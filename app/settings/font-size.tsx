import React from "react";
import { View, StyleSheet } from "react-native";
import { Header } from "@/components/Header";
import { StyledText } from "@/components/StyledText";
import { HapticPressable } from "@/components/HapticPressable";
import { useFont, MIN_SIZE, MAX_SIZE } from "@/contexts/FontSizeContext";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

export default function FontSizeScreen() {
	const { fontSize, setFontSize } = useFont();
	const { invertColors } = useInvertColors();
	const borderColor = invertColors ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)";

	const step = n(2);

	return (
		<View style={[styles.container, { backgroundColor: invertColors ? "white" : "black" }]}>
			<Header headerTitle="Font Size" />
			<View style={styles.content}>
				<View style={styles.controls}>
					<HapticPressable
						onPress={() => setFontSize(fontSize - step)}
						style={[styles.button, { borderColor }]}
					>
						<StyledText style={styles.buttonText}>A−</StyledText>
					</HapticPressable>
					<HapticPressable
						onPress={() => setFontSize(fontSize + step)}
						style={[styles.button, { borderColor }]}
					>
						<StyledText style={styles.buttonText}>A+</StyledText>
					</HapticPressable>
				</View>
				<View style={[styles.preview, { borderColor }]}>
					<StyledText style={{ fontSize, lineHeight: fontSize * 1.6 }}>
						In the beginning God created the heavens and the earth. Now the earth was
						formless and void, and darkness was over the surface of the deep.
					</StyledText>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
		paddingHorizontal: n(20),
		paddingTop: n(20),
	},
	controls: {
		flexDirection: "row",
		gap: n(16),
		marginBottom: n(24),
	},
	button: {
		width: n(60),
		height: n(48),
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	buttonText: {
		fontSize: n(20),
	},
	preview: {
		borderWidth: 1,
		padding: n(16),
	},
});
