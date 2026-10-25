#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
sdk="$root/.light-sdk"
# Official Light SDK 0.2.2. Update deliberately, then rerun lint and tests.
revision=92b8b862de5be677a3c68146ba98adf5bf19d7cc

if [[ ! -d "$sdk/.git" ]]; then
  git init --quiet "$sdk"
  git -C "$sdk" remote add origin https://github.com/lightphone/light-sdk.git
fi
if [[ "$(git -C "$sdk" rev-parse HEAD 2>/dev/null || true)" != "$revision" ]]; then
  git -C "$sdk" fetch --quiet --depth 1 origin "$revision"
  if [[ -L "$sdk/tool" ]]; then
    rm "$sdk/tool"
    git -C "$sdk" restore --worktree tool
  fi
  git -C "$sdk" checkout --quiet --detach FETCH_HEAD
fi
# Build our tool against unmodified upstream SDK/plugin/lint modules, just as
# Light's builder overlays tool/ onto its pinned SDK. Never copy the SDK into git.
if [[ ! -L "$sdk/tool" ]]; then
  rm -rf "$sdk/tool"
  ln -s ../tool "$sdk/tool"
fi
exec "$sdk/gradlew" -p "$sdk" -DlightSdk.toolOnly=true --no-daemon --max-workers=2 "$@"
