#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/release.sh          - bump patch, tag, push
#   ./scripts/release.sh minor    - bump minor, tag, push
#   ./scripts/release.sh major    - bump major, tag, push
#   ./scripts/release.sh recreate - retag current version, push

# Ensure we're running from the project root
cd "$(dirname "$0")/.."

BUMP="${1:-patch}"
APP_JSON="app.json"

current_version() {
  node -p "require('./$APP_JSON').expo.version"
}

set_version() {
  local new_version="$1"
  node -e "
    const fs = require('fs');
    const app = JSON.parse(fs.readFileSync('$APP_JSON', 'utf-8'));
    app.expo.version = '$new_version';
    fs.writeFileSync('$APP_JSON', JSON.stringify(app, null, 2) + '\n');
  "
}

validate_semver() {
  local version="$1"
  if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Version '$version' is not valid semver (expected X.Y.Z)"
    exit 1
  fi
}

VERSION=$(current_version)
validate_semver "$VERSION"

if [ "$BUMP" = "recreate" ]; then
  TAG="v${VERSION}"
  echo "Recreating tag $TAG for current version..."
  git tag -d "$TAG" 2>/dev/null || true
  git push origin ":refs/tags/$TAG" 2>/dev/null || true
  git tag -a "$TAG" -m "Release $TAG"
  git push origin "$TAG"
  echo "Tag $TAG pushed — release workflow will start."
  exit 0
fi

# Parse semver
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "Usage: $0 [patch|minor|major|recreate]"; exit 1 ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
TAG="v${NEW_VERSION}"

echo "Bumping version: ${VERSION} → ${NEW_VERSION}"
set_version "$NEW_VERSION"
node scripts/sync-version.js

# Stage all version-related files
git add app.json package.json
[ -f android/app/build.gradle ] && git add android/app/build.gradle
git commit -m "chore: bump version to ${NEW_VERSION}"
git tag -a "$TAG" -m "Release $TAG"
git push origin HEAD "$TAG"
echo "Tag $TAG pushed — release workflow will start."
