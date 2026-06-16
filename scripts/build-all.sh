#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"
cd "$REPO_ROOT"

source "$SCRIPT_DIR/release-utils.sh"

ALLOW_DIRTY=false
EXPLICIT_VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --allow-dirty)
      ALLOW_DIRTY=true
      shift
      ;;
    --version)
      EXPLICIT_VERSION="$2"
      shift 2
      ;;
    *)
      echo "❌ Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

detect_platform_keys() {
  local uname_s
  local uname_m
  uname_s="$(uname -s)"
  uname_m="$(uname -m)"
  case "$uname_s" in
    Darwin)
      case "$uname_m" in
        arm64)
          CORE_PLATFORM_KEY="darwin-arm64"
          LAUNCHER_FILE_PLATFORM="macos-arm64"
          ;;
        x86_64)
          CORE_PLATFORM_KEY="darwin-x64"
          LAUNCHER_FILE_PLATFORM="macos-x64"
          ;;
        *)
          echo "❌ Unsupported macOS architecture: $uname_m" >&2
          exit 1
          ;;
      esac
      ;;
    Linux)
      if [[ "$uname_m" != "x86_64" ]]; then
        echo "❌ Unsupported Linux architecture: $uname_m" >&2
        exit 1
      fi
      CORE_PLATFORM_KEY="linux-x64"
      LAUNCHER_FILE_PLATFORM="linux-x64"
      ;;
    *)
      echo "❌ Unsupported platform: $uname_s" >&2
      exit 1
      ;;
  esac
}

copy_release_artifacts() {
  local version="$1"
  detect_platform_keys
  local release_cache="$HOME/.codeai-hub/releases"
  local doc_releases="$REPO_ROOT/doc/tmp/releases"
  local required=(
    "claude-module-${version}.tar.bz2"
    "codex-module-${version}.tar.bz2"
    "gemini-module-${version}.tar.bz2"
    "glm-claude-code-module-${version}.tar.bz2"
    "glm-opencode-module-${version}.tar.bz2"
    "kimi-module-${version}.tar.bz2"
    "codeai-hub-core-${CORE_PLATFORM_KEY}-${version}.tar.bz2"
    "CodeAIHubLauncher-${LAUNCHER_FILE_PLATFORM}-${version}.tar.bz2"
    "vscode-webview-${version}.tar.bz2"
    "project-manager-${version}.tar.bz2"
  )

  for artefact in "${required[@]}"; do
    if [[ ! -f "$release_cache/$artefact" ]]; then
      echo "❌ Missing artefact $artefact in $release_cache" >&2
      exit 1
    fi
  done

  mkdir -p "$doc_releases"
  for artefact in "${required[@]}"; do
    cp "$release_cache/$artefact" "$doc_releases/$artefact"
  done
  clean_release_dir "$doc_releases"
}

VERSION_SOURCES=(
  "package.json::version"
  "packages/core/package.json::version"
  "packages/Claude_Module/package.json::version"
  "packages/Codex_AppServer_Module/package.json::version"
  "packages/Gemini_Module/package.json::version"
  "packages/GLM_OpenCode_Module/package.json::version"
  "packages/Kimi_Module/package.json::version"
  "packages/localization/package.json::version"
  "packages/translation/package.json::version"
  "packages/initiatives/package.json::version"
  "packages/unified-session/package.json::version"
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
  if $ALLOW_DIRTY; then
    echo "⚠️  Warning: --allow-dirty enabled. Building from a dirty working tree." >&2
    return
  fi
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "❌ Working tree has uncommitted changes. Commit or stash before running build-all." >&2
    exit 1
  fi
}

update_workspace_version() {
  local workspace="$1"
  local version="$2"
  npm version "$version" --workspace="$workspace" --no-git-tag-version --allow-same-version >/dev/null
}

update_root_version() {
  local version="$1"
  npm version "$version" --no-git-tag-version --allow-same-version >/dev/null
}

