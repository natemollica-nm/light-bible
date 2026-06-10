// HelloAO Bible API types

export interface Translation {
	id: string;
	name: string;
	shortName: string;
	englishName: string;
	language: string;
	textDirection: "ltr" | "rtl";
	numberOfBooks: number;
	totalNumberOfChapters: number;
	languageName: string;
	languageEnglishName: string;
}

export interface TranslationsResponse {
	translations: Translation[];
}

export interface Book {
	id: string;
	translationId: string;
	name: string;
	commonName: string;
	order: number;
	numberOfChapters: number;
	firstChapterNumber: number;
	lastChapterNumber: number;
}

export interface BooksResponse {
	translation: Translation;
	books: Book[];
}

export type ChapterContentItem =
	| { type: "verse"; number: number; content: VerseContent[] }
	| { type: "heading"; content: string[] }
	| { type: "line_break" };

export type VerseContent = string | { noteId: number } | { lineBreak: true };

export interface Chapter {
	number: number;
	content: ChapterContentItem[];
}

export interface ChapterResponse {
	translation: Translation;
	book: Book;
	chapter: Chapter;
}
