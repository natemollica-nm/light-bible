import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
	TranslationsResponse,
	BooksResponse,
	ChapterResponse,
} from "@/types/bible";

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
