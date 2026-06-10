import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ChapterPicker } from "../ChapterPicker";
import { InvertColorsProvider } from "@/contexts/InvertColorsContext";
import { HapticProvider } from "@/contexts/HapticContext";

function renderWithProviders(ui: React.ReactElement) {
	return render(
		<InvertColorsProvider>
			<HapticProvider>{ui}</HapticProvider>
		</InvertColorsProvider>
	);
}

describe("ChapterPicker", () => {
	it("renders correct number of chapters", () => {
		const onSelect = jest.fn();
		const { getAllByText } = renderWithProviders(
			<ChapterPicker bookName="Genesis" numberOfChapters={50} onSelect={onSelect} />
		);
		// Should have numbers 1-50
		expect(getAllByText(/^\d+$/).length).toBe(50);
	});

	it("calls onSelect with chapter number when tapped", () => {
		const onSelect = jest.fn();
		const { getByText } = renderWithProviders(
			<ChapterPicker bookName="Genesis" numberOfChapters={50} onSelect={onSelect} />
		);
		fireEvent.press(getByText("3"));
		expect(onSelect).toHaveBeenCalledWith(3);
	});

	it("displays book name", () => {
		const { getByText } = renderWithProviders(
			<ChapterPicker bookName="Exodus" numberOfChapters={40} onSelect={jest.fn()} />
		);
		expect(getByText("Exodus")).toBeTruthy();
	});
});
