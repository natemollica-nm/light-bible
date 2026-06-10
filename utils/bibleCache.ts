import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
	TranslationsResponse,
	BooksResponse,
	ChapterResponse,
} from "@/types/bible";
import { fetchBooks, fetchChapter } from "./bibleApi";

const PREFIX = "@bible-cache";

function key(...parts: string[]): string {
	return `${PREFIX}/${parts.join("/")}`;
}

export async function getCachedTranslations(): Promise<TranslationsResponse | null> {
	const data = await AsyncStorage.getItem(key("translations"));
	return data ? JSON.parse(data) : null;
}

export async function cacheTranslations(data: TranslationsResponse): Promise<void> {
	await AsyncStorage.setItem(key("translations"), JSON.stringify(data));
}

export async function getCachedBooks(translationId: string): Promise<BooksResponse | null> {
	const data = await AsyncStorage.getItem(key(translationId, "books"));
	return data ? JSON.parse(data) : null;
}

export async function cacheBooks(translationId: string, data: BooksResponse): Promise<void> {
	await AsyncStorage.setItem(key(translationId, "books"), JSON.stringify(data));
}

export async function getCachedChapter(
	translationId: string,
	bookId: string,
	chapter: number
): Promise<ChapterResponse | null> {
	const data = await AsyncStorage.getItem(key(translationId, bookId, String(chapter)));
	return data ? JSON.parse(data) : null;
}

export async function cacheChapter(
	translationId: string,
	bookId: string,
	chapter: number,
	data: ChapterResponse
): Promise<void> {
	await AsyncStorage.setItem(key(translationId, bookId, String(chapter)), JSON.stringify(data));
}

/** Remove all cached chapters for a translation */
export async function clearTranslationCache(translationId: string): Promise<void> {
	const allKeys = await AsyncStorage.getAllKeys();
	const prefix = key(translationId);
	const toRemove = allKeys.filter((k) => k.startsWith(prefix));
	if (toRemove.length > 0) {
		await AsyncStorage.multiRemove(toRemove);
	}
}

/** Check if a full translation has been downloaded */
export async function isTranslationDownloaded(translationId: string): Promise<boolean> {
	const val = await AsyncStorage.getItem(key(translationId, "@downloaded"));
	return val === "true";
}

/** Download all chapters for a translation with progress callback */
export async function downloadFullTranslation(
	translationId: string,
	onProgress: (current: number, total: number) => void,
	signal?: { cancelled: boolean }
): Promise<void> {
	const booksRes = await fetchBooks(translationId);
	const total = booksRes.books.reduce((sum, b) => sum + b.numberOfChapters, 0);
	let completed = 0;

	for (const book of booksRes.books) {
		for (let ch = book.firstChapterNumber; ch <= book.lastChapterNumber; ch++) {
			if (signal?.cancelled) return;
			const data = await fetchChapter(translationId, book.id, ch);
			await cacheChapter(translationId, book.id, ch, data);
			completed++;
			onProgress(completed, total);
		}
	}

	await cacheBooks(translationId, booksRes);
	await AsyncStorage.setItem(key(translationId, "@downloaded"), "true");
}

/** Get list of downloaded translation IDs */
export async function getDownloadedTranslations(): Promise<string[]> {
	const allKeys = await AsyncStorage.getAllKeys();
	const suffix = "/@downloaded";
	return allKeys
		.filter((k) => k.startsWith(PREFIX) && k.endsWith(suffix))
		.map((k) => k.slice(PREFIX.length + 1, k.length - suffix.length));
}
