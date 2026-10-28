package com.lightbible.reader.data

import java.io.File
import java.io.IOException
import kotlin.io.path.createTempDirectory
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.job
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

class BibleRepositoryTest {
    @Test
    fun curatedCatalogSurvivesOfflineReopenAndRejectsUnlistedDownloads() = runBlocking {
        withDirectory { directory ->
            val server = Server()
            BibleRepository(directory, server::fetch).use { repository ->
                assertEquals(setOf("eng_kjv", "eng_asv", "NIV", "NLT", "NKJV"), repository.translations().map { it.id }.toSet())
                assertFailsWith<IllegalArgumentException> { repository.download("SPA") { _, _ -> } }
                assertFailsWith<IllegalArgumentException> { repository.download("BSB") { _, _ -> } }
            }
            server.online = false
            BibleRepository(directory, server::fetch).use { repository ->
                assertEquals(setOf("eng_kjv", "eng_asv", "NIV", "NLT", "NKJV"), repository.translations().map { it.id }.toSet())
                repository.esvApiKey = "test-user-key"
                assertEquals(setOf("ESV", "eng_kjv", "eng_asv", "NIV", "NLT", "NKJV"), repository.translations().map { it.id }.toSet())
            }
        }
    }

    @Test
    fun hostedEditionsPreserveAttributionWithoutDeviceCredentialsOrOfflineCopies() = runBlocking {
        withDirectory { directory ->
            var online = true
            var includeCopyright = true
            val fetch: suspend (String, Map<String, String>) -> String = { url, headers ->
                if (!online) throw IOException("Offline")
                assertTrue(headers.isEmpty()) // The ESV key must not be sent to this service.
                assertTrue(url.startsWith("https://light-bible-api.nathanmollica.workers.dev/v1/"))
                val id = url.substringAfter("/v1/").substringBefore('/')
                val translation = """{"id":"$id","name":"$id","languageName":"English"}"""
                val book = """{"id":"JHN","name":"John","lastChapterNumber":21}"""
                if (url.endsWith("/books")) """{"translation":$translation,"books":[$book]}"""
                else {
                    assertTrue(url.endsWith("/chapters/JHN.3"))
                    val copyright = if (includeCopyright) ",\"copyright\":\"Publisher attribution\"" else ""
                    """{"translation":$translation,"book":$book,"chapter":{"number":3,"content":[
                        {"type":"verse","number":16,"content":["$id licensed passage"]}
                    ]}$copyright}"""
                }
            }
            BibleRepository(directory, fetch).use { repository ->
                repository.esvApiKey = "private-esv-key"
                for (id in listOf("NIV", "NLT", "NKJV")) {
                    assertEquals(21, repository.books(id).single().lastChapterNumber)
                    val location = ReadingLocation(id, "JHN", 3)
                    val passage = repository.chapter(location)
                    assertEquals(id, passage.translation.id)
                    assertEquals(listOf(Verse(16, "$id licensed passage")), passage.verses)
                    assertEquals("Publisher attribution", passage.copyright)
                    assertFailsWith<IllegalArgumentException> { repository.download(id) { _, _ -> } }
                    online = false
                    assertFailsWith<IOException> { repository.chapter(location) }
                    online = true
                }
                includeCopyright = false
                assertFailsWith<IllegalArgumentException> { repository.chapter(ReadingLocation("NIV", "JHN", 3)) }
                assertTrue(repository.downloaded().isEmpty())
            }
            online = false
            BibleRepository(directory, fetch).use { repository ->
                assertTrue(repository.translations().any { it.id == "NIV" })
                assertFailsWith<IOException> { repository.chapter(ReadingLocation("NIV", "JHN", 3)) }
            }
            assertFalse(directory.walkTopDown().filter { it.isFile }.any {
                it.readText().contains("licensed passage") || it.readText().contains("private-esv-key")
            })
        }
    }

    @Test
    fun preservesFragmentsHeadingsPoetryAndCopyrightWithoutFootnotes() = runBlocking {
        withDirectory { directory ->
            val server = Server()
            BibleRepository(directory, server::fetch).use { repository ->
                val translation = repository.translations().first()
                assertEquals("King James Version", translation.englishName)
                assertEquals("ltr", translation.textDirection)
                val passage = repository.chapter(ReadingLocation("eng_kjv", "GEN", 1))
                assertEquals(Translation("eng_kjv", "eng_kjv"), passage.translation)
                assertEquals(Book("GEN", "Genesis", 1, 2), passage.book)
                assertEquals(1, passage.number)
                assertEquals(
                    listOf(
                        Verse(null, "A heading"),
                        Verse(1, "In the beginning.\nA second line."),
                        Verse(2, "First poem line\nSecond poem line"),
                        Verse(3, "Jethro, the priest came to Horeb, the mountain of God. There the angel of the LORD appeared."),
                        Verse(4, "The LORD’s word, spoken (clearly)."),
                        Verse(5, "Already spaced; unbroken."),
                        Verse(null, "\n"),
                    ), passage.verses,
                )
                assertEquals("Public domain", passage.copyright)
                server.online = false
                assertEquals(passage, repository.chapter(ReadingLocation("eng_kjv", "GEN", 1)))
            }
        }
    }

