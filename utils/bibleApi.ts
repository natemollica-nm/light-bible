import type {
	TranslationsResponse,
	BooksResponse,
	ChapterResponse,
} from "@/types/bible";

const API_BASE = "https://bible.helloao.org/api";

export async function fetchTranslations(): Promise<TranslationsResponse> {
	const res = await fetch(`${API_BASE}/available_translations.json`);
	if (!res.ok) throw new Error(`Failed to fetch translations: ${res.status}`);
	return res.json();
}

export async function fetchBooks(translationId: string): Promise<BooksResponse> {
	const res = await fetch(`${API_BASE}/${translationId}/books.json`);
	if (!res.ok) throw new Error(`Failed to fetch books: ${res.status}`);
	return res.json();
}

export async function fetchChapter(
	translationId: string,
	bookId: string,
	chapter: number
): Promise<ChapterResponse> {
	const res = await fetch(`${API_BASE}/${translationId}/${bookId}/${chapter}.json`);
	if (!res.ok) throw new Error(`Failed to fetch chapter: ${res.status}`);
	return res.json();
}
