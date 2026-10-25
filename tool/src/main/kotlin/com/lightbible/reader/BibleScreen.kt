package com.lightbible.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.input.rememberTextFieldState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.lightbible.reader.data.BibleRepository
import com.lightbible.reader.data.Book
import com.lightbible.reader.data.ReadingLocation
import com.lightbible.reader.data.Translation
import com.thelightphone.sdk.InitialScreen
import com.thelightphone.sdk.LightScreen
import com.thelightphone.sdk.SealedLightActivity
import com.thelightphone.sdk.SimpleLightScreen
import com.thelightphone.sdk.rememberKeyboardOptions
import com.thelightphone.sdk.ui.LightBarButton
import com.thelightphone.sdk.ui.LightIcons
import com.thelightphone.sdk.ui.LightScrollView
import com.thelightphone.sdk.ui.LightText
import com.thelightphone.sdk.ui.LightTextField
import com.thelightphone.sdk.ui.LightTextInputEditor
import com.thelightphone.sdk.ui.LightTextVariant
import com.thelightphone.sdk.ui.LightTheme
import com.thelightphone.sdk.ui.LightThemeController
import com.thelightphone.sdk.ui.LightThemeTokens
import com.thelightphone.sdk.ui.LightTopBar
import com.thelightphone.sdk.ui.LightTopBarCenter
import com.thelightphone.sdk.ui.lightClickable

@InitialScreen
class BibleScreen(activity: SealedLightActivity) : LightScreen<Unit, BibleViewModel>(activity) {
    override val viewModelClass = BibleViewModel::class.java
    override fun createViewModel() = BibleViewModel(BibleRepository(lightContext.filesDir), lightContext.dataStore)

    @Composable
    override fun Content() {
        val state by viewModel.state.collectAsState()
        BibleTheme {
            Column(Modifier.fillMaxSize().background(LightThemeTokens.colors.background)) {
                LightTopBar(
                    center = LightTopBarCenter.Text("BIBLE · ${state.location.translationId}"),
                    rightButton = LightBarButton.LightIcon(LightIcons.SETTINGS, contentDescription = "Settings", onClick = {
                        if (state.ready) navigateTo({ SettingsScreen(it, viewModel) })
                    }),
                )
                Action(
                    state.passage?.let { "${it.book.name} ${it.number} ▾" } ?: "Choose book and chapter",
                    enabled = state.books.isNotEmpty() && !state.loading,
                ) {
                    navigateTo({ BooksScreen(it, viewModel, state.books, state.location.translationId) }) { viewModel.open(it) }
                }
                val swipeThreshold = with(LocalDensity.current) { 56.dp.toPx() }
                Column(Modifier.weight(1f).pointerInput(state.location, state.loading) {
                    var distance = 0f
                    detectHorizontalDragGestures(
                        onDragStart = { distance = 0f },
                        onDragCancel = { distance = 0f },
                        onDragEnd = {
                            if (!state.loading && kotlin.math.abs(distance) > swipeThreshold) {
                                viewModel.adjacentChapter(if (distance < 0) 1 else -1)?.let(viewModel::open)
                            }
                        },
                        onHorizontalDrag = { change, amount -> change.consume(); distance += amount },
                    )
                }) {
                    when {
                        state.loading -> Message("Loading chapter…")
                        state.error != null -> LightScrollView(Modifier.fillMaxSize()) {
                            Message(state.error!!)
                            Action("Retry", enabled = state.ready) { viewModel.open(state.location) }
                            Action("Choose translation", enabled = state.ready) {
                                navigateTo({ TranslationsScreen(it, viewModel) })
                            }
                        }
                        else -> state.passage?.let { passage ->
                            key(state.location) {
                                val density = LocalDensity.current
                                val scale = listOf(0.85f, 1f, 1.25f)[state.fontSize]
                                CompositionLocalProvider(
                                    LocalDensity provides Density(density.density, density.fontScale * scale),
                                    LocalLayoutDirection provides if (passage.translation.textDirection == "rtl") LayoutDirection.Rtl else LayoutDirection.Ltr,
                                ) {
                                    LightScrollView(Modifier.fillMaxSize(), scrollState = rememberScrollState()) {
                                        passage.verses.forEach { verse ->
                                            LightText(
                                                text = if (verse.number == null) verse.text else "${verse.number}  ${verse.text}",
                                                variant = if (verse.number == null) LightTextVariant.Heading else LightTextVariant.Copy,
                                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                                            )
                                        }
                                        passage.copyright?.let { Message(it) }
                                    }
                                }
                            }
                        }
                    }
                }
                Row(Modifier.fillMaxWidth()) {
                    Action("Previous", Modifier.weight(1f), enabled = !state.loading && viewModel.adjacentChapter(-1) != null) {
                        viewModel.adjacentChapter(-1)?.let(viewModel::open)
                    }
                    Action("Next", Modifier.weight(1f), enabled = !state.loading && viewModel.adjacentChapter(1) != null) {
                        viewModel.adjacentChapter(1)?.let(viewModel::open)
                    }
                }
            }
        }
    }
}

