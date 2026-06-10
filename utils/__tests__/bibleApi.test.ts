import { fetchTranslations, fetchBooks, fetchChapter } from "../bibleApi";

global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("bibleApi", () => {
	beforeEach(() => {
		mockFetch.mockClear();
	});

	it("fetchTranslations calls correct URL and returns data", async () => {
		const mockData = { translations: [{ id: "BSB", name: "Berean" }] };
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockData,
		} as Response);

		const result = await fetchTranslations();
		expect(mockFetch).toHaveBeenCalledWith(
			"https://bible.helloao.org/api/available_translations.json"
		);
		expect(result).toEqual(mockData);
	});

	it("fetchBooks calls correct URL", async () => {
		const mockData = { translation: {}, books: [] };
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockData,
		} as Response);

		await fetchBooks("BSB");
		expect(mockFetch).toHaveBeenCalledWith(
			"https://bible.helloao.org/api/BSB/books.json"
		);
	});

	it("fetchChapter calls correct URL", async () => {
		const mockData = { translation: {}, book: {}, chapter: { number: 1, content: [] } };
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockData,
		} as Response);

		await fetchChapter("BSB", "GEN", 1);
		expect(mockFetch).toHaveBeenCalledWith(
			"https://bible.helloao.org/api/BSB/GEN/1.json"
		);
	});

	it("throws on non-ok response", async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 404 } as Response);
		await expect(fetchTranslations()).rejects.toThrow("Failed to fetch translations: 404");
	});
});
