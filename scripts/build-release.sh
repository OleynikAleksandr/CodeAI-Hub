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

echo ""
echo "🔎 Step 2.6: Verifying bundled template coverage..."
node <<'NODE'
const { readFileSync } = require("node:fs");
const source = readFileSync("packages/core/src/templates/bundled-templates.ts", "utf8");
const requiredDestinations = [
  ".codeai-hub/templates/description/description-collector-prompt.md",
  ".codeai-hub/templates/description/description-template.md",
  ".codeai-hub/templates/description/questionnaire-template.md",
  ".codeai-hub/templates/virtual_simulation/virtual-simulation-prompt.md",
];
const missing = requiredDestinations.filter(
  (path) => !source.includes(`\"${path}\"`)
);
if (missing.length > 0) {
  throw new Error(`Missing bundled template destinations:\\n${missing.join("\\n")}`);
}
NODE
echo "✅ Bundled template coverage verified"

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
if [ -d "node_modules/@codeai-hub/claude-module" ] || [ -d "node_modules/@codeai-hub/codex-app-server-module" ] || [ -d "node_modules/@codeai-hub/gemini-module" ] || [ -d "node_modules/@codeai-hub/glm-module" ] || [ -d "node_modules/@codeai-hub/glm-opencode-module" ] || [ -d "node_modules/@codeai-hub/kimi-module" ]; then
  echo "⚠️  Warning: Bundled provider modules detected, removing..."
  rm -rf node_modules/@codeai-hub/claude-module node_modules/@codeai-hub/codex-app-server-module node_modules/@codeai-hub/gemini-module node_modules/@codeai-hub/glm-module node_modules/@codeai-hub/glm-opencode-module node_modules/@codeai-hub/kimi-module
fi
if ! grep -q "node_modules/@codeai-hub/claude-module" .vscodeignore 2>/dev/null; then
  echo "node_modules/@codeai-hub/claude-module/**" >> .vscodeignore
fi
if ! grep -q "node_modules/@codeai-hub/codex-app-server-module" .vscodeignore 2>/dev/null; then
  echo "node_modules/@codeai-hub/codex-app-server-module/**" >> .vscodeignore
fi
if ! grep -q "node_modules/@codeai-hub/gemini-module" .vscodeignore 2>/dev/null; then
  echo "node_modules/@codeai-hub/gemini-module/**" >> .vscodeignore
fi
if ! grep -q "node_modules/@codeai-hub/glm-module" .vscodeignore 2>/dev/null; then
  echo "node_modules/@codeai-hub/glm-module/**" >> .vscodeignore
fi
if ! grep -q "node_modules/@codeai-hub/glm-opencode-module" .vscodeignore 2>/dev/null; then
  echo "node_modules/@codeai-hub/glm-opencode-module/**" >> .vscodeignore
fi
if ! grep -q "node_modules/@codeai-hub/kimi-module" .vscodeignore 2>/dev/null; then
  echo "node_modules/@codeai-hub/kimi-module/**" >> .vscodeignore
fi
if ! grep -q "packages/Claude_Module" .vscodeignore 2>/dev/null; then
  echo "packages/Claude_Module/**" >> .vscodeignore
fi
if ! grep -q "packages/Codex_AppServer_Module" .vscodeignore 2>/dev/null; then
  echo "packages/Codex_AppServer_Module/**" >> .vscodeignore
fi
if ! grep -q "packages/Gemini_Module" .vscodeignore 2>/dev/null; then
  echo "packages/Gemini_Module/**" >> .vscodeignore
fi
if ! grep -q "packages/GLM_Module" .vscodeignore 2>/dev/null; then
  echo "packages/GLM_Module/**" >> .vscodeignore
fi
if ! grep -q "packages/GLM_OpenCode_Module" .vscodeignore 2>/dev/null; then
  echo "packages/GLM_OpenCode_Module/**" >> .vscodeignore
