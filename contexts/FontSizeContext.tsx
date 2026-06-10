import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useMemo,
	useCallback,
	ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { n } from "@/utils/scaling";

interface FontSizeContextType {
	fontSize: number;
	setFontSize: (size: number) => void;
}

const DEFAULT_SIZE = n(18);
const MIN_SIZE = n(14);
const MAX_SIZE = n(28);

const FontSizeContext = createContext<FontSizeContextType>({
	fontSize: DEFAULT_SIZE,
	setFontSize: () => {},
});

export const useFont = () => useContext(FontSizeContext);
export { MIN_SIZE, MAX_SIZE, DEFAULT_SIZE };

export const FontSizeProvider = ({ children }: { children: ReactNode }) => {
	const [fontSize, setFontSizeState] = useState(DEFAULT_SIZE);

	useEffect(() => {
		AsyncStorage.getItem("@font-size").then((value) => {
			if (value) setFontSizeState(Number(value));
		});
	}, []);

	const setFontSize = useCallback(async (size: number) => {
		const clamped = Math.max(MIN_SIZE, Math.min(MAX_SIZE, size));
		setFontSizeState(clamped);
		await AsyncStorage.setItem("@font-size", String(clamped));
	}, []);

	const value = useMemo(
		() => ({ fontSize, setFontSize }),
		[fontSize, setFontSize]
	);

	return (
		<FontSizeContext.Provider value={value}>
			{children}
		</FontSizeContext.Provider>
	);
};
