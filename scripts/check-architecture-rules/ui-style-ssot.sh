#!/bin/bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HAS_VIOLATIONS=0

violation() {
  echo "❌ $1"
  HAS_VIOLATIONS=1
}

assert_file_exists() {
  local file_path="$1"
  local label="$2"
  if [ ! -f "$file_path" ]; then
    violation "$label is missing: ${file_path#$ROOT_DIR/}"
  fi
}

assert_file_absent() {
  local file_path="$1"
  local label="$2"
  if [ -f "$file_path" ]; then
    violation "$label must stay removed: ${file_path#$ROOT_DIR/}"
  fi
}

echo "Checking canonical style owners..."

assert_file_exists "$ROOT_DIR/media/session-view.css" "Session style source"
assert_file_exists "$ROOT_DIR/packages/ui/project-manager/styles.css" "Project Manager style source"
assert_file_exists "$ROOT_DIR/src/client/ui/src/components/settings/style-tokens.ts" "Settings token layer"

assert_file_absent "$ROOT_DIR/src/client/project-manager/styles/layout.css" "Legacy PM layout source"

if rg -n '\.session-|\.settings-overlay' "$ROOT_DIR/packages/ui/project-manager/styles.css" >/dev/null 2>&1; then
  violation "packages/ui/project-manager/styles.css must not define .session-* or .settings-overlay* selectors"
fi

if ! rg -n 'style-tokens' "$ROOT_DIR/src/client/ui/src/components/settings-view.tsx" >/dev/null 2>&1; then
  violation "settings-view.tsx must consume settings style token layer"
fi

if ! rg -n 'style-tokens' "$ROOT_DIR/src/client/ui/src/app-host/settings-only-host.tsx" >/dev/null 2>&1; then
  violation "settings-only-host.tsx must consume settings style token layer"
fi

if [ "$HAS_VIOLATIONS" -eq 1 ]; then
  echo "UI style SSOT guardrails: FAILED"
  exit 1
fi

echo "✅ UI style SSOT guardrails passed"