fi
if ! grep -q "packages/Kimi_Module" .vscodeignore 2>/dev/null; then
  echo "packages/Kimi_Module/**" >> .vscodeignore
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
        CORE_NODE_RELATIVE_PATH="node/bin/node"
        ;;
      x86_64)
        CORE_PLATFORM_KEY="darwin-x64"
        LAUNCHER_FILE_PLATFORM="macos-x64"
        LAUNCHER_MANIFEST_KEY="darwin-x64"
        CORE_NODE_RELATIVE_PATH="node/bin/node"
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
    CORE_NODE_RELATIVE_PATH="node/bin/node"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    CORE_PLATFORM_KEY="win32-x64"
    LAUNCHER_FILE_PLATFORM="win-x64"
    LAUNCHER_MANIFEST_KEY="win32-x64"
    CORE_NODE_RELATIVE_PATH="node/node.exe"
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
  "glm-module-${VERSION}.tar.bz2"
  "glm-opencode-module-${VERSION}.tar.bz2"
  "kimi-module-${VERSION}.tar.bz2"
  "codeai-hub-core-${CORE_PLATFORM_KEY}-${VERSION}.tar.bz2"
  "CodeAIHubLauncher-${LAUNCHER_FILE_PLATFORM}-${VERSION}.tar.bz2"
)

for artefact in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "$RELEASE_CACHE/$artefact" ]]; then
    echo "❌ Missing artefact $artefact in $RELEASE_CACHE" >&2
    exit 1
  fi
done

CLAUDE_INSTALL_ROOT="$HOME/.codeai-hub/providers/claude/$VERSION"
if [[ ! -f "$CLAUDE_INSTALL_ROOT/node_modules/@codeai-hub/translation/package.json" ]]; then
  echo "❌ Missing bundled @codeai-hub/translation package in $CLAUDE_INSTALL_ROOT" >&2
  exit 1
fi

node -e "require('$CLAUDE_INSTALL_ROOT/dist/index.js')"
echo "✅ Claude provider bundle loads with bundled shared translation package"

CODEX_INSTALL_ROOT="$HOME/.codeai-hub/providers/codex/$VERSION"
if [[ ! -f "$CODEX_INSTALL_ROOT/node_modules/@codeai-hub/translation/package.json" ]]; then
  echo "❌ Missing bundled @codeai-hub/translation package in $CODEX_INSTALL_ROOT" >&2
  exit 1
fi

node -e "require('$CODEX_INSTALL_ROOT/dist/index.js')"
echo "✅ Codex provider bundle loads with bundled shared translation package"

GEMINI_INSTALL_ROOT="$HOME/.codeai-hub/providers/gemini/$VERSION"
if [[ ! -f "$GEMINI_INSTALL_ROOT/node_modules/@codeai-hub/translation/package.json" ]]; then
  echo "❌ Missing bundled @codeai-hub/translation package in $GEMINI_INSTALL_ROOT" >&2
  exit 1
fi

node -e "require('$GEMINI_INSTALL_ROOT/dist/index.js')"
echo "✅ Gemini provider bundle loads with bundled shared translation package"

KIMI_INSTALL_ROOT="$HOME/.codeai-hub/providers/kimi/$VERSION"
node -e "require('$KIMI_INSTALL_ROOT/dist/index.js')"
echo "✅ Kimi provider bundle loads"

GLM_INSTALL_ROOT="$HOME/.codeai-hub/providers/glm-native/$VERSION"
GLM_MODULE_PATH="$GLM_INSTALL_ROOT/dist/index.js" node <<'NODE'
const loaded = require(process.env.GLM_MODULE_PATH);
if (typeof loaded.GlmProviderAdapter !== "function") {
  throw new Error("Missing GlmProviderAdapter export");
}
NODE
echo "✅ GLM provider bundle loads with standalone provider package"

GLM_OPENCODE_INSTALL_ROOT="$HOME/.codeai-hub/providers/opencode/$VERSION"
GLM_OPENCODE_MODULE_PATH="$GLM_OPENCODE_INSTALL_ROOT/dist/index.js" node <<'NODE'
const loaded = require(process.env.GLM_OPENCODE_MODULE_PATH);
if (typeof loaded.GlmOpenCodeProviderAdapter !== "function") {
  throw new Error("Missing GlmOpenCodeProviderAdapter export");
}
NODE
echo "✅ GLM-OpenCode provider bundle loads with standalone provider package"

