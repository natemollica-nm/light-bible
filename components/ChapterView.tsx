import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
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
	type: "verse" | "heading";
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
		}
	}
	return items;
}

export function ChapterView({ translationId, bookId, chapter }: ChapterViewProps) {
	const [items, setItems] = useState<DisplayItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		getChapter(translationId, bookId, chapter)
			.then((res) => {
				if (!cancelled) {
					setItems(buildDisplayItems(res.chapter.content));
					setLoading(false);
				}
			})
			.catch((err) => {
				if (!cancelled) {
					setError(err.message);
					setLoading(false);
				}
			});

		return () => { cancelled = true; };
	}, [translationId, bookId, chapter]);

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
			data={items}
			keyExtractor={(item) => item.key}
			renderItem={({ item }) =>
				item.type === "verse" ? (
					<VerseText number={item.number!} text={item.text} />
				) : (
					<StyledText style={styles.heading}>{item.text}</StyledText>
				)
			}
			contentContainerStyle={styles.list}
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
});
