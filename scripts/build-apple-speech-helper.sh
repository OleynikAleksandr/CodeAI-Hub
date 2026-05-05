#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"
HELPER_DIR="$REPO_ROOT/native/apple-speech-helper"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Apple Speech helper can only be built on macOS." >&2
  exit 1
fi

swift build \
  --package-path "$HELPER_DIR" \
  --configuration release

echo "$HELPER_DIR/.build/release/apple-speech-helper"
