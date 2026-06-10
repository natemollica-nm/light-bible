import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Header } from "@/components/Header";
import { SelectorButton } from "@/components/SelectorButton";
import { StyledText } from "@/components/StyledText";
import { HapticPressable } from "@/components/HapticPressable";
import { useTranslation } from "@/contexts/TranslationContext";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useHaptic } from "@/contexts/HapticContext";
import { getTranslations } from "@/utils/bible";
import { n } from "@/utils/scaling";

export default function SettingsScreen() {
	const { translationId } = useTranslation();
	const { invertColors, setInvertColors } = useInvertColors();
	const { hapticEnabled, setHapticEnabled } = useHaptic();
	const [translationName, setTranslationName] = useState("");
	const borderColor = invertColors ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)";

	useEffect(() => {
		if (!translationId) return;
		getTranslations().then((res) => {
			const t = res.translations.find((t) => t.id === translationId);
			if (t) setTranslationName(t.shortName);
		}).catch(() => {});
	}, [translationId]);

	return (
		<View style={[styles.container, { backgroundColor: invertColors ? "white" : "black" }]}>
			<Header headerTitle="Settings" hideBackButton />
			<View style={styles.content}>
				<SelectorButton
					label="Translation"
					value={translationName || translationId || "—"}
					href="/settings/translation"
				/>
				<SelectorButton
					label="Font Size"
					value="Adjust"
					href="/settings/font-size"
				/>
				<SelectorButton
					label="Downloads"
					value="Manage"
					href="/settings/downloads"
				/>
				<HapticPressable
					onPress={() => setInvertColors(!invertColors)}
					style={[styles.toggle, { borderBottomColor: borderColor }]}
				>
					<StyledText style={styles.toggleLabel}>Invert Colors</StyledText>
					<StyledText style={styles.toggleValue}>
						{invertColors ? "On" : "Off"}
					</StyledText>
				</HapticPressable>
				<HapticPressable
					onPress={() => setHapticEnabled(!hapticEnabled)}
					style={[styles.toggle, { borderBottomColor: borderColor }]}
				>
					<StyledText style={styles.toggleLabel}>Haptic Feedback</StyledText>
					<StyledText style={styles.toggleValue}>
						{hapticEnabled ? "On" : "Off"}
					</StyledText>
				</HapticPressable>
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
	},
	toggle: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: n(14),
		borderBottomWidth: 1,
		width: "100%",
	},
	toggleLabel: {
		fontSize: n(16),
	},
	toggleValue: {
		fontSize: n(16),
		opacity: 0.6,
	},
});
