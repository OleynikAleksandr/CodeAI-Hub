#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"
cd "$REPO_ROOT"

source "$SCRIPT_DIR/release-utils.sh"

VERSION_SOURCES=(
  "package.json::version"
  "packages/core/package.json::version"
  "packages/Claude_Module/package.json::version"
  "packages/Codex_Module/package.json::version"
  "packages/Gemini_Module/package.json::version"
  "assets/launcher/manifest.json::platforms.darwin-arm64.launcherVersion"
)

read_versions() {
  local blob=""
  for source in "${VERSION_SOURCES[@]}"; do
    blob+="$source"$'\n'
  done
  VERSION_SOURCES_BLOB="$blob" node <<'EOF'
const { readFileSync } = require("node:fs");
const raw = process.env.VERSION_SOURCES_BLOB ?? "";
const sources = raw.split("\n").map((entry) => entry.trim()).filter(Boolean);
const extract = (data, path) => path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), data);
const versions = [];
for (const source of sources) {
  const [file, path] = source.split("::");
  try {
    const content = JSON.parse(readFileSync(file, "utf8"));
    const value = extract(content, path);
    if (typeof value === "string") {
      versions.push(value);
    }
  } catch {
    // ignore missing files
  }
}
console.log(JSON.stringify(versions));
EOF
}

compare_versions() {
  local a_version="$1"
  local b_version="$2"
  IFS='.' read -r a_major a_minor a_patch <<<"$a_version"
  IFS='.' read -r b_major b_minor b_patch <<<"$b_version"

  if ((a_major != b_major)); then
    if ((a_major > b_major)); then
      echo "$a_version"
    else
      echo "$b_version"
    fi
    return
  fi

  if ((a_minor != b_minor)); then
    if ((a_minor > b_minor)); then
      echo "$a_version"
    else
      echo "$b_version"
    fi
    return
  fi

  if ((a_patch != b_patch)); then
    if ((a_patch > b_patch)); then
      echo "$a_version"
    else
      echo "$b_version"
    fi
    return
  fi

  echo "$a_version"
}

increment_patch() {
  IFS='.' read -r major minor patch <<<"$1"
  patch=$((patch + 1))
  echo "$major.$minor.$patch"
}

ensure_clean_worktree() {
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "❌ Working tree has uncommitted changes. Commit or stash before running build-all." >&2
    exit 1
  fi
}

update_workspace_version() {
  local workspace="$1"
  local version="$2"
  npm version "$version" --workspace="$workspace" --no-git-tag-version >/dev/null
}

update_root_version() {
  local version="$1"
  npm version "$version" --no-git-tag-version >/dev/null
}

clean_local_artifacts() {
  local paths=(
    "$HOME/.codeai-hub/core"
    "$HOME/.codeai-hub/providers"
    "$HOME/.codeai-hub/cef-launcher"
    "$HOME/.codeai-hub/releases"
  )
  for path in "${paths[@]}"; do
    if [[ -d "$path" ]]; then
      rm -rf "$path"
    fi
  done
}

ensure_clean_worktree

versions_json="$(read_versions)"
versions=($(node -e "console.log(JSON.parse(process.argv[1]).join(' '))" "$versions_json"))

if [[ ${#versions[@]} -eq 0 ]]; then
  echo "❌ Unable to determine current versions." >&2
  exit 1
fi

max_version="${versions[0]}"
for version in "${versions[@]:1}"; do
  max_version="$(compare_versions "$max_version" "$version")"
done

new_version="$(increment_patch "$max_version")"

echo "🔖 Current max version: $max_version"
echo "🔖 Preparing new unified version: $new_version"

update_workspace_version "@codeai-hub/core" "$new_version"
update_workspace_version "@codeai-hub/claude-module" "$new_version"
update_workspace_version "@codeai-hub/codex-module" "$new_version"
update_workspace_version "@codeai-hub/gemini-module" "$new_version"
update_root_version "$new_version"

clean_local_artifacts

echo "🏗️  Building provider modules..."
"$SCRIPT_DIR/build-claude-module.sh" --version "$new_version"
"$SCRIPT_DIR/build-codex-module.sh" --version "$new_version"
"$SCRIPT_DIR/build-gemini-module.sh" --version "$new_version"

echo "🏗️  Building core..."
"$SCRIPT_DIR/build-core.sh" --version "$new_version"

echo "🏗️  Building CEF launcher..."
"$SCRIPT_DIR/build-cef-launcher.sh" --launcher-version "$new_version"

echo "🏗️  Building VSIX..."
"$SCRIPT_DIR/build-release.sh" --use-current-version

echo ""
echo "✅ Unified build complete."
echo "📦 VSIX: codeai-hub-${new_version}.vsix"
echo "📦 Core: codeai-hub-core-darwin-arm64-${new_version}.tar.bz2"
echo "📦 Launcher: CodeAIHubLauncher-macos-arm64-${new_version}.tar.bz2"
echo "📦 Providers: claude/codex/gemini-module-${new_version}.tar.bz2"
echo ""
echo "⚠️  Reminder: update README/CHANGELOG/SystemArchitecture manually to describe the release."
