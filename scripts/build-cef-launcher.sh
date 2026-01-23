#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"
LAUNCHER_PROJECT_DIR="$REPO_ROOT/packages/cef-launcher"
DOC_RELEASES_DIR="$REPO_ROOT/doc/tmp/releases"
MANIFEST_PATH="$REPO_ROOT/assets/launcher/manifest.json"

CEF_VERSION="141.0.10+g1d65b0d+chromium-141.0.7390.123"
CEF_LINUX_VERSION="142.0.4+g8cfb2b2+chromium-142.0.7444.34"

usage() {
  cat <<USAGE
CodeAI Hub custom CEF launcher builder

Usage:
  ./scripts/build-cef-launcher.sh [--cef-version <version>] [--launcher-version <version>] [--force]

Options:
  --cef-version       Override CEF version (default: $CEF_VERSION for macOS,
                      $CEF_LINUX_VERSION for Linux)
  --launcher-version  Override launcher version (default: from manifest)
  --force             Remove temporary build directory after completion

This script downloads the official *minimal* CEF distribution, builds the
CodeAIHubLauncher binary and installs it into:
  ~/.codeai-hub/cef-launcher/<platform>/...

Prerequisites:
  - cmake >= 3.20
  - Ninja (optional, improves build speed)
  - clang/clang++ (macOS) or gcc/clang (Linux)
  - curl, tar

Currently supported platforms: macOS (arm64/x64) and Linux x64.
Windows support will be added in a later iteration.
USAGE
}

CLEAN_FLAG="false"
CUSTOM_VERSION=""
CUSTOM_LAUNCHER_VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cef-version)
      shift
      CUSTOM_VERSION=${1:-}
      if [[ -z "$CUSTOM_VERSION" ]]; then
        echo "❌ Missing value for --cef-version" >&2
        exit 1
      fi
      ;;
    --launcher-version)
      shift
      CUSTOM_LAUNCHER_VERSION=${1:-}
      if [[ -z "$CUSTOM_LAUNCHER_VERSION" ]]; then
        echo "❌ Missing value for --launcher-version" >&2
        exit 1
      fi
      ;;
    --force)
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

if ! command -v cmake >/dev/null 2>&1; then
  echo "❌ cmake not found. Install CMake (e.g. via Homebrew: brew install cmake) and re-run the script." >&2
  exit 1
fi

GENERATOR_ARGS=()
if command -v ninja >/dev/null 2>&1; then
  GENERATOR_ARGS=(-G "Ninja")
fi

UNAME_S=$(uname -s)
UNAME_M=$(uname -m)

case "$UNAME_S" in
  Darwin)
    case "$UNAME_M" in
      arm64)
        PLATFORM_KEY="darwin-arm64"
        FILE_PLATFORM="macos-arm64"
        CEF_PLATFORM="macosarm64"
        ;;
      x86_64)
        PLATFORM_KEY="darwin-x64"
        FILE_PLATFORM="macos-x64"
        CEF_PLATFORM="macosx64"
        ;;
      *)
        echo "❌ Unsupported macOS architecture: $UNAME_M" >&2
        exit 1
        ;;
    esac
    EFFECTIVE_VERSION=${CUSTOM_VERSION:-$CEF_VERSION}
    ;;
  Linux)
    if [[ "$UNAME_M" != "x86_64" ]]; then
      echo "❌ Unsupported Linux architecture: $UNAME_M" >&2
      exit 1
    fi
    PLATFORM_KEY="linux-x64"
    FILE_PLATFORM="linux-x64"
    CEF_PLATFORM="linux64"
    EFFECTIVE_VERSION=${CUSTOM_VERSION:-$CEF_LINUX_VERSION}
    ;;
  *)
    echo "❌ Unsupported platform: $UNAME_S" >&2
    exit 1
    ;;
esac

if [[ -z "${FILE_PLATFORM:-}" ]]; then
  echo "❌ Unsupported platform mapping: $PLATFORM_KEY" >&2
  exit 1
fi

CEF_ARCHIVE_NAME="cef_binary_${EFFECTIVE_VERSION}_${CEF_PLATFORM}_minimal.tar.bz2"
DOWNLOAD_URL="https://cef-builds.spotifycdn.com/${CEF_ARCHIVE_NAME}"
WORK_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/cef-launcher-build-XXXXXX")
ARCHIVE_PATH="$WORK_ROOT/$CEF_ARCHIVE_NAME"
BUILD_DIR="$WORK_ROOT/build"

cleanup() {
  if [[ -n "${STAGING_DIR:-}" && -d "$STAGING_DIR" ]]; then
    rm -rf "$STAGING_DIR"
  fi
  if [[ "$CLEAN_FLAG" == "true" ]]; then
    rm -rf "$WORK_ROOT"
  fi
}
trap cleanup EXIT

echo "📦 Downloading $DOWNLOAD_URL"
curl -L "$DOWNLOAD_URL" -o "$ARCHIVE_PATH"

