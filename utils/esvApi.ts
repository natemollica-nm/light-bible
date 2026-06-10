import type { ChapterResponse, ChapterContentItem } from "@/types/bible";

/**
 * ESV API v3 Integration
 *
 * Guidelines enforced:
 * - Max 500 verses per query (chapters are well under this)
 * - No local storage of >500 consecutive verses or >50% of a book
 * - Copyright citation included in every response
 * - Noncommercial use only
 * - Rate limits: 60/min, 1000/hr, 5000/day (handled by single-user app usage)
 */

const ESV_API_BASE = "https://api.esv.org/v3/passage";

// API key must be set by the user in settings (not bundled)
let apiKey: string | null = null;

export function setEsvApiKey(key: string) {
	apiKey = key;
}

export function getEsvApiKey(): string | null {
	return apiKey;
}

export function isEsvConfigured(): boolean {
	return apiKey !== null && apiKey.length > 0;
}

const ESV_COPYRIGHT =
	'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), ' +
	"© 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.";

interface EsvPassageResponse {
	query: string;
	canonical: string;
	passages: string[];
	passage_meta: Array<{
		canonical: string;
		chapter_start: [number, number];
		chapter_end: [number, number];
		prev_verse: number;
		next_verse: number;
		prev_chapter: [number, number] | null;
		next_chapter: [number, number] | null;
	}>;
}

const ESV_BOOK_IDS: Record<string, string> = {
	GEN: "Genesis", EXO: "Exodus", LEV: "Leviticus", NUM: "Numbers", DEU: "Deuteronomy",
	JOS: "Joshua", JDG: "Judges", RUT: "Ruth", "1SA": "1 Samuel", "2SA": "2 Samuel",
	"1KI": "1 Kings", "2KI": "2 Kings", "1CH": "1 Chronicles", "2CH": "2 Chronicles",
	EZR: "Ezra", NEH: "Nehemiah", EST: "Esther", JOB: "Job", PSA: "Psalms",
	PRO: "Proverbs", ECC: "Ecclesiastes", SNG: "Song of Solomon", ISA: "Isaiah",
	JER: "Jeremiah", LAM: "Lamentations", EZK: "Ezekiel", DAN: "Daniel",
	HOS: "Hosea", JOL: "Joel", AMO: "Amos", OBA: "Obadiah", JON: "Jonah",
	MIC: "Micah", NAM: "Nahum", HAB: "Habakkuk", ZEP: "Zephaniah", HAG: "Haggai",
	ZEC: "Zechariah", MAL: "Malachi",
	MAT: "Matthew", MRK: "Mark", LUK: "Luke", JHN: "John", ACT: "Acts",
	ROM: "Romans", "1CO": "1 Corinthians", "2CO": "2 Corinthians", GAL: "Galatians",
	EPH: "Ephesians", PHP: "Philippians", COL: "Colossians", "1TH": "1 Thessalonians",
	"2TH": "2 Thessalonians", "1TI": "1 Timothy", "2TI": "2 Timothy", TIT: "Titus",
	PHM: "Philemon", HEB: "Hebrews", JAS: "James", "1PE": "1 Peter", "2PE": "2 Peter",
	"1JN": "1 John", "2JN": "2 John", "3JN": "3 John", JUD: "Jude", REV: "Revelation",
};

export function getEsvBookName(bookId: string): string | null {
	return ESV_BOOK_IDS[bookId] ?? null;
}

export async function fetchEsvChapter(
	bookId: string,
	chapter: number
): Promise<ChapterResponse> {
	if (!apiKey) throw new Error("ESV API key not configured");

	const bookName = getEsvBookName(bookId);
	if (!bookName) throw new Error(`Unknown book: ${bookId}`);

	const query = `${bookName} ${chapter}`;
	const params = new URLSearchParams({
		q: query,
		"include-headings": "true",
		"include-footnotes": "false",
		"include-verse-numbers": "true",
		"include-short-copyright": "false",
		"include-passage-references": "false",
		"indent-paragraphs": "0",
		"indent-poetry": "false",
		"indent-declares": "0",
		"indent-psalm-doxology": "0",
	});

	const res = await fetch(`${ESV_API_BASE}/text/?${params}`, {
		headers: { Authorization: `Token ${apiKey}` },
	});

	if (res.status === 429) throw new Error("ESV rate limit exceeded. Try again later.");
	if (!res.ok) throw new Error(`ESV API error: ${res.status}`);

	const data: EsvPassageResponse = await res.json();
	const passage = data.passages[0] ?? "";

	// Parse passage text into verse content items
	const content = parseEsvPassage(passage);

	return {
		translation: {
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
		},
		book: {
			id: bookId,
			translationId: "ESV",
			name: bookName,
			commonName: bookName,
			order: Object.keys(ESV_BOOK_IDS).indexOf(bookId) + 1,
			numberOfChapters: 0, // not used in reading view
			firstChapterNumber: 1,
			lastChapterNumber: 0,
		},
		chapter: {
			number: chapter,
			content,
		},
		_copyright: ESV_COPYRIGHT,
	} as ChapterResponse & { _copyright: string };
}

/**
 * Parse ESV plain text (with [verse numbers]) into ChapterContentItem[]
 * ESV API returns text like: "[1] In the beginning... [2] The earth was..."
 */
function parseEsvPassage(text: string): ChapterContentItem[] {
	const items: ChapterContentItem[] = [];
	// Split on verse markers like [1], [2], etc.
	const parts = text.split(/\[(\d+)\]\s*/);

	// parts[0] is any text before first verse (headings/whitespace)
	// then alternating: verseNumber, verseText, verseNumber, verseText...
	for (let i = 1; i < parts.length; i += 2) {
		const verseNum = parseInt(parts[i], 10);
		const verseText = (parts[i + 1] ?? "").trim();
		if (verseText) {
			items.push({
				type: "verse",
				number: verseNum,
				content: [verseText],
			});
		}
	}

	// Add copyright as final heading
	items.push({
		type: "heading",
		content: [ESV_COPYRIGHT],
	});

	return items;
}
