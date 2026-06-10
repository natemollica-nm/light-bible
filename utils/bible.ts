import type {
	TranslationsResponse,
	BooksResponse,
	ChapterResponse,
	Translation,
} from "@/types/bible";
import { fetchTranslations, fetchBooks, fetchChapter } from "./bibleApi";
import {
	getCachedTranslations,
	cacheTranslations,
	getCachedBooks,
	cacheBooks,
	getCachedChapter,
	cacheChapter,
} from "./bibleCache";
import { fetchEsvChapter, isEsvConfigured } from "./esvApi";
import { ESV_BOOKS } from "./esvBooks";

const ESV_TRANSLATION: Translation = {
	id: "ESV",
	name: "English Standard Version",
	shortName: "ESV",
	englishName: "English Standard Version",
	language: "eng",
	textDirection: "ltr",
	numberOfBooks: 66,
	totalNumberOfChapters: 1189,
	languageName: "English",
	languageEnglishName: "English",
};

export async function getTranslations(): Promise<TranslationsResponse> {
	const cached = await getCachedTranslations();
	let data = cached;
	if (!data) {
		data = await fetchTranslations();
		await cacheTranslations(data);
	}
	// Inject ESV if configured and not already present
	if (isEsvConfigured() && !data.translations.some((t) => t.id === "ESV")) {
		data = { translations: [ESV_TRANSLATION, ...data.translations] };
	}
	return data;
}

export async function getBooks(translationId: string): Promise<BooksResponse> {
	if (translationId === "ESV") {
		return { translation: ESV_TRANSLATION, books: ESV_BOOKS };
	}
	const cached = await getCachedBooks(translationId);
	if (cached) return cached;
	const data = await fetchBooks(translationId);
	await cacheBooks(translationId, data);
	return data;
}

export async function getChapter(
	translationId: string,
	bookId: string,
	chapter: number
): Promise<ChapterResponse> {
	const cached = await getCachedChapter(translationId, bookId, chapter);
	if (cached) return cached;

	if (translationId === "ESV") {
		const data = await fetchEsvChapter(bookId, chapter);
		// Cache per ESV guidelines: only cache individual chapters (never >500 consecutive verses)
		await cacheChapter(translationId, bookId, chapter, data);
		return data;
	}

	const data = await fetchChapter(translationId, bookId, chapter);
	await cacheChapter(translationId, bookId, chapter, data);
	return data;
}
