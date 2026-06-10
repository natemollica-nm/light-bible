import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { BookPicker } from "@/components/BookPicker";
import { ChapterPicker } from "@/components/ChapterPicker";
import { Header } from "@/components/Header";
import { useReadingPosition } from "@/contexts/ReadingPositionContext";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useRouter } from "expo-router";
import { n } from "@/utils/scaling";
import type { Book } from "@/types/bible";

export default function BooksScreen() {
	const [selectedBook, setSelectedBook] = useState<Book | null>(null);
	const { setPosition } = useReadingPosition();
	const { invertColors } = useInvertColors();
	const router = useRouter();

	const handleBookSelect = (book: Book) => {
		setSelectedBook(book);
	};

	const handleChapterSelect = (chapter: number) => {
		if (!selectedBook) return;
		setPosition({ bookId: selectedBook.id, chapter });
		setSelectedBook(null);
		router.navigate("/(tabs)");
	};

	const handleBack = () => {
		setSelectedBook(null);
	};

	return (
		<View style={[styles.container, { backgroundColor: invertColors ? "white" : "black" }]}>
			{selectedBook ? (
				<>
					<Header headerTitle={selectedBook.commonName} onBackPress={handleBack} />
					<View style={styles.content}>
						<ChapterPicker
							bookName={selectedBook.commonName}
							numberOfChapters={selectedBook.numberOfChapters}
							onSelect={handleChapterSelect}
						/>
					</View>
				</>
			) : (
				<>
					<Header headerTitle="Books" hideBackButton />
					<View style={styles.content}>
						<BookPicker onSelect={handleBookSelect} />
					</View>
				</>
			)}
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
