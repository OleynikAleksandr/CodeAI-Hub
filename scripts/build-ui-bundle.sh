#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"
cd "$REPO_ROOT"

BUNDLE_NAME="${1:-vscode-webview}"
VERSION="${2:-1.0.0}"

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
    tar -cjf "vscode-webview-$VERSION.tar.bz2" "vscode-webview-$VERSION"
    rm -rf "vscode-webview-$VERSION"
    
    # Move to releases
    RELEASES_DIR="$HOME/.codeai-hub/releases"
    mkdir -p "$RELEASES_DIR"
    mv "vscode-webview-$VERSION.tar.bz2" "$RELEASES_DIR/"
    
    echo "✅ vscode-webview bundle created: $RELEASES_DIR/vscode-webview-$VERSION.tar.bz2"
    ;;
    
  web-client)
    echo "🏗️  Building web-client UI bundle..."
    npm run build:web-client
    
    BUNDLE_DIR="$REPO_ROOT/dist/ui/web-client-$VERSION"
    mkdir -p "$BUNDLE_DIR"
    
    # Copy built web-client assets
    cp -r "$REPO_ROOT/packages/web-client/build/"* "$BUNDLE_DIR/" 2>/dev/null || {
      echo "⚠️  web-client build output not found, creating placeholder"
      echo "placeholder" > "$BUNDLE_DIR/index.html"
    }
    
    # Create archive
    cd "$REPO_ROOT/dist/ui"
    tar -cjf "web-client-$VERSION.tar.bz2" "web-client-$VERSION"
    rm -rf "web-client-$VERSION"
    
    # Move to releases
    RELEASES_DIR="$HOME/.codeai-hub/releases"
    mkdir -p "$RELEASES_DIR"
    mv "web-client-$VERSION.tar.bz2" "$RELEASES_DIR/"
    
    echo "✅ web-client bundle created: $RELEASES_DIR/web-client-$VERSION.tar.bz2"
    ;;
    
  *)
    echo "❌ Unknown bundle name: $BUNDLE_NAME" >&2
    echo "Usage: $0 {vscode-webview|web-client} [version]" >&2
    exit 1
    ;;
esac
