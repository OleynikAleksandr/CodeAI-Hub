# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Scope:** Runtime Reliability Follow-up
**Planning approval:** APPROVED 2026-04-29 18:29 CEST by user request
**Current version at planning time:** `1.2.110`
**Target release:** `1.2.111` unless `package.json` version changes before execution

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Runtime_Reliability_Followup_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Runtime_Reliability_Followup_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream — микро-задачи.
- Каждая подзадача должна затрагивать не более 3 файлов/пакетов. Если фактическая реализация требует больше — сначала переписать этот план и разбить задачу.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Docs are part of implementation:** если микрозадача меняет архитектурную границу/логику, один из трех файлов scope должен быть соответствующим SSOT-документом или задача должна быть разбита до коммита.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
  - Ручной прогон этих команд обычно не нужен, только для диагностики.
- **Таргетные сборки** выполняем вручную после соответствующих Streams и обязательно перед закрытием Phase:
  - `npm run build:webview`
  - `npm run typecheck:webview`
  - `npm run build --workspace @codeai-hub/core`
- **Commit:** после зеленых гейтов — Git Commit с максимально релевантным описанием. Сразу после коммита обновить статус пункта и hash в этом файле.
- **Real-time документация:** todo-plan и связанные SSOT-документы обновляются до коммита, чтобы изменения кода и документации попадали вместе.
- **Phase release closeout:** финальная Phase завершается на чистом дереве через release stream: подготовка README/CHANGELOG на будущую версию, `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, перенос/проверка артефактов, архивирование плана и planning-doc.

Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

## Phase 0 — Planning and Pre-Implementation Report (owner: Codex, updated: 2026-04-29)

### Stream: Scope Setup
1. [DONE] Создать planning-doc, активный todo-plan и Docs Index entry для runtime reliability follow-up; scope: `doc/SolidWorks-WorkFlow/Plans/Runtime_Reliability_Followup_Architecture.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs: plan runtime reliability follow-up`
2. [DONE] Git Commit: `docs: plan runtime reliability follow-up` (hash: `19175db90`)
3. [DONE] Создать pre-implementation `doc/Sessions/Session034.md` по просьбе пользователя; scope: `doc/Sessions/Session034.md`; expected commit message: `N/A — session report remains uncommitted by closeout rule`
4. [DONE] Git Commit: `N/A — session report remains uncommitted by closeout rule` (hash: N/A)

## Phase 1 — Transport Errors and Startup Diagnostics (owner: Codex, updated: 2026-04-29)

### Stream: Core WebSocket Error Boundary
1. [DONE] Добавить server/client WS error handlers и stop-time replay map cleanup; scope: `packages/core/src/remote-bridge/handlers/websocket-manager.ts`, `packages/core/src/remote-bridge/handlers/websocket-manager.errors.test.ts`, `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`; expected commit message: `fix(core): handle websocket error events`
2. [DONE] Git Commit: `fix(core): handle websocket error events` (hash: `e3268746e`)

### Stream: Startup Best-Effort Diagnostics
3. [DONE] Заменить silent startup/workspace best-effort catches на sanitized logs; scope: `packages/core/src/remote-bridge/handlers/settings-persistence-service.ts`, `packages/core/src/remote-bridge/handlers/workspace-session-service.ts`, `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`; expected commit message: `fix(core): log startup best-effort failures`
4. [DONE] Git Commit: `fix(core): log startup best-effort failures` (hash: `1b6ce2c9c`)

### Stream: Core Bridge Notification Dedupe
5. [DONE] Дедуплицировать reconnect status notifications без изменения schedule semantics; scope: `src/client/ui/src/core-bridge/core-bridge.ts`, `media/react-chat.js`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; expected commit message: `fix(ui): dedupe core bridge reconnect status`
6. [DONE] Git Commit: `fix(ui): dedupe core bridge reconnect status` (hash: `cdc2f236e`)

## Phase 2 — Runtime Cleanup and Continuity Safety (owner: Codex, updated: 2026-04-29)

### Stream: Legacy Continuity Retry Safety
1. [DONE] Сбрасывать legacy ContinuityMonitor state on failure/success и покрыть retry-after-failure; scope: `packages/core/src/session-continuity/session-continuity-facade.ts`, `packages/core/src/session-continuity/session-continuity-facade.test.ts`, `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`; expected commit message: `fix(core): reset legacy continuity handoff state`
2. [DONE] Git Commit: `fix(core): reset legacy continuity handoff state` (hash: `2af2cfa2e`)

### Stream: Runtime Dispose Ownership
3. [DONE] Очищать SessionRuntime entries on dispose и покрыть тестом; scope: `packages/core/src/workspace-runtime/session-runtime.ts`, `packages/core/src/workspace-runtime/session-runtime.test.ts`, `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`; expected commit message: `fix(core): clear session runtime entries on dispose`
4. [DONE] Git Commit: `fix(core): clear session runtime entries on dispose` (hash: `4230cdaa3`)
5. [DONE] Добавить ProviderRecoveryScheduler bulk dispose и unit coverage; scope: `packages/core/src/provider-registry/provider-recovery-scheduler.ts`, `packages/core/src/provider-registry/provider-recovery-scheduler.test.ts`, `doc/TODO/todo-plan.md`; expected commit message: `fix(core): dispose provider recovery timers`
6. [DONE] Git Commit: `fix(core): dispose provider recovery timers` (hash: `a6bf22f45`)
7. [DONE] Wire provider recovery scheduler disposal через registry/orchestrator stop; scope: `packages/core/src/provider-registry/index.ts`, `packages/core/src/orchestrator/core-orchestrator.ts`, `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`; expected commit message: `fix(core): stop provider recovery scheduler`
8. [DONE] Git Commit: `fix(core): stop provider recovery scheduler` (hash: `0df918fc5`)
9. [DONE] Убрать оставшийся definite-assignment bypass из runtime factory; scope: `packages/core/src/remote-bridge/handlers/session-request-handler-runtime.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.test.ts`, `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`; expected commit message: `refactor(core): make rollover runtime wiring explicit`
10. [DONE] Git Commit: `refactor(core): make rollover runtime wiring explicit` (hash: `d4e7d105f`)

## Phase 3 — Unified Session Storage Lifecycle (owner: Codex, updated: 2026-04-29)

### Stream: Writer Close and Dead Queue Cleanup
1. [DONE] Сохранить storage entry до завершения close promises и убрать dead queue/flushQueue path; scope: `packages/core/src/unified-session/storage.ts`, `packages/core/src/unified-session/storage.test.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit message: `fix(core): harden unified session storage close`
2. [IN_PROGRESS] Git Commit: `fix(core): harden unified session storage close` (hash: TBD)

