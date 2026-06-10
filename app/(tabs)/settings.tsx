import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Header } from "@/components/Header";
import { SelectorButton } from "@/components/SelectorButton";
import { useTranslation } from "@/contexts/TranslationContext";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { getTranslations } from "@/utils/bible";
import { n } from "@/utils/scaling";

export default function SettingsScreen() {
	const { translationId } = useTranslation();
	const { invertColors } = useInvertColors();
	const [translationName, setTranslationName] = useState("");

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
					label="Downloads"
					value="Manage"
					href="/settings/downloads"
				/>
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
});