CORE_INSTALL_ROOT="$HOME/.codeai-hub/core/$CORE_PLATFORM_KEY/$VERSION"
CORE_NODE_PATH="$CORE_INSTALL_ROOT/$CORE_NODE_RELATIVE_PATH"
CORE_HANDLER_PATH="$CORE_INSTALL_ROOT/app/dist/remote-bridge/handlers/settings-request-handler.js"
CORE_SOURCE_DICTIONARY_PATH="$CORE_INSTALL_ROOT/app/assets/localization/source/en/interactive_templates.json"
CORE_APPLE_TRANSLATION_HELPER_PATH="$CORE_INSTALL_ROOT/app/native/apple-translation-helper/.build/release/apple-translation-helper"
CORE_APPLE_SPEECH_HELPER_PATH="$CORE_INSTALL_ROOT/app/native/apple-speech-helper/.build/release/apple-speech-helper"
if [[ ! -f "$CORE_INSTALL_ROOT/app/node_modules/@codeai-hub/localization/package.json" ]]; then
  echo "❌ Missing bundled @codeai-hub/localization package in $CORE_INSTALL_ROOT" >&2
  exit 1
fi
if [[ ! -f "$CORE_INSTALL_ROOT/app/node_modules/@codeai-hub/translation/package.json" ]]; then
  echo "❌ Missing bundled @codeai-hub/translation package in $CORE_INSTALL_ROOT" >&2
  exit 1
fi
if [[ ! -f "$CORE_INSTALL_ROOT/app/node_modules/@codeai-hub/gemini-module/package.json" ]]; then
  echo "❌ Missing bundled @codeai-hub/gemini-module package in $CORE_INSTALL_ROOT" >&2
  exit 1
fi
if [[ ! -f "$CORE_INSTALL_ROOT/app/node_modules/@codeai-hub/glm-module/package.json" ]]; then
  echo "❌ Missing bundled @codeai-hub/glm-module package in $CORE_INSTALL_ROOT" >&2
  exit 1
fi
if [[ ! -f "$CORE_INSTALL_ROOT/app/node_modules/@codeai-hub/glm-opencode-module/package.json" ]]; then
  echo "❌ Missing bundled @codeai-hub/glm-opencode-module package in $CORE_INSTALL_ROOT" >&2
  exit 1
fi
if [[ ! -f "$CORE_INSTALL_ROOT/app/node_modules/@codeai-hub/kimi-module/package.json" ]]; then
  echo "❌ Missing bundled @codeai-hub/kimi-module package in $CORE_INSTALL_ROOT" >&2
  exit 1
fi
if [[ ! -f "$CORE_SOURCE_DICTIONARY_PATH" ]]; then
  echo "❌ Missing bundled localization source dictionaries in $CORE_INSTALL_ROOT/app/assets" >&2
  exit 1
fi
if [[ ! -x "$CORE_NODE_PATH" ]]; then
  echo "❌ Missing core runtime node binary at $CORE_NODE_PATH" >&2
  exit 1
fi
if [[ "$UNAME_S" == "Darwin" && ! -x "$CORE_APPLE_TRANSLATION_HELPER_PATH" ]]; then
  echo "❌ Missing executable Apple Translation helper at $CORE_APPLE_TRANSLATION_HELPER_PATH" >&2
  exit 1
fi
if [[ "$UNAME_S" == "Darwin" && ! -x "$CORE_APPLE_SPEECH_HELPER_PATH" ]]; then
  echo "❌ Missing executable Apple Speech helper at $CORE_APPLE_SPEECH_HELPER_PATH" >&2
  exit 1
fi

