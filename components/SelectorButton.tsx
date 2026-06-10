import React from "react";
import { StyleSheet } from "react-native";
import { StyledText } from "./StyledText";
import { HapticPressable } from "./HapticPressable";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";
import { useRouter } from "expo-router";

interface SelectorButtonProps {
	label: string;
	value: string;
	href: string;
}

export function SelectorButton({ label, value, href }: SelectorButtonProps) {
	const { invertColors } = useInvertColors();
	const router = useRouter();
	const borderColor = invertColors ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)";

	return (
		<HapticPressable
			onPress={() => router.push(href as any)}
			style={[styles.container, { borderBottomColor: borderColor }]}
		>
			<StyledText style={styles.label}>{label}</StyledText>
			<StyledText style={styles.value}>{value}</StyledText>
		</HapticPressable>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: n(14),
		borderBottomWidth: 1,
		width: "100%",
	},
	label: {
		fontSize: n(16),
	},
	value: {
		fontSize: n(16),
		opacity: 0.6,
	},
});
