# Session 196 — Replace ts-prune with Knip + Dead Code Cleanup

**Date:** 2026-03-30
**Version:** 1.1.843 → 1.1.844
**Scope:** Quality gate upgrade — replace deprecated ts-prune with knip; remove verified dead code across the entire codebase.

## Context

ts-prune (v0.10.3) is deprecated and no longer maintained. Knip is its recommended successor with broader capabilities: unused files, unused dependencies, unused exports, and duplicate exports detection. The project had accumulated dead code from older feature iterations (idea collector, flow wizard, session store, diagram editor modules, recovery subsystem).

## What Was Done

### 1. Tooling Swap
- Uninstalled `ts-prune`, installed `knip` as devDependency.
- Created `knip.json` with workspace-aware config: root entry points (`extension.ts`, `index.tsx` for webview and project-manager), plus 9 workspace packages. Test files registered as entry points so knip sees their imports.
- Updated `package.json` script: `check:tsprune` → `check:knip`.
- Updated `.husky/pre-commit`: `npm run check:tsprune` → `npm run check:knip`.
- Updated `.github/workflows/ci.yml`: CI step renamed and rewired.
- Updated `AGENTS.md`, `assets/flow/continuity/create-report-code.md`, `packages/core/src/flow-node-continuity/template-loader.ts` — all ts-prune references replaced with knip.

### 2. Dead Code Verification and Cleanup
Every file and export flagged by knip was **manually verified via grep** before removal. False positives were identified and preserved.

**Unused files removed (59):**
- `packages/Claude_Module/src/sdk/` — 2 orphaned usage-limits files
- `packages/Codex_Module/src/response-policy/` — 1 unused facade
- `packages/core/src/` — 4 recovery files, 3 unused barrel index.ts files
- `src/client/project-manager/components/diagram-editor/` — 10 module editor files (closed dead cluster)
- `src/client/ui/src/` — 35 files: entire idea collector, flow wizard, action-bar, session store, questionnaire subsystems
- `src/client/ui/src/session/dialog-panel-pending-thinking.ts` — 1 unused file
- `src/extension-module/ui/index.ts` — empty barrel
- 7 orphaned test files for deleted modules

**Files kept (false positives):**
- `packages/core/src/workflow/diagram-dsl/` — 6 parser files (diagram-cluster-parser, diagram-legacy-ownership-parser, diagram-module-parser, diagram-modules-parser, diagram-ownership-parser, diagram-relations-parser) — form a live dependency chain anchored by test imports. Added to knip ignore.

**Unused exports cleaned (105):**
- ~40 exports: removed `export` keyword (symbol still used locally)
- ~25 exports: deleted entirely (no local or external usage)
- ~10 re-exports: removed from barrel files
- ~30 exports: confirmed as false positives (cross-workspace imports knip couldn't trace)

**Duplicate exports fixed (3):**
- 2 files had both named + default export of same component; removed redundant named export.
- 1 file had duplicate function name in barrel; removed.

**Lint fixes (2):**
- Removed 2 functions that became unused locals after export removal (`normalizeOptionalString`, `calculateRemainingPercent`).

### 3. Knip Configuration
Final `knip.json` excludes: `unlisted`, `binaries`, `devDependencies`, `types` (high noise, low signal for pre-commit). Active checks: unused files, unused exports, unused dependencies, duplicate exports.

### 4. Release Build
- v1.1.844 built and verified: all providers, core, CEF launcher, VSIX (1.71 MB).
- README.md and CHANGELOG.md synced to v1.1.844.
- Pushed to GitHub.

## Commits
1. `12029c86` — `refactor: replace ts-prune with knip and remove dead code`
2. `553e0341` — `chore: prepare v1.1.844 artifacts`
3. `e2880373` — `docs: sync release docs to v1.1.844`

## Gates
- `./scripts/check-architecture.sh`: OK
- `npx ultracite check`: OK (546 files, 0 errors)
- `npx knip`: OK (0 issues)
- `tsc --noEmit` (root): OK
- `tsc -p tsconfig.webview.json`: OK
- `jscpd` (duplication): OK (2.02%, under 3% threshold)
- `check-markdown-links`: OK (427 files)

## Stats
- Files deleted: 59
- Lines removed: ~6900
- Unused exports cleaned: 105
- Net file count change: -59

## Deferred
- Phase 104 item 23: move optimistic guard into shared WorkflowStateStore
- Gemini delay after submit: queueMicrotask() for session ID emission
- Stale allowlist entry: `packages/Codex_Module/src/sdk/codex-sdk-manager.ts` now at 300 lines — can be removed from debt allowlist
