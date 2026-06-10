import React, { useEffect, useState } from "react";
import { View, StyleSheet, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Header } from "@/components/Header";
import { StyledText } from "@/components/StyledText";
import { HapticPressable } from "@/components/HapticPressable";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { setEsvApiKey } from "@/utils/esvApi";
import { n } from "@/utils/scaling";

const ESV_KEY_STORAGE = "@esv-api-key";

export default function EsvKeyScreen() {
	const { invertColors } = useInvertColors();
	const [key, setKey] = useState("");
	const [saved, setSaved] = useState(false);
	const textColor = invertColors ? "black" : "white";
	const borderColor = invertColors ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)";

	useEffect(() => {
		AsyncStorage.getItem(ESV_KEY_STORAGE).then((val) => {
			if (val) setKey(val);
		});
	}, []);

	const handleSave = async () => {
		const trimmed = key.trim();
		await AsyncStorage.setItem(ESV_KEY_STORAGE, trimmed);
		setEsvApiKey(trimmed);
		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	};

	return (
		<View style={[styles.container, { backgroundColor: invertColors ? "white" : "black" }]}>
			<Header headerTitle="ESV API Key" />
			<View style={styles.content}>
				<StyledText style={styles.description}>
					The ESV requires an API key from Crossway. Get one free at api.esv.org
				</StyledText>
				<TextInput
					style={[styles.input, { color: textColor, borderColor }]}
					placeholder="Paste your ESV API key"
					placeholderTextColor={invertColors ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)"}
					value={key}
					onChangeText={setKey}
					autoCorrect={false}
					autoCapitalize="none"
					secureTextEntry
				/>
				<HapticPressable onPress={handleSave} style={[styles.button, { borderColor }]}>
					<StyledText style={styles.buttonText}>
						{saved ? "Saved ✓" : "Save"}
					</StyledText>
				</HapticPressable>
				<StyledText style={styles.note}>
					ESV text is © Crossway. Used under noncommercial license terms.
				</StyledText>
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
		paddingTop: n(16),
	},
	description: {
		fontSize: n(14),
		opacity: 0.7,
		marginBottom: n(16),
		lineHeight: n(14 * 1.5),
	},
	input: {
		fontSize: n(16),
		fontFamily: "PublicSans-Regular",
		borderWidth: 1,
		paddingHorizontal: n(12),
		paddingVertical: n(10),
		marginBottom: n(16),
	},
	button: {
		borderWidth: 1,
		paddingVertical: n(12),
		alignItems: "center",
		marginBottom: n(20),
	},
	buttonText: {
		fontSize: n(16),
	},
	note: {
		fontSize: n(12),
		opacity: 0.5,
		lineHeight: n(12 * 1.5),
	},
});
