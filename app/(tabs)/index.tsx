import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, StyleSheet, PanResponder } from "react-native";
import { ChapterView } from "@/components/ChapterView";
import { ChapterPicker } from "@/components/ChapterPicker";
import { Header } from "@/components/Header";
import { StyledText } from "@/components/StyledText";
import { useTranslation } from "@/contexts/TranslationContext";
import { useReadingPosition } from "@/contexts/ReadingPositionContext";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { getBooks, getChapter } from "@/utils/bible";
import { n } from "@/utils/scaling";
import type { Book } from "@/types/bible";

export default function ReadScreen() {
	const { translationId, setTranslationId } = useTranslation();
	const { position, setPosition } = useReadingPosition();
	const { invertColors } = useInvertColors();
	const [books, setBooks] = useState<Book[]>([]);
	const [showChapterPicker, setShowChapterPicker] = useState(false);

	useEffect(() => {
		if (!translationId) {
			setTranslationId("BSB");
		}
	}, [translationId, setTranslationId]);

	useEffect(() => {
		if (!translationId) return;
		getBooks(translationId)
			.then((res) => {
				setBooks(res.books);
				if (!position && res.books.length > 0) {
					setPosition({ bookId: res.books[0].id, chapter: 1 });
				}
			})
			.catch(() => {});
	}, [translationId]);

	useEffect(() => {
		if (!translationId || !position || books.length === 0) return;
		const { next, prev } = getAdjacentPositions(books, position.bookId, position.chapter);
		if (next) getChapter(translationId, next.bookId, next.chapter).catch(() => {});
		if (prev) getChapter(translationId, prev.bookId, prev.chapter).catch(() => {});
	}, [translationId, position, books]);

	const navigateChapter = useCallback(
		(direction: 1 | -1) => {
			if (!position || books.length === 0) return;
			const adjacent = direction === 1
				? getAdjacentPositions(books, position.bookId, position.chapter).next
				: getAdjacentPositions(books, position.bookId, position.chapter).prev;
			if (adjacent) setPosition(adjacent);
		},
		[position, books, setPosition]
	);

	const panResponder = useRef(
		PanResponder.create({
			onMoveShouldSetPanResponder: (_, gesture) =>
				Math.abs(gesture.dx) > 30 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
			onPanResponderRelease: (_, gesture) => {
				if (gesture.dx < -50) navigateChapter(1);
				else if (gesture.dx > 50) navigateChapter(-1);
			},
		})
	).current;

	useEffect(() => {
		panResponder.panHandlers.onMoveShouldSetResponder = undefined;
	}, [navigateChapter]);

	const currentBook = books.find((b) => b.id === position?.bookId);
	const headerTitle = currentBook
		? `${currentBook.commonName} ${position?.chapter}`
		: "Bible";

	const handleChapterSelect = (chapter: number) => {
		if (!position) return;
		setPosition({ bookId: position.bookId, chapter });
		setShowChapterPicker(false);
	};

	if (!translationId || !position) {
		return (
			<View style={[styles.container, { backgroundColor: invertColors ? "white" : "black" }]}>
				<StyledText style={styles.message}>Loading...</StyledText>
			</View>
		);
	}

	return (
		<View style={[styles.container, { backgroundColor: invertColors ? "white" : "black" }]}>
			<Header
				headerTitle={headerTitle}
				hideBackButton
				rightIcon={showChapterPicker ? "close" : "list"}
				onRightIconPress={() => setShowChapterPicker(!showChapterPicker)}
				onTitlePress={() => setShowChapterPicker(!showChapterPicker)}
			/>
			{showChapterPicker && currentBook ? (
				<View style={styles.content}>
					<ChapterPicker
						bookName={currentBook.commonName}
						numberOfChapters={currentBook.numberOfChapters}
						onSelect={handleChapterSelect}
					/>
				</View>
			) : (
				<View style={styles.content} {...panResponder.panHandlers}>
					<ChapterView
						translationId={translationId}
						bookId={position.bookId}
						chapter={position.chapter}
					/>
				</View>
			)}
		</View>
	);
}

function getAdjacentPositions(
	books: Book[],
	bookId: string,
	chapter: number
): { next: { bookId: string; chapter: number } | null; prev: { bookId: string; chapter: number } | null } {
	const bookIndex = books.findIndex((b) => b.id === bookId);
	if (bookIndex === -1) return { next: null, prev: null };

	const currentBook = books[bookIndex];
	let next: { bookId: string; chapter: number } | null = null;
	let prev: { bookId: string; chapter: number } | null = null;

	if (chapter < currentBook.numberOfChapters) {
		next = { bookId, chapter: chapter + 1 };
	} else if (bookIndex < books.length - 1) {
		next = { bookId: books[bookIndex + 1].id, chapter: 1 };
	}

	if (chapter > 1) {
		prev = { bookId, chapter: chapter - 1 };
	} else if (bookIndex > 0) {
		const prevBook = books[bookIndex - 1];
		prev = { bookId: prevBook.id, chapter: prevBook.numberOfChapters };
	}

	return { next, prev };
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
		marginTop: n(40),
		paddingHorizontal: n(20),
	},
});
