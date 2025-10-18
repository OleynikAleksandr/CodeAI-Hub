#!/bin/bash

# CodeAI Hub Release Build Script
# Ensures clean build, architecture compliance, and VSIX packaging

set -e

PROJECT_NAME="CodeAI Hub"
# Ensure we run from repo root regardless of where script is invoked
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"
cd "$REPO_ROOT"

PACKAGE_NAME=$(node -p "require('./package.json').name")

echo "🔧 ${PROJECT_NAME} - Release Build Script"
echo "============================================"

if [ -z "$1" ]; then
    echo "❌ Error: Version number required!"
    echo "Usage: ./build-release.sh <version>"
    echo "Example: ./build-release.sh 0.1.0"
    exit 1
fi

VERSION=$1
echo "📦 Building version: $VERSION"

# Step 1: Clean build artifacts
echo ""
echo "🧹 Step 1: Cleaning build cache..."
rm -rf out/*
rm -f *.vsix
rm -rf media/webview
rm -rf node_modules/@anthropic-ai 2>/dev/null || true
rm -rf node_modules/@openai 2>/dev/null || true
rm -rf node_modules/@google 2>/dev/null || true
echo "✅ Cache cleaned"

# Step 2: Update version in package.json
echo ""
echo "📝 Step 2: Updating version to $VERSION..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
echo "✅ Version updated"

# Step 3: Build webview UI (if present)
echo ""
echo "⚛️ Step 3: Building webview UI..."
if [ -d "src/webview/ui" ]; then
  pushd src/webview/ui >/dev/null
  if [ -f package.json ]; then
    npm install
    npm run build
  else
    echo "⚠️  package.json not found in src/webview/ui; skipping webview build"
  fi
  popd >/dev/null

  if [ -d "src/webview/ui/dist" ]; then
    mkdir -p media/webview
    rsync -a src/webview/ui/dist/ media/webview/
    echo "✅ Webview artifacts copied to media/webview"
  else
    echo "⚠️  Webview dist folder not found; ensure build output exists"
  fi
else
  echo "⚠️  Webview directory src/webview/ui not found; skipping"
fi

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
if [ -d "node_modules/@anthropic-ai" ] || [ -d "node_modules/@openai" ] || [ -d "node_modules/@google" ]; then
  echo "⚠️  Warning: Provider SDK found in node_modules, removing..."
  rm -rf node_modules/@anthropic-ai node_modules/@openai node_modules/@google
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

echo "✅ SDK exclusions verified"

# Step 8: Docs link check & duplication check (advisory)
echo ""
echo "🔗 Checking markdown links..."
npm run -s check:links || echo "⚠️  Markdown link issues detected (advisory)"

echo ""
echo "🔁 Checking code duplication (jscpd)..."
npm run -s check:dup || echo "⚠️  Duplication threshold exceeded (advisory)"

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
