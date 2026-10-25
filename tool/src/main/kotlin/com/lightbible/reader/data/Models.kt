package com.lightbible.reader.data

import kotlinx.serialization.Serializable

@Serializable
data class Translation(
    val id: String = "",
    val name: String = id,
    val englishName: String = name,
    val languageName: String = "",
    val textDirection: String = "ltr",
)

@Serializable
data class Book(
    val id: String,
    val name: String,
    val firstChapterNumber: Int = 1,
    val lastChapterNumber: Int = 1,
)

data class Passage(
    val translation: Translation,
    val book: Book,
    val number: Int,
    val verses: List<Verse>,
    val copyright: String? = null,
)

/** A null number denotes a heading or a standalone line break. */
data class Verse(val number: Int?, val text: String)

@Serializable
data class ReadingLocation(val translationId: String, val bookId: String, val chapter: Int)
