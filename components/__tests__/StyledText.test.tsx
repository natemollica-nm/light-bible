import React from "react";
import { render } from "@testing-library/react-native";
import { StyledText } from "../StyledText";
import { InvertColorsProvider } from "@/contexts/InvertColorsContext";

function renderWithProviders(ui: React.ReactElement) {
	return render(<InvertColorsProvider>{ui}</InvertColorsProvider>);
}

describe("StyledText", () => {
	it("renders children text", () => {
		const { getByText } = renderWithProviders(
			<StyledText>Hello Bible</StyledText>
		);
		expect(getByText("Hello Bible")).toBeTruthy();
	});

	it("applies custom styles", () => {
		const { getByText } = renderWithProviders(
			<StyledText style={{ fontSize: 24 }}>Styled</StyledText>
		);
		const element = getByText("Styled");
		expect(element.props.style).toEqual(
			expect.arrayContaining([expect.objectContaining({ fontSize: 24 })])
		);
	});
});
