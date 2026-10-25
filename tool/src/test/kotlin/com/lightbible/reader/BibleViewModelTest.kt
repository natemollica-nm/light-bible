package com.lightbible.reader

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.lifecycle.ViewModelStore
import com.lightbible.reader.data.BibleRepository
import com.lightbible.reader.data.ReadingLocation
import java.io.File
import kotlin.io.path.createTempDirectory
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.job
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.withTimeout

@OptIn(ExperimentalCoroutinesApi::class)
class BibleViewModelTest {
    @Test
    fun latestChapterSelectionWinsAndSurvivesReopening() = runBlocking {
        withReader { create ->
            val started = CompletableDeferred<Unit>()
            val blocked = CompletableDeferred<Unit>()
            val model = create { url ->
                if (url.endsWith("GEN/2.json")) { started.complete(Unit); blocked.await() }
                response(url)
            }
            model.awaitPassage("GEN", 1)
            model.open(ReadingLocation("BSB", "GEN", 2))
            withTimeout(10_000) { started.await() }
            model.open(ReadingLocation("BSB", "REV", 3))
            model.awaitPassage("REV", 3)
            blocked.complete(Unit)
            assertEquals(ReadingLocation("BSB", "REV", 3), model.state.value.location)
            // A new view model reads the real persisted DataStore, not the old model's state.
            create(::response).awaitPassage("REV", 3)
        }
    }

    @Test
    fun navigationUsesBookChapterBoundsAndStopsAtBothEnds() = runBlocking {
        withReader { create ->
            val model = create(::response)
            model.awaitPassage("GEN", 1)
            assertNull(model.adjacentChapter(-1))
            model.open(ReadingLocation("BSB", "GEN", 2))
            model.awaitPassage("GEN", 2)
            assertEquals(ReadingLocation("BSB", "REV", 2), model.adjacentChapter(1))
            model.open(model.adjacentChapter(1)!!)
            model.awaitPassage("REV", 2)
            assertEquals(ReadingLocation("BSB", "GEN", 2), model.adjacentChapter(-1))
            model.open(ReadingLocation("BSB", "REV", 3))
            model.awaitPassage("REV", 3)
            assertNull(model.adjacentChapter(1))
        }
    }

    private suspend fun BibleViewModel.awaitPassage(book: String, chapter: Int) {
        withTimeout(10_000) {
            state.first { !it.loading && it.passage?.book?.id == book && it.passage.number == chapter }
        }
    }

    private suspend fun withReader(block: suspend (create: (suspend (String) -> String) -> BibleViewModel) -> Unit) {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        val directory = createTempDirectory("bible-reader-test-").toFile()
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        val preferences = PreferenceDataStoreFactory.create(scope = scope) { File(directory, "reader.preferences_pb") }
        val models = ViewModelStore()
        try {
            block { fetch ->
                models.clear()
                BibleViewModel(BibleRepository(directory) { url, _ -> fetch(url) }, preferences).also {
                    models.put("reader", it)
                }
            }
        } finally {
            models.clear()
            scope.coroutineContext.job.cancelAndJoin()
            Dispatchers.resetMain()
            directory.deleteRecursively()
        }
    }

    private fun response(url: String): String {
        val translation = """{"id":"BSB","name":"Berean Standard Bible"}"""
        val genesis = """{"id":"GEN","name":"Genesis","firstChapterNumber":1,"lastChapterNumber":2}"""
        val revelation = """{"id":"REV","name":"Revelation","firstChapterNumber":2,"lastChapterNumber":3}"""
        if (url.endsWith("books.json")) return """{"translation":$translation,"books":[$genesis,$revelation]}"""
        val book = if ("/GEN/" in url) genesis else revelation
        val chapter = url.substringAfterLast('/').substringBefore('.').toInt()
        return """{"translation":$translation,"book":$book,"chapter":{"number":$chapter,"content":[{"type":"verse","number":1,"content":["Reading $chapter"]}]}}"""
    }
}
