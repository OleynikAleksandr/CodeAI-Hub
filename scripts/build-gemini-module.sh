#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"
source "$SCRIPT_DIR/release-utils.sh"

MODULE_DIR="$REPO_ROOT/packages/Gemini_Module"
DIST_ROOT="$REPO_ROOT/doc/tmp/releases"
INSTALL_ROOT="$HOME/.codeai-hub/providers/gemini"
MANIFEST_PATH="$REPO_ROOT/assets/providers/gemini/manifest.json"
LOCAL_RELEASE_DIR="$HOME/.codeai-hub/releases"
PROVIDER_DOWNLOAD_DIR="$HOME/.codeai-hub/providers/gemini/downloads"

usage() {
  cat <<USAGE
Gemini Module build script
Usage: ./scripts/build-gemini-module.sh [--version <semver>] [--clean]
USAGE
}

get_file_size() {
  local target="$1"
  if [[ "$(uname -s)" == "Darwin" ]]; then
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

CLEAN=false
CUSTOM_VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      shift
      CUSTOM_VERSION=${1:-}
      if [[ -z "$CUSTOM_VERSION" ]]; then
        echo "Missing value for --version" >&2
        exit 1
      fi
      ;;
    --clean)
      CLEAN=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

cd "$MODULE_DIR"

if [[ -z "$CUSTOM_VERSION" ]]; then
  MODULE_VERSION=$(node -p "require('./package.json').version")
else
  MODULE_VERSION="$CUSTOM_VERSION"
fi

echo "📦 Building Gemini module v$MODULE_VERSION"

echo "📥 Installing deps..."
npm install >/dev/null

echo "🔧 Compiling TypeScript..."
npm run build >/dev/null

STAGE_DIR="$(mktemp -d)"
mkdir -p "$STAGE_DIR/dist"
cp -R dist/* "$STAGE_DIR/dist/"
cp package.json "$STAGE_DIR/package.json"
if [[ -f package-lock.json ]]; then
  cp package-lock.json "$STAGE_DIR/package-lock.json"
fi

echo "📦 Installing runtime dependencies..."
(cd "$STAGE_DIR" && npm install --omit=dev --ignore-scripts >/dev/null)

TARGET_DIR="$INSTALL_ROOT/$MODULE_VERSION"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp -R "$STAGE_DIR"/* "$TARGET_DIR"
echo -n "$MODULE_VERSION" > "$INSTALL_ROOT/latest"

echo "✅ Installed to $TARGET_DIR"

mkdir -p "$DIST_ROOT" "$LOCAL_RELEASE_DIR" "$PROVIDER_DOWNLOAD_DIR"

ARCHIVE_NAME="gemini-module-$MODULE_VERSION.tar.bz2"
ARCHIVE_PATH="$DIST_ROOT/$ARCHIVE_NAME"

(cd "$STAGE_DIR" && tar -cjf "$ARCHIVE_PATH" .)
cp "$ARCHIVE_PATH" "$LOCAL_RELEASE_DIR/$ARCHIVE_NAME"
cp "$ARCHIVE_PATH" "$PROVIDER_DOWNLOAD_DIR/$ARCHIVE_NAME"

clean_release_dir "$DIST_ROOT"

PACKAGE_SIZE=$(get_file_size "$ARCHIVE_PATH")
PACKAGE_SHA1=$(compute_sha1 "$ARCHIVE_PATH")

GEMINI_PACKAGE_NAME="$ARCHIVE_NAME" \
GEMINI_PACKAGE_SIZE="$PACKAGE_SIZE" \
GEMINI_PACKAGE_SHA1="$PACKAGE_SHA1" \
GEMINI_MODULE_VERSION="$MODULE_VERSION" \
MANIFEST_PATH="$MANIFEST_PATH" \
  node <<'NODE'
const fs = require("node:fs");
const manifestPath = process.env.MANIFEST_PATH;
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.module = {
  version: process.env.GEMINI_MODULE_VERSION,
  package: process.env.GEMINI_PACKAGE_NAME,
  size: Number(process.env.GEMINI_PACKAGE_SIZE),
  sha1: process.env.GEMINI_PACKAGE_SHA1,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
NODE

if [[ "$CLEAN" == "true" ]]; then
  rm -rf dist
fi

rm -rf "$STAGE_DIR"

echo "📦 Archive ready: $ARCHIVE_PATH"
echo "📂 Local cache: $LOCAL_RELEASE_DIR/$ARCHIVE_NAME"
echo "📂 Provider cache: $PROVIDER_DOWNLOAD_DIR/$ARCHIVE_NAME"