    @Test
    fun interruptedDownloadKeepsOfflineNavigationAndResumesOnlyMissingChapters() = runBlocking {
        withDirectory { directory ->
            val server = Server().apply { failChapter = 2 }
            BibleRepository(directory, server::fetch).use { repository ->
                assertFailsWith<IOException> { repository.download("eng_kjv") { _, _ -> } }
                assertEquals(emptyList(), repository.downloaded())
            }
            server.online = false
            BibleRepository(directory, server::fetch).use { repository ->
                assertEquals(setOf("eng_kjv", "eng_asv", "NIV", "NLT", "NKJV"), repository.translations().map { it.id }.toSet())
                assertEquals(2, repository.books("eng_kjv").single().lastChapterNumber)
                assertEquals(1, repository.chapter(ReadingLocation("eng_kjv", "GEN", 1)).number)
                assertFailsWith<IOException> { repository.chapter(ReadingLocation("eng_kjv", "GEN", 2)) }
                assertTrue(repository.downloaded().isEmpty())
                server.online = true
                server.failChapter = null
                server.urls.clear()
                val progress = mutableListOf<Pair<Int, Int>>()
                repository.download("eng_kjv") { current, total -> progress += current to total }
                assertEquals(listOf(0 to 2, 1 to 2, 2 to 2), progress)
                assertEquals(listOf("https://bible.helloao.org/api/eng_kjv/GEN/2.json"), server.urls)
            }
            server.online = false
            BibleRepository(directory, server::fetch).use { repository ->
                assertEquals(listOf("eng_kjv"), repository.downloaded())
                assertEquals(2, repository.chapter(ReadingLocation("eng_kjv", "GEN", 2)).number)
                repository.download("eng_kjv") { _, _ -> } // Entirely offline, including both manifests.
                assertEquals(listOf("eng_kjv"), repository.downloaded())
            }
            assertFalse(directory.walkTopDown().any { it.extension == "tmp" })
        }
    }

    @Test
    fun cancellationIncludingFinalProgressNeverCommitsIncompleteDownload() = runBlocking {
        for (cancelAt in listOf(1, 2)) {
            withDirectory { directory ->
                val server = Server()
                BibleRepository(directory, server::fetch).use { repository ->
                    val download = launch {
                        val job = currentCoroutineContext().job
                        repository.download("eng_kjv") { current, _ -> if (current == cancelAt) job.cancel() }
                    }
                    download.join()
                    assertTrue(download.isCancelled)
                    assertTrue(repository.downloaded().isEmpty())
                    server.urls.clear()
                    repository.download("eng_kjv") { _, _ -> }
                    assertEquals(2 - cancelAt, server.urls.size)
                    assertEquals(listOf("eng_kjv"), repository.downloaded())
                }
            }
        }
    }

    @Test
    fun clearingOneTranslationDoesNotRemoveAnother() = runBlocking {
        withDirectory { directory ->
            val server = Server()
            BibleRepository(directory, server::fetch).use { repository ->
                repository.download("eng_kjv") { _, _ -> }
                repository.download("eng_asv") { _, _ -> }
                repository.clearDownload("eng_kjv")
                server.online = false
                assertEquals(listOf("eng_asv"), repository.downloaded())
                assertEquals("eng_asv", repository.chapter(ReadingLocation("eng_asv", "GEN", 1)).translation.id)
                assertFailsWith<IOException> { repository.chapter(ReadingLocation("eng_kjv", "GEN", 1)) }
                assertFailsWith<IllegalArgumentException> { repository.clearDownload("../eng_asv") }
                assertEquals(listOf("eng_asv"), repository.downloaded())
            }
        }
    }

    @Test
    fun damagedChapterIsNotReportedCompleteAndIsRepairedOnResume() = runBlocking {
        withDirectory { directory ->
            val server = Server()
            BibleRepository(directory, server::fetch).use { repository ->
                repository.download("eng_kjv") { _, _ -> }
                directory.walkTopDown().single { it.name == "2.json" }.writeText("{truncated")
                assertTrue(repository.downloaded().isEmpty())
                server.urls.clear()
                repository.download("eng_kjv") { _, _ -> }
                assertEquals(listOf("https://bible.helloao.org/api/eng_kjv/GEN/2.json"), server.urls)
                assertEquals(listOf("eng_kjv"), repository.downloaded())
            }
        }
    }

