import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { BookPicker } from "../BookPicker";
import { InvertColorsProvider } from "@/contexts/InvertColorsContext";
import { HapticProvider } from "@/contexts/HapticContext";
import { TranslationProvider } from "@/contexts/TranslationContext";

jest.mock("@/utils/bible", () => ({
	getBooks: jest.fn().mockResolvedValue({
		books: [
			{ id: "GEN", commonName: "Genesis", order: 1, numberOfChapters: 50 },
			{ id: "EXO", commonName: "Exodus", order: 2, numberOfChapters: 40 },
			{ id: "MAT", commonName: "Matthew", order: 40, numberOfChapters: 28 },
		],
	}),
}));

// Mock AsyncStorage to return a translation
jest.mock("@react-native-async-storage/async-storage", () => {
	const mock = require("@react-native-async-storage/async-storage/jest/async-storage-mock");
	mock.getItem = jest.fn((key: string) => {
		if (key === "@selected-translation") return Promise.resolve("BSB");
		return Promise.resolve(null);
	});
	return mock;
});

function renderWithProviders(ui: React.ReactElement) {
	return render(
		<InvertColorsProvider>
			<TranslationProvider>
				<HapticProvider>{ui}</HapticProvider>
			</TranslationProvider>
		</InvertColorsProvider>
	);
}

describe("BookPicker", () => {
	it("renders Old and New Testament sections", async () => {
		const { getByText } = renderWithProviders(
			<BookPicker onSelect={jest.fn()} />
		);
		await waitFor(() => {
			expect(getByText("Old Testament")).toBeTruthy();
			expect(getByText("New Testament")).toBeTruthy();
		});
	});

	it("renders book names", async () => {
		const { getByText } = renderWithProviders(
			<BookPicker onSelect={jest.fn()} />
		);
		await waitFor(() => {
			expect(getByText("Genesis")).toBeTruthy();
			expect(getByText("Matthew")).toBeTruthy();
		});
	});
});
