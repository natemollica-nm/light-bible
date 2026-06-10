import React, { useEffect, useState, useRef, useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VerseText } from "./VerseText";
import { StyledText } from "./StyledText";
import { getChapter } from "@/utils/bible";
import { n } from "@/utils/scaling";
import type { ChapterContentItem, VerseContent } from "@/types/bible";

interface ChapterViewProps {
	translationId: string;
	bookId: string;
	chapter: number;
}

interface DisplayItem {
	key: string;
	type: "verse" | "heading" | "copyright";
	number?: number;
	text: string;
}

function extractVerseText(content: VerseContent[]): string {
	return content
		.filter((c): c is string => typeof c === "string")
		.join("");
}

function buildDisplayItems(content: ChapterContentItem[]): DisplayItem[] {
	const items: DisplayItem[] = [];
	for (const item of content) {
		if (item.type === "verse") {
			items.push({
				key: `v-${item.number}`,
				type: "verse",
				number: item.number,
				text: extractVerseText(item.content),
			});
		} else if (item.type === "heading") {
			items.push({
				key: `h-${items.length}`,
				type: "heading",
				text: item.content.join(""),
			});
		} else if (item.type === "copyright") {
			items.push({
				key: `c-${items.length}`,
				type: "copyright",
				text: item.content.join(""),
			});
		}
	}
	return items;
}

const scrollKey = (tid: string, book: string, ch: number) =>
	`@scroll/${tid}/${book}/${ch}`;

export function ChapterView({ translationId, bookId, chapter }: ChapterViewProps) {
	const [items, setItems] = useState<DisplayItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isRtl, setIsRtl] = useState(false);
	const [initialOffset, setInitialOffset] = useState(0);
	const listRef = useRef<FlatList>(null);
	const offsetRef = useRef(0);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		// Restore scroll position
		AsyncStorage.getItem(scrollKey(translationId, bookId, chapter)).then((val) => {
			if (!cancelled && val) setInitialOffset(Number(val));
			else setInitialOffset(0);
		});

		getChapter(translationId, bookId, chapter)
			.then((res) => {
				if (!cancelled) {
					setItems(buildDisplayItems(res.chapter.content));
					setIsRtl(res.translation.textDirection === "rtl");
					setLoading(false);
				}
			})
			.catch((err) => {
				if (!cancelled) {
					setError(err.message);
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
			// Save scroll position on unmount/chapter change
			AsyncStorage.setItem(
				scrollKey(translationId, bookId, chapter),
				String(offsetRef.current)
			);
		};
	}, [translationId, bookId, chapter]);

	const handleScroll = useCallback((e: any) => {
		offsetRef.current = e.nativeEvent.contentOffset.y;
	}, []);

	if (loading) {
		return (
			<View style={styles.center}>
				<StyledText style={styles.message}>Loading...</StyledText>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.center}>
				<StyledText style={styles.message}>
					Chapter not available offline.
				</StyledText>
			</View>
		);
	}

	return (
		<FlatList
			ref={listRef}
			data={items}
			keyExtractor={(item) => item.key}
			renderItem={({ item }) =>
				item.type === "verse" ? (
					<VerseText number={item.number!} text={item.text} rtl={isRtl} />
				) : item.type === "copyright" ? (
					<StyledText style={[styles.copyright, isRtl && styles.rtlText]}>{item.text}</StyledText>
				) : (
					<StyledText style={[styles.heading, isRtl && styles.rtlText]}>{item.text}</StyledText>
				)
			}
			contentContainerStyle={styles.list}
			style={isRtl ? styles.rtl : undefined}
			onScroll={handleScroll}
			scrollEventThrottle={100}
			contentOffset={{ x: 0, y: initialOffset }}
		/>
	);
}

const styles = StyleSheet.create({
	list: {
		paddingBottom: n(40),
	},
	heading: {
		fontSize: n(16),
		opacity: 0.7,
		paddingTop: n(20),
		paddingBottom: n(8),
	},
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	message: {
		fontSize: n(18),
		opacity: 0.6,
	},
	rtl: {
		direction: "rtl",
	},
	rtlText: {
		textAlign: "right",
		writingDirection: "rtl",
	},
	copyright: {
		fontSize: n(10),
		opacity: 0.35,
		paddingTop: n(32),
		lineHeight: n(10 * 1.4),
	},
});
