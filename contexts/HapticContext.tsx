import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface HapticContextType {
	triggerHaptic: () => void;
	hapticEnabled: boolean;
	setHapticEnabled: (enabled: boolean) => void;
}

const HapticContext = createContext<HapticContextType>({
	triggerHaptic: () => {},
	hapticEnabled: true,
	setHapticEnabled: () => {},
});

export const useHaptic = () => useContext(HapticContext);

export const HapticProvider = ({ children }: { children: ReactNode }) => {
	const [hapticEnabled, setHapticEnabledState] = useState(true);

	useEffect(() => {
		AsyncStorage.getItem("@haptic-enabled").then((value) => {
			if (value !== null) setHapticEnabledState(value === "true");
		});
	}, []);

	const setHapticEnabled = useCallback(async (enabled: boolean) => {
		setHapticEnabledState(enabled);
		await AsyncStorage.setItem("@haptic-enabled", String(enabled));
	}, []);

	const triggerHaptic = useCallback(() => {
		if (hapticEnabled) {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		}
	}, [hapticEnabled]);

	const value = useMemo(
		() => ({ triggerHaptic, hapticEnabled, setHapticEnabled }),
		[triggerHaptic, hapticEnabled, setHapticEnabled]
	);

	return (
		<HapticContext.Provider value={value}>
			{children}
		</HapticContext.Provider>
	);
};
