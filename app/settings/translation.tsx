import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, TextInput } from "react-native";
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
	const [query, setQuery] = useState("");
	const router = useRouter();

	useEffect(() => {
		getTranslations()
			.then((res) => {
				setTranslations(res.translations);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, []);

	const filtered = useMemo(() => {
		if (!query.trim()) return translations;
		const q = query.toLowerCase();
		return translations.filter(
			(t) =>
				t.englishName.toLowerCase().includes(q) ||
				t.shortName.toLowerCase().includes(q) ||
				t.name.toLowerCase().includes(q) ||
				t.languageEnglishName.toLowerCase().includes(q) ||
				t.id.toLowerCase().includes(q)
		);
	}, [translations, query]);

	const handleSelect = (t: Translation) => {
		setTranslationId(t.id);
		router.back();
	};

	const textColor = invertColors ? "black" : "white";
	const borderColor = invertColors ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)";

	return (
		<View style={[styles.container, { backgroundColor: invertColors ? "white" : "black" }]}>
			<Header headerTitle="Translation" />
			<View style={styles.content}>
				<TextInput
					style={[styles.search, { color: textColor, borderColor }]}
					placeholder="Search translations..."
					placeholderTextColor={invertColors ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)"}
					value={query}
					onChangeText={setQuery}
					autoCorrect={false}
					autoCapitalize="none"
				/>
				{loading ? (
					<StyledText style={styles.message}>Loading...</StyledText>
				) : (
					<TranslationList
						translations={filtered}
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
	search: {
		fontSize: n(16),
		fontFamily: "PublicSans-Regular",
		borderWidth: 1,
		paddingHorizontal: n(12),
		paddingVertical: n(10),
		marginBottom: n(12),
	},
	message: {
		fontSize: n(18),
		opacity: 0.6,
		marginTop: n(20),
	},
});
