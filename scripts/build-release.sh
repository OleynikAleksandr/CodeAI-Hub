#!/bin/bash

# CodeAI Hub Release Build Script
# Ensures clean build, architecture compliance, and VSIX packaging

set -e

PROJECT_NAME="CodeAI Hub"
# Ensure we run from repo root regardless of where script is invoked
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"
source "$SCRIPT_DIR/release-utils.sh"
cd "$REPO_ROOT"

USE_CURRENT_VERSION=false
ALLOW_DIRTY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --use-current-version)
      USE_CURRENT_VERSION=true
      shift
      ;;
    --allow-dirty)
      ALLOW_DIRTY=true
      shift
      ;;
    *)
      echo "❌ Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Ensure clean working tree before release build (unless explicitly overridden).
if ! $ALLOW_DIRTY && [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Working tree has uncommitted changes. Commit or stash before running build-release.sh." >&2
  exit 1
fi

if $ALLOW_DIRTY; then
  echo "⚠️  Warning: --allow-dirty enabled. Building from a dirty working tree." >&2
fi

PACKAGE_NAME=$(node -p "require('./package.json').name")
DIST_ROOT="$REPO_ROOT/doc/tmp/releases"

CURRENT_VERSION=$(node -p "require('./package.json').version")

if $USE_CURRENT_VERSION; then
  VERSION=$CURRENT_VERSION
else
  VERSION=$(node <<'EOF'
const pkg = require('./package.json');
const parts = pkg.version.split('.').map((part) => Number(part));
if (parts.length !== 3 || parts.some(Number.isNaN)) {
  throw new Error(`Invalid semver ${pkg.version}`);
}
parts[2] += 1;
console.log(parts.join('.'));
EOF
)
fi

echo "🔧 ${PROJECT_NAME} - Release Build Script"
echo "============================================"
echo "📦 Building version: $VERSION"

cleanup_workspace_tarballs "$REPO_ROOT"

# Step 1: Clean build artifacts
echo ""
echo "🧹 Step 1: Cleaning build cache..."
rm -rf out/*
rm -f *.vsix
rm -rf node_modules/@anthropic-ai 2>/dev/null || true
rm -rf node_modules/@openai 2>/dev/null || true
rm -rf node_modules/@google 2>/dev/null || true
echo "✅ Cache cleaned"

# Step 2: Update version in package.json
echo ""
if $USE_CURRENT_VERSION; then
  echo "📝 Step 2: Skipping version bump (using current version $VERSION)..."
  echo "✅ Version preserved"
else
  echo "📝 Step 2: Updating version to $VERSION..."
  npm version "$VERSION" --no-git-tag-version >/dev/null
  echo "✅ Version updated"
fi

# Step 2.5: Generate bundled-templates.ts from asset sources
echo ""
echo "📝 Step 2.5: Generating bundled-templates.ts..."
node "$SCRIPT_DIR/generate-bundled-templates.js"

# Step 3: Pre-build UI bundles
echo ""
echo "⚛️ Step 3: Building UI bundles..."
npm run build:webview
echo "✅ UI bundles ready"

# Step 4: Architecture check
echo ""
echo "🏗️ Step 4: Checking architecture compliance..."
"$SCRIPT_DIR"/check-architecture.sh
echo "✅ Architecture check passed"

# Step 5: Smoke type-check (no emit)
echo ""
echo "🚬 Step 5: Type-check (no emit)..."
npx tsc -p . --noEmit
echo "✅ Type-check passed"

# Step 6: Compile TypeScript
echo ""
echo "⚙️ Step 6: Compiling TypeScript..."
npm run compile
echo "✅ TypeScript compiled"

# Step 7: Verify SDK exclusions
echo ""
echo "🔍 Step 7: Verifying SDK exclusions..."
if [ -d "node_modules/@anthropic-ai" ] || [ -d "node_modules/@openai" ] || [ -d "node_modules/@google" ] || [ -d "node_modules/@google-cloud" ] || [ -d "node_modules/@modelcontextprotocol" ] || [ -d "node_modules/@opentelemetry" ] || [ -d "node_modules/googleapis" ] || [ -d "node_modules/google-auth-library" ] || [ -d "node_modules/google-gax" ] || [ -d "node_modules/google-logging-utils" ] || [ -d "node_modules/tree-sitter-bash" ] || [ -d "node_modules/web-tree-sitter" ]; then
  echo "⚠️  Warning: Provider SDK found in node_modules, removing..."
  rm -rf \
    node_modules/@anthropic-ai \
    node_modules/@openai \
    node_modules/@google \
    node_modules/@google-cloud \
    node_modules/@modelcontextprotocol \
    node_modules/@opentelemetry \
    node_modules/googleapis \
    node_modules/google-auth-library \
    node_modules/google-gax \
    node_modules/google-logging-utils \
    node_modules/tree-sitter-bash \
    node_modules/web-tree-sitter
fi

if ! grep -q "node_modules/@anthropic-ai" .vscodeignore 2>/dev/null; then
  echo "node_modules/@anthropic-ai/**" >> .vscodeignore
fi
if ! grep -q "node_modules/@openai" .vscodeignore 2>/dev/null; then
  echo "node_modules/@openai/**" >> .vscodeignore
fi
if ! grep -q "node_modules/@google" .vscodeignore 2>/dev/null; then
  echo "node_modules/@google/**" >> .vscodeignore
fi
if ! grep -q "node_modules/@google-cloud" .vscodeignore 2>/dev/null; then
  echo "node_modules/@google-cloud/**" >> .vscodeignore
fi
if [ -d "node_modules/@codeai-hub/claude-module" ] || [ -d "node_modules/@codeai-hub/codex-module" ] || [ -d "node_modules/@codeai-hub/gemini-module" ]; then
  echo "⚠️  Warning: Bundled provider modules detected, removing..."
  rm -rf node_modules/@codeai-hub/claude-module node_modules/@codeai-hub/codex-module node_modules/@codeai-hub/gemini-module
fi
if ! grep -q "node_modules/@codeai-hub/claude-module" .vscodeignore 2>/dev/null; then
  echo "node_modules/@codeai-hub/claude-module/**" >> .vscodeignore
fi
if ! grep -q "node_modules/@codeai-hub/codex-module" .vscodeignore 2>/dev/null; then
  echo "node_modules/@codeai-hub/codex-module/**" >> .vscodeignore
fi
if ! grep -q "node_modules/@codeai-hub/gemini-module" .vscodeignore 2>/dev/null; then
  echo "node_modules/@codeai-hub/gemini-module/**" >> .vscodeignore
fi
if ! grep -q "packages/Claude_Module" .vscodeignore 2>/dev/null; then
  echo "packages/Claude_Module/**" >> .vscodeignore
fi
if ! grep -q "packages/Codex_Module" .vscodeignore 2>/dev/null; then
  echo "packages/Codex_Module/**" >> .vscodeignore
fi
if ! grep -q "packages/Gemini_Module" .vscodeignore 2>/dev/null; then
  echo "packages/Gemini_Module/**" >> .vscodeignore
fi

clean_temp_dirs() {
  cleanup_workspace_tarballs "$REPO_ROOT"
  rm -rf dist
  rm -rf doc/tmp/build
}

clean_temp_dirs

echo "✅ SDK exclusions verified"

# Step 7.5: Validate locally built modules and runtime artefacts
echo ""
echo "🗂️  Step 7.5: Validating local artefacts..."
UNAME_S=$(uname -s)
UNAME_M=$(uname -m)
case "$UNAME_S" in
  Darwin)
    case "$UNAME_M" in
      arm64)
        CORE_PLATFORM_KEY="darwin-arm64"
        LAUNCHER_FILE_PLATFORM="macos-arm64"
        LAUNCHER_MANIFEST_KEY="darwin-arm64"
        ;;
      x86_64)
        CORE_PLATFORM_KEY="darwin-x64"
        LAUNCHER_FILE_PLATFORM="macos-x64"
        LAUNCHER_MANIFEST_KEY="darwin-x64"
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
    CORE_PLATFORM_KEY="linux-x64"
    LAUNCHER_FILE_PLATFORM="linux-x64"
    LAUNCHER_MANIFEST_KEY="linux-x64"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    CORE_PLATFORM_KEY="win32-x64"
    LAUNCHER_FILE_PLATFORM="win-x64"
    LAUNCHER_MANIFEST_KEY="win32-x64"
    ;;
  *)
    echo "❌ Unsupported platform: $UNAME_S" >&2
    exit 1
    ;;
esac

RELEASE_CACHE="$HOME/.codeai-hub/releases"
declare -a REQUIRED_FILES=(
  "claude-module-${VERSION}.tar.bz2"
  "codex-module-${VERSION}.tar.bz2"
  "gemini-module-${VERSION}.tar.bz2"
  "codeai-hub-core-${CORE_PLATFORM_KEY}-${VERSION}.tar.bz2"
  "CodeAIHubLauncher-${LAUNCHER_FILE_PLATFORM}-${VERSION}.tar.bz2"
)

for artefact in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "$RELEASE_CACHE/$artefact" ]]; then
    echo "❌ Missing artefact $artefact in $RELEASE_CACHE" >&2
    exit 1
  fi
done

if ! VERSION="$VERSION" \
CORE_KEY="$CORE_PLATFORM_KEY" \
LAUNCHER_KEY="$LAUNCHER_MANIFEST_KEY" \
node <<'NODE'
const { readFileSync } = require("node:fs");
const version = process.env.VERSION;
const coreKey = process.env.CORE_KEY;
const launcherKey = process.env.LAUNCHER_KEY;
const manifestChecks = [
  ["assets/core/manifest.json", (manifest) => manifest.platforms?.[coreKey]?.coreVersion],
  ["assets/launcher/manifest.json", (manifest) => manifest.platforms?.[launcherKey]?.launcherVersion],
  ["assets/providers/claude/manifest.json", (manifest) => manifest.module?.version],
  ["assets/providers/codex/manifest.json", (manifest) => manifest.module?.version],
  ["assets/providers/gemini/manifest.json", (manifest) => manifest.module?.version],
];

const mismatches = manifestChecks
  .map(([path, selector]) => {
    const data = JSON.parse(readFileSync(path, "utf8"));
    const value = selector(data);
    return value === version ? null : { path, value };
  })
  .filter(Boolean);

if (mismatches.length > 0) {
  const formatted = mismatches.map(({ path, value }) => `${path} -> ${value ?? "undefined"}`).join("\n");
  throw new Error(`Manifest version mismatch:\n${formatted}`);
}
NODE
then
  exit 1
fi

mkdir -p "$DIST_ROOT"
for artefact in "${REQUIRED_FILES[@]}"; do
  cp "$RELEASE_CACHE/$artefact" "$DIST_ROOT/$artefact"
done
clean_release_dir "$DIST_ROOT"
echo "✅ Artefacts validated"

# Step 8: Docs link check & duplication check (advisory)
echo ""
echo "🔗 Checking markdown links..."
npm run -s check:links || echo "⚠️  Markdown link issues detected (advisory)"

echo ""
echo "🔁 Checking code duplication (jscpd)..."
npm run -s check:dup || echo "⚠️  Duplication threshold exceeded (advisory)"

# Step 8.5: Prune dev dependencies before packaging
echo ""
echo "🧼 Removing dev dependencies before packaging..."
npm prune --omit=dev >/dev/null
echo "✅ Production dependency tree ready"

# Step 9: Package extension
echo ""
echo "📦 Step 9: Creating VSIX package..."
npx vsce package
echo "✅ Package created"

VSIX_FILE="${PACKAGE_NAME}-${VERSION}.vsix"
if [ ! -f "$VSIX_FILE" ]; then
  echo "❌ VSIX file not found!"
  exit 1
fi

clean_release_dir "$DIST_ROOT"

echo ""
echo "🔁 Restoring development dependencies..."
npm install >/dev/null
echo "✅ Development dependencies restored"

cleanup_workspace_tarballs "$REPO_ROOT"

# Step 10: Check package size
echo ""
echo "📊 Step 10: Verifying package size..."
SIZE=$(du -sh "$VSIX_FILE" | cut -f1)
SIZE_MB=$(du -m "$VSIX_FILE" | cut -f1)
echo "📦 Package size: $SIZE"
if [ $SIZE_MB -gt 20 ]; then
  echo "⚠️  Warning: Package size is over 20MB!"
  echo "Check if large assets or SDKs are included"
fi

# Step 9: Summary
echo ""
echo "============================================"
echo "✅ Release build complete!"
echo "📦 Package: $VSIX_FILE ($SIZE)"
echo ""
echo "🔍 Package contents (top level):"
unzip -l "$VSIX_FILE" | head -20
echo ""
echo "Next steps:"
echo "1. Test the extension locally"
echo "2. Commit changes: git add . && git commit -m \"feat: v$VERSION - <description>\""
echo "3. Push to GitHub: git push origin <branch>"
echo "4. Create GitHub release (if stable)"
echo ""
echo "⚠️  Reminder: Provider CLIs/SDKs must remain globally installed, not inside the extension."
