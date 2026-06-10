import React from "react";
import { StyleSheet, View } from "react-native";
import { StyledText } from "./StyledText";
import { HapticPressable } from "./HapticPressable";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

interface ChapterPickerProps {
	bookName: string;
	numberOfChapters: number;
	onSelect: (chapter: number) => void;
}

export function ChapterPicker({ bookName, numberOfChapters, onSelect }: ChapterPickerProps) {
	const { invertColors } = useInvertColors();
	const borderColor = invertColors ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)";

	const chapters = Array.from({ length: numberOfChapters }, (_, i) => i + 1);

	return (
		<View style={styles.container}>
			<StyledText style={styles.title}>{bookName}</StyledText>
			<View style={styles.grid}>
				{chapters.map((ch) => (
					<HapticPressable
						key={ch}
						onPress={() => onSelect(ch)}
						style={[styles.cell, { borderColor }]}
					>
						<StyledText style={styles.number}>{ch}</StyledText>
					</HapticPressable>
				))}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	title: {
		fontSize: n(18),
		marginBottom: n(16),
		opacity: 0.7,
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: n(8),
	},
	cell: {
		width: n(44),
		height: n(44),
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	number: {
		fontSize: n(16),
	},
});
