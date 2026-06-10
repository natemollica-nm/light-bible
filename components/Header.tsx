import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { StyledText } from "./StyledText";
import { HapticPressable } from "./HapticPressable";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { n } from "@/utils/scaling";

interface HeaderProps {
	headerTitle?: string;
	hideBackButton?: boolean;
	onBackPress?: () => void;
	rightIcon?: keyof typeof MaterialIcons.glyphMap;
	onRightIconPress?: () => void;
	onTitlePress?: () => void;
}

export function Header({
	headerTitle,
	hideBackButton = false,
	onBackPress,
	rightIcon,
	onRightIconPress,
	onTitlePress,
}: HeaderProps) {
	const { invertColors } = useInvertColors();
	const iconColor = invertColors ? "black" : "white";

	const handleBack = onBackPress ?? (() => {
		if (router.canGoBack()) {
			router.back();
		}
	});

	return (
		<View
			style={[
				styles.header,
				{ backgroundColor: invertColors ? "white" : "black" },
			]}
		>
			{!hideBackButton ? (
				<HapticPressable onPress={handleBack}>
					<View style={styles.button}>
						<MaterialIcons
							name="arrow-back-ios"
							size={n(28)}
							color={iconColor}
						/>
					</View>
				</HapticPressable>
			) : (
				<View style={styles.button} />
			)}
			<View style={styles.titleContainer}>
				{onTitlePress ? (
					<HapticPressable onPress={onTitlePress}>
						<StyledText style={styles.title} numberOfLines={1}>
							{headerTitle}
						</StyledText>
					</HapticPressable>
				) : (
					<StyledText style={styles.title} numberOfLines={1}>
						{headerTitle}
					</StyledText>
				)}
			</View>
			{rightIcon ? (
				<HapticPressable onPress={onRightIconPress}>
					<View style={styles.button}>
						<MaterialIcons
							name={rightIcon}
							size={n(28)}
							color={iconColor}
						/>
					</View>
				</HapticPressable>
			) : (
				<View style={styles.button} />
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: n(22),
		paddingVertical: n(5),
	},
	title: {
		fontSize: n(20),
		fontFamily: "PublicSans-Regular",
		paddingTop: n(2),
	},
	titleContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	button: {
		width: n(32),
		height: n(32),
		alignItems: "center",
		paddingTop: n(6),
	},
});
