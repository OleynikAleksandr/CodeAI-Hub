# Settings Footer Codex Models Release 1.2.84

**Status:** Approved for execution
**Date:** 2026-04-27
**Owner:** Oleksandr + Codex

## 1. Problem

The Settings footer and Codex model catalog changes are already implemented and committed, but the session must produce a fresh release artifact.

## 2. Release Target

- Target version: `1.2.84`
- Release content:
  - Settings shell footer scroll boundary fix.
  - Codex model catalog additions: `gpt-5.2`, `gpt-5.3-codex-spark`.
  - Codex Settings order: `gpt-5.2`, `gpt-5.3-codex-spark`, `gpt-5.3-codex`, `gpt-5.4-mini`, `gpt-5.4`, `gpt-5.5`.
  - Core settings acceptance for the new Codex model IDs.

## 3. Release Flow

Follow the project release checklist:

1. Update `README.md` and `CHANGELOG.md` for the future version `1.2.84`.
2. Commit release documentation before running `build-all.sh`.
3. Ensure the tree is clean.
4. Run `./scripts/build-all.sh`.
5. Run `./scripts/build-release.sh --use-current-version`.
6. Archive this planning-doc and the active `todo-plan.md`.
7. Update the session report with release artifacts and verification results.

## 4. Verification

Required success evidence:

- `./scripts/build-all.sh` completes.
- `./scripts/build-release.sh --use-current-version` completes.
- Release output includes SDK exclusion verification and package creation.
- VSIX `codeai-hub-1.2.84.vsix` exists in the repo root.

## 5. Execution Plan

The active execution checklist lives in `doc/TODO/todo-plan.md`.
