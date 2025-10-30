#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"
source "$SCRIPT_DIR/release-utils.sh"

CORE_PROJECT_DIR="$REPO_ROOT/packages/core"
DIST_ROOT="$REPO_ROOT/doc/tmp/releases"
DOWNLOAD_ROOT="$REPO_ROOT/doc/tmp/downloads"
MANIFEST_PATH="$REPO_ROOT/assets/core/manifest.json"
LOCAL_RELEASE_BASE="file://$HOME/.codeai-hub/releases/"
PACK_DIR="$REPO_ROOT/doc/tmp/tarballs"

NODE_VERSION="20.11.1"
NODE_DIST_BASE="https://nodejs.org/dist/v${NODE_VERSION}"

usage() {
  cat <<USAGE
CodeAI Hub Core runtime builder (Node ${NODE_VERSION})

Usage:
  ./scripts/build-core.sh [--version <version>] [--clean]

Options:
  --version   Override core version (default: from package.json)
  --clean     Remove staging artifacts after completion
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

UNAME_S=$(uname -s)
UNAME_M=$(uname -m)

case "$UNAME_S" in
  Darwin)
    case "$UNAME_M" in
      arm64)
        PLATFORM_KEY="darwin-arm64"
        NODE_ARCHIVE="node-v${NODE_VERSION}-darwin-arm64.tar.gz"
        ;;
      x86_64)
        PLATFORM_KEY="darwin-x64"
        NODE_ARCHIVE="node-v${NODE_VERSION}-darwin-x64.tar.gz"
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
    NODE_ARCHIVE="node-v${NODE_VERSION}-linux-x64.tar.gz"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    PLATFORM_KEY="win32-x64"
    NODE_ARCHIVE="node-v${NODE_VERSION}-win-x64.zip"
    ;;
  *)
    echo "❌ Unsupported platform: $UNAME_S" >&2
    exit 1
    ;;

esac

if [[ -z "$CUSTOM_VERSION" ]]; then
  CORE_VERSION=$(PKG_JSON="$REPO_ROOT/packages/core/package.json" node -e "const fs=require('node:fs');console.log(JSON.parse(fs.readFileSync(process.env.PKG_JSON,'utf8')).version);")
else
  CORE_VERSION="$CUSTOM_VERSION"
fi

echo "📦 Building CodeAI Hub Core v$CORE_VERSION for $PLATFORM_KEY (Node $NODE_VERSION)"

mkdir -p "$DIST_ROOT" "$DOWNLOAD_ROOT" "$PACK_DIR"

# Build dependent packages
npm run build --workspace=@codeai-hub/claude-module >/dev/null
npm run build --workspace=@codeai-hub/codex-module >/dev/null
npm run build --workspace=@codeai-hub/gemini-module >/dev/null || true
npm run build --workspace=@codeai-hub/core >/dev/null

# Stage tarballs for local modules
CLAUDE_TARBALL=$(npm pack --workspace=@codeai-hub/claude-module --pack-destination "$PACK_DIR" | tail -n1)
CODEX_TARBALL=$(npm pack --workspace=@codeai-hub/codex-module --pack-destination "$PACK_DIR" | tail -n1)
GEMINI_TARBALL=$(npm pack --workspace=@codeai-hub/gemini-module --pack-destination "$PACK_DIR" | tail -n1)

STAGING_DIR=$(mktemp -d)
APP_STAGE="$STAGING_DIR/app"
NODE_STAGE="$STAGING_DIR/node"
mkdir -p "$APP_STAGE" "$NODE_STAGE" "$APP_STAGE/tarballs"

cp "$PACK_DIR/$CLAUDE_TARBALL" "$APP_STAGE/tarballs/"
cp "$PACK_DIR/$CODEX_TARBALL" "$APP_STAGE/tarballs/"
cp "$PACK_DIR/$GEMINI_TARBALL" "$APP_STAGE/tarballs/"

cp "$CORE_PROJECT_DIR/package.json" "$APP_STAGE/package.json"
if [[ -f "$CORE_PROJECT_DIR/package-lock.json" ]]; then
  cp "$CORE_PROJECT_DIR/package-lock.json" "$APP_STAGE/package-lock.json"
fi
rsync -a "$CORE_PROJECT_DIR/dist" "$APP_STAGE/"

