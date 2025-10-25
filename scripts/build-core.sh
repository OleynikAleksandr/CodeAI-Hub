#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"
CORE_PROJECT_DIR="$REPO_ROOT/packages/core"
DIST_ROOT="$REPO_ROOT/doc/tmp/releases"
MANIFEST_PATH="$REPO_ROOT/assets/core/manifest.json"

usage() {
  cat <<USAGE
CodeAI Hub Core Orchestrator builder

Usage:
  ./scripts/build-core.sh [--version <version>] [--clean]

Options:
  --version   Override core version (default: from package.json)
  --clean     Remove build artifacts after completion

This script builds the CodeAI Hub Core Orchestrator binary and installs it into:
  ~/.codeai-hub/core/<platform>/<version>/
  doc/tmp/releases/

Prerequisites:
  - Node.js >= 20
  - npm workspaces configured
  - pkg installed (npm install -g pkg or use npx)

Currently supported platforms: macOS (arm64/x64), Windows x64, Linux x64.
USAGE
}

CLEAN_FLAG="false"
CUSTOM_VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      shift
      CUSTOM_VERSION=${1:-}
      if [[ -z "$CUSTOM_VERSION" ]]; then
        echo "❌ Missing value for --version" >&2
        exit 1
      fi
      ;;
    --clean)
      CLEAN_FLAG="true"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

if ! command -v node >/dev/null 2>&1; then
  echo "❌ node not found. Install Node.js (>= 20) and re-run the script." >&2
  exit 1
fi

UNAME_S=$(uname -s)
UNAME_M=$(uname -m)

get_file_size() {
  local target="$1"
  if [[ "$UNAME_S" == "Darwin" ]]; then
    stat -f%z "$target"
  else
    stat -c%s "$target"
  fi
}

compute_sha1() {
  local target="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 1 "$target" | awk '{print $1}'
  else
    sha1sum "$target" | awk '{print $1}'
  fi
}

case "$UNAME_S" in
  Darwin)
    case "$UNAME_M" in
      arm64)
        PLATFORM_KEY="darwin-arm64"
        PKG_TARGET="node18-macos-arm64"
        ;;
      x86_64)
        PLATFORM_KEY="darwin-x64"
        PKG_TARGET="node18-macos-x64"
        ;;
      *)
        echo "❌ Unsupported macOS architecture: $UNAME_M" >&2
        exit 1
        ;;
    esac
    ;;
  Linux)
    if [[ "$UNAME_M" != "x86_64" ]]; then
      echo "❌ Unsupported Linux architecture: $UNAME_M" >&2
      exit 1
    fi
    PLATFORM_KEY="linux-x64"
    PKG_TARGET="node18-linux-x64"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    PLATFORM_KEY="win32-x64"
    PKG_TARGET="node18-win-x64"
    ;;
  *)
    echo "❌ Unsupported platform: $UNAME_S" >&2
    exit 1
    ;;
esac

if [[ -z "$CUSTOM_VERSION" ]]; then
  CORE_VERSION=$(node -p "require('$CORE_PROJECT_DIR/package.json').version")
else
  CORE_VERSION="$CUSTOM_VERSION"
fi

echo "📦 Building CodeAI Hub Core v$CORE_VERSION for $PLATFORM_KEY"

cd "$CORE_PROJECT_DIR"

echo "📥 Installing dependencies..."
npm install

echo "🔧 Building TypeScript..."
npm run build

echo "📦 Packaging with pkg..."
npx pkg . --targets "$PKG_TARGET" --compress Brotli --output "$DIST_ROOT/codeai-hub-core-$PLATFORM_KEY"

TARGET_BASE="$HOME/.codeai-hub/core/$PLATFORM_KEY/$CORE_VERSION"
mkdir -p "$TARGET_BASE"

BINARY_NAME="codeai-hub-core-$PLATFORM_KEY"
if [[ "$PLATFORM_KEY" == "win32-x64" ]]; then
  BINARY_NAME="$BINARY_NAME.exe"
fi

if [[ -f "$DIST_ROOT/$BINARY_NAME" ]]; then
  cp "$DIST_ROOT/$BINARY_NAME" "$TARGET_BASE/codeai-hub-core"
  chmod +x "$TARGET_BASE/codeai-hub-core"
  
  cat > "$TARGET_BASE/install.json" <<INSTALL_JSON
{
  "platform": "$PLATFORM_KEY",
  "version": "$CORE_VERSION",
  "installedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
INSTALL_JSON

  echo "✅ Installed to $TARGET_BASE"
  echo "✅ Distribution copy at $DIST_ROOT/$BINARY_NAME"

  ARCHIVE_NAME="codeai-hub-core-$PLATFORM_KEY-$CORE_VERSION.tar.bz2"
  ARCHIVE_PATH="$DIST_ROOT/$ARCHIVE_NAME"
  TEMP_DIR="$(mktemp -d)"
  cp "$DIST_ROOT/$BINARY_NAME" "$TEMP_DIR/codeai-hub-core"
  (cd "$TEMP_DIR" && tar -cjf "$ARCHIVE_PATH" "codeai-hub-core")
  rm -rf "$TEMP_DIR"

  PACKAGE_SIZE=$(get_file_size "$ARCHIVE_PATH")
  PACKAGE_SHA1=$(compute_sha1 "$ARCHIVE_PATH")

  CORE_PACKAGE_NAME="$ARCHIVE_NAME" \
  CORE_PACKAGE_SIZE="$PACKAGE_SIZE" \
  CORE_PACKAGE_SHA1="$PACKAGE_SHA1" \
  CORE_VERSION="$CORE_VERSION" \
  PLATFORM_KEY="$PLATFORM_KEY" \
  MANIFEST_PATH="$MANIFEST_PATH" \
    node <<'EOF'
const fs = require("node:fs");
const manifestPath = process.env.MANIFEST_PATH;
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const key = process.env.PLATFORM_KEY;
if (!manifest.platforms[key]) {
  manifest.platforms[key] = {};
}
manifest.platforms[key].coreVersion = process.env.CORE_VERSION;
manifest.platforms[key].package = process.env.CORE_PACKAGE_NAME;
manifest.platforms[key].size = Number(process.env.CORE_PACKAGE_SIZE);
manifest.platforms[key].sha1 = process.env.CORE_PACKAGE_SHA1;
fs.writeFileSync(
  manifestPath,
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);
EOF

  echo "📦 Archive created at $ARCHIVE_PATH"
  echo "🗂  Updated manifest for $PLATFORM_KEY"
else
  echo "❌ Binary not found at $DIST_ROOT/$BINARY_NAME" >&2
  exit 1
fi

if [[ "$CLEAN_FLAG" == "true" ]]; then
  echo "🧹 Cleaning build artifacts..."
  rm -rf "$CORE_PROJECT_DIR/dist"
fi

echo "🎉 Core orchestrator binary ready"
echo "📦 Runtime location: $TARGET_BASE"
echo "📦 Distribution copy: $DIST_ROOT"
echo "📦 Archive: $DIST_ROOT/codeai-hub-core-$PLATFORM_KEY-$CORE_VERSION.tar.bz2"
echo "📝 Manifest updated: $MANIFEST_PATH"
echo "ℹ️  You can now test with: $TARGET_BASE/codeai-hub-core"
