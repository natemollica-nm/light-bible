package com.lightbible.reader

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.lifecycle.viewModelScope
import com.lightbible.reader.data.BibleRepository
import com.lightbible.reader.data.Book
import com.lightbible.reader.data.Passage
import com.lightbible.reader.data.ReadingLocation
import com.lightbible.reader.data.Translation
import com.thelightphone.sdk.LightViewModel
import com.thelightphone.sdk.ui.LightThemeController
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class BibleState(
    val ready: Boolean = false,
    val location: ReadingLocation = ReadingLocation("BSB", "GEN", 1),
    val passage: Passage? = null,
    val books: List<Book> = emptyList(),
    val translations: List<Translation> = emptyList(),
    val loading: Boolean = true,
    val loadingTranslations: Boolean = false,
    val error: String? = null,
    val catalogError: String? = null,
    val fontSize: Int = 1,
    val lightBackground: Boolean = false,
    val esvConfigured: Boolean = false,
    val downloaded: List<String> = emptyList(),
    val downloading: String? = null,
    val progress: Pair<Int, Int> = 0 to 0,
    val downloadMessage: String? = null,
)

class BibleViewModel(
    private val repository: BibleRepository,
    private val preferences: DataStore<Preferences>,
) : LightViewModel<Unit>() {
    private val mutableState = MutableStateFlow(BibleState())
    val state = mutableState.asStateFlow()
    private var readingJob: Job? = null
    private var downloadJob: Job? = null

    init {
        viewModelScope.launch {
            try {
                val saved = preferences.data.first()
                repository.esvApiKey = saved[ESV_KEY].orEmpty()
                val light = saved[LIGHT_BACKGROUND] ?: false
                if (light) LightThemeController.setLightTheme() else LightThemeController.setDarkTheme()
                val location = ReadingLocation(
                    saved[TRANSLATION] ?: "BSB", saved[BOOK] ?: "GEN", saved[CHAPTER] ?: 1,
                )
                mutableState.update {
                    it.copy(ready = true, location = location, fontSize = (saved[FONT_SIZE] ?: 1).coerceIn(0, 2),
                        lightBackground = light, esvConfigured = repository.esvApiKey.isNotBlank())
                }
                open(location)
                refreshDownloaded()
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                mutableState.update { it.copy(loading = false, error = "Could not open saved settings. Close and reopen Bible.") }
            }
        }
    }

    fun open(location: ReadingLocation) {
        // Reading takes priority over a foreground bulk download's repository lock.
        cancelDownload()
        readingJob?.cancel()
        readingJob = viewModelScope.launch {
            mutableState.update { it.copy(location = location, loading = true, error = null, passage = null, books = emptyList()) }
            try {
                val books = withContext(Dispatchers.IO) { repository.books(location.translationId) }
                val book = books.find { it.id == location.bookId } ?: books.firstOrNull()
                    ?: error("No books available")
                val resolved = location.copy(bookId = book.id, chapter = location.chapter.coerceIn(book.firstChapterNumber, book.lastChapterNumber))
                mutableState.update { it.copy(location = resolved, books = books) }
                val passage = withContext(Dispatchers.IO) { repository.chapter(resolved) }
                preferences.edit {
                    it[TRANSLATION] = resolved.translationId
                    it[BOOK] = resolved.bookId
                    it[CHAPTER] = resolved.chapter
                }
                mutableState.update { it.copy(location = resolved, passage = passage, books = books, loading = false) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                mutableState.update { it.copy(loading = false, error = "Unable to load this chapter. Check your connection or choose a downloaded translation. ESV requires a valid API key.") }
            }
        }
    }

    fun adjacentChapter(direction: Int): ReadingLocation? {
        val current = state.value
        val index = current.books.indexOfFirst { it.id == current.location.bookId }
        if (index < 0) return null
        val book = current.books[index]
        val chapter = current.location.chapter + direction
        if (chapter in book.firstChapterNumber..book.lastChapterNumber) return current.location.copy(chapter = chapter)
        val next = current.books.getOrNull(index + direction) ?: return null
        return current.location.copy(bookId = next.id, chapter = if (direction > 0) next.firstChapterNumber else next.lastChapterNumber)
    }

    fun loadTranslations() {
        if (state.value.loadingTranslations) return
        cancelDownload()
        viewModelScope.launch {
            mutableState.update { it.copy(loadingTranslations = true, catalogError = null) }
            try {
                val translations = withContext(Dispatchers.IO) { repository.translations() }
                mutableState.update { it.copy(translations = translations, loadingTranslations = false) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                mutableState.update { it.copy(loadingTranslations = false, catalogError = "Could not load translations. Check your connection and retry.") }
            }
        }
    }

    fun setFontSize(size: Int) = saveSetting {
        this[FONT_SIZE] = size.coerceIn(0, 2)
        mutableState.update { it.copy(fontSize = size.coerceIn(0, 2)) }
    }

    fun toggleBackground() = saveSetting {
        val light = !state.value.lightBackground
        this[LIGHT_BACKGROUND] = light
        if (light) LightThemeController.setLightTheme() else LightThemeController.setDarkTheme()
        mutableState.update { it.copy(lightBackground = light) }
    }

    fun setEsvKey(key: String) = saveSetting {
        this[ESV_KEY] = key.trim()
        repository.esvApiKey = key.trim()
        mutableState.update { it.copy(esvConfigured = key.isNotBlank()) }
        if (state.value.location.translationId == "ESV") open(state.value.location)
    }

    private fun saveSetting(edit: androidx.datastore.preferences.core.MutablePreferences.() -> Unit) {
        viewModelScope.launch {
            try {
                preferences.edit { it.edit() }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                mutableState.update { it.copy(downloadMessage = "Could not save settings. Check available storage.") }
            }
        }
    }

    fun download() {
        if (downloadJob?.isActive == true || state.value.location.translationId == "ESV") return
        val id = state.value.location.translationId
        mutableState.update { it.copy(downloading = id, progress = 0 to 0, downloadMessage = null) }
        downloadJob = viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    repository.download(id) { done, total -> mutableState.update { it.copy(progress = done to total) } }
                }
                refreshDownloaded()
                mutableState.update { it.copy(downloadMessage = "$id is ready for offline reading.") }
            } catch (e: CancellationException) {
                mutableState.update { it.copy(downloadMessage = "Download paused. Cached chapters are kept; tap download to resume.") }
                throw e
            } catch (_: Exception) {
                mutableState.update { it.copy(downloadMessage = "Download interrupted. Check connection and storage, then retry; cached chapters are kept.") }
            } finally {
                mutableState.update { it.copy(downloading = null) }
            }
        }
    }

    fun cancelDownload() { downloadJob?.cancel() }

    fun removeDownload(id: String) {
        if (state.value.downloading != null) return
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) { repository.clearDownload(id) }
                refreshDownloaded()
                mutableState.update { it.copy(downloadMessage = "Removed downloaded $id.") }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                mutableState.update { it.copy(downloadMessage = "Could not remove download.") }
            }
        }
    }

    private suspend fun refreshDownloaded() {
        val downloaded = withContext(Dispatchers.IO) { repository.downloaded() }
        mutableState.update { it.copy(downloaded = downloaded) }
    }

    override fun onAppPause() { cancelDownload() }

    override fun onCleared() {
        repository.close()
        super.onCleared()
    }

    private companion object {
        val TRANSLATION = stringPreferencesKey("translation")
        val BOOK = stringPreferencesKey("book")
        val CHAPTER = intPreferencesKey("chapter")
        val FONT_SIZE = intPreferencesKey("font-size")
        val LIGHT_BACKGROUND = booleanPreferencesKey("light-background")
        val ESV_KEY = stringPreferencesKey("esv-api-key")
    }
}