clean_local_artifacts() {
  local core_path="$HOME/.codeai-hub/core"
  local providers_root="$HOME/.codeai-hub/providers"
  local cef_path="$HOME/.codeai-hub/cef-launcher"
  local releases_path="$HOME/.codeai-hub/releases"

  for path in "$core_path" "$cef_path" "$releases_path"; do
    if [[ -d "$path" ]]; then
      rm -rf "$path"
    fi
  done

  if [[ -d "$providers_root" ]]; then
    find "$providers_root" -mindepth 1 -maxdepth 1 ! -name "codex" ! -name "claude" ! -name "glm-claude-code" ! -name "glm-opencode" -exec rm -rf {} +
    if [[ -d "$providers_root/codex" ]]; then
      find "$providers_root/codex" -mindepth 1 -maxdepth 1 ! -name "home" -exec rm -rf {} +
    fi
    if [[ -d "$providers_root/claude" ]]; then
      find "$providers_root/claude" -mindepth 1 -maxdepth 1 ! -name "home" -exec rm -rf {} +
    fi
    if [[ -d "$providers_root/glm-claude-code" ]]; then
      find "$providers_root/glm-claude-code" -mindepth 1 -maxdepth 1 ! -name "home" ! -name "config.json" -exec rm -rf {} +
    fi
    if [[ -d "$providers_root/glm-opencode" ]]; then
      find "$providers_root/glm-opencode" -mindepth 1 -maxdepth 1 ! -name "home" ! -name "config.json" -exec rm -rf {} +
    fi
  fi
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

if [[ -n "$EXPLICIT_VERSION" ]]; then
  if ! [[ "$EXPLICIT_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ --version must be semver like 1.2.0 (got: $EXPLICIT_VERSION)" >&2
    exit 1
  fi
  if [[ "$(compare_versions "$max_version" "$EXPLICIT_VERSION")" != "$EXPLICIT_VERSION" ]] && [[ "$EXPLICIT_VERSION" != "$max_version" ]]; then
    echo "❌ --version $EXPLICIT_VERSION is not greater than current max $max_version" >&2
    exit 1
  fi
  new_version="$EXPLICIT_VERSION"
else
  new_version="$(increment_patch "$max_version")"
fi

echo "🔖 Current max version: $max_version"
echo "🔖 Preparing new unified version: $new_version"

update_workspace_version "@codeai-hub/core" "$new_version"
update_workspace_version "@codeai-hub/claude-module" "$new_version"
update_workspace_version "@codeai-hub/codex-app-server-module" "$new_version"
update_workspace_version "@codeai-hub/gemini-module" "$new_version"
update_workspace_version "@codeai-hub/glm-opencode-module" "$new_version"
update_workspace_version "@codeai-hub/kimi-module" "$new_version"
update_workspace_version "@codeai-hub/localization" "$new_version"
update_workspace_version "@codeai-hub/translation" "$new_version"
update_workspace_version "@codeai-hub/initiatives" "$new_version"
update_workspace_version "@codeai-hub/unified-session" "$new_version"
update_root_version "$new_version"

clean_local_artifacts

echo "🏗️  Building provider modules..."
"$SCRIPT_DIR/build-claude-module.sh" --version "$new_version"
"$SCRIPT_DIR/build-glm-claude-code-module.sh" --version "$new_version"
"$SCRIPT_DIR/build-glm-opencode-module.sh" --version "$new_version"
"$SCRIPT_DIR/build-codex-module.sh" --version "$new_version"
"$SCRIPT_DIR/build-gemini-module.sh" --version "$new_version"
"$SCRIPT_DIR/build-kimi-module.sh" --version "$new_version"

echo "🏗️  Building core..."
"$SCRIPT_DIR/build-core.sh" --version "$new_version"

echo "🏗️  Building UI bundles..."
"$SCRIPT_DIR/build-ui-bundle.sh" vscode-webview "$new_version"
"$SCRIPT_DIR/build-ui-bundle.sh" project-manager "$new_version"

echo "🏗️  Building CEF launcher..."
"$SCRIPT_DIR/build-cef-launcher.sh" --launcher-version "$new_version"

copy_release_artifacts "$new_version"

echo ""
echo "✅ Unified provider/core/UI build complete."
echo "📦 Providers: claude/codex/gemini/kimi/glm-claude-code/glm-opencode module tarballs for ${new_version}"
echo "📦 Core: codeai-hub-core-<platform>-${new_version}.tar.bz2"
echo "📦 Launcher: CodeAIHubLauncher-<platform>-${new_version}.tar.bz2"
echo "📦 UI: vscode-webview-${new_version}.tar.bz2, project-manager-${new_version}.tar.bz2"
echo ""
echo "Next:"
echo "  1) Ensure git status is clean."
echo "  2) Run ./scripts/build-release.sh --use-current-version to build VSIX."
echo ""
echo "⚠️  Reminder: update README/CHANGELOG/SystemArchitecture manually to describe the release."
