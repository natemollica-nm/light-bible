import React from "react";
import { View, StyleSheet } from "react-native";
import { StyledText } from "./StyledText";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

interface DownloadProgressProps {
	current: number;
	total: number;
	label?: string;
}

export function DownloadProgress({ current, total, label }: DownloadProgressProps) {
	const { invertColors } = useInvertColors();
	const barBg = invertColors ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
	const barFill = invertColors ? "black" : "white";
	const progress = total > 0 ? current / total : 0;

	return (
		<View style={styles.container}>
			{label && <StyledText style={styles.label}>{label}</StyledText>}
			<View style={[styles.barBg, { backgroundColor: barBg }]}>
				<View style={[styles.barFill, { backgroundColor: barFill, width: `${progress * 100}%` }]} />
			</View>
			<StyledText style={styles.count}>{current}/{total} chapters</StyledText>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: "100%",
		paddingVertical: n(8),
	},
	label: {
		fontSize: n(14),
		marginBottom: n(6),
	},
	barBg: {
		height: n(4),
		width: "100%",
	},
	barFill: {
		height: "100%",
	},
	count: {
		fontSize: n(12),
		opacity: 0.6,
		marginTop: n(4),
	},
});
