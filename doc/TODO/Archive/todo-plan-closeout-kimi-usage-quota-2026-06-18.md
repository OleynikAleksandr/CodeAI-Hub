# Plan Closeout: kimi-usage-quota-2026-06-18

**Created:** 2026-06-19T05:29:09.935Z
**Acceptance:** User accepted release v1.2.547: Kimi 5h/Weekly appear after a turn; questionnaire no longer overwritten on read error. GLM 5h reset-time-at-0% confirmed expected (z.ai omits nextResetTime for a fresh window).
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** kimi-quota-closeout
**Expected Commit:** chore(closeout): archive kimi usage limits and questionnaire fix plan
**Last Recorded Commit:** 80cb5fb32
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_Usage_Quota_Planning_RU.md

## Active Plan Copy

````markdown
# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-usage-quota-2026-06-18",
  "branch": "main",
  "baseHead": "62f98657b",
  "lastRecordedCommit": "80cb5fb32",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_Usage_Quota_Planning_RU.md",
  "currentTaskId": "kimi-quota-closeout",
  "expectedCommitMessage": "chore(closeout): archive kimi usage limits and questionnaire fix plan",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_Usage_Quota_Planning_RU.md`
- **Read this context before implementation:**
  - `packages/Kimi_Module/src/provider/kimi-usage-limits-reader.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts` (`onTurnCompleted` injection at 145)
  - `src/client/project-manager/services/description-questionnaire-service.ts` (`load` write guard at 215, `readWorkspaceFile` status at 66)
  - `doc/BugRegistry.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- Каждая подзадача затрагивает не более 3 файлов и оформляется парой пунктов: (1) реализация, (2) `Git Commit: ...` (отдельной строкой). Scope указывается реальными путями в `scope: \`...\``.
- **Gates (автоматически через Husky):** `git commit` → `check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`; `git push` → `npm run check:dup`, `npm run check:links`.
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run build --workspace @codeai-hub/kimi-module`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit:** после зелёных гейтов — `npm run plan:commit -- "<expected commit message>"`.
- **Ponytail Hard Mode:** минимальный diff, переиспользование существующих primitives.
- **Release Build Confirmation Gate:** не запускать `./scripts/build-all.sh` без отдельного явного подтверждения пользователя.
- **Variant C:** scope расширен Stream'ом «Questionnaire overwrite fix» (data-integrity) — релиз соберёт оба фикса (Kimi 5h/Weekly + questionnaire).

## Phase 0 — Documentation Intake (owner: orchestrator, updated: 2026-06-18)
### Stream: Adopt Kimi usage-quota planning
1. [DONE] `kimi-quota-intake` Создать планинг-документ Kimi usage quota (диагноз: 5h remaining bug + turn_completed refresh не подключён) (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_Usage_Quota_Planning_RU.md`; expected commit: `docs(kimi): adopt kimi usage quota planning`)
2. [DONE] Git Commit: `docs(kimi): adopt kimi usage quota planning` (hash: 8942f6bea)

## Phase 1 — Fix A: 5h remaining parsing (owner: orchestrator, updated: 2026-06-18)
### Stream: Kimi reader remaining handling
3. [DONE] `kimi-quota-reader` `KimiUsageLimitsReader`: `buildBucket` вычисляет `used = limit − remaining`, когда `used` отсутствует (5h detail). Обновлён unit-тест реальным shape. (scope: `packages/Kimi_Module/src/provider/kimi-usage-limits-reader.ts, packages/Kimi_Module/src/provider/kimi-usage-limits-reader.test.ts`; expected commit: `fix(kimi): read 5h remaining usage bucket`)
4. [DONE] Git Commit: `fix(kimi): read 5h remaining usage bucket` (hash: 20dcaa18d)

## Phase 2 — Fix B: refresh on turn completion (owner: orchestrator, updated: 2026-06-18)
### Stream: Core turn_completed usage refresh
5. [DONE] `kimi-quota-refresh` Обёртка `onTurnCompleted` → `handleRefreshUsageLimits(turn_completed)`, вынесена в helper `session-request-handler-usage-limits-turn-refresh.ts`. (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts, packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-turn-refresh.ts, packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-turn-refresh.test.ts`; expected commit: `fix(core): refresh usage limits on turn completion`)
6. [DONE] Git Commit: `fix(core): refresh usage limits on turn completion` (hash: cafc0e326)

## Phase 3 — Tooling Verification (Kimi) (owner: orchestrator, updated: 2026-06-18)
### Stream: Target builds + gates
7. [DONE] `kimi-quota-verify` Таргетные сборки + гейты зелёные; kimi-module tests 13/13, core turn-refresh 2/2. (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record kimi usage limits verification`) Result: kimi-module/core/webview/typecheck OK; tests green; lint/knip/architecture clean.
8. [DONE] Git Commit: `chore: record kimi usage limits verification` (hash: 01928bd67)

