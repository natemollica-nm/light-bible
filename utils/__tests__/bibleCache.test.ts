import {
	getCachedChapter,
	cacheChapter,
	getCachedTranslations,
	cacheTranslations,
	getCachedBooks,
	cacheBooks,
} from "../bibleCache";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
});
