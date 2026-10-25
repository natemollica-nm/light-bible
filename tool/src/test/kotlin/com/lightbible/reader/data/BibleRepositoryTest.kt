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
    fun preservesFragmentsHeadingsPoetryAndCopyrightWithoutFootnotes() = runBlocking {
        withDirectory { directory ->
            val server = Server()
            BibleRepository(directory, server::fetch).use { repository ->
                val translation = repository.translations().first()
                assertEquals("A", translation.englishName)
                assertEquals("ltr", translation.textDirection)
                val passage = repository.chapter(ReadingLocation("A", "GEN", 1))
                assertEquals(Translation("A", "A"), passage.translation)
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
                assertEquals(passage, repository.chapter(ReadingLocation("A", "GEN", 1)))
            }
        }
    }

    @Test
    fun interruptedDownloadKeepsOfflineNavigationAndResumesOnlyMissingChapters() = runBlocking {
        withDirectory { directory ->
            val server = Server().apply { failChapter = 2 }
            BibleRepository(directory, server::fetch).use { repository ->
                assertFailsWith<IOException> { repository.download("A") { _, _ -> } }
                assertEquals(emptyList(), repository.downloaded())
            }
            server.online = false
            BibleRepository(directory, server::fetch).use { repository ->
                assertEquals(listOf("A", "AB"), repository.translations().map { it.id })
                assertEquals(2, repository.books("A").single().lastChapterNumber)
                assertEquals(1, repository.chapter(ReadingLocation("A", "GEN", 1)).number)
                assertFailsWith<IOException> { repository.chapter(ReadingLocation("A", "GEN", 2)) }
                assertTrue(repository.downloaded().isEmpty())
                server.online = true
                server.failChapter = null
                server.urls.clear()
                val progress = mutableListOf<Pair<Int, Int>>()
                repository.download("A") { current, total -> progress += current to total }
                assertEquals(listOf(0 to 2, 1 to 2, 2 to 2), progress)
                assertEquals(listOf("https://bible.helloao.org/api/A/GEN/2.json"), server.urls)
            }
            server.online = false
            BibleRepository(directory, server::fetch).use { repository ->
                assertEquals(listOf("A"), repository.downloaded())
                assertEquals(2, repository.chapter(ReadingLocation("A", "GEN", 2)).number)
                repository.download("A") { _, _ -> } // Entirely offline, including both manifests.
                assertEquals(listOf("A"), repository.downloaded())
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
                        repository.download("A") { current, _ -> if (current == cancelAt) job.cancel() }
                    }
                    download.join()
                    assertTrue(download.isCancelled)
                    assertTrue(repository.downloaded().isEmpty())
                    server.urls.clear()
                    repository.download("A") { _, _ -> }
                    assertEquals(2 - cancelAt, server.urls.size)
                    assertEquals(listOf("A"), repository.downloaded())
                }
            }
        }
    }

    @Test
    fun clearingExactTranslationDoesNotRemovePrefixNeighbour() = runBlocking {
        withDirectory { directory ->
            val server = Server()
            BibleRepository(directory, server::fetch).use { repository ->
                repository.download("A") { _, _ -> }
                repository.download("AB") { _, _ -> }
                repository.clearDownload("A")
                server.online = false
                assertEquals(listOf("AB"), repository.downloaded())
                assertEquals("AB", repository.chapter(ReadingLocation("AB", "GEN", 1)).translation.id)
                assertFailsWith<IOException> { repository.chapter(ReadingLocation("A", "GEN", 1)) }
                assertFailsWith<IllegalArgumentException> { repository.clearDownload("../AB") }
                assertEquals(listOf("AB"), repository.downloaded())
            }
        }
    }

    @Test
    fun damagedChapterIsNotReportedCompleteAndIsRepairedOnResume() = runBlocking {
        withDirectory { directory ->
            val server = Server()
            BibleRepository(directory, server::fetch).use { repository ->
                repository.download("A") { _, _ -> }
                directory.walkTopDown().single { it.name == "2.json" }.writeText("{truncated")
                assertTrue(repository.downloaded().isEmpty())
                server.urls.clear()
                repository.download("A") { _, _ -> }
                assertEquals(listOf("https://bible.helloao.org/api/A/GEN/2.json"), server.urls)
                assertEquals(listOf("A"), repository.downloaded())
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
                return """{"translations":[{"id":"A","name":"A"},{"id":"AB","name":"AB"}]}"""
            }
            val path = url.removePrefix("https://bible.helloao.org/api/").split('/')
            val translation = """{"id":"${path[0]}","name":"${path[0]}"}"""
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
