#!/bin/bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <commit-message-file>" >&2
  exit 2
fi

MESSAGE_FILE="$1"

if [ ! -f "$MESSAGE_FILE" ]; then
  echo "Commit message file not found: $MESSAGE_FILE" >&2
  exit 2
fi

BLOCKED_PATTERN='^[[:space:]]*Co-Authored-By:[[:space:]]*Claude[^<]*<noreply@anthropic\.com>[[:space:]]*$'
TEMP_FILE="$(mktemp)"
trap 'rm -f "$TEMP_FILE"' EXIT

grep -Eiv "$BLOCKED_PATTERN" "$MESSAGE_FILE" > "$TEMP_FILE" || true

if ! cmp -s "$MESSAGE_FILE" "$TEMP_FILE"; then
  mv "$TEMP_FILE" "$MESSAGE_FILE"
  echo "⚠️  Removed forbidden Claude co-author trailer from commit message"
fi

if grep -Eiq "$BLOCKED_PATTERN" "$MESSAGE_FILE"; then
  echo "❌ Commit message still contains forbidden Claude co-author trailer" >&2
  exit 1
fi

exit 0
