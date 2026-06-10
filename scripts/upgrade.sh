#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Expo SDK Upgrade ==="
echo ""
echo "This will upgrade Expo SDK and all related dependencies."
echo "It handles cross-dependency coordination that Dependabot cannot."
echo ""

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: You have uncommitted changes. Commit or stash them first."
  exit 1
fi

# Run Expo upgrade
echo "Running npx expo upgrade..."
npx expo install --fix
echo ""

# Reinstall to sync lockfile
echo "Reinstalling dependencies..."
bun install
echo ""

# Run tests
echo "Running tests..."
npx jest
echo ""

# Type check
echo "Type checking..."
npx tsc --noEmit
echo ""

# Lint
echo "Linting..."
npx eslint . || true
echo ""

# Show what changed
echo "=== Changed files ==="
git diff --stat
echo ""

echo "Review the changes above, then:"
echo "  git add -A && git commit -m 'chore: upgrade expo sdk'"
echo "  make release"
