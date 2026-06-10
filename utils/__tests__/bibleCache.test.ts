import {
	getCachedChapter,
	cacheChapter,
	getCachedTranslations,
	cacheTranslations,
	getCachedBooks,
	cacheBooks,
	clearTranslationCache,
	isTranslationDownloaded,
	downloadFullTranslation,
	getDownloadedTranslations,
} from "../bibleCache";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("../bibleApi", () => ({
	fetchBooks: jest.fn().mockResolvedValue({
		books: [
			{ id: "GEN", firstChapterNumber: 1, lastChapterNumber: 2, numberOfChapters: 2 },
		],
	}),
	fetchChapter: jest.fn().mockResolvedValue({
		chapter: { number: 1, content: [] },
	}),
}));

describe("bibleCache", () => {
	beforeEach(async () => {
		await AsyncStorage.clear();
	});

	it("returns null on cache miss for translations", async () => {
		const result = await getCachedTranslations();
		expect(result).toBeNull();
	});

	it("caches and retrieves translations", async () => {
		const data = { translations: [{ id: "BSB" }] } as any;
		await cacheTranslations(data);
		const result = await getCachedTranslations();
		expect(result).toEqual(data);
	});

	it("returns null on cache miss for books", async () => {
		const result = await getCachedBooks("BSB");
		expect(result).toBeNull();
	});

	it("caches and retrieves books", async () => {
		const data = { translation: {}, books: [{ id: "GEN" }] } as any;
		await cacheBooks("BSB", data);
		const result = await getCachedBooks("BSB");
		expect(result).toEqual(data);
	});

	it("returns null on cache miss for chapter", async () => {
		const result = await getCachedChapter("BSB", "GEN", 1);
		expect(result).toBeNull();
	});

	it("caches and retrieves chapter", async () => {
		const data = { chapter: { number: 1, content: [] } } as any;
		await cacheChapter("BSB", "GEN", 1, data);
		const result = await getCachedChapter("BSB", "GEN", 1);
		expect(result).toEqual(data);
	});

	it("clearTranslationCache removes all keys for a translation", async () => {
		await cacheChapter("BSB", "GEN", 1, {} as any);
		await cacheChapter("BSB", "GEN", 2, {} as any);
		await cacheChapter("KJV", "GEN", 1, {} as any);

		await clearTranslationCache("BSB");

		expect(await getCachedChapter("BSB", "GEN", 1)).toBeNull();
		expect(await getCachedChapter("BSB", "GEN", 2)).toBeNull();
		// KJV unaffected
		expect(await getCachedChapter("KJV", "GEN", 1)).not.toBeNull();
	});

	it("isTranslationDownloaded returns false by default", async () => {
		expect(await isTranslationDownloaded("BSB")).toBe(false);
	});

	it("downloadFullTranslation calls progress and marks as downloaded", async () => {
		const progress = jest.fn();
		await downloadFullTranslation("TEST", progress);

		// 2 chapters in mocked book
		expect(progress).toHaveBeenCalledWith(1, 2);
		expect(progress).toHaveBeenCalledWith(2, 2);
		expect(await isTranslationDownloaded("TEST")).toBe(true);
	});

	it("downloadFullTranslation respects cancel signal", async () => {
		const progress = jest.fn();
		const signal = { cancelled: true };
		await downloadFullTranslation("TEST", progress, signal);

		expect(progress).not.toHaveBeenCalled();
		expect(await isTranslationDownloaded("TEST")).toBe(false);
	});

	it("getDownloadedTranslations returns downloaded IDs", async () => {
		await downloadFullTranslation("BSB", jest.fn());
		const result = await getDownloadedTranslations();
		expect(result).toContain("BSB");
	});
});
