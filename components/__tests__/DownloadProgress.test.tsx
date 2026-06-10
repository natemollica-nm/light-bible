import React from "react";
import { render } from "@testing-library/react-native";
import { DownloadProgress } from "../DownloadProgress";
import { InvertColorsProvider } from "@/contexts/InvertColorsContext";

function renderWithProviders(ui: React.ReactElement) {
	return render(<InvertColorsProvider>{ui}</InvertColorsProvider>);
}

describe("DownloadProgress", () => {
	it("renders current/total count", () => {
		const { getByText } = renderWithProviders(
			<DownloadProgress current={245} total={1189} />
		);
		expect(getByText("245/1189 chapters")).toBeTruthy();
	});

	it("renders label when provided", () => {
		const { getByText } = renderWithProviders(
			<DownloadProgress current={0} total={100} label="Downloading BSB..." />
		);
		expect(getByText("Downloading BSB...")).toBeTruthy();
	});

	it("handles zero total gracefully", () => {
		const { getByText } = renderWithProviders(
			<DownloadProgress current={0} total={0} />
		);
		expect(getByText("0/0 chapters")).toBeTruthy();
	});
});
