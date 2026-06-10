import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { setStatusBarHidden } from "expo-status-bar";
import { InvertColorsProvider, useInvertColors } from "@/contexts/InvertColorsContext";
import { HapticProvider } from "@/contexts/HapticContext";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { ReadingPositionProvider } from "@/contexts/ReadingPositionContext";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import { setEsvApiKey } from "@/utils/esvApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";

function RootNavigation() {
	const { invertColors } = useInvertColors();

	useEffect(() => {
		SystemUI.setBackgroundColorAsync(invertColors ? "white" : "black");
		NavigationBar.setVisibilityAsync("hidden");
	}, [invertColors]);

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: "none",
				contentStyle: {
					backgroundColor: invertColors ? "white" : "black",
				},
			}}
		>
			<Stack.Screen name="(tabs)" />
			<Stack.Screen name="settings" />
		</Stack>
	);
}

export default function RootLayout() {
	const [fontsLoaded, fontError] = useFonts({
		"PublicSans-Regular": require("../assets/fonts/PublicSans-Regular.ttf"),
	});

	useEffect(() => {
		setStatusBarHidden(true, "none");
		// Load ESV API key on startup
		AsyncStorage.getItem("@esv-api-key").then((key) => {
			if (key) setEsvApiKey(key);
		});
	}, []);

	useEffect(() => {
		if (fontsLoaded || fontError) {
			SplashScreen.hideAsync().catch(() => {});
		}
	}, [fontsLoaded, fontError]);

	if (!fontsLoaded && !fontError) {
		return null;
	}

	return (
		<InvertColorsProvider>
			<FontSizeProvider>
				<TranslationProvider>
					<ReadingPositionProvider>
						<HapticProvider>
							<RootNavigation />
						</HapticProvider>
					</ReadingPositionProvider>
				</TranslationProvider>
			</FontSizeProvider>
		</InvertColorsProvider>
	);
}
