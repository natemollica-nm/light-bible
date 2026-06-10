import type {
	TranslationsResponse,
	BooksResponse,
	ChapterResponse,
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

export async function getTranslations(): Promise<TranslationsResponse> {
	const cached = await getCachedTranslations();
	if (cached) return cached;
	const data = await fetchTranslations();
	await cacheTranslations(data);
	return data;
}

export async function getBooks(translationId: string): Promise<BooksResponse> {
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
	const data = await fetchChapter(translationId, bookId, chapter);
	await cacheChapter(translationId, bookId, chapter, data);
	return data;
}
