# Plan Closeout: glm-usage-quota-2026-06-18

**Created:** 2026-06-18T18:40:23.409Z
**Acceptance:** User accepted release v1.2.546; native GLM session top bar shows real 5h 2% and Weekly 15% with reset times; context-window usage intact; Kimi unaffected.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** glm-quota-closeout
**Expected Commit:** chore(closeout): archive glm usage limits plan
**Last Recorded Commit:** 22abaeb8b
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/GLM_Usage_Quota_Planning_RU.md

## Active Plan Copy

````markdown
# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "glm-usage-quota-2026-06-18",
  "branch": "main",
  "baseHead": "f03168e3d",
  "lastRecordedCommit": "22abaeb8b",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/GLM_Usage_Quota_Planning_RU.md",
  "currentTaskId": "glm-quota-closeout",
  "expectedCommitMessage": "chore(closeout): archive glm usage limits plan",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/GLM_Usage_Quota_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `packages/GLM_Module/src/provider/glm-native-provider-adapter.ts`
  - `packages/GLM_Module/src/provider/glm-native-runtime-profile.ts`
  - `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts` (образец `refreshUsageLimits`)
  - `packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-refresh.ts` (Core refresh шов, duck-typing)
  - `src/client/project-manager/components/sessions/usage-limits-stream.ts` (ожидаемый payload `kind: "usage_limits"`)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- Каждая подзадача затрагивает не более 3 файлов и оформляется парой пунктов: (1) реализация, (2) `Git Commit: ...` (отдельной строкой). Scope указывается реальными путями в `scope: \`...\``.
- **Gates (автоматически через Husky):** `git commit` → `check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`; `git push` → `npm run check:dup`, `npm run check:links`.
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run build --workspace @codeai-hub/glm-module`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit:** после зелёных гейтов — `npm run plan:commit -- "<expected commit message>"`.
- **Ponytail Hard Mode:** минимальный diff, переиспользование существующих primitives, никаких новых абстракций. Core/UI не трогаем.
- **Release Build Confirmation Gate:** не запускать `./scripts/build-all.sh` без отдельного явного подтверждения пользователя.

## Phase 0 — Documentation Intake (owner: orchestrator, updated: 2026-06-18)
### Stream: Adopt GLM usage-quota planning
1. [DONE] `glm-quota-intake` Создать планинг-документ GLM usage quota (минимальный дизайн: reader + adapter.refreshUsageLimits, Core/UI не трогаем) (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/GLM_Usage_Quota_Planning_RU.md`; expected commit: `docs(glm): adopt glm usage quota planning`)
2. [DONE] Git Commit: `docs(glm): adopt glm usage quota planning` (hash: 3463600be)

## Phase 1 — GLM usage-limits emission (owner: orchestrator, updated: 2026-06-18)
### Stream: monitor reader + adapter refresh
3. [DONE] `glm-quota-reader` GLM usage-limits reader (fetch monitor endpoint, голый Authorization, origin из baseUrl, классификация 5h/Weekly по `(type, unit)`, отброс TIME_LIMIT) + `GlmProviderAdapter.refreshUsageLimits()` (buildProfile → reader → broadcast payload `kind: "usage_limits"`) + unit-тест reader (scope: `packages/GLM_Module/src/provider/glm-usage-limits-reader.ts, packages/GLM_Module/src/provider/glm-native-provider-adapter.ts, packages/GLM_Module/src/provider/glm-usage-limits-reader.test.ts`; expected commit: `feat(glm): emit 5h and weekly usage limits`)
4. [DONE] Git Commit: `feat(glm): emit 5h and weekly usage limits` (hash: b341cba84)

## Phase 2 — Tooling Verification (owner: orchestrator, updated: 2026-06-18)
### Stream: Target builds + gates + behavioral check
5. [DONE] `glm-quota-verify` Таргетные сборки (`glm-module`, `core`, `build:webview`, `typecheck:webview`) + гейты зелёные; поведенческая проверка: 5h/Weekly видны в GLM-сессии и не протекают в Kimi/opencode сессии. Если что-то ломается — отдельная узкая micro-task. Зафиксировать evidence в todo-plan. (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record glm usage limits verification`) Result: glm-module build OK, core build OK, build:webview OK, typecheck:webview OK; GLM module tests 18/18 pass (incl. 4 new reader tests). Provider separation confirmed in code — `normalizeProviderFamily` keeps `glmnative` distinct from `kimi`/`glmopencode`, so the `glmNative:global` payload matches only GLM sessions. Runtime visual confirmation deferred to User Visual Acceptance (Phase 4).
6. [DONE] Git Commit: `chore: record glm usage limits verification` (hash: 6753a1f3b)

## Phase 3 — Release Build (owner: orchestrator, updated: 2026-06-18)
### Stream: Release vNEXT (после явного confirmation gate)
7. [DONE] `glm-quota-release-notes` Обновить README ("Current Release") + CHANGELOG на будущую версию (GLM 5h/Weekly usage limits); закоммитить ДО build-all.sh (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare glm usage limits release notes`)
8. [DONE] Git Commit: `docs: prepare glm usage limits release notes` (hash: 1ec036da1)
9. [TODO] **Release Build Confirmation Gate:** остановка и явный запрос пользователя перед `./scripts/build-all.sh`. Не запускать сборку релиза без отдельного подтверждения.
10. [DONE] `glm-quota-release-build` `./scripts/build-all.sh` (version bump) + `./scripts/build-release.sh --use-current-version`; VSIX → пользователю; зафиксировать версии/манифесты/evidence (scope: `package.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, package-lock.json, doc/TODO/todo-plan.md`; expected commit: `chore(release): build glm usage limits release`)
11. [DONE] Git Commit: `chore(release): build glm usage limits release` (hash: bf9af2ce6)

## Phase 4 — User Visual Acceptance Testing (owner: orchestrator, updated: 2026-06-18)
### Stream: User retest
12. [DONE] `glm-quota-acceptance` Передать VSIX пользователю; дождаться явного acceptance: 5h/Weekly реально показываются для GLM-сессии. (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record glm usage limits user acceptance`) Result: User accepted release v1.2.546 — screenshot confirms native GLM session top bar shows 5h 2% (Resets Jun 18 11:05pm) and Weekly 15% (Resets Jun 25 6:56am), matching the live curl values; context-window usage (9232 tokens) intact, Kimi unaffected.
13. [DONE] Git Commit: `chore: record glm usage limits user acceptance` (hash: 22abaeb8b)

## Phase 5 — Scope Closeout (owner: orchestrator, updated: 2026-06-18)
### Stream: Archive + planning-doc disposition
14. [IN_PROGRESS] `glm-quota-closeout` После User Acceptance Gate: архивировать todo-plan в Archive/, disposition планинг-документа, обновить Docs_Index.md и затронутые SSOT/provider docs (scope: `doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/**, CHANGELOG.md`; expected commit: `chore(closeout): archive glm usage limits plan`)
15. [TODO] Git Commit: `chore(closeout): archive glm usage limits plan` (hash: TBD)
16. [TODO] Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
````
