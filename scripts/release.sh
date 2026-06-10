#!/usr/bin/env bash
set -euo pipefail

# Reads version from app.json, creates/recreates a git tag, and pushes it to trigger a release.

VERSION=$(node -p "require('./app.json').expo.version")
TAG="v${VERSION}"

# Delete existing tag if present (local + remote)
if git rev-parse "$TAG" &>/dev/null; then
  echo "Tag $TAG exists, replacing..."
  git tag -d "$TAG"
  git push origin ":refs/tags/$TAG" 2>/dev/null || true
fi

echo "Creating tag: $TAG"
git tag -a "$TAG" -m "Release $TAG"
git push origin "$TAG"
echo "Tag $TAG pushed — release workflow will start."
