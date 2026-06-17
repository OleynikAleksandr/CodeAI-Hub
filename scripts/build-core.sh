#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"
source "$SCRIPT_DIR/release-utils.sh"

CORE_PROJECT_DIR="$REPO_ROOT/packages/core"
RELEASE_ROOT="$HOME/.codeai-hub/releases"
MANIFEST_PATH="$REPO_ROOT/assets/core/manifest.json"
LOCAL_RELEASE_BASE="file://$HOME/.codeai-hub/releases/"

NODE_VERSION="20.11.1"
NODE_DIST_BASE="https://nodejs.org/dist/v${NODE_VERSION}"

usage() {
  cat <<USAGE
CodeAI Hub Core runtime builder (Node ${NODE_VERSION})

Usage:
  ./scripts/build-core.sh [--version <version>] [--clean]

Options:
  --version   Override core version (default: from package.json)
  --clean     Remove temporary artefacts after completion
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

STAGING_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGING_DIR"' EXIT
APP_STAGE="$STAGING_DIR/app"
NODE_STAGE="$STAGING_DIR/node"
TARBALL_STAGE="$STAGING_DIR/tarballs"
DOWNLOAD_STAGE="$STAGING_DIR/downloads"
mkdir -p "$APP_STAGE" "$NODE_STAGE" "$TARBALL_STAGE" "$DOWNLOAD_STAGE"

echo "📝 Generating bundled-templates.ts from asset sources..."
node "$SCRIPT_DIR/generate-bundled-templates.js"

echo "🔧 Building workspace packages..."
npm run build --workspace=@codeai-hub/agent-shared >/dev/null
npm run build --workspace=@codeai-hub/claude-module >/dev/null
npm run build --workspace=@codeai-hub/codex-app-server-module >/dev/null
npm run build --workspace=@codeai-hub/gemini-module >/dev/null || true
npm run build --workspace=@codeai-hub/glm-module >/dev/null
npm run build --workspace=@codeai-hub/glm-opencode-module >/dev/null
npm run build --workspace=@codeai-hub/kimi-module >/dev/null
npm run build --workspace=@codeai-hub/initiatives >/dev/null
npm run build --workspace=@codeai-hub/localization >/dev/null
npm run build --workspace=@codeai-hub/translation >/dev/null
npm run build --workspace=@codeai-hub/unified-session >/dev/null
npm run build --workspace=@codeai-hub/core-supervisor >/dev/null
npm run build --workspace=@codeai-hub/core >/dev/null

if [[ "$UNAME_S" == "Darwin" ]]; then
  echo "🍎 Building Apple Translation helper..."
  APPLE_TRANSLATION_HELPER_BINARY="$("$SCRIPT_DIR/build-apple-translation-helper.sh" | tail -n1)"
  APPLE_TRANSLATION_HELPER_STAGE="$APP_STAGE/native/apple-translation-helper/.build/release"
  mkdir -p "$APPLE_TRANSLATION_HELPER_STAGE"
  cp "$APPLE_TRANSLATION_HELPER_BINARY" "$APPLE_TRANSLATION_HELPER_STAGE/apple-translation-helper"
  chmod 755 "$APPLE_TRANSLATION_HELPER_STAGE/apple-translation-helper"

  echo "🍎 Building Apple Speech helper..."
  APPLE_SPEECH_HELPER_BINARY="$("$SCRIPT_DIR/build-apple-speech-helper.sh" | tail -n1)"
  APPLE_SPEECH_HELPER_STAGE="$APP_STAGE/native/apple-speech-helper/.build/release"
  mkdir -p "$APPLE_SPEECH_HELPER_STAGE"
  cp "$APPLE_SPEECH_HELPER_BINARY" "$APPLE_SPEECH_HELPER_STAGE/apple-speech-helper"
  chmod 755 "$APPLE_SPEECH_HELPER_STAGE/apple-speech-helper"
fi

echo "📦 Packing provider tarballs..."
CLAUDE_TARBALL=$(npm pack --workspace=@codeai-hub/claude-module --pack-destination "$TARBALL_STAGE" | tail -n1)
CODEX_APP_SERVER_TARBALL=$(npm pack --workspace=@codeai-hub/codex-app-server-module --pack-destination "$TARBALL_STAGE" | tail -n1)
GEMINI_TARBALL=$(npm pack --workspace=@codeai-hub/gemini-module --pack-destination "$TARBALL_STAGE" | tail -n1)
GLM_TARBALL=$(npm pack --workspace=@codeai-hub/glm-module --pack-destination "$TARBALL_STAGE" | tail -n1)
GLM_OPENCODE_TARBALL=$(npm pack --workspace=@codeai-hub/glm-opencode-module --pack-destination "$TARBALL_STAGE" | tail -n1)
KIMI_TARBALL=$(npm pack --workspace=@codeai-hub/kimi-module --pack-destination "$TARBALL_STAGE" | tail -n1)
INITIATIVES_TARBALL=$(npm pack --workspace=@codeai-hub/initiatives --pack-destination "$TARBALL_STAGE" | tail -n1)
LOCALIZATION_TARBALL=$(npm pack --workspace=@codeai-hub/localization --pack-destination "$TARBALL_STAGE" | tail -n1)
TRANSLATION_TARBALL=$(npm pack --workspace=@codeai-hub/translation --pack-destination "$TARBALL_STAGE" | tail -n1)
UNIFIED_SESSION_TARBALL=$(npm pack --workspace=@codeai-hub/unified-session --pack-destination "$TARBALL_STAGE" | tail -n1)

cp "$CORE_PROJECT_DIR/package.json" "$APP_STAGE/package.json"
if [[ -f "$CORE_PROJECT_DIR/package-lock.json" ]]; then
  cp "$CORE_PROJECT_DIR/package-lock.json" "$APP_STAGE/package-lock.json"
fi
rsync -a "$CORE_PROJECT_DIR/dist" "$APP_STAGE/"
mkdir -p "$APP_STAGE/assets/localization/source"
rsync -a "$REPO_ROOT/assets/localization/source/en" "$APP_STAGE/assets/localization/source/"

# NOTE: agent packages that are still consumed via local workspace references must be
# copied into the staged runtime tree so npm's symlinked resolution keeps working.
AGENTS_STAGE="$STAGING_DIR/agents"
mkdir -p "$AGENTS_STAGE"
rsync -a --delete \
  --exclude "node_modules" \
  --exclude "src" \
  --exclude "*.tsbuildinfo" \
  "$REPO_ROOT/packages/agents/shared/" \
  "$AGENTS_STAGE/shared/"
rsync -a --delete \
  --exclude "node_modules" \
  --exclude "src" \
  --exclude "*.tsbuildinfo" \
  "$REPO_ROOT/packages/agents/diagram-modules-agent/" \
  "$AGENTS_STAGE/diagram-modules-agent/"
# Allow agent packages to resolve shared deps when loaded directly from $INSTALL_ROOT/agents/**.
mkdir -p "$AGENTS_STAGE/node_modules/@codeai-hub"
ln -snf "../../shared" "$AGENTS_STAGE/node_modules/@codeai-hub/agent-shared"

mkdir -p "$APP_STAGE/tarballs"
cp "$TARBALL_STAGE/$CLAUDE_TARBALL" "$APP_STAGE/tarballs/"
cp "$TARBALL_STAGE/$CODEX_APP_SERVER_TARBALL" "$APP_STAGE/tarballs/"
cp "$TARBALL_STAGE/$GEMINI_TARBALL" "$APP_STAGE/tarballs/"
cp "$TARBALL_STAGE/$GLM_TARBALL" "$APP_STAGE/tarballs/"
cp "$TARBALL_STAGE/$GLM_OPENCODE_TARBALL" "$APP_STAGE/tarballs/"
cp "$TARBALL_STAGE/$KIMI_TARBALL" "$APP_STAGE/tarballs/"
cp "$TARBALL_STAGE/$INITIATIVES_TARBALL" "$APP_STAGE/tarballs/"
cp "$TARBALL_STAGE/$LOCALIZATION_TARBALL" "$APP_STAGE/tarballs/"
cp "$TARBALL_STAGE/$TRANSLATION_TARBALL" "$APP_STAGE/tarballs/"
cp "$TARBALL_STAGE/$UNIFIED_SESSION_TARBALL" "$APP_STAGE/tarballs/"

APP_STAGE_DIR="$APP_STAGE" node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const appDir = process.env.APP_STAGE_DIR;
const tarDir = path.join(appDir, "tarballs");
const pkgPath = path.join(appDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const rewrite = new Map([
  ["@codeai-hub/claude-module", "codeai-hub-claude-module"],
  ["@codeai-hub/codex-app-server-module", "codeai-hub-codex-app-server-module"],
  ["@codeai-hub/gemini-module", "codeai-hub-gemini-module"],
  ["@codeai-hub/glm-module", "codeai-hub-glm-module"],
  ["@codeai-hub/glm-opencode-module", "codeai-hub-glm-opencode-module"],
  ["@codeai-hub/kimi-module", "codeai-hub-kimi-module"],
  ["@codeai-hub/initiatives", "codeai-hub-initiatives"],
  ["@codeai-hub/localization", "codeai-hub-localization"],
  ["@codeai-hub/unified-session", "codeai-hub-unified-session"],
]);
for (const [dep, base] of rewrite) {
  if (pkg.dependencies && pkg.dependencies[dep]) {
    const file = fs.readdirSync(tarDir).find((entry) => entry.startsWith(base));
    if (file) {
      pkg.dependencies[dep] = `file:./tarballs/${file}`;
    }
  }
}
const translationTarball = fs
  .readdirSync(tarDir)
  .find((entry) => entry.startsWith("codeai-hub-translation"));
if (translationTarball) {
  pkg.overrides = {
    ...(pkg.overrides ?? {}),
    "@codeai-hub/translation": `file:./tarballs/${translationTarball}`,
  };
}
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
NODE

(cd "$APP_STAGE" && npm install --omit=dev --ignore-scripts --no-audit --no-fund >/dev/null)
rm -rf "$APP_STAGE/tarballs"

# Ensure agent package symlinks are valid inside the extracted runtime.
# (package-lock from the workspace may create links that otherwise point to nowhere)
mkdir -p "$APP_STAGE/node_modules/@codeai-hub"
ln -snf "../../../agents/shared" "$APP_STAGE/node_modules/@codeai-hub/agent-shared"

NODE_ARCHIVE_PATH="$DOWNLOAD_STAGE/$NODE_ARCHIVE"
echo "⬇️  Fetching Node runtime $NODE_ARCHIVE"
curl -fsSL "$NODE_DIST_BASE/$NODE_ARCHIVE" -o "$NODE_ARCHIVE_PATH"

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
rsync -a "$AGENTS_STAGE/" "$INSTALL_ROOT/agents/"

touch "$INSTALL_ROOT/.complete"

find "$(dirname "$INSTALL_ROOT")" -mindepth 1 -maxdepth 1 -type d ! -name "$CORE_VERSION" -exec rm -rf {} +

ARCHIVE_NAME="codeai-hub-core-$PLATFORM_KEY-$CORE_VERSION.tar.bz2"

cat > "$INSTALL_ROOT/install.json" <<INSTALL_JSON
{
  "platform": "$PLATFORM_KEY",
  "coreVersion": "$CORE_VERSION",
  "package": "$ARCHIVE_NAME",
  "installedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
INSTALL_JSON
ARCHIVE_PATH="$RELEASE_ROOT/$ARCHIVE_NAME"
mkdir -p "$RELEASE_ROOT"
(
  cd "$INSTALL_ROOT"/..
  tar -cjf "$ARCHIVE_PATH" "$CORE_VERSION"
)
find "$RELEASE_ROOT" -maxdepth 1 -type f -name "codeai-hub-core-$PLATFORM_KEY-*.tar.bz2" ! -name "$ARCHIVE_NAME" -exec rm -f {} +

PACKAGE_SIZE=$(file_size "$ARCHIVE_PATH")
PACKAGE_SHA1=$(sha1_file "$ARCHIVE_PATH")

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
  rm -rf "$CORE_PROJECT_DIR/dist"
fi

echo "✅ Core runtime ready at $INSTALL_ROOT"
echo "📦 Archive: $ARCHIVE_PATH"

cleanup_workspace_tarballs "$REPO_ROOT"
