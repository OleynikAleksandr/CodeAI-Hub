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

## Documents

- Base SSOT: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Discovery index: `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Release surfaces: `README.md`, `CHANGELOG.md`
