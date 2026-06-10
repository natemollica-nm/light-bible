#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.." || exit

# --- Output helpers ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[→]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
fail()    { echo -e "${RED}[✗]${NC} $*"; }

LOGFILE="upgrade-$(date +%Y%m%d-%H%M%S).log"
ERRORS=0

run_step() {
  local label="$1"
  shift
  info "$label"
  if "$@" >> "$LOGFILE" 2>&1; then
    success "$label"
  else
    local code=$?
    fail "$label (exit code: $code)"
    echo "    See $LOGFILE for details"
    return $code
  fi
}

# --- Pre-flight checks ---
echo ""
echo "═══════════════════════════════════════"
echo "  Expo SDK Upgrade"
echo "═══════════════════════════════════════"
echo ""
info "Log file: $LOGFILE"
echo ""

# Check clean working tree
if ! git diff --quiet || ! git diff --cached --quiet; then
  fail "Working tree is dirty. Commit or stash changes first."
  echo ""
  echo "  Uncommitted files:"
  git status --short | head -10
  echo ""
  echo "  Fix: git stash  OR  git add -A && git commit -m 'wip'"
  exit 1
fi
success "Working tree is clean"

# Check we're on main
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  warn "You're on branch '$BRANCH', not 'main'"
  echo "    Consider: git checkout main && git pull"
  echo ""
fi

# --- Step 1: Upgrade Expo ---
echo ""
info "Step 1/5: Upgrading Expo SDK packages..."
if npx expo install --fix >> "$LOGFILE" 2>&1; then
  success "Expo packages upgraded"
else
  fail "Expo upgrade failed"
  echo ""
  echo "  Common fixes:"
  echo "    • Delete node_modules and retry: rm -rf node_modules && bun install"
  echo "    • Check for conflicting resolutions in package.json"
  echo "    • Review $LOGFILE for the specific npm resolution error"
  echo ""
  echo "  To abort: git checkout -- package.json bun.lock"
  ERRORS=$((ERRORS + 1))
fi

# --- Step 2: Reinstall dependencies ---
echo ""
info "Step 2/5: Reinstalling dependencies..."
if bun install >> "$LOGFILE" 2>&1; then
  success "Dependencies installed"
else
  fail "bun install failed"
  echo ""
  echo "  Common fixes:"
  echo "    • rm -rf node_modules && bun install"
  echo "    • Check bun version: bun --version (need 1.3+)"
  echo "    • Review $LOGFILE for resolution conflicts"
  ERRORS=$((ERRORS + 1))
fi

# --- Step 3: Type check ---
echo ""
info "Step 3/5: Type checking..."
if npx tsc --noEmit >> "$LOGFILE" 2>&1; then
  success "TypeScript passes"
else
  fail "TypeScript errors found"
  echo ""
  echo "  Run to see errors: npx tsc --noEmit"
  echo ""
  echo "  Common causes after upgrade:"
  echo "    • Removed/renamed exports from Expo packages"
  echo "    • Changed prop types on components"
  echo "    • New strict checks in updated @types packages"
  ERRORS=$((ERRORS + 1))
fi

# --- Step 4: Tests ---
echo ""
info "Step 4/5: Running tests..."
if npx jest >> "$LOGFILE" 2>&1; then
  success "All tests pass"
else
  fail "Tests failed"
  echo ""
  echo "  Run to see failures: npx jest"
  echo ""
  echo "  Common causes after upgrade:"
  echo "    • jest-expo version mismatch with Expo SDK"
  echo "    • Changed mock behavior in new React Native version"
  echo "    • AsyncStorage mock API changes"
  ERRORS=$((ERRORS + 1))
fi

# --- Step 5: Lint ---
echo ""
info "Step 5/5: Linting..."
if npx eslint . >> "$LOGFILE" 2>&1; then
  success "Lint passes"
else
  warn "Lint issues found (non-blocking)"
  echo "    Run to see: npx eslint ."
  echo "    New lint errors are common after major upgrades — fix separately."
fi

# --- Summary ---
echo ""
echo "═══════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  success "Upgrade completed successfully!"
  echo ""
  echo "  Changed files:"
  git diff --stat
  echo ""
  echo "  Next steps:"
  echo "    1. Review changes:  git diff"
  echo "    2. Test on device:  make run"
  echo "    3. Commit:          git add -A && git commit -m 'chore: upgrade expo sdk'"
  echo "    4. Release:         make release"
else
  fail "Upgrade completed with $ERRORS error(s)"
  echo ""
  echo "  Log file: $LOGFILE"
  echo "  Changed files:"
  git diff --stat
  echo ""
  echo "  Options:"
  echo "    • Fix issues manually, then commit"
  echo "    • Abort upgrade: git checkout -- . && bun install"
  echo "    • Partial rollback: git diff to see what changed, revert specific files"
  echo ""
  exit 1
fi
echo "═══════════════════════════════════════"
