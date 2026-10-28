package com.lightbible.reader.data

import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.ResponseException
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.statement.bodyAsText
import io.ktor.http.URLBuilder
import java.io.Closeable
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString

internal class ReadingLimitException : IOException("Reading limit reached. Try again later.")

/**
 * One repository per SDK filesDir. Operations run on IO and are serialized so clearing a
 * download cannot race its completion. Cancel the caller's coroutine to interrupt a download.
 * Progress runs on IO; it must not block or call back into this repository.
 */
class BibleRepository internal constructor(
    filesDir: File,
    private val fetchOverride: (suspend (url: String, headers: Map<String, String>) -> String)?,
) : Closeable {
    constructor(filesDir: File) : this(filesDir, null)

    private val root = File(filesDir, "bible-cache-v1")
    private val mutex = Mutex()
    private val hostedBooks = mutableMapOf<String, List<Book>>()
    private val client = if (fetchOverride != null) null else HttpClient(OkHttp) {
        expectSuccess = true
        followRedirects = false
        install(HttpTimeout) {
            connectTimeoutMillis = 15_000
            socketTimeoutMillis = 30_000
            requestTimeoutMillis = 45_000
        }
    }

    /** In-memory only. The UI is responsible for obtaining a user's optional ESV key. */
    @Volatile var esvApiKey: String = ""
    @Volatile private var closed = false

    suspend fun translations(): List<Translation> = operation {
        // The fixed catalog remains available even when either provider is offline.
        val available = listOf(
            Translation("eng_kjv", "King James Version", languageName = "English"),
            Translation("eng_asv", "American Standard Version", languageName = "English"),
        ) + hostedTranslations.map { (id, name) -> Translation(id, name, languageName = "English") }
        if (esvApiKey.isNotBlank()) listOf(ESV_TRANSLATION) + available else available
    }

    suspend fun books(translationId: String): List<Book> = operation {
        require(translationId in translationAbbreviations) { "Select a supported translation" }
        when {
            translationId == "ESV" -> ESV_BOOKS
            translationId in hostedTranslations -> hostedBooks.getOrPut(translationId) {
                parseBooks(fetch("$HOSTED_BASE/$translationId/books"), translationId).books
            }
            else -> bookManifest(translationId).books
        }
    }

    suspend fun chapter(location: ReadingLocation): Passage = operation {
        require(location.translationId in translationAbbreviations) { "Select a supported translation" }
        when {
            location.translationId == "ESV" -> esvChapter(location)
            location.translationId in hostedTranslations -> {
                validateId(location.bookId)
                require(location.chapter in 1..150) { "Invalid chapter number" }
                // Licensed text is always fetched, never written to the on-device cache.
                parseChapter(fetch("$HOSTED_BASE/${location.translationId}/chapters/${location.bookId}.${location.chapter}"), location).also {
                    require(!it.copyright.isNullOrBlank()) { "Missing publisher attribution" }
                }
            }
            else -> helloChapter(location)
        }
    }

    suspend fun download(translationId: String, onProgress: (Int, Int) -> Unit) = operation {
        require(!isOnlineOnlyTranslation(translationId)) { "$translationId is network-only and cannot be downloaded" }
        // Both navigation manifests must survive offline, even if the first chapter fails.
        val translations = translationManifest()
        require(translationId in translationAbbreviations && translations.translations.any { it.id == translationId }) { "Select a supported translation" }
        val directory = translationDirectory(translationId)
        val complete = File(directory, "complete")
        if (complete.exists() && !complete.delete()) throw IOException("Cannot reset download status")
        val manifest = bookManifest(translationId)
        val total = manifest.books.sumOf { it.lastChapterNumber - it.firstChapterNumber + 1 }
        var completed = 0
        onProgress(0, total)
        for (book in manifest.books) {
            for (number in book.firstChapterNumber..book.lastChapterNumber) {
                currentCoroutineContext().ensureActive()
                helloChapter(ReadingLocation(translationId, book.id, number))
                completed++
                onProgress(completed, total)
            }
        }
        // In particular, cancellation from the final progress callback must not commit.
        currentCoroutineContext().ensureActive()
        atomicWrite(complete, translationId)
    }

    suspend fun downloaded(): List<String> = operation {
        val translations = readCached(File(root, "translations.json"), ::parseTranslations)
            ?: return@operation emptyList()
        translations.translations.filter { translation ->
            if (isOnlineOnlyTranslation(translation.id) || translation.id !in translationAbbreviations) return@filter false
            val directory = translationDirectory(translation.id)
            val complete = File(directory, "complete")
            if (!complete.isFile) return@filter false
            val manifest = readCached(File(directory, "books.json")) {
                parseBooks(it, translation.id)
            } ?: return@filter false
            // Check persisted files, not just a marker: missing/corrupt chapters are resumable.
            manifest.books.all { book ->
                (book.firstChapterNumber..book.lastChapterNumber).all { number ->
                    currentCoroutineContext().ensureActive()
                    val location = ReadingLocation(translation.id, book.id, number)
                    readCached(chapterFile(location)) { parseChapter(it, location) } != null
                }
            }
        }.map { it.id }
    }

    suspend fun clearDownload(translationId: String) = operation {
        val directory = translationDirectory(translationId)
        // Remove only this exact directory, never another translation sharing its prefix.
        if (directory.exists() && !directory.deleteRecursively()) {
            throw IOException("Could not clear translation cache")
        }
    }

    override fun close() {
        closed = true
        esvApiKey = ""
        client?.close()
    }

    private suspend fun <T> operation(block: suspend () -> T): T = withContext(Dispatchers.IO) {
        mutex.withLock {
            check(!closed) { "Bible repository is closed" }
            currentCoroutineContext().ensureActive()
            block()
        }
    }

    private suspend fun translationManifest(): TranslationManifest = cached(
        File(root, "translations.json"), "$HELLO_BASE/available_translations.json", ::parseTranslations,
    )

    private fun parseTranslations(raw: String): TranslationManifest =
        bibleJson.decodeFromString<TranslationManifest>(raw).also { manifest ->
            require(manifest.translations.isNotEmpty()) { "Empty translation manifest" }
            manifest.translations.forEach { validateId(it.id) }
        }

    private suspend fun bookManifest(id: String): BookManifest = cached(
        File(translationDirectory(id), "books.json"), "$HELLO_BASE/$id/books.json",
    ) { parseBooks(it, id) }

    private fun parseBooks(raw: String, id: String): BookManifest =
        bibleJson.decodeFromString<BookManifest>(raw).also { manifest ->
            require(manifest.translation.id == id && manifest.books.isNotEmpty()) { "Invalid book manifest" }
            require(manifest.books.map { it.id }.distinct().size == manifest.books.size)
            manifest.books.forEach {
                validateId(it.id)
                require(it.firstChapterNumber >= 0 && it.lastChapterNumber >= it.firstChapterNumber)
            }
        }

    private suspend fun helloChapter(location: ReadingLocation): Passage = cached(
        chapterFile(location),
        "$HELLO_BASE/${location.translationId}/${location.bookId}/${location.chapter}.json",
    ) { parseChapter(it, location) }

    private fun parseChapter(raw: String, location: ReadingLocation): Passage =
        parseHelloChapter(raw).also {
            require(it.translation.id == location.translationId && it.book.id == location.bookId &&
                it.number == location.chapter) { "Unexpected chapter response" }
        }

    private suspend fun esvChapter(location: ReadingLocation): Passage {
        val key = esvApiKey.trim()
        require(key.isNotEmpty()) { "ESV API key not configured" }
        val book = ESV_BOOKS.firstOrNull { it.id == location.bookId }
            ?: throw IllegalArgumentException("Unknown ESV book")
        require(location.chapter in book.firstChapterNumber..book.lastChapterNumber) { "Invalid ESV chapter" }
        val url = URLBuilder("https://api.esv.org/v3/passage/text/").apply {
            parameters.append("q", "${book.name} ${location.chapter}")
            parameters.append("include-headings", "true")
            parameters.append("include-footnotes", "false")
            parameters.append("include-verse-numbers", "true")
            parameters.append("include-short-copyright", "false")
            parameters.append("include-passage-references", "false")
            parameters.append("indent-paragraphs", "0")
            parameters.append("indent-poetry", "false")
            parameters.append("indent-declares", "0")
            parameters.append("indent-psalm-doxology", "0")
        }.buildString()
        // Never pass ESV through the cache, including when the user changes/removes the key.
        return parseEsvChapter(fetch(url, mapOf("Authorization" to "Token $key")), book, location.chapter)
    }

    private suspend fun fetch(url: String, headers: Map<String, String> = emptyMap()): String {
        currentCoroutineContext().ensureActive()
        return try {
            fetchOverride?.invoke(url, headers) ?: checkNotNull(client).get(url) {
                headers.forEach { (name, value) -> header(name, value) }
            }.bodyAsText()
        } catch (error: ResponseException) {
            // Do not propagate response bodies or request headers into UI errors/logs.
            val status = error.response.status.value
            if (status == 429) throw ReadingLimitException()
            throw IOException("Bible request failed (HTTP $status)")
        }
    }

    private suspend fun <T> cached(file: File, url: String, parse: (String) -> T): T {
        readCached(file, parse)?.let { return it }
        val raw = fetch(url)
        val result = parse(raw) // Validate before committing, never cache an error response.
        currentCoroutineContext().ensureActive()
        atomicWrite(file, raw)
        return result
    }

    private fun <T> readCached(file: File, parse: (String) -> T): T? {
        if (!file.isFile) return null
        return try {
            parse(file.readText())
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (_: Exception) {
            null // Interrupted/old/corrupt cache entries are repaired by the next fetch.
        }
    }

    private fun translationDirectory(id: String): File {
        validateId(id)
        return File(File(root, "translations"), id)
    }

    private fun chapterFile(location: ReadingLocation): File {
        validateId(location.bookId)
        require(location.chapter >= 0) { "Invalid chapter number" }
        return File(File(translationDirectory(location.translationId), location.bookId), "${location.chapter}.json")
    }

    private fun validateId(id: String) {
        require(id.matches(Regex("[A-Za-z0-9_-]+"))) { "Invalid Bible identifier" }
    }

    private fun atomicWrite(destination: File, text: String) {
        val directory = checkNotNull(destination.parentFile)
        if (!directory.isDirectory && !directory.mkdirs()) throw IOException("Cannot create Bible cache")
        val temporary = File.createTempFile(".pending-", ".tmp", directory)
        try {
            FileOutputStream(temporary).use { stream ->
                stream.write(text.toByteArray(Charsets.UTF_8))
                stream.fd.sync()
            }
            // Same-filesystem rename is atomic on Android/Linux; never delete the old file first.
            if (!temporary.renameTo(destination)) throw IOException("Cannot commit Bible cache")
        } finally {
            temporary.delete()
        }
    }

    private companion object {
        const val HELLO_BASE = "https://bible.helloao.org/api"
        const val HOSTED_BASE = "https://light-bible-api.nathanmollica.workers.dev/v1"
    }
}
