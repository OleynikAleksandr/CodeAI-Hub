#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"
source "$SCRIPT_DIR/release-utils.sh"

cd "$REPO_ROOT"

BUNDLE_NAME="${1:-vscode-webview}"
VERSION="${2:-1.0.0}"
MANIFEST_PATH="$REPO_ROOT/assets/ui/manifest.json"
INSTALL_ROOT="$HOME/.codeai-hub/packages/ui/$BUNDLE_NAME"
RELEASES_DIR="$HOME/.codeai-hub/releases"

mkdir -p "$RELEASES_DIR"

case "$BUNDLE_NAME" in
  vscode-webview)
    echo "🏗️  Building vscode-webview UI bundle..."
    npm run build:webview
    
    BUNDLE_DIR="$REPO_ROOT/dist/ui/vscode-webview-$VERSION"
    mkdir -p "$BUNDLE_DIR"
    
    # Copy built webview assets
    cp "$REPO_ROOT/media/react-chat.js" "$BUNDLE_DIR/"
    cp "$REPO_ROOT/media"/*.css "$BUNDLE_DIR/" 2>/dev/null || true
    
    # Create archive
    cd "$REPO_ROOT/dist/ui"
    ARCHIVE_NAME="vscode-webview-$VERSION.tar.bz2"
    tar -cjf "$ARCHIVE_NAME" "vscode-webview-$VERSION"
    
    # Move to releases
    mv "$ARCHIVE_NAME" "$RELEASES_DIR/"
    ARCHIVE_PATH="$RELEASES_DIR/$ARCHIVE_NAME"
    
    echo "✅ vscode-webview bundle created: $ARCHIVE_PATH"
    
    # Install to packages layout
    TARGET_DIR="$INSTALL_ROOT/$VERSION"
    echo "📥 Installing to $TARGET_DIR..."
    rm -rf "$TARGET_DIR"
    mkdir -p "$TARGET_DIR"
    cp -r "$BUNDLE_DIR/"* "$TARGET_DIR/"
    
    # Update current symlink
    ln -sfn "$VERSION" "$INSTALL_ROOT/current"
    
    # Clean up build dir
    rm -rf "vscode-webview-$VERSION"
    ;;
    
  web-client)
    echo "🏗️  Building web-client UI bundle..."
    npm run build:web-client
    
    BUNDLE_DIR="$REPO_ROOT/dist/ui/web-client-$VERSION"
    mkdir -p "$BUNDLE_DIR"
    
    # Copy built web-client assets
    cp -r "$REPO_ROOT/media/web-client/dist/"* "$BUNDLE_DIR/" 2>/dev/null || {
      echo "⚠️  web-client build output not found, creating placeholder"
      echo "placeholder" > "$BUNDLE_DIR/index.html"
    }
    
    # Create archive
    cd "$REPO_ROOT/dist/ui"
    ARCHIVE_NAME="web-client-$VERSION.tar.bz2"
    tar -cjf "$ARCHIVE_NAME" "web-client-$VERSION"
    
    # Move to releases
    mv "$ARCHIVE_NAME" "$RELEASES_DIR/"
    ARCHIVE_PATH="$RELEASES_DIR/$ARCHIVE_NAME"
    
    echo "✅ web-client bundle created: $ARCHIVE_PATH"
    
    # Install to packages layout
    TARGET_DIR="$INSTALL_ROOT/$VERSION"
    echo "📥 Installing to $TARGET_DIR..."
    rm -rf "$TARGET_DIR"
    mkdir -p "$TARGET_DIR"
    cp -r "$BUNDLE_DIR/"* "$TARGET_DIR/"
    
    # Update current symlink
    ln -sfn "$VERSION" "$INSTALL_ROOT/current"
    
    # Clean up build dir
    rm -rf "web-client-$VERSION"
    ;;

  project-manager)
    echo "🏗️  Building project-manager UI bundle..."
    # No build step for now, just copy static files
    
    BUNDLE_DIR="$REPO_ROOT/dist/ui/project-manager-$VERSION"
    mkdir -p "$BUNDLE_DIR"
    
    # Copy project-manager assets
    cp -r "$REPO_ROOT/packages/ui/project-manager/"* "$BUNDLE_DIR/"
    
    # Create archive
    cd "$REPO_ROOT/dist/ui"
    ARCHIVE_NAME="project-manager-$VERSION.tar.bz2"
    tar -cjf "$ARCHIVE_NAME" "project-manager-$VERSION"
    
    # Move to releases
    mv "$ARCHIVE_NAME" "$RELEASES_DIR/"
    ARCHIVE_PATH="$RELEASES_DIR/$ARCHIVE_NAME"
    
    echo "✅ project-manager bundle created: $ARCHIVE_PATH"
    
    # Install to packages layout
    TARGET_DIR="$INSTALL_ROOT/$VERSION"
    echo "📥 Installing to $TARGET_DIR..."
    rm -rf "$TARGET_DIR"
    mkdir -p "$TARGET_DIR"
    cp -r "$BUNDLE_DIR/"* "$TARGET_DIR/"
    
    # Update current symlink
    ln -sfn "$VERSION" "$INSTALL_ROOT/current"
    
    # Clean up build dir
    rm -rf "project-manager-$VERSION"
    ;;
    
  *)
    echo "❌ Unknown bundle name: $BUNDLE_NAME" >&2
    echo "Usage: $0 {vscode-webview|web-client|project-manager} [version]" >&2
    exit 1
    ;;
esac

# Update manifest
PACKAGE_SIZE=$(file_size "$ARCHIVE_PATH")
PACKAGE_SHA1=$(sha1_file "$ARCHIVE_PATH")

BUNDLE_NAME="$BUNDLE_NAME" \
BUNDLE_VERSION="$VERSION" \
PACKAGE_NAME="$ARCHIVE_NAME" \
PACKAGE_SIZE="$PACKAGE_SIZE" \
PACKAGE_SHA1="$PACKAGE_SHA1" \
MANIFEST_PATH="$MANIFEST_PATH" \
  node <<'EOF'
const fs = require("node:fs");
const manifestPath = process.env.MANIFEST_PATH;
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const bundleId = process.env.BUNDLE_NAME;

if (!manifest.bundles[bundleId]) {
  manifest.bundles[bundleId] = {};
}

manifest.bundles[bundleId] = {
  version: process.env.BUNDLE_VERSION,
  package: process.env.PACKAGE_NAME,
  size: Number(process.env.PACKAGE_SIZE),
  sha1: process.env.PACKAGE_SHA1
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
EOF

echo "📝 Manifest updated for $BUNDLE_NAME"
