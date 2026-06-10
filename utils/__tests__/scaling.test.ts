import { n, getDensityNormalization } from "../scaling";

jest.mock("react-native", () => ({
	PixelRatio: { get: () => 2.55 },
}));

describe("scaling", () => {
	it("returns the input unchanged at target density", () => {
		expect(n(16)).toBeCloseTo(16);
		expect(n(0)).toBe(0);
	});

	it("getDensityNormalization returns 1 at target density", () => {
		expect(getDensityNormalization()).toBeCloseTo(1);
	});
});
