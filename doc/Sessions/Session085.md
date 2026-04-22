# Session 85 — Usage Limits Cold-Open Fixes And Release 1.2.47

**Date:** 2026-04-22 10:48 (CEST)
**Branch:** main
**Version:** 1.2.47
**Execution Scope Status:** COMPLETED

---

# 1. Work Done in This Session

## Work summary
- Re-opened the post-`1.2.46` usage-limits regressions for `Codex` and `Claude` after user retest showed two concrete cold-open failures: missing `Resets ...` labels for Codex and delayed first-open limits for Claude.
- Confirmed `Codex` lost reset timestamps because app-server `resetsAt` arrived as numeric epoch values while `codex-app-server-event-router` accepted only non-empty strings on the account-level usage path.
- Confirmed `Claude` had a two-part cold-open defect: the provider adapter exposed `refreshUsageLimits()` as fire-and-forget instead of an awaitable lifecycle seam, and PM `usage-limits-stream` only updated the direct source session, so late provider-scoped payloads were cached but not applied once the bootstrap session id had already been replaced by a restored runtime session id.
- Fixed the provider-side contract by making `refreshUsageLimits()` awaitable for `Claude` and `Codex`, extracted Codex account-level usage normalization into a dedicated micro-helper to preserve architecture limits, and updated PM provider-scoped usage fan-out so late payloads refresh the visible snapshot even after restore-swap.
- Added regression guards for the two adapter contracts, Codex numeric `resetsAt` normalization, and the PM late-payload/same-provider replay path.
- Ran targeted tests and compilation checks, then completed the full release stream: `./scripts/build-all.sh --version 1.2.47` followed by `./scripts/build-release.sh --use-current-version`, producing `codeai-hub-1.2.47.vsix`.
- Updated `BugRegistry` to mark both usage-limits regressions fixed in `1.2.47`, synchronized `SystemArchitecture.md` with the new awaitable/provider-scoped usage contract, and restored `doc/TODO/todo-plan.md` to the neutral no-active-scope stub pointing at this session report.
- Verified document closure status after release: no live planning-docs for this usage-limits scope remained outside `Archive/`; the relevant implementation planning artifacts had already been archived in the earlier `1.2.45` closeout, so this session only needed SSOT/report synchronization and release closeout docs.

## Verification
- `npx tsx --test src/client/project-manager/components/sessions/usage-limits-stream.test.ts`
- `npx tsx --test packages/Claude_Module/src/provider/claude-provider-adapter.test.ts`
- `npx tsx --test packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.test.ts`
- `npx tsx --test packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.test.ts`
- `npm run typecheck:webview`
- `npm run build --workspace=@codeai-hub/claude-module`
- `npm run build --workspace=@codeai-hub/codex-app-server-module`
- `./scripts/build-all.sh --version 1.2.47`
- `./scripts/build-release.sh --use-current-version`

## User feedback
- Retest feedback (2026-04-22): пользователь подтвердил, что релиз `1.2.47` ведёт себя именно как требовалось: cold-open limits для `Codex` и `Claude` отображаются корректно, включая ожидаемый pre-turn UX.

## Git commits
(REFERENCE ONLY: этот список сохраняется для исторической трассировки и расследования регрессий; следующая сессия не обязана читать все коммиты по умолчанию.)
- `884f7b1eb fix: harden pre-turn usage limits cold-open refresh`
- `725a8d529 chore: release 1.2.47`

---

# 2. Instructions for Next Session

**Base SSOT:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
**Scope Discovery Index:** `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Plans for next session
- Активный execution scope отсутствует.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT.
- Затем агент обязан согласовать с пользователем новый scope.
- После этого агент обязан открыть `doc/SolidWorks-WorkFlow/Docs_Index.md`, выбрать релевантные документы для нового scope и только потом формировать новый planning-doc.
- До появления нового planning-doc и нового `doc/TODO/todo-plan.md` навигационной опорой служит `doc/SolidWorks-WorkFlow/Docs_Index.md`.
- Релизный артефакт текущей сессии: `codeai-hub-1.2.47.vsix`.
