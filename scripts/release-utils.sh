#!/bin/bash

clean_release_dir() {
  local dist_root="$1"
  if [[ ! -d "$dist_root" ]]; then
    return
  fi
  local keep_patterns=(
    "CodeAIHubLauncher-macos-arm64-*.tar.bz2"
    "codeai-hub-core-darwin-arm64-*.tar.bz2"
    "claude-module-*.tar.bz2"
    "codex-module-*.tar.bz2"
    "gemini-module-*.tar.bz2"
  )

  for pattern in "${keep_patterns[@]}"; do
    matches=()
    while IFS= read -r match; do
      matches+=("$match")
    done < <(ls -1t "$dist_root"/$pattern 2>/dev/null || true)
    if [ ${#matches[@]} -gt 0 ]; then
      for idx in "${!matches[@]}"; do
        if [ "$idx" -eq 0 ]; then
          continue
        fi
        rm -f "${matches[$idx]}"
      done
    fi
  done

  for entry in "$dist_root"/*; do
    [[ -e "$entry" ]] || continue
    local base
    base="$(basename "$entry")"
    local keep=false
    for pattern in "${keep_patterns[@]}"; do
      if [[ $base == $pattern ]]; then
        keep=true
        break
      fi
    done
    if [[ "$keep" == false ]]; then
      rm -rf "$entry"
    fi
  done
}