echo "📂 Extracting archive..."
tar -xjf "$ARCHIVE_PATH" -C "$WORK_ROOT"
CEF_EXTRACT_DIR=$(find "$WORK_ROOT" -maxdepth 1 -type d -name "cef_binary_*" | head -n 1)
if [[ -z "$CEF_EXTRACT_DIR" ]]; then
  echo "❌ Failed to locate extracted CEF directory" >&2
  exit 1
fi

mkdir -p "$BUILD_DIR"

echo "🔧 Configuring CodeAIHubLauncher..."
cmake "${GENERATOR_ARGS[@]}" \
      -S "$LAUNCHER_PROJECT_DIR" \
      -B "$BUILD_DIR" \
      -DCEF_ROOT="$CEF_EXTRACT_DIR" \
      -DCMAKE_BUILD_TYPE=Release \
      -DCEF_USE_SANDBOX=OFF

echo "🛠️  Building CodeAIHubLauncher..."
cmake --build "$BUILD_DIR" --target CodeAIHubLauncher --config Release

OUTPUT_ROOT="$BUILD_DIR/out"
CEF_RELEASE_DIR="$CEF_EXTRACT_DIR/Release"
CEF_RESOURCE_DIR="$CEF_EXTRACT_DIR/Resources"
CEF_FRAMEWORK_DIR="$CEF_RELEASE_DIR/Chromium Embedded Framework.framework"
CEF_FRAMEWORK_RESOURCES="$CEF_FRAMEWORK_DIR/Resources"

TARGET_BASE="$HOME/.codeai-hub/cef-launcher/$PLATFORM_KEY"
STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/cef-launcher-package-XXXXXX")"
STAGING_PAYLOAD="$STAGING_DIR/$PLATFORM_KEY"
LOCAL_RELEASE_DIR="$HOME/.codeai-hub/releases"
DOC_RELEASES_PATH="$LOCAL_RELEASE_DIR"
DOWNLOADS_DIR="$HOME/.codeai-hub/cef-launcher/$PLATFORM_KEY/downloads"

mkdir -p "$TARGET_BASE" "$STAGING_PAYLOAD" "$LOCAL_RELEASE_DIR" "$DOWNLOADS_DIR"

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

resolve_manifest_version() {
  node - "$1" "$2" <<'EOF'
const { readFileSync } = require("node:fs");
const path = process.argv[2];
const platformKey = process.argv[3];
try {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  const entry = manifest.platforms?.[platformKey];
  if (entry && typeof entry.launcherVersion === "string") {
    console.log(entry.launcherVersion);
  }
} catch {
  // ignore
}
EOF
}

if [[ -n "$CUSTOM_LAUNCHER_VERSION" ]]; then
  LAUNCHER_VERSION="$CUSTOM_LAUNCHER_VERSION"
else
  LAUNCHER_VERSION="$(resolve_manifest_version "$MANIFEST_PATH" "$PLATFORM_KEY")"
fi

if [[ -z "$LAUNCHER_VERSION" ]]; then
  echo "❌ Launcher version not provided and manifest has no entry for $PLATFORM_KEY" >&2
  exit 1
fi

echo "ℹ️  Using launcher version: $LAUNCHER_VERSION"

ARCHIVE_NAME="CodeAIHubLauncher-${FILE_PLATFORM}-${LAUNCHER_VERSION}.tar.bz2"
ARCHIVE_PATH="$DOC_RELEASES_PATH/$ARCHIVE_NAME"

