jest.mock("@react-native-async-storage/async-storage", () =>
	require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Suppress VirtualizedList act() warning from FlatList internal timers
const originalError = console.error;
console.error = (...args) => {
	if (typeof args[0] === "string" && args[0].includes("not wrapped in act")) return;
	originalError(...args);
};
