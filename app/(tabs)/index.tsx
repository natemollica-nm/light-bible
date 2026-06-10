import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { ChapterView } from "@/components/ChapterView";
import { StyledText } from "@/components/StyledText";
import { useTranslation } from "@/contexts/TranslationContext";
import { useReadingPosition } from "@/contexts/ReadingPositionContext";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { getBooks } from "@/utils/bible";
import { n } from "@/utils/scaling";

export default function ReadScreen() {
	const { translationId, setTranslationId } = useTranslation();
	const { position, setPosition } = useReadingPosition();
	const { invertColors } = useInvertColors();

	// Default to BSB Genesis 1 on first load
	useEffect(() => {
		if (!translationId) {
			setTranslationId("BSB");
		}
	}, [translationId, setTranslationId]);

	useEffect(() => {
		if (translationId && !position) {
			getBooks(translationId).then((res) => {
				if (res.books.length > 0) {
					setPosition({ bookId: res.books[0].id, chapter: 1 });
				}
			}).catch(() => {});
		}
	}, [translationId, position, setPosition]);

	if (!translationId || !position) {
		return (
			<View style={[styles.container, { backgroundColor: invertColors ? "white" : "black" }]}>
				<StyledText style={styles.message}>Loading...</StyledText>
			</View>
		);
	}

	return (
		<View style={[styles.container, { backgroundColor: invertColors ? "white" : "black" }]}>
			<ChapterView
				translationId={translationId}
				bookId={position.bookId}
				chapter={position.chapter}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: n(20),
		paddingTop: n(8),
	},
	message: {
		fontSize: n(18),
		opacity: 0.6,
		marginTop: n(40),
	},
});
