import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { Header } from "@/components/Header";
import { StyledText } from "@/components/StyledText";
import { HapticPressable } from "@/components/HapticPressable";
import { DownloadProgress } from "@/components/DownloadProgress";
import { useTranslation } from "@/contexts/TranslationContext";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import {
	isTranslationDownloaded,
	downloadFullTranslation,
	clearTranslationCache,
	getDownloadedTranslations,
} from "@/utils/bibleCache";
import { getTranslations } from "@/utils/bible";
import { n } from "@/utils/scaling";
import type { Translation } from "@/types/bible";

interface DownloadState {
	translationId: string;
	current: number;
	total: number;
}

export default function DownloadsScreen() {
	const { translationId } = useTranslation();
	const { invertColors } = useInvertColors();
	const [downloaded, setDownloaded] = useState<string[]>([]);
	const [translations, setTranslations] = useState<Translation[]>([]);
	const [downloading, setDownloading] = useState<DownloadState | null>(null);
	const cancelRef = useRef({ cancelled: false });
	const borderColor = invertColors ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)";

	const refresh = useCallback(async () => {
		const dl = await getDownloadedTranslations();
		setDownloaded(dl);
	}, []);

	useEffect(() => {
		refresh();
		getTranslations()
			.then((res) => setTranslations(res.translations))
			.catch(() => {});
	}, [refresh]);

	const handleDownload = async (id: string) => {
		cancelRef.current = { cancelled: false };
		setDownloading({ translationId: id, current: 0, total: 0 });

		try {
			await downloadFullTranslation(
				id,
				(current, total) => setDownloading({ translationId: id, current, total }),
				cancelRef.current
			);
			await refresh();
		} catch {
			// swallow
		}
		setDownloading(null);
	};

	const handleCancel = () => {
		cancelRef.current.cancelled = true;
		setDownloading(null);
	};

	const handleRemove = async (id: string) => {
		await clearTranslationCache(id);
		await refresh();
	};

	const currentTranslation = translations.find((t) => t.id === translationId);
	// Show current + downloaded translations
	const shown = translations.filter(
		(t) => t.id === translationId || downloaded.includes(t.id)
	);

	return (
		<View style={[styles.container, { backgroundColor: invertColors ? "white" : "black" }]}>
			<Header headerTitle="Downloads" />
			<View style={styles.content}>
				{shown.length === 0 && !downloading && (
					<StyledText style={styles.empty}>
						No translations downloaded yet.
					</StyledText>
				)}

				{shown.map((t) => {
					const isDownloaded = downloaded.includes(t.id);
					const isDownloading = downloading?.translationId === t.id;

					return (
						<View key={t.id} style={[styles.item, { borderBottomColor: borderColor }]}>
							<StyledText style={styles.name}>
								{t.shortName} — {t.englishName}
							</StyledText>
							{isDownloading ? (
								<>
									<DownloadProgress
										current={downloading!.current}
										total={downloading!.total}
									/>
									<HapticPressable onPress={handleCancel}>
										<StyledText style={styles.action}>Cancel</StyledText>
									</HapticPressable>
								</>
							) : isDownloaded ? (
								<HapticPressable onPress={() => handleRemove(t.id)}>
									<StyledText style={styles.action}>Remove</StyledText>
								</HapticPressable>
							) : (
								<HapticPressable onPress={() => handleDownload(t.id)}>
									<StyledText style={styles.action}>Download for offline</StyledText>
								</HapticPressable>
							)}
						</View>
					);
				})}

				{!downloading && currentTranslation && !downloaded.includes(currentTranslation.id) && (
					<HapticPressable
						onPress={() => handleDownload(currentTranslation.id)}
						style={styles.downloadCurrent}
					>
						<StyledText style={styles.action}>
							Download {currentTranslation.shortName} for offline
						</StyledText>
					</HapticPressable>
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
		paddingTop: n(12),
	},
	empty: {
		fontSize: n(16),
		opacity: 0.6,
	},
	item: {
		paddingVertical: n(14),
		borderBottomWidth: 1,
	},
	name: {
		fontSize: n(16),
		marginBottom: n(6),
	},
	action: {
		fontSize: n(14),
		opacity: 0.7,
		paddingVertical: n(6),
	},
	downloadCurrent: {
		marginTop: n(20),
	},
});
