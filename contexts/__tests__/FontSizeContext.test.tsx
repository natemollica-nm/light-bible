import React from "react";
import { Text } from "react-native";
import { render, act, fireEvent } from "@testing-library/react-native";
import { FontSizeProvider, useFont, MIN_SIZE, MAX_SIZE } from "../FontSizeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

function TestConsumer() {
	const { fontSize, setFontSize } = useFont();
	return (
		<>
			<Text testID="size">{fontSize}</Text>
			<Text testID="increase" onPress={() => setFontSize(fontSize + 2)} />
			<Text testID="max" onPress={() => setFontSize(MAX_SIZE + 10)} />
			<Text testID="min" onPress={() => setFontSize(MIN_SIZE - 10)} />
		</>
	);
}

describe("FontSizeContext", () => {
	beforeEach(async () => {
		await AsyncStorage.clear();
	});

	it("provides default font size", () => {
		const { getByTestId } = render(
			<FontSizeProvider>
				<TestConsumer />
			</FontSizeProvider>
		);
		expect(Number(getByTestId("size").props.children)).toBeGreaterThan(0);
	});

	it("persists font size to AsyncStorage", async () => {
		const { getByTestId } = render(
			<FontSizeProvider>
				<TestConsumer />
			</FontSizeProvider>
		);

		await act(async () => {
			fireEvent.press(getByTestId("increase"));
		});

		const stored = await AsyncStorage.getItem("@font-size");
		expect(stored).not.toBeNull();
	});

	it("clamps to MAX_SIZE", async () => {
		const { getByTestId } = render(
			<FontSizeProvider>
				<TestConsumer />
			</FontSizeProvider>
		);

		await act(async () => {
			fireEvent.press(getByTestId("max"));
		});

		expect(Number(getByTestId("size").props.children)).toBeLessThanOrEqual(MAX_SIZE);
	});

	it("clamps to MIN_SIZE", async () => {
		const { getByTestId } = render(
			<FontSizeProvider>
				<TestConsumer />
			</FontSizeProvider>
		);

		await act(async () => {
			fireEvent.press(getByTestId("min"));
		});

		expect(Number(getByTestId("size").props.children)).toBeGreaterThanOrEqual(MIN_SIZE);
	});
});
