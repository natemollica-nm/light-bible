import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { StyledText } from "./StyledText";
import { HapticPressable } from "./HapticPressable";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { getBooks } from "@/utils/bible";
import { n } from "@/utils/scaling";
import type { Book } from "@/types/bible";

interface BookPickerProps {
	onSelect: (book: Book) => void;
}

interface Section {
	title: string;
	books: Book[];
}

export function BookPicker({ onSelect }: BookPickerProps) {
	const { translationId } = useTranslation();
	const { invertColors } = useInvertColors();
	const [sections, setSections] = useState<Section[]>([]);

	useEffect(() => {
		if (!translationId) return;
		getBooks(translationId).then((res) => {
			const ot = res.books.filter((b) => b.order <= 39);
			const nt = res.books.filter((b) => b.order > 39);
			setSections([
				{ title: "Old Testament", books: ot },
				{ title: "New Testament", books: nt },
			]);
		}).catch(() => {});
	}, [translationId]);

	const borderColor = invertColors ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

	return (
		<FlatList
			data={sections}
			keyExtractor={(item) => item.title}
			renderItem={({ item: section }) => (
				<View style={styles.section}>
					<StyledText style={styles.sectionTitle}>{section.title}</StyledText>
					<View style={styles.grid}>
						{section.books.map((book) => (
							<HapticPressable
								key={book.id}
								onPress={() => onSelect(book)}
								style={[styles.bookItem, { borderColor }]}
							>
								<StyledText style={styles.bookName}>{book.commonName}</StyledText>
							</HapticPressable>
						))}
					</View>
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
		marginBottom: n(24),
	},
	sectionTitle: {
		fontSize: n(14),
		opacity: 0.5,
		marginBottom: n(12),
		textTransform: "uppercase",
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: n(8),
	},
	bookItem: {
		paddingVertical: n(10),
		paddingHorizontal: n(12),
		borderWidth: 1,
		minWidth: n(80),
	},
	bookName: {
		fontSize: n(14),
	},
});
