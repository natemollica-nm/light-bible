import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { TranslationList } from "../TranslationList";
import { InvertColorsProvider } from "@/contexts/InvertColorsContext";
import { HapticProvider } from "@/contexts/HapticContext";
import type { Translation } from "@/types/bible";

const mockTranslations: Translation[] = [
	{
		id: "BSB",
		name: "Berean Standard Bible",
		shortName: "BSB",
		englishName: "Berean Standard Bible",
		language: "eng",
		textDirection: "ltr",
		numberOfBooks: 66,
		totalNumberOfChapters: 1189,
		languageName: "English",
		languageEnglishName: "English",
	},
	{
		id: "ARBNAV",
		name: "كتاب الحياة",
		shortName: "NAV",
		englishName: "New Arabic Version",
		language: "arb",
		textDirection: "rtl",
		numberOfBooks: 66,
		totalNumberOfChapters: 1189,
		languageName: "العربية",
		languageEnglishName: "Arabic",
	},
];

function renderWithProviders(ui: React.ReactElement) {
	return render(
		<InvertColorsProvider>
			<HapticProvider>{ui}</HapticProvider>
		</InvertColorsProvider>
	);
}

describe("TranslationList", () => {
	it("renders translations grouped by language with English first", () => {
		const { getByText } = renderWithProviders(
			<TranslationList
				translations={mockTranslations}
				selectedId="BSB"
				onSelect={jest.fn()}
			/>
		);
		expect(getByText("English")).toBeTruthy();
		expect(getByText("Arabic")).toBeTruthy();
		expect(getByText("BSB")).toBeTruthy();
		expect(getByText("NAV")).toBeTruthy();
	});

	it("shows filled dot for selected translation", () => {
		const { getAllByText } = renderWithProviders(
			<TranslationList
				translations={mockTranslations}
				selectedId="BSB"
				onSelect={jest.fn()}
			/>
		);
		expect(getAllByText("●").length).toBe(1);
		expect(getAllByText("○").length).toBe(1);
	});

	it("calls onSelect when a translation is tapped", () => {
		const onSelect = jest.fn();
		const { getByText } = renderWithProviders(
			<TranslationList
				translations={mockTranslations}
				selectedId="BSB"
				onSelect={onSelect}
			/>
		);
		fireEvent.press(getByText("NAV"));
		expect(onSelect).toHaveBeenCalledWith(mockTranslations[1]);
	});
});
