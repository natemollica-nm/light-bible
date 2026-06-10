.PHONY: deps dev clean build

# Install and configure all development dependencies
deps:
	@./scripts/setup-dev.sh

# Start Expo dev server
dev:
	mise exec -- bun start

# Build production APK locally
build:
	mise exec -- bunx eas build --platform android --profile production --local --output ./light-bible.apk

# Build and run on connected Android device
run:
	mise exec -- bunx expo run:android

# Sync version from app.json to package.json + build.gradle
sync-version:
	mise exec -- bun run sync-version

# Remove build artifacts
clean:
	rm -rf node_modules android/app/build *.apk .expo
