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

interface TranslationContextType {
	translationId: string | null;
	setTranslationId: (id: string) => void;
}

const TranslationContext = createContext<TranslationContextType>({
	translationId: null,
	setTranslationId: () => {},
});

export const useTranslation = () => useContext(TranslationContext);

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
	const [translationId, setTranslationIdState] = useState<string | null>(null);

	useEffect(() => {
		AsyncStorage.getItem("@selected-translation").then((value) => {
			if (value) setTranslationIdState(value);
		});
	}, []);

	const setTranslationId = useCallback(async (id: string) => {
		setTranslationIdState(id);
		await AsyncStorage.setItem("@selected-translation", id);
	}, []);

	const value = useMemo(
		() => ({ translationId, setTranslationId }),
		[translationId, setTranslationId]
	);

	return (
		<TranslationContext.Provider value={value}>
			{children}
		</TranslationContext.Provider>
	);
};
