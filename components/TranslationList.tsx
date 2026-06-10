import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { StyledText } from "./StyledText";
import { HapticPressable } from "./HapticPressable";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";
import type { Translation } from "@/types/bible";

interface TranslationListProps {
	translations: Translation[];
	selectedId: string | null;
	onSelect: (translation: Translation) => void;
}

interface GroupedSection {
	language: string;
	translations: Translation[];
}

function groupByLanguage(translations: Translation[]): GroupedSection[] {
	const map = new Map<string, Translation[]>();
	for (const t of translations) {
		const lang = t.languageEnglishName || t.language;
		if (!map.has(lang)) map.set(lang, []);
		map.get(lang)!.push(t);
	}
	// English first, then alphabetical
	const sections = Array.from(map.entries()).map(([language, translations]) => ({
		language,
		translations,
	}));
	sections.sort((a, b) => {
		if (a.language === "English") return -1;
		if (b.language === "English") return 1;
		return a.language.localeCompare(b.language);
	});
	return sections;
}

export function TranslationList({ translations, selectedId, onSelect }: TranslationListProps) {
	const { invertColors } = useInvertColors();
	const sections = groupByLanguage(translations);
	const borderColor = invertColors ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

	return (
		<FlatList
			data={sections}
			keyExtractor={(item) => item.language}
			renderItem={({ item: section }) => (
				<View style={styles.section}>
					<StyledText style={styles.sectionTitle}>{section.language}</StyledText>
					{section.translations.map((t) => {
						const isSelected = t.id === selectedId;
						return (
							<HapticPressable
								key={t.id}
								onPress={() => onSelect(t)}
								style={[styles.item, { borderBottomColor: borderColor }]}
							>
								<View style={styles.row}>
									<StyledText style={styles.indicator}>
										{isSelected ? "●" : "○"}
									</StyledText>
									<View style={styles.info}>
										<StyledText style={styles.shortName}>{t.shortName}</StyledText>
										<StyledText style={styles.fullName}>{t.englishName}</StyledText>
									</View>
								</View>
							</HapticPressable>
						);
					})}
				</View>
			)}
			contentContainerStyle={styles.list}
		/>
	);
}

const styles = StyleSheet.create({
	list: {
		paddingBottom: n(40),
	},
	section: {
		marginBottom: n(20),
	},
	sectionTitle: {
		fontSize: n(12),
		opacity: 0.5,
		textTransform: "uppercase",
		marginBottom: n(8),
	},
	item: {
		paddingVertical: n(12),
		borderBottomWidth: 1,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
	},
	indicator: {
		fontSize: n(16),
		marginRight: n(12),
	},
	info: {
		flex: 1,
	},
	shortName: {
		fontSize: n(16),
	},
	fullName: {
		fontSize: n(13),
		opacity: 0.6,
		marginTop: n(2),
	},
});