CORE_HANDLER_PATH="$CORE_HANDLER_PATH" "$CORE_NODE_PATH" -e "require(process.env.CORE_HANDLER_PATH)"
echo "✅ Core runtime bundle loads the localization-backed settings bridge"
CORE_GEMINI_MODULE_PATH="$CORE_INSTALL_ROOT/app/node_modules/@codeai-hub/gemini-module/dist/index.js" \
"$CORE_NODE_PATH" -e "require(process.env.CORE_GEMINI_MODULE_PATH)"
echo "✅ Core runtime bundle includes Gemini provider module"
CORE_GLM_MODULE_PATH="$CORE_INSTALL_ROOT/app/node_modules/@codeai-hub/glm-module/dist/index.js" \
"$CORE_NODE_PATH" -e "require(process.env.CORE_GLM_MODULE_PATH)"
echo "✅ Core runtime bundle includes GLM provider module"
CORE_GLM_OPENCODE_MODULE_PATH="$CORE_INSTALL_ROOT/app/node_modules/@codeai-hub/glm-opencode-module/dist/index.js" \
"$CORE_NODE_PATH" -e "require(process.env.CORE_GLM_OPENCODE_MODULE_PATH)"
echo "✅ Core runtime bundle includes GLM-OpenCode provider module"
CORE_KIMI_MODULE_PATH="$CORE_INSTALL_ROOT/app/node_modules/@codeai-hub/kimi-module/dist/index.js" \
"$CORE_NODE_PATH" -e "require(process.env.CORE_KIMI_MODULE_PATH)"
echo "✅ Core runtime bundle includes Kimi provider module"

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
  ["assets/providers/glm-native/manifest.json", (manifest) => manifest.module?.version],
  ["assets/providers/glm-opencode/manifest.json", (manifest) => manifest.module?.version],
  ["assets/providers/kimi/manifest.json", (manifest) => manifest.module?.version],
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

echo ""
echo "🧪 Step 9.5: Verifying VSIX runtime package surface..."
if ! VSIX_FILE="$VSIX_FILE" node <<'NODE'
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const archivePath = process.env.VSIX_FILE;
const listing = execFileSync("unzip", ["-l", archivePath], { encoding: "utf8" });
const requiredEntries = [
  "extension/node_modules/@codeai-hub/localization/package.json",
  "extension/node_modules/@codeai-hub/translation/package.json",
];
const forbiddenEntries = [
  "extension/.git",
  "extension/.github/",
  "extension/.nvmrc",
  "extension/native/",
];
const forbiddenPatterns = [
  /\/\.build\//u,
  /\/ModuleCache\//u,
  /\.dSYM\//u,
];

const missing = requiredEntries.filter((entry) => !listing.includes(entry));
const leaked = forbiddenEntries.filter((entry) => listing.includes(entry));
const leakedByPattern = listing
  .split("\n")
  .map((line) => line.trim().split(/\s+/u).at(-1) ?? "")
  .filter((entry) => forbiddenPatterns.some((pattern) => pattern.test(entry)));

if (missing.length > 0 || leaked.length > 0 || leakedByPattern.length > 0) {
  if (missing.length > 0) {
    console.error(`Missing VSIX runtime entries:\n${missing.join("\n")}`);
  }
  if (leaked.length > 0) {
    console.error(`Unexpected repo-only VSIX entries:\n${leaked.join("\n")}`);
  }
  if (leakedByPattern.length > 0) {
    console.error(
      `Unexpected VSIX build-cache entries:\n${leakedByPattern.slice(0, 20).join("\n")}`
    );
  }
  process.exit(1);
}

const extractionRoot = mkdtempSync(join(tmpdir(), "codeai-hub-vsix-"));
try {
  execFileSync("unzip", ["-q", archivePath, "-d", extractionRoot], {
    stdio: "pipe",
  });
  const packagedRegistry = require(join(
    extractionRoot,
    "extension/node_modules/@codeai-hub/localization/dist/source-dictionary-registry.js"
  ));
  const bundledDictionaries = packagedRegistry.BUNDLED_SOURCE_DICTIONARIES;
  if (!Array.isArray(bundledDictionaries) || bundledDictionaries.length === 0) {
    throw new Error(
      "Packaged localization source registry did not expose bundled dictionaries."
    );
  }
} finally {
  rmSync(extractionRoot, { force: true, recursive: true });
}
NODE
then
  exit 1
fi
echo "✅ VSIX runtime package surface verified"

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

# Step 11: Summary
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
echo "2. Keep the release commit history intact; do not hand-edit versions after packaging"
echo "3. Copy fresh tarballs from doc/tmp/releases/ or ~/.codeai-hub/releases/ if you are distributing the full release bundle"
echo "4. Share or install $VSIX_FILE once local validation is complete"
echo ""
echo "⚠️  Reminder: Provider CLIs/SDKs must remain globally installed, not inside the extension."
