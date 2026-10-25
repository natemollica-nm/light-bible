.PHONY: deps build test run clean legacy-test legacy-dev

# Install and cache the native Light SDK development environment.
deps:
	@./.agents/setup

# SDK source/dependency policy, Android lint, and native unit tests.
test:
	mise exec -- ./scripts/light-gradle.sh :tool:testDebugUnitTest :tool:lintDebug

# Unsigned release: only Light's build/sign/review process grants approval.
build:
	mise exec -- ./scripts/light-gradle.sh :tool:assembleRelease -DlightSdk.unsigned=true

# Requires an attached Android device with sideloading enabled.
run:
	mise exec -- ./scripts/light-gradle.sh :tool:installDebug

clean:
	mise exec -- ./scripts/light-gradle.sh :tool:clean

# The previous Expo app remains for reference, not Tool Library submission.
legacy-test:
	mise exec -- bun run test --runInBand

legacy-dev:
	mise exec -- bun start
