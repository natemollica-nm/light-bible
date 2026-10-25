package com.lightbible.reader.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

internal val bibleJson = Json { ignoreUnknownKeys = true }

@Serializable
internal data class TranslationManifest(val translations: List<Translation>)

@Serializable
internal data class BookManifest(val translation: Translation, val books: List<Book>)

/** Keep textual fragments and poetry, but never render footnote/reference objects. */
private fun contentText(content: JsonElement?): String = buildString {
    fun appendContent(element: JsonElement) {
        when (element) {
            is JsonPrimitive -> if (element.isString) append(element.content)
            is JsonArray -> element.forEach { appendContent(it) }
            is JsonObject -> when {
                "noteId" in element -> Unit
                element["lineBreak"]?.jsonPrimitive?.booleanOrNull == true -> append('\n')
                element["text"] is JsonPrimitive -> {
                    val poetry = "poem" in element
                    if (poetry && isNotEmpty() && last() != '\n') append('\n')
                    append(element.getValue("text").jsonPrimitive.content)
                    if (poetry) append('\n')
                }
            }
        }
    }
    if (content != null) appendContent(content)
}.trim()

internal fun parseHelloChapter(raw: String): Passage {
    val root = bibleJson.parseToJsonElement(raw).jsonObject
    val chapter = root.getValue("chapter").jsonObject
    val verses = mutableListOf<Verse>()
    val copyright = mutableListOf<String>()
    for (element in chapter.getValue("content").jsonArray) {
        val item = element.jsonObject
        val text = contentText(item["content"])
        when (item["type"]?.jsonPrimitive?.content) {
            "verse" -> verses += Verse(item.getValue("number").jsonPrimitive.int, text)
            "heading" -> if (text.isNotEmpty()) verses += Verse(null, text)
            "line_break" -> verses += Verse(null, "\n")
            "copyright" -> if (text.isNotEmpty()) copyright += text
        }
    }
    (root["_copyright"] ?: root["copyright"])?.let {
        val text = contentText(it)
        if (text.isNotEmpty()) copyright += text
    }
    return Passage(
        translation = bibleJson.decodeFromJsonElement(root.getValue("translation")),
        book = bibleJson.decodeFromJsonElement(root.getValue("book")),
        number = chapter.getValue("number").jsonPrimitive.int,
        verses = verses,
        copyright = copyright.distinct().joinToString("\n").ifEmpty { null },
    )
}

internal fun parseEsvChapter(raw: String, book: Book, chapter: Int): Passage {
    val passages = bibleJson.parseToJsonElement(raw).jsonObject.getValue("passages").jsonArray
    require(passages.isNotEmpty()) { "ESV returned no passage" }
    val text = passages.joinToString("\n\n") { it.jsonPrimitive.content }.trim()
    val markers = Regex("\\[(\\d+)]\\s*").findAll(text).toList()
    val verses = mutableListOf<Verse>()
    val heading = text.substring(0, markers.firstOrNull()?.range?.first ?: text.length).trim()
    if (heading.isNotEmpty()) verses += Verse(null, heading)
    markers.forEachIndexed { index, marker ->
        val end = markers.getOrNull(index + 1)?.range?.first ?: text.length
        val verseText = text.substring(marker.range.last + 1, end).trim()
        if (verseText.isNotEmpty()) verses += Verse(marker.groupValues[1].toInt(), verseText)
    }
    require(verses.isNotEmpty()) { "ESV returned an empty passage" }
    return Passage(ESV_TRANSLATION, book, chapter, verses, ESV_COPYRIGHT)
}
