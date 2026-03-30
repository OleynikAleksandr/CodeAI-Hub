# Session 197 — Architecture Gate: Raise Line Limit to 500

**Date:** 2026-03-30
**Branch:** main
**Version:** 1.1.844

---

# 1. Work Done in This Session

## Work summary
- Archived previous `todo-plan.md` (Phases 101-115, release 1.1.844) into `doc/TODO/Archive/`
- Created new `todo-plan.md` for architecture line-limit refactor (3 phases, 5 target files)
- Raised architecture gate: `MAX_LINES` 300→500, `WARNING_LINES` 250→400
- Cleaned debt allowlist from 19 entries to 5 (only files genuinely >500 lines)
- Updated `AGENTS.md` architecture principles to reflect new 500-line limit

## Codebase scan results (before changes)
- Files >500 lines (blocking debt): 5
  - `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts` — 633
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts` — 595
  - `packages/core-supervisor/src/index.ts` — 585
  - `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts` — 529
  - `packages/core/src/unified-session/storage.ts` — 506
- Files 400-500 lines (warning zone under new limit): 4
  - `packages/Claude_Module/src/auth/sdk-auth-manager.ts` — 496
  - `packages/Gemini_Module/src/runtime/cli-bridge.ts` — 486
  - `packages/Gemini_Module/src/installer/gemini-installer.ts` — 450
  - `packages/core/src/provider-usage-limits/providers/claude/claude-usage-limits-facade.ts` — 440
- Files removed from allowlist (now within 500 limit): 14

## Git commits
- `2f35d3ab` `refactor: raise architecture line limit to 500`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session197.md` (THIS REPORT)

> Далее: в зависимости от задачи открыть нужные документы из `doc/SolidWorks-WorkFlow/Clusters/`, `doc/SolidWorks-WorkFlow/Modules/`, `doc/SolidWorks-WorkFlow/Contracts/`.

## Plans for next session
- Phase 2: refactor 5 files >500 lines (order: storage.ts → facade.test.ts → index.ts → session-request-handler.ts → session-request-handler.test.ts)
- Phase 3: release build after all files are within 500-line limit
- Deferred from Session 196: optimistic guard → shared WorkflowStateStore, Gemini queueMicrotask, codex-sdk-manager allowlist cleanup (now auto-resolved by new limit)