// Child screens borrow the root reader's model; only the root owns its lifetime.
private abstract class BibleChild<R>(activity: SealedLightActivity, protected val model: BibleViewModel) : SimpleLightScreen<R>(activity) {
    override fun onAppPause() { model.onAppPause() }
}

private class BooksScreen(activity: SealedLightActivity, model: BibleViewModel, private val books: List<Book>, private val translation: String) : BibleChild<ReadingLocation>(activity, model) {
    @Composable
    override fun Content() = Page("Books") {
        LazyColumn(Modifier.weight(1f)) {
            items(books, key = { it.id }) { book ->
                Action(book.name) {
                    navigateTo({ ChaptersScreen(it, model, book) }) { chapter -> goBack(ReadingLocation(translation, book.id, chapter)) }
                }
            }
        }
    }
}

private class ChaptersScreen(activity: SealedLightActivity, model: BibleViewModel, private val book: Book) : BibleChild<Int>(activity, model) {
    @Composable
    override fun Content() = Page(book.name) {
        LazyColumn(Modifier.weight(1f)) {
            items((book.firstChapterNumber..book.lastChapterNumber).toList()) { chapter ->
                Action("Chapter $chapter") { goBack(chapter) }
            }
        }
    }
}

private class TranslationsScreen(activity: SealedLightActivity, model: BibleViewModel) : BibleChild<Unit>(activity, model) {
    private var query by mutableStateOf("")

    override fun willShow() { if (model.state.value.translations.isEmpty()) model.loadTranslations() }

    @Composable
    override fun Content() {
        val state by model.state.collectAsState()
        Page("Translation") {
            LightTextField("Filter", query, "Name or language", onClick = {
                navigateTo({ TextScreen(it, model, "Find translation", query) }) { query = it }
            }, modifier = Modifier.padding(horizontal = 16.dp))
            if (state.loadingTranslations) Message("Loading translations…")
            state.catalogError?.let {
                Message(it)
                Action("Retry") { model.loadTranslations() }
            }
            val available = (state.translations + state.downloaded.map { Translation(id = it, name = it) } +
                Translation(id = "ESV", name = "English Standard Version (API key required)")).distinctBy { it.id }
            val filtered = available.filter { "${it.id} ${it.name} ${it.englishName} ${it.languageName}".contains(query, ignoreCase = true) }
            LazyColumn(Modifier.weight(1f)) {
                if (filtered.isEmpty() && !state.loadingTranslations) item { Message("No matching translations.") }
                items(filtered, key = { it.id }) { translation ->
                    Action("${translation.name} (${translation.id})${if (translation.id in state.downloaded) " · offline" else ""}") {
                        model.open(state.location.copy(translationId = translation.id))
                        goBack()
                    }
                }
            }
        }
    }
}

private class SettingsScreen(activity: SealedLightActivity, model: BibleViewModel) : BibleChild<Unit>(activity, model) {
    @Composable
    override fun Content() {
        val state by model.state.collectAsState()
        Page("Settings") {
            LightScrollView(Modifier.weight(1f)) {
                Action("Translation: ${state.location.translationId}") { navigateTo({ TranslationsScreen(it, model) }) }
                Message("Reading text size")
                Row {
                    listOf("Small", "Medium", "Large").forEachIndexed { index, label ->
                        Action(if (index == state.fontSize) "$label ✓" else label, modifier = Modifier.weight(1f)) { model.setFontSize(index) }
                    }
                }
                Action(if (state.lightBackground) "Background: white" else "Background: black") { model.toggleBackground() }
                Action("Offline downloads") { navigateTo({ DownloadsScreen(it, model) }) }
                Action(if (state.esvConfigured) "Replace ESV API key" else "Set ESV API key") {
                    navigateTo({ TextScreen(it, model, "ESV API key", "") }) { model.setEsvKey(it) }
                }
                if (state.esvConfigured) Action("Forget ESV API key") { model.setEsvKey("") }
                Message("ESV requires your own Crossway API key and an internet connection. ESV passages are never downloaded or cached.")
                Action("Privacy and about") { navigateTo({ AboutScreen(it, model) }) }
                state.downloadMessage?.let { Message(it) }
            }
        }
    }
}