copy_common_files() {
  local destination="$1"
  mkdir -p "$destination"
  local source_root="$CEF_RELEASE_DIR"
  if [[ -d "$CEF_FRAMEWORK_RESOURCES" ]]; then
    source_root="$CEF_FRAMEWORK_RESOURCES"
  fi
  cp -f "$source_root"/icudtl.dat "$destination" 2>/dev/null || true
  cp -f "$source_root"/natives_blob.bin "$destination" 2>/dev/null || true
  cp -f "$source_root"/snapshot_blob.bin "$destination" 2>/dev/null || true
  cp -f "$source_root"/v8_context_snapshot.bin "$destination" 2>/dev/null || true
  cp -f "$source_root"/*.pak "$destination" 2>/dev/null || true
  cp -f "$source_root"/*.bin "$destination" 2>/dev/null || true
  if [[ -d "$source_root/locales" ]]; then
    mkdir -p "$destination/locales"
    cp -R "$source_root/locales/"* "$destination/locales/"
  fi
}

if [[ "$UNAME_S" == "Darwin" ]]; then
  APP_SOURCE="$OUTPUT_ROOT/CodeAIHubLauncher.app"
  if [[ ! -d "$APP_SOURCE" ]]; then
    echo "❌ Built app not found at $APP_SOURCE" >&2
    exit 1
  fi

  for target in "$TARGET_BASE" "$STAGING_PAYLOAD"; do
    rm -rf "$target/CodeAIHubLauncher.app"
    mkdir -p "$target"
    cp -R "$APP_SOURCE" "$target/CodeAIHubLauncher.app"

    FRAMEWORK_DEST="$target/CodeAIHubLauncher.app/Contents/Frameworks"
    RESOURCE_DEST="$target/CodeAIHubLauncher.app/Contents/Resources"
    mkdir -p "$FRAMEWORK_DEST" "$RESOURCE_DEST"

    if [[ -d "$CEF_FRAMEWORK_DIR" ]]; then
      rsync -a "$CEF_FRAMEWORK_DIR" "$FRAMEWORK_DEST/"
    fi
    if [[ -d "$CEF_RESOURCE_DIR" ]]; then
      rsync -a "$CEF_RESOURCE_DIR/" "$RESOURCE_DEST/"
    fi
    copy_common_files "$RESOURCE_DEST"

    pushd "$target" >/dev/null
    ln -sfn "CodeAIHubLauncher.app/Contents/Frameworks/Chromium Embedded Framework.framework" \
      "Chromium Embedded Framework.framework"
    popd >/dev/null
  done

  echo "✅ Installed CodeAIHubLauncher.app"
else
  BIN_SOURCE="$OUTPUT_ROOT/CodeAIHubLauncher"
  if [[ ! -f "$BIN_SOURCE" ]]; then
    echo "❌ Built binary not found at $BIN_SOURCE" >&2
    exit 1
  fi

  for target in "$TARGET_BASE" "$STAGING_PAYLOAD"; do
    mkdir -p "$target"
    install -m 755 "$BIN_SOURCE" "$target/codeai-hub-launcher"
    copy_common_files "$target"
    cp -f "$CEF_RELEASE_DIR"/*.so* "$target" 2>/dev/null || true
  done

  echo "✅ Installed codeai-hub-launcher"
fi

echo "🗜️  Creating distribution archive..."
rm -f "$ARCHIVE_PATH"
tar -cjf "$ARCHIVE_PATH" -C "$STAGING_DIR" "$PLATFORM_KEY"

find "$LOCAL_RELEASE_DIR" -maxdepth 1 -type f -name "CodeAIHubLauncher-${FILE_PLATFORM}-*.tar.bz2" ! -name "$ARCHIVE_NAME" -exec rm -f {} +
find "$DOWNLOADS_DIR" -maxdepth 1 -type f -name "CodeAIHubLauncher-${FILE_PLATFORM}-*.tar.bz2" ! -name "$ARCHIVE_NAME" -exec rm -f {} +
cp "$ARCHIVE_PATH" "$DOWNLOADS_DIR/$ARCHIVE_NAME"

PACKAGE_SIZE=$(get_file_size "$ARCHIVE_PATH")
PACKAGE_SHA1=$(compute_sha1 "$ARCHIVE_PATH")

MANIFEST_PATH="$MANIFEST_PATH" \
PLATFORM_KEY="$PLATFORM_KEY" \
LAUNCHER_VERSION="$LAUNCHER_VERSION" \
ARCHIVE_NAME="$ARCHIVE_NAME" \
PACKAGE_SIZE="$PACKAGE_SIZE" \
PACKAGE_SHA1="$PACKAGE_SHA1" \
  node <<'EOF'
const { readFileSync, writeFileSync } = require("node:fs");
const path = process.env.MANIFEST_PATH;
const platformKey = process.env.PLATFORM_KEY;
const version = process.env.LAUNCHER_VERSION;
const packageName = process.env.ARCHIVE_NAME;
const packageSize = Number(process.env.PACKAGE_SIZE);
const packageSha1 = process.env.PACKAGE_SHA1;

const manifest = JSON.parse(readFileSync(path, "utf8"));
if (!manifest.platforms) {
  manifest.platforms = {};
}
if (!manifest.platforms[platformKey]) {
  manifest.platforms[platformKey] = {};
}
manifest.platforms[platformKey].launcherVersion = version;
manifest.platforms[platformKey].package = packageName;
manifest.platforms[platformKey].size = packageSize;
manifest.platforms[platformKey].sha1 = packageSha1;

writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
EOF

INSTALL_METADATA_PATH="$TARGET_BASE/install.json"
INSTALLED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > "$INSTALL_METADATA_PATH" <<EOF
{
  "platform": "$PLATFORM_KEY",
  "launcherVersion": "$LAUNCHER_VERSION",
  "installedAt": "${INSTALLED_AT}",
  "package": "$ARCHIVE_NAME",
  "size": $PACKAGE_SIZE,
  "sha1": "$PACKAGE_SHA1"
}
EOF

rm -rf "$STAGING_DIR"

echo "🎉 Custom CEF launcher ready"
echo "📦 Runtime location: $TARGET_BASE"
echo "📦 Archive: $ARCHIVE_PATH"
echo "📦 Local cache: $DOWNLOADS_DIR/$ARCHIVE_NAME"
echo "ℹ️  Restart VS Code and run 'Launch Web Client'"
