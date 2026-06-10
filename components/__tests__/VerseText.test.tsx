import React from "react";
import { render } from "@testing-library/react-native";
import { VerseText } from "../VerseText";
import { InvertColorsProvider } from "@/contexts/InvertColorsContext";

function renderWithProviders(ui: React.ReactElement) {
	return render(<InvertColorsProvider>{ui}</InvertColorsProvider>);
}

describe("VerseText", () => {
	it("renders verse number and text", () => {
		const { getByText } = renderWithProviders(
			<VerseText number={1} text="In the beginning God created the heavens." />
		);
		expect(getByText("1")).toBeTruthy();
		expect(getByText("In the beginning God created the heavens.")).toBeTruthy();
	});
});
