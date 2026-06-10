import { getTranslations, getBooks, getChapter } from "../bible";
import * as api from "../bibleApi";
import * as cache from "../bibleCache";

jest.mock("../bibleApi");
jest.mock("../bibleCache");

const mockApi = api as jest.Mocked<typeof api>;
const mockCache = cache as jest.Mocked<typeof cache>;

describe("bible", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("getTranslations", () => {
		it("returns cached data when available", async () => {
			const data = { translations: [{ id: "BSB" }] } as any;
			mockCache.getCachedTranslations.mockResolvedValue(data);

			const result = await getTranslations();
			expect(result).toEqual(data);
			expect(mockApi.fetchTranslations).not.toHaveBeenCalled();
		});

		it("fetches from API and caches on miss", async () => {
			const data = { translations: [{ id: "BSB" }] } as any;
			mockCache.getCachedTranslations.mockResolvedValue(null);
			mockApi.fetchTranslations.mockResolvedValue(data);
			mockCache.cacheTranslations.mockResolvedValue(undefined);

			const result = await getTranslations();
			expect(result).toEqual(data);
			expect(mockApi.fetchTranslations).toHaveBeenCalled();
			expect(mockCache.cacheTranslations).toHaveBeenCalledWith(data);
		});
	});

	describe("getBooks", () => {
		it("returns cached data when available", async () => {
			const data = { books: [{ id: "GEN" }] } as any;
			mockCache.getCachedBooks.mockResolvedValue(data);

			const result = await getBooks("BSB");
			expect(result).toEqual(data);
			expect(mockApi.fetchBooks).not.toHaveBeenCalled();
		});

		it("fetches from API and caches on miss", async () => {
			const data = { books: [{ id: "GEN" }] } as any;
			mockCache.getCachedBooks.mockResolvedValue(null);
			mockApi.fetchBooks.mockResolvedValue(data);
			mockCache.cacheBooks.mockResolvedValue(undefined);

			const result = await getBooks("BSB");
			expect(mockApi.fetchBooks).toHaveBeenCalledWith("BSB");
			expect(mockCache.cacheBooks).toHaveBeenCalledWith("BSB", data);
			expect(result).toEqual(data);
		});
	});

	describe("getChapter", () => {
		it("returns cached data when available", async () => {
			const data = { chapter: { number: 1, content: [] } } as any;
			mockCache.getCachedChapter.mockResolvedValue(data);

			const result = await getChapter("BSB", "GEN", 1);
			expect(result).toEqual(data);
			expect(mockApi.fetchChapter).not.toHaveBeenCalled();
		});

		it("fetches from API and caches on miss", async () => {
			const data = { chapter: { number: 1, content: [] } } as any;
			mockCache.getCachedChapter.mockResolvedValue(null);
			mockApi.fetchChapter.mockResolvedValue(data);
			mockCache.cacheChapter.mockResolvedValue(undefined);

			const result = await getChapter("BSB", "GEN", 1);
			expect(mockApi.fetchChapter).toHaveBeenCalledWith("BSB", "GEN", 1);
			expect(mockCache.cacheChapter).toHaveBeenCalledWith("BSB", "GEN", 1, data);
			expect(result).toEqual(data);
		});
	});
});
