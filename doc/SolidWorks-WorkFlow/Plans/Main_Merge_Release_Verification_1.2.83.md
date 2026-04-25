# Main Merge Release Verification 1.2.83

**Status:** Active planning scope
**Date:** 2026-04-25
**Owner:** Oleksandr + Codex

## Problem

The instruction-stack work from `codex/claude-instruction-stack-tests` was completed and merged into `main`. We need a release-grade verification that the merged `main` branch is current, coherent, and packageable.

## Scope

- Build the next release from `main`.
- Bump the project from `1.2.82` to `1.2.83` through the existing release automation.
- Keep release notes truthful: `README.md` and `CHANGELOG.md` must describe this release as a merge/package verification release, not a new feature release.
- Use the standard release scripts:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`

## Non-Goals

- No provider prompt/tool behavior changes.
- No architecture changes.
- No manual package version edits outside the release automation.

## Verification Contract

Release `1.2.83` is considered valid if:

- `main` starts from a clean worktree.
- README/CHANGELOG are prepared for `1.2.83` before `build-all.sh`.
- `build-all.sh` completes and produces the provider/core/UI/launcher tarballs.
- `build-release.sh --use-current-version` completes and produces `codeai-hub-1.2.83.vsix`.
- The script output confirms:
  - `Step 7: Verifying SDK exclusions`
  - `Removing dev dependencies before packaging`
  - `Package created`

## Verification Result

Release `1.2.83` passed the release verification on `main`.

- `./scripts/build-all.sh` passed and produced:
  - `doc/tmp/releases/claude-module-1.2.83.tar.bz2`
  - `doc/tmp/releases/codex-module-1.2.83.tar.bz2`
  - `doc/tmp/releases/gemini-module-1.2.83.tar.bz2`
  - `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.2.83.tar.bz2`
  - `doc/tmp/releases/project-manager-1.2.83.tar.bz2`
  - `doc/tmp/releases/vscode-webview-1.2.83.tar.bz2`
  - `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.2.83.tar.bz2`
- `./scripts/build-release.sh --use-current-version` passed and produced:
  - `codeai-hub-1.2.83.vsix`
- Required release output markers were present:
  - `Step 7: Verifying SDK exclusions`
  - `Removing dev dependencies before packaging`
  - `Package created`
- Advisory markdown link warnings remain limited to archived provider prompt dumps with upstream example absolute paths.

## Documents

- Base SSOT: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Discovery index: `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Release surfaces: `README.md`, `CHANGELOG.md`