private class DownloadsScreen(activity: SealedLightActivity, model: BibleViewModel) : BibleChild<Unit>(activity, model) {
    @Composable
    override fun Content() {
        val state by model.state.collectAsState()
        var removing by remember { mutableStateOf<String?>(null) }
        Page("Offline reading") {
            LightScrollView(Modifier.weight(1f)) {
                Message("Download the selected translation over Wi-Fi. Leaving the app, loading the translation list, or opening another chapter pauses the download. Retry resumes saved chapters.")
                if (state.downloading != null) {
                    Message("${state.downloading}: ${state.progress.first} / ${state.progress.second} chapters")
                    Action("Pause download") { model.cancelDownload() }
                } else if (state.location.translationId == "ESV") {
                    Message("ESV is online-only. Select another translation to download.")
                } else {
                    Action("Download ${state.location.translationId}") { model.download() }
                }
                state.downloadMessage?.let { Message(it) }
                Message("Downloaded translations")
                if (state.downloaded.isEmpty()) Message("No complete downloads yet. Chapters you have read are also cached automatically, except ESV.")
                state.downloaded.forEach { id ->
                    Action("Read $id") { model.open(state.location.copy(translationId = id)); goBack() }
                    if (removing == id) {
                        Message("Remove all cached $id chapters from this device?")
                        Action("Confirm removal", enabled = state.downloading == null) { model.removeDownload(id); removing = null }
                        Action("Keep download") { removing = null }
                    } else {
                        Action("Remove $id", enabled = state.downloading == null) { removing = id }
                    }
                }
            }
        }
    }
}

private class TextScreen(activity: SealedLightActivity, model: BibleViewModel, private val title: String, private val initialValue: String) : BibleChild<String>(activity, model) {
    @Composable
    override fun Content() = BibleTheme {
        LightTextInputEditor(
            title = title,
            state = rememberTextFieldState(initialValue),
            onSubmit = { goBack(it.toString()) },
            onBack = { goBack() },
            keyboardOptionsFlow = rememberKeyboardOptions(),
            singleLine = true,
            initialCaps = false,
            submitLabel = "SAVE",
        )
    }
}

private class AboutScreen(activity: SealedLightActivity, model: BibleViewModel) : BibleChild<Unit>(activity, model) {
    @Composable
    override fun Content() = Page("About Bible") {
        LightScrollView(Modifier.weight(1f)) {
            Message("Bible 2.0.0 · Open source · No ads or analytics")
            Message("Translations, book lists, and uncached chapters are requested over HTTPS from bible.helloao.org. The provider receives your IP address and requested translation and chapter. Downloaded chapters are read locally.")
            Message("If you enable ESV, your API key and passage requests go only to api.esv.org over HTTPS. The key is saved in this app's private settings until you forget it. ESV passages remain in memory only.")
            Message("Reading position, text size, and downloads stay in app-private storage. Device backup behavior is controlled by Android and the Light SDK. Haptics follow your LightOS preference.")
            Message("Bible texts retain their respective copyright and license terms. ESV use is subject to Crossway's API terms. This tool is not affiliated with Crossway or HelloAO.")
            Message("Built with the Light SDK. SDK compatibility is not Light approval; only Light can approve and sign a Tool Library release.")
        }
    }
}

@Composable
private fun BibleTheme(content: @Composable () -> Unit) {
    val colors by LightThemeController.colors.collectAsState()
    LightTheme(colors = colors, content = content)
}

@Composable
private fun Page(title: String, content: @Composable ColumnScope.() -> Unit) = BibleTheme {
    Column(Modifier.fillMaxSize().background(LightThemeTokens.colors.background)) {
        LightTopBar(center = LightTopBarCenter.Text(title))
        content()
    }
}

@Composable
private fun Message(text: String) = LightText(text, LightTextVariant.Detail, Modifier.padding(16.dp))

@Composable
private fun Action(text: String, modifier: Modifier = Modifier, enabled: Boolean = true, onClick: () -> Unit) {
    LightText(
        text = text, variant = LightTextVariant.Copy, lighten = !enabled,
        modifier = modifier.fillMaxWidth().heightIn(min = 48.dp)
            .lightClickable(enabled = enabled, role = Role.Button, onClick = onClick).padding(horizontal = 16.dp, vertical = 12.dp),
    )
}