## Phase 4 — Verification and Deferred Cleanup Recording (owner: Codex, updated: 2026-04-29)

### Stream: Targeted Verification
1. [TODO] Запустить targeted builds/checks for touched surfaces; scope: UI bundle, Core package; expected commit message: `chore: verify runtime reliability follow-up`
2. [TODO] Git Commit: `chore: verify runtime reliability follow-up` (hash: TBD)

### Stream: Deferred Cleanup Note
3. [TODO] Зафиксировать deferred low-priority cleanup/facade audit decision in navigation docs; scope: `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/Plans/Runtime_Reliability_Followup_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: record deferred cleanup audit scope`
4. [TODO] Git Commit: `docs: record deferred cleanup audit scope` (hash: TBD)

## Phase 5 — Release Build 1.2.111 (owner: Codex, updated: 2026-04-29)

### Stream: Release Preparation
1. [TODO] Обновить release-facing docs на будущую версию `1.2.111`; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: prepare release 1.2.111`
2. [TODO] Git Commit: `docs: prepare release 1.2.111` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-all.sh` из repo root, проверить tarball outputs and version bump results; scope: release scripts output, package manifests, `doc/tmp/releases/`; expected commit message: `chore: build release 1.2.111`
4. [TODO] Git Commit: `chore: build release 1.2.111` (hash: TBD)
5. [TODO] Выполнить `./scripts/build-release.sh --use-current-version` on clean tree and verify package output; scope: VSIX artifact, release output, `doc/tmp/releases/`; expected commit message: `chore: package release 1.2.111`
6. [TODO] Git Commit: `chore: package release 1.2.111` (hash: TBD)

### Stream: Scope Archive and Session Report
7. [TODO] После успешного релиза архивировать completed todo-plan и planning-doc, обновить `Docs_Index.md`, создать no-active-scope `doc/TODO/todo-plan.md`; scope: `doc/TODO/Archive/todo-plan-phase1-runtime-reliability-followup.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Runtime_Reliability_Followup_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs: archive runtime reliability follow-up`
8. [TODO] Git Commit: `docs: archive runtime reliability follow-up` (hash: TBD)
9. [TODO] Обновить `doc/Sessions/Session034.md` финальным состоянием после последнего substantive commit; scope: `doc/Sessions/Session034.md`; closeout note: session report remains uncommitted by project rule
10. [TODO] Git Commit: `N/A — session report remains uncommitted by closeout rule` (hash: N/A)
