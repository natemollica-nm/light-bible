# light-bible

A distraction-free Bible reader for the Light Phone III. Monochrome, offline-capable, multi-translation.

## Features

- Read any Bible translation via the [HelloAO Bible API](https://bible.helloao.org)
- Swipe between chapters, jump to any book
- Download full translations for offline reading
- Adjustable font size, black/white theme toggle
- RTL language support (Arabic, Hebrew, etc.)

## Install on Light Phone III

### Via Obtainium (auto-updates)

1. Install [Obtainium](https://github.com/ImranR98/Obtainium) on your Light Phone III
2. Add a new app with source URL: `https://github.com/<owner>/light-bible`
3. Set APK filter to `light-bible-*.apk`
4. Obtainium will notify you of new releases

## Development

### Prerequisites

- [mise](https://github.com/jdx/mise) (tool version manager)
- Android SDK (via Android Studio or cmdline-tools)

### Setup

```bash
make deps    # Install mise tools + project dependencies
make test    # Run tests
make dev     # Start Expo dev server
make run     # Build + run on connected Android device
make build   # Production APK
```

### Release

```bash
# 1. Bump version in app.json
# 2. Tag and push:
make release
```

This creates a git tag and pushes it, triggering the CI pipeline (test → build → GitHub release).

## Project Structure

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for architecture details.

## License

See [LICENSE](LICENSE).
