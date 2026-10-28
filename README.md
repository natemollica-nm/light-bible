# light-bible

A distraction-free Bible reader for the Light Phone III, built in Kotlin/Compose
with the official [Light SDK](https://github.com/lightphone/light-sdk).

**Status: SDK-based tool, not yet Light-approved or Light-signed.** Approval is
granted only by Light after its Dashboard build, signing, and review process.

## Features

- Multiple translations from the [HelloAO Bible API](https://bible.helloao.org).
- Book/chapter selection, previous/next buttons, and horizontal chapter swipes.
- Saved reading position, three text sizes, black/white background, RTL text.
- Cache-first reading and resumable, cancellable full-translation downloads.
- Optional ESV using the reader's own Crossway API key; ESV is online-only and
  never cached or offered for download.
- Light SDK navigation/back bar, keyboard, typography, and LightOS haptics.
- No ads, analytics, account registration, push notifications, or background jobs.

## Native development

The submitted application lives entirely in `tool/`. Its identity, version,
permissions, and LightOS server are declared in `tool/lighttool.toml`:
`com.lightbible.reader`, version `2.0.0` / `20000`, server `com.lightos`.
The SDK generates the Android manifest; do not add a custom one.

Light Dashboard also requires the repository-root `gradle.properties` during
build preflight. Keep its `sdkGroup` and `sdkVersion` aligned with the SDK pinned
in `scripts/light-gradle.sh`; the ignored `.light-sdk/gradle.properties` used by
local builds does not replace this published submission file.

Prerequisites: Git, Java 17, and Android SDK platform 36/build-tools 36.0.0.
The existing `.mise.toml` installs the toolchain; `make deps` automates setup on
Linux orbs and accepts Android SDK licenses non-interactively.

```bash
make deps     # Install/cache tools and native debug build
make test     # Native unit tests, Android lint, SDK policy checks
make build    # Unsigned release APK (not an approved distribution)
make run      # Install debug APK on an attached Android device
```

`scripts/light-gradle.sh` fetches the official SDK into ignored `.light-sdk/`,
pinned to [SDK commit 92b8b86](https://github.com/lightphone/light-sdk/commit/92b8b862de5be677a3c68146ba98adf5bf19d7cc)
(SDK 0.2.2). It overlays this repository's `tool/` into the SDK workspace without
modifying upstream policy, lint, or SDK source. The SDK's own Gradle wrapper and
version catalog supply build dependencies. To use Android Studio, run the script
once and open `.light-sdk/` as the project. Update the pinned revision deliberately
when Light publishes a new SDK, and rerun tests and lint before submitting.

Outputs:

- Debug: `tool/build/outputs/apk/debug/tool-debug.apk` (local Android debug key).
- Release: `tool/build/outputs/apk/release/tool-release-unsigned.apk`.
- Tests: `tool/build/reports/tests/testDebugUnitTest/`.
- Lint: `tool/build/reports/lint-results-debug.html`.

The CI workflow tests/lints/builds the native tool. The tag/manual build workflow
produces an **unsigned artifact only**, not a GitHub release or approved APK.

### Amp orbs

`.agents/setup` installs the pinned toolchains, Android SDK packages, official
Light SDK, and caches a native debug build and its Gradle dependencies. Repeated
runs reuse those caches. It also retains the frozen Bun dependencies for the old
Expo reference. Login shells in this repository receive the mise environment;
`.agents/resume` performs no installations or authentication.

No Expo token, signing secret, database, or API key is needed to build or test.
Native Android UI verification requires a connected device or a non-orb machine
with Light's emulator; Linux orbs cannot run an Android emulator. A browser
preview of the old Expo app is **not** verification of the native tool.

## Tool Library submission

Follow Light's [submission instructions](https://github.com/lightphone/light-sdk#submitting-your-tool)
and [Tool Guidelines](https://github.com/lightphone/light-sdk/blob/main/TOOL_GUIDELINES.md).

1. Run `make test` and `make build`, and verify on a Light Phone III running a
   compatible LightOS release. Check back navigation, keyboard/filtering, swipes,
   RTL, both backgrounds, all text sizes, offline restart, download interruption,
   removal, and optional ESV with your own key. Capture genuine device screenshots.
2. Review third-party Bible text licenses and Crossway's API terms. Source-code
   licensing does not grant redistribution rights to every Bible translation.
3. Ensure this repository and the intended commit are public. In the Light
   Dashboard: **Settings → Account → Developer Account → Manage Custom Tools →
   Submit New Tool**. Use this repository and the package from `lighttool.toml`.
4. Add at least one real screenshot and a description. Submit the Git ref for
   Light to build and sign. Increment `versionCode` for subsequent submissions.
5. Resolve build/review feedback. A successful build is still **pending approval**;
   only Light can add the tool to its approved library.

Do not use the old Expo `scripts/release.sh` flow for the native tool. Do not
describe a debug or unsigned APK as Light-approved.

### Moving from the sideloaded Expo app

The package name is retained, but Light's signing certificate will differ from a
locally/EAS-signed app. Android may require uninstalling the old APK before the
Light-signed version can be installed. **Uninstalling removes app data.** Note
your reading position and translation first; re-enter your ESV key and re-download
translations afterward. This version does not migrate Expo AsyncStorage data.

The original `app/`, `components/`, `contexts/`, `utils/`, `android/`, and Expo
configuration remain as a reference. They are not compiled into the Light tool
or extracted by Light's builder. `make legacy-test` / `make legacy-dev` still run
that reference app; the old implementation plan describes that version only.

## Privacy and text rights

HelloAO receives your IP address and the translation/chapter URLs you request.
Offline cached reads do not contact it. ESV requests send the selected passage
and your API key **only** to `api.esv.org` over HTTPS. The key is held in app-private
settings until forgotten; ESV passage text stays in memory only. Settings and
cached translations use app-private storage; Android/SDK backup policies apply.
Downloads run while the app is in use and pause when it is backgrounded.
Opening another chapter or loading the translation catalog also pauses a bulk
download so reading is not blocked behind it.

The tool declares Internet access only. The current upstream SDK additionally
merges permissions for its shared components (including camera, vibration,
connectivity, and WorkManager). Bible does not request camera access or schedule
background work. These upstream manifests are left unmodified so local builds
match Light's builder; review the final APK permissions during submission.

This project is not affiliated with Light, HelloAO, or Crossway. Bible texts
retain their own licenses and copyright. ESV attribution is displayed with each
ESV chapter. Source code is licensed under [MIT](LICENSE).