## Phase 4 — Questionnaire overwrite fix (Variant C) (owner: orchestrator, updated: 2026-06-18)
### Stream: Do not overwrite a filled questionnaire on read failure
9. [DONE] `anketa-fix` Записать баг в `doc/BugRegistry.md`; в `DescriptionQuestionnaireService.load` писать template ТОЛЬКО при явном `status === "missing"` (404), НЕ при `error` (вынести решение в чистую функцию `shouldSeedQuestionnaire(status)`); покрыть unit-тестом, что при `error` запись не происходит. (scope: `doc/BugRegistry.md, src/client/project-manager/services/description-questionnaire-service.ts, src/client/project-manager/services/description-questionnaire-service.test.ts`; expected commit: `fix(pm): keep questionnaire when read fails`)
10. [DONE] Git Commit: `fix(pm): keep questionnaire when read fails` (hash: 007e66732)
### Stream: Verification
11. [DONE] `anketa-verify` Таргетная проверка клиента: focused test + `npm run build:webview` + `npm run typecheck:webview`; зафиксировать evidence. (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record questionnaire overwrite fix verification`) Result: build:webview OK, typecheck:webview OK; description-questionnaire-service tests 4/4 (incl. `shouldSeedQuestionnaire` unit + read-error no-overwrite integration); lint/knip clean. Runtime visual confirmation (filled questionnaire survives PM startup) deferred to User Visual Acceptance (Phase 6).
12. [DONE] Git Commit: `chore: record questionnaire overwrite fix verification` (hash: dddb57117)

## Phase 5 — Release Build (owner: orchestrator, updated: 2026-06-18)
### Stream: Release vNEXT (после явного confirmation gate)
13. [DONE] `release-notes` Обновить README ("Current Release") + CHANGELOG на будущую версию (Kimi 5h/Weekly usage limits + questionnaire overwrite fix); закоммитить ДО build-all.sh (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare kimi usage limits and questionnaire fix release notes`)
14. [DONE] Git Commit: `docs: prepare kimi usage limits and questionnaire fix release notes` (hash: 42746fe6e)
15. [TODO] **Release Build Confirmation Gate:** остановка и явный запрос пользователя перед `./scripts/build-all.sh`. Не запускать сборку релиза без отдельного подтверждения.
16. [DONE] `release-build` `./scripts/build-all.sh` (version bump) + `./scripts/build-release.sh --use-current-version`; VSIX → пользователю; зафиксировать версии/манифесты/evidence (scope: `package.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, package-lock.json, doc/TODO/todo-plan.md`; expected commit: `chore(release): build kimi usage limits and questionnaire fix release`)
17. [DONE] Git Commit: `chore(release): build kimi usage limits and questionnaire fix release` (hash: b08822a63)

## Phase 6 — User Visual Acceptance Testing (owner: orchestrator, updated: 2026-06-18)
### Stream: User retest (both fixes)
18. [DONE] `acceptance` Передать VSIX; дождаться acceptance: (1) Kimi 5h/Weekly показываются после turn'а в свежей сессии; (2) заполненная анкета НЕ затирается шаблоном при старте PM. (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record kimi and questionnaire user acceptance`) Result: User accepted release v1.2.547. Kimi 5h/Weekly appear after a turn (screenshot confirmed). GLM 5h reset time was absent at 0% usage — z.ai omits nextResetTime for a fresh window; it appeared once usage reached 1% (expected, not a defect). Questionnaire fix accepted. Both fixes accepted; proceed to closeout.
19. [DONE] Git Commit: `chore: record kimi and questionnaire user acceptance` (hash: 80cb5fb32)

## Phase 7 — Scope Closeout (owner: orchestrator, updated: 2026-06-18)
### Stream: Archive + planning-doc disposition
20. [IN_PROGRESS] `kimi-quota-closeout` После User Acceptance Gate: архивировать todo-plan в Archive/, disposition планинг-документа, обновить Docs_Index.md, `Modules/Kimi.md` и `BugRegistry.md`. (scope: `doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/**, doc/BugRegistry.md, CHANGELOG.md`; expected commit: `chore(closeout): archive kimi usage limits and questionnaire fix plan`)
21. [TODO] Git Commit: `chore(closeout): archive kimi usage limits and questionnaire fix plan` (hash: TBD)
22. [TODO] `kimi-quota-handoff` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
````