APP_STAGE_DIR="$APP_STAGE" node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const appDir = process.env.APP_STAGE_DIR;
const tarDir = path.join(appDir, "tarballs");
const pkgPath = path.join(appDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const rewrite = new Map([
  ["@codeai-hub/claude-module", "codeai-hub-claude-module"],
  ["@codeai-hub/codex-module", "codeai-hub-codex-module"],
  ["@codeai-hub/gemini-module", "codeai-hub-gemini-module"],
]);
for (const [dep, base] of rewrite) {
  if (pkg.dependencies && pkg.dependencies[dep]) {
    const file = fs.readdirSync(tarDir).find((entry) => entry.startsWith(base));
    if (file) {
      pkg.dependencies[dep] = `file:./tarballs/${file}`;
    }
  }
}
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
NODE

(cd "$APP_STAGE" && npm install --omit=dev --ignore-scripts --no-audit --no-fund >/dev/null)
rm -rf "$APP_STAGE/tarballs"

# Download Node runtime
NODE_ARCHIVE_PATH="$DOWNLOAD_ROOT/$NODE_ARCHIVE"
if [[ ! -f "$NODE_ARCHIVE_PATH" ]]; then
  echo "⬇️  Downloading $NODE_ARCHIVE"
  curl -fsSL "$NODE_DIST_BASE/$NODE_ARCHIVE" -o "$NODE_ARCHIVE_PATH"
fi

case "$NODE_ARCHIVE" in
  *.tar.gz)
    tar -xzf "$NODE_ARCHIVE_PATH" -C "$NODE_STAGE"
    ;;
  *.zip)
    unzip -q "$NODE_ARCHIVE_PATH" -d "$NODE_STAGE"
    ;;
  *)
    echo "❌ Unsupported archive format: $NODE_ARCHIVE" >&2
    exit 1
    ;;
esac

NODE_EXTRACTED=$(find "$NODE_STAGE" -mindepth 1 -maxdepth 1 -type d | head -n1)
if [[ -z "$NODE_EXTRACTED" ]]; then
  echo "❌ Failed to extract Node runtime" >&2
  exit 1
fi
mv "$NODE_EXTRACTED" "$NODE_STAGE/runtime"

INSTALL_ROOT="$HOME/.codeai-hub/core/$PLATFORM_KEY/$CORE_VERSION"
rm -rf "$INSTALL_ROOT"
mkdir -p "$INSTALL_ROOT"
rsync -a "$NODE_STAGE/runtime/" "$INSTALL_ROOT/node/"
rsync -a "$APP_STAGE/" "$INSTALL_ROOT/app/"

cat > "$INSTALL_ROOT/install.json" <<INSTALL_JSON
{
  "platform": "$PLATFORM_KEY",
  "version": "$CORE_VERSION",
  "nodeVersion": "$NODE_VERSION",
  "installedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
INSTALL_JSON

touch "$INSTALL_ROOT/.complete"

ARCHIVE_NAME="codeai-hub-core-$PLATFORM_KEY-$CORE_VERSION.tar.bz2"
ARCHIVE_PATH="$DIST_ROOT/$ARCHIVE_NAME"
rm -f "$ARCHIVE_PATH"
(
  cd "$INSTALL_ROOT"/..
  tar -cjf "$ARCHIVE_PATH" "$CORE_VERSION"
)

if [[ "$(uname -s)" == "Darwin" ]]; then
  PACKAGE_SIZE=$(stat -f%z "$ARCHIVE_PATH")
else
  PACKAGE_SIZE=$(stat -c%s "$ARCHIVE_PATH")
fi
if command -v shasum >/dev/null 2>&1; then
  PACKAGE_SHA1=$(shasum -a 1 "$ARCHIVE_PATH" | awk '{print $1}')
else
  PACKAGE_SHA1=$(sha1sum "$ARCHIVE_PATH" | awk '{print $1}')
fi

CORE_PACKAGE_NAME="$ARCHIVE_NAME" \
CORE_PACKAGE_SIZE="$PACKAGE_SIZE" \
CORE_PACKAGE_SHA1="$PACKAGE_SHA1" \
CORE_VERSION="$CORE_VERSION" \
PLATFORM_KEY="$PLATFORM_KEY" \
MANIFEST_PATH="$MANIFEST_PATH" \
LOCAL_RELEASE_BASE="$LOCAL_RELEASE_BASE" \
  node <<'NODE'
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
manifest.baseUrl = process.env.LOCAL_RELEASE_BASE;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
NODE

if [[ "$CLEAN_FLAG" == "true" ]]; then
  rm -rf "$STAGING_DIR"
fi

echo "✅ Core runtime ready at $INSTALL_ROOT"
echo "📦 Archive: $ARCHIVE_PATH"
