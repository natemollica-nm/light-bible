const { readFileSync, writeFileSync } = require("fs");
const { resolve } = require("path");

const root = resolve(__dirname, "..");
const appJson = JSON.parse(readFileSync(resolve(root, "app.json"), "utf-8"));
const version = appJson.expo.version;

// Update package.json
const pkgPath = resolve(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
pkg.version = version;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`package.json → ${version}`);

// Update build.gradle if it exists
const gradlePath = resolve(root, "android/app/build.gradle");
try {
	let gradle = readFileSync(gradlePath, "utf-8");
	gradle = gradle.replace(/versionName "[^"]+"/, `versionName "${version}"`);
	const versionCode = version.split(".").reduce((acc, v, i) => acc + Number(v) * Math.pow(100, 2 - i), 0);
	gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`);
	writeFileSync(gradlePath, gradle);
	console.log(`build.gradle → ${version} (code: ${versionCode})`);
} catch {
	// android/ may not exist yet (prebuild not run)
}
