#!/usr/bin/env bash
set -euo pipefail

# Reads version from app.json, creates a git tag, and pushes it to trigger a release.

VERSION=$(node -p "require('./app.json').expo.version")
TAG="v${VERSION}"

if git rev-parse "$TAG" &>/dev/null; then
  echo "Error: Tag $TAG already exists. Bump version in app.json first."
  exit 1
fi

echo "Creating tag: $TAG"
git tag -a "$TAG" -m "Release $TAG"
git push origin "$TAG"
echo "Tag $TAG pushed — release workflow will start."
