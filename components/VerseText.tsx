import React from "react";
import { StyleSheet, View } from "react-native";
import { StyledText } from "./StyledText";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useFont } from "@/contexts/FontSizeContext";
import { n } from "@/utils/scaling";

interface VerseTextProps {
	number: number;
	text: string;
}

export function VerseText({ number, text }: VerseTextProps) {
	const { invertColors } = useInvertColors();
	const { fontSize } = useFont();
	const dimColor = invertColors ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";

	return (
		<View style={styles.container}>
			<StyledText style={[styles.number, { color: dimColor }]}>
				{number}
			</StyledText>
			<StyledText style={{ fontSize, lineHeight: fontSize * 1.6, flex: 1 }}>
				{text}
			</StyledText>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		paddingVertical: n(4),
	},
	number: {
		fontSize: n(12),
		marginRight: n(6),
		marginTop: n(2),
		minWidth: n(16),
	},
});
