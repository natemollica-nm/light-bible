import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Header } from "@/components/Header";
import { TranslationList } from "@/components/TranslationList";
import { StyledText } from "@/components/StyledText";
import { useTranslation } from "@/contexts/TranslationContext";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { getTranslations } from "@/utils/bible";
import { useRouter } from "expo-router";
import { n } from "@/utils/scaling";
import type { Translation } from "@/types/bible";

export default function TranslationScreen() {
	const { translationId, setTranslationId } = useTranslation();
	const { invertColors } = useInvertColors();
	const [translations, setTranslations] = useState<Translation[]>([]);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		getTranslations()
			.then((res) => {
				setTranslations(res.translations);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, []);

	const handleSelect = (t: Translation) => {
		setTranslationId(t.id);
		router.back();
	};

	return (
		<View style={[styles.container, { backgroundColor: invertColors ? "white" : "black" }]}>
			<Header headerTitle="Translation" />
			<View style={styles.content}>
				{loading ? (
					<StyledText style={styles.message}>Loading...</StyledText>
				) : (
					<TranslationList
						translations={translations}
						selectedId={translationId}
						onSelect={handleSelect}
					/>
				)}
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
	message: {
		fontSize: n(18),
		opacity: 0.6,
		marginTop: n(20),
	},
});
