#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# --- mise ---
if ! command -v mise &>/dev/null; then
  echo "Installing mise..."
  curl https://mise.run | sh
  eval "$(mise activate bash)"
fi
info "mise $(mise --version | head -1)"

# --- Install tools via mise ---
echo ""
echo "Installing tools via mise (.mise.toml)..."
mise install
info "bun $(mise exec -- bun --version)"
info "node $(mise exec -- node --version)"
info "java $(mise exec -- java -version 2>&1 | head -1)"

# --- Android SDK ---
echo ""
# Try common locations
ANDROID_HOME="${ANDROID_HOME:-}"
if [ -z "$ANDROID_HOME" ]; then
  for candidate in \
    "$HOME/Library/Android/sdk" \
    "$HOME/Android/Sdk" \
    "/opt/homebrew/share/android-commandlinetools" \
    "/usr/local/share/android-commandlinetools"; do
    if [ -d "$candidate" ]; then
      ANDROID_HOME="$candidate"
      break
    fi
  done
fi

if [ -z "$ANDROID_HOME" ] || [ ! -d "$ANDROID_HOME" ]; then
  warn "Android SDK not found"
  echo "  Option A: Install Android Studio from https://developer.android.com/studio"
  echo "  Option B: brew install --cask android-commandlinetools"
  echo ""
  echo "  Then run:"
  echo "    sdkmanager 'platforms;android-35' 'build-tools;35.0.0' 'platform-tools'"
  echo ""
  echo "  Set ANDROID_HOME in your shell profile or .mise.toml [env] section."
else
  info "Android SDK at $ANDROID_HOME"
  SDK_MGR=""
  if [ -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
    SDK_MGR="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
  elif command -v sdkmanager &>/dev/null; then
    SDK_MGR="sdkmanager"
  fi
  if [ -n "$SDK_MGR" ]; then
    echo "  Ensuring required SDK packages..."
    yes | $SDK_MGR --licenses &>/dev/null 2>&1 || true
    $SDK_MGR "platforms;android-35" "build-tools;35.0.0" "platform-tools" 2>/dev/null || \
      warn "Could not install SDK packages. Run sdkmanager manually."
    info "Android SDK packages OK"
  fi
fi

# --- EAS CLI ---
echo ""
if ! mise exec -- bun pm ls -g 2>/dev/null | grep -q eas-cli; then
  echo "Installing EAS CLI globally..."
  mise exec -- bun add -g eas-cli
fi
info "eas-cli installed"

# --- Project init (if no package.json) ---
echo ""
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
  echo "Initializing project files..."

  cat > "$PROJECT_ROOT/package.json" <<'EOF'
{
  "name": "light-bible",
  "main": "expo-router/entry",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "sync-version": "node scripts/sync-version.js",
    "generate-icon": "node scripts/generate-icon.js"
  },
  "dependencies": {
    "@expo/vector-icons": "^15.0.3",
    "@react-native-async-storage/async-storage": "2.2.0",
    "expo": "~54.0.31",
    "expo-font": "~14.0.10",
    "expo-haptics": "~15.0.8",
    "expo-navigation-bar": "~5.0.10",
    "expo-router": "~6.0.21",
    "expo-splash-screen": "~31.0.13",
    "expo-status-bar": "~3.0.9",
    "expo-system-ui": "~6.0.9",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-safe-area-context": "~5.6.2",
    "react-native-screens": "~4.16.0"
  },
  "devDependencies": {
    "@babel/core": "^7.28.6",
    "@types/react": "~19.1.10",
    "typescript": "~5.9.2"
  }
}
EOF

  cat > "$PROJECT_ROOT/app.json" <<'EOF'
{
  "expo": {
    "name": "Bible",
    "slug": "light-bible",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "light-bible",
    "newArchEnabled": true,
    "icon": "./assets/images/icon.png",
    "android": {
      "backgroundColor": "#000000",
      "package": "com.lightbible.reader",
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.VIBRATE"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-font"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
EOF

  cat > "$PROJECT_ROOT/tsconfig.json" <<'EOF'
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
EOF

  cat > "$PROJECT_ROOT/eas.json" <<'EOF'
{
  "cli": {
    "appVersionSource": "local"
  },
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
EOF

  info "Project config files created"
fi

# --- Project dependencies ---
echo "Installing project dependencies..."
mise exec -- bun install
info "Project dependencies installed"

# --- Summary ---
echo ""
echo "========================================="
info "Development environment ready!"
echo ""
echo "  Activate mise in your shell:"
echo "    eval \"\$(mise activate bash)\"   # or zsh/fish"
echo ""
echo "  Quick start:"
echo "    make dev              # Expo dev server"
echo "    make run              # Build + run on device"
echo ""
echo "========================================="
