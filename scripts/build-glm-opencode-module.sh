#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"
source "$SCRIPT_DIR/release-utils.sh"

MODULE_DIR="$REPO_ROOT/packages/GLM_OpenCode_Module"
INSTALL_ROOT="$HOME/.codeai-hub/providers/opencode"
RELEASE_ROOT="$HOME/.codeai-hub/releases"
MANIFEST_PATH="$REPO_ROOT/assets/providers/glm-opencode/manifest.json"

usage() {
  cat <<USAGE
GLM-OpenCode Module build script (developer mode)
Usage: ./scripts/build-glm-opencode-module.sh [--version <semver>] [--clean]
USAGE
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

echo "📦 Building GLM-OpenCode module v$MODULE_VERSION"

echo "🧹 Resetting build output..."
rm -rf dist

echo "🔧 Compiling TypeScript..."
npm run build >/dev/null

if [[ ! -d "dist" ]]; then
  echo "❌ Missing build output" >&2
  exit 1
fi

STAGE_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGE_DIR"' EXIT

cp -R dist "$STAGE_DIR/dist"
cp package.json "$STAGE_DIR/package.json"
if [[ -f package-lock.json ]]; then
  cp package-lock.json "$STAGE_DIR/package-lock.json"
fi

TARGET_DIR="$INSTALL_ROOT/$MODULE_VERSION"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp -R "$STAGE_DIR"/* "$TARGET_DIR"
echo -n "$MODULE_VERSION" > "$INSTALL_ROOT/latest"

CONFIG_PATH="$INSTALL_ROOT/config.json"
if [[ ! -e "$CONFIG_PATH" ]]; then
  mkdir -p "$(dirname "$CONFIG_PATH")"
  cat > "$CONFIG_PATH" <<'EOF'
{
  "apiKey": ""
}
EOF
  echo "📝 Created GLM-OpenCode config template: $CONFIG_PATH"
else
  echo "📝 Preserved existing GLM-OpenCode config: $CONFIG_PATH"
fi

find "$INSTALL_ROOT" -mindepth 1 -maxdepth 1 -type d ! -name "$MODULE_VERSION" ! -name "home" -exec rm -rf {} +
rm -rf "$INSTALL_ROOT/downloads"

ARCHIVE_NAME="glm-opencode-module-$MODULE_VERSION.tar.bz2"
ARCHIVE_PATH="$RELEASE_ROOT/$ARCHIVE_NAME"
mkdir -p "$RELEASE_ROOT"
(cd "$STAGE_DIR" && tar -cjf "$ARCHIVE_PATH" .)
find "$RELEASE_ROOT" -maxdepth 1 -type f -name "glm-opencode-module-*.tar.bz2" ! -name "$ARCHIVE_NAME" -exec rm -f {} +

PACKAGE_SIZE=$(file_size "$ARCHIVE_PATH")
PACKAGE_SHA1=$(sha1_file "$ARCHIVE_PATH")

mkdir -p "$(dirname "$MANIFEST_PATH")"
GLM_OPENCODE_PACKAGE_NAME="$ARCHIVE_NAME" \
GLM_OPENCODE_PACKAGE_SIZE="$PACKAGE_SIZE" \
GLM_OPENCODE_PACKAGE_SHA1="$PACKAGE_SHA1" \
GLM_OPENCODE_MODULE_VERSION="$MODULE_VERSION" \
MANIFEST_PATH="$MANIFEST_PATH" \
  node <<'EOF'
const fs = require("node:fs");
const manifestPath = process.env.MANIFEST_PATH;
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : { schema: 1, baseUrl: "file://" };
manifest.module = {
  version: process.env.GLM_OPENCODE_MODULE_VERSION,
  package: process.env.GLM_OPENCODE_PACKAGE_NAME,
  size: Number(process.env.GLM_OPENCODE_PACKAGE_SIZE),
  sha1: process.env.GLM_OPENCODE_PACKAGE_SHA1,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
EOF

if [[ "$CLEAN" == "true" ]]; then
  rm -rf dist
fi

echo "✅ Installed to $TARGET_DIR"
echo "📦 Archive ready: $ARCHIVE_PATH"

cleanup_workspace_tarballs "$REPO_ROOT"