    @Test
    fun esvUsesHeaderOnlyAndNeverCachesOrDownloadsPassages() = runBlocking {
        withDirectory { directory ->
            val server = Server()
            BibleRepository(directory, server::fetch).use { repository ->
                val location = ReadingLocation("ESV", "GEN", 1)
                assertFailsWith<IllegalArgumentException> { repository.chapter(location) }
                assertFalse(repository.translations().any { it.id == "ESV" })
                repository.esvApiKey = "test-user-key"
                assertEquals("ESV", repository.translations().first().id)
                val books = repository.books("ESV")
                assertEquals(66, books.size)
                assertEquals(1189, books.sumOf { it.lastChapterNumber })
                val passage = repository.chapter(location)
                assertEquals(listOf(Verse(null, "Creation"), Verse(1, "First line\nSecond line"), Verse(2, "Next verse")), passage.verses)
                assertTrue(passage.copyright.orEmpty().contains("© 2001 by Crossway"))
                repository.chapter(location)
                assertEquals(2, server.urls.count { it.startsWith("https://api.esv.org/") })
                assertEquals(mapOf("Authorization" to "Token test-user-key"), server.esvHeaders)
                assertFalse(server.urls.any { it.contains("test-user-key") })
                assertFalse(directory.walkTopDown().filter { it.isFile }.any {
                    it.readText().contains("test-user-key") || it.readText().contains("First line")
                })
                assertFailsWith<IllegalArgumentException> { repository.download("ESV") { _, _ -> } }
                server.online = false
                assertFailsWith<IOException> { repository.chapter(location) }
                repository.esvApiKey = ""
                assertFailsWith<IllegalArgumentException> { repository.chapter(location) }
                assertTrue(repository.downloaded().isEmpty())
            }
        }
    }

    private suspend fun withDirectory(block: suspend (File) -> Unit) {
        val directory = createTempDirectory("bible-repository-test-").toFile()
        try {
            block(directory)
        } finally {
            directory.deleteRecursively()
        }
    }

    private class Server {
        var online = true
        var failChapter: Int? = null
        val urls = mutableListOf<String>()
        var esvHeaders: Map<String, String> = emptyMap()

        suspend fun fetch(url: String, headers: Map<String, String>): String {
            urls += url
            if (!online) throw IOException("Offline")
            if (url.startsWith("https://api.esv.org/")) {
                esvHeaders = headers
                return """{"passages":["Creation\n\n[1] First line\nSecond line [2] Next verse"]}"""
            }
            assertTrue(headers.isEmpty())
            if (url.endsWith("available_translations.json")) {
                return """{"translations":[
                    {"id":"eng_kjv","name":"KJV","language":"eng"},
                    {"id":"eng_asv","name":"ASV","languageName":"English"},
                    {"id":"BSB","name":"Berean Standard Bible","language":"eng"},
                    {"id":"eng_cpb","name":"KJV Cambridge Paragraph Bible","language":"eng"},
                    {"id":"SPA","name":"English-labelled Spanish","language":"spa","languageName":"English"},
                    {"id":"UNKNOWN","name":"English"}
                ]}"""
            }
            val path = url.removePrefix("https://bible.helloao.org/api/").split('/')
            val translation = """{"id":"${path[0]}","name":"${path[0]}","language":"eng"}"""
            val book = """{"id":"GEN","name":"Genesis","firstChapterNumber":1,"lastChapterNumber":2}"""
            if (path.last() == "books.json") return """{"translation":$translation,"books":[$book]}"""
            val number = path.last().removeSuffix(".json").toInt()
            if (number == failChapter) throw IOException("Interrupted transfer")
            return """{
                "translation":$translation,"book":$book,
                "chapter":{"number":$number,"content":[
                    {"type":"heading","content":["A heading"]},
                    {"type":"verse","number":1,"content":["In ",{"text":"the beginning."},{"noteId":1,"text":"DO NOT SHOW"},{"lineBreak":true},"A second line."]},
                    {"type":"verse","number":2,"content":[{"text":"First poem line","poem":1},{"text":"Second poem line","poem":2}]},
                    {"type":"verse","number":3,"content":["Jethro,",{"noteId":10},"the priest came to Horeb,",{"noteId":11},"the mountain of God. There the angel",{"noteId":12},{"text":"of the LORD appeared."}]},
                    {"type":"verse","number":4,"content":["The LORD",{"noteId":13},"’s word",{"noteId":14},", spoken (",{"noteId":15},"clearly)."]},
                    {"type":"verse","number":5,"content":["Already ",{"noteId":16},"spaced; un",{"text":"broken."}]},
                    {"type":"line_break"},
                    {"type":"copyright","content":["Public domain"]}
                ],"footnotes":[{"text":"DO NOT SHOW"}]},"unknownFutureField":true
            }"""
        }
    }
}
