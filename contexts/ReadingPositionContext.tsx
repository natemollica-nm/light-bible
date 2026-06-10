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

interface ReadingPosition {
	bookId: string;
	chapter: number;
}

interface ReadingPositionContextType {
	position: ReadingPosition | null;
	setPosition: (pos: ReadingPosition) => void;
}

const ReadingPositionContext = createContext<ReadingPositionContextType>({
	position: null,
	setPosition: () => {},
});

export const useReadingPosition = () => useContext(ReadingPositionContext);

export const ReadingPositionProvider = ({ children }: { children: ReactNode }) => {
	const [position, setPositionState] = useState<ReadingPosition | null>(null);

	useEffect(() => {
		AsyncStorage.getItem("@reading-position").then((value) => {
			if (value) setPositionState(JSON.parse(value));
		});
	}, []);

	const setPosition = useCallback(async (pos: ReadingPosition) => {
		setPositionState(pos);
		await AsyncStorage.setItem("@reading-position", JSON.stringify(pos));
	}, []);

	const value = useMemo(
		() => ({ position, setPosition }),
		[position, setPosition]
	);

	return (
		<ReadingPositionContext.Provider value={value}>
			{children}
		</ReadingPositionContext.Provider>
	);
};
