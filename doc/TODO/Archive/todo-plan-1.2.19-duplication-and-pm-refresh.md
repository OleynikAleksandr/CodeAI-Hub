# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_Codex_PM_FollowUp_Umbrella_1.2.19.md`
- **Read this context before implementation:**
  - `doc/BugRegistry.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_LiveText_OrderSafe_Finalization_1.2.19.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Dialog_Duplication_StopResend_And_FinalAnswer_1.2.19.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/ProjectManager_MultiWorkspace_Performance_And_EventDriven_UsageRefresh_1.2.19.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Planning Kickoff Note
- `BUG-2026-04-18-03`, `BUG-2026-04-18-04`, `BUG-2026-04-18-05` и `BUG-2026-04-18-06` уже заведены в `doc/BugRegistry.md`.
- Umbrella planning-doc согласован и этот active `todo-plan.md` открыт в Session048.
- Текущая сессия intentionally остановлена на planning-only kickoff; первая кодовая микро-задача начинается с Phase 1 ниже.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту конкретная задача пересекается с другой активной задачей или вырастает больше чем в `≤3` файла, план обязан быть переписан до начала реализации.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Таргетные сборки перед закрытием stream/phase:
  - `npm run build --workspace=@codeai-hub/claude-module`
  - `npm run build --workspace=@codeai-hub/codex-module`
  - `npm run build --workspace=@codeai-hub/core`
  - `npm run build:project-manager`
- **Commit:** После зелёных гейтов — Git Commit с максимально релевантным описанием (код + доки) и немедленное обновление `todo-plan.md`.
- **Real-time Документация:** Любое изменение архитектуры/логики требует синхронного обновления релевантных документов из `doc/` до коммита.

## Phase 1 — Independent duplication fixes (owner: Codex, updated: 2026-04-18)

### Stream 1: Claude final answer orphan suffix
1. [DONE] Реализовать single-owner order-safe finalization Claude text block, чтобы финальный `end_turn` ответ materialize-ился ровно один раз и не оставлял orphan suffix. — scope: `packages/Claude_Module/src/messaging/claude-text-live-buffer.ts`, `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`; commit: `fix(claude): make final live text finalization order-safe`
2. [DONE] Git Commit: `fix(claude): make final live text finalization order-safe` (hash: `336cfadfc`)
3. [DONE] Добавить regression guards на observed production order, suppression `ell.` и single final assistant emission. — scope: `packages/Claude_Module/src/messaging/claude-stream-event-router.live-text.test.ts`, `packages/Claude_Module/src/messaging/claude-text-live-buffer.test.ts`; commit: `test(claude): guard order-safe live text finalization`
4. [DONE] Git Commit: `test(claude): guard order-safe live text finalization` (hash: `0633a9ea5`)

### Stream 2: Codex rollout final answer dedupe
1. [DONE] Зафиксировать single terminal assistant emission across rollout `final_answer` и `task_complete`, включая observed case без `turn_id`. — scope: `packages/Codex_Module/src/rollout/codex-rollout-event-parser.ts`, `packages/Codex_Module/src/rollout/codex-rollout-live-sync.ts`; commit: `fix(codex): dedupe rollout final answer emission`
2. [DONE] Git Commit: `fix(codex): dedupe rollout final answer emission` (hash: `b243c09a9`)
3. [DONE] Добавить replay/live regression guards для missing-`turn_id` final pair и fallback-only `task_complete`. — scope: `packages/Codex_Module/src/rollout/codex-rollout-event-parser.test.ts`, `packages/Codex_Module/src/rollout/codex-rollout-live-sync.test.ts`, `packages/Codex_Module/src/messaging/message-processor.replay.test.ts`; commit: `test(codex): guard rollout final answer dedupe`
4. [DONE] Git Commit: `test(codex): guard rollout final answer dedupe` (hash: `2cd5130a5`)

### Stream 3: PM optimistic stop/resend reconciliation
1. [DONE] Схлопнуть optimistic user bubble с canonical tail history после `Stop` + fast resend и не оставлять duplicate snapshot entries. — scope: `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`, `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`, `src/client/project-manager/components/sessions/session-message-dedupe.ts`; commit: `fix(pm): reconcile optimistic stop-resend user messages`
2. [DONE] Git Commit: `fix(pm): reconcile optimistic stop-resend user messages` (hash: `8d95ac49c`)
3. [DONE] Добавить PM guards для optimistic reconciliation и full rebuild stability после workspace switch. — scope: `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`; commit: `test(pm): guard optimistic stop-resend reconciliation`
4. [DONE] Git Commit: `test(pm): guard optimistic stop-resend reconciliation` (hash: `34cd74baf`)

## Phase 2 — PM/Core event-driven telemetry and polling budget (owner: Codex, updated: 2026-04-18)

### Stream 1: Session UI usage ownership
1. [DONE] Убрать mount-driven automatic `usageLimits` refresh из Session UI surfaces и оставить им display-only ownership. — scope: `src/client/ui/src/session/session-id-bar.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`; commit: `refactor(pm): remove mount-driven usage refresh ownership`
2. [DONE] Git Commit: `refactor(pm): remove mount-driven usage refresh ownership` (hash: `d642f51e1`)
3. [DONE] Добавить client guards, что remount больше не триггерит automatic refresh и что cached snapshots display-ятся без нового provider read. — scope: `src/client/project-manager/components/sessions/usage-limits-stream.test.ts`, `src/client/project-manager/components/sessions/token-usage-stream.test.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`; commit: `test(pm): guard display-only usage ownership`
4. [DONE] Git Commit: `test(pm): guard display-only usage ownership` (hash: `c845a5c24`)

### Stream 2: Dialog bootstrap/history suppression
1. [DONE] Ужесточить dialog restore path так, чтобы completed idle dialogs не reread-или `dialog:list` / `dialog:history` сами по себе. — scope: `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`, `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`, `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`; commit: `fix(pm): suppress idle dialog refresh churn`
2. [DONE] Git Commit: `fix(pm): suppress idle dialog refresh churn` (hash: `537837d91`)

### Stream 3: Visibility-aware polling
1. [DONE] Сделать workflow polling visibility-aware для main workspace surfaces, чтобы background clients останавливали или резко замедляли polling. — scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/services/workflow-state-store.ts`, `src/client/project-manager/services/workflow-events-client.ts`; commit: `fix(pm): throttle workflow polling for background clients`
2. [DONE] Git Commit: `fix(pm): throttle workflow polling for background clients` (hash: `2cd698b57`)
3. [DONE] Применить тот же visibility-aware budget к artifact и diagram availability polling. — scope: `src/client/project-manager/components/layout/use-artifact-availability.ts`, `src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx`, `src/client/project-manager/components/layout/use-diagram-modules-artifact-availability.test.ts`; commit: `fix(pm): throttle background artifact polling`
4. [DONE] Git Commit: `fix(pm): throttle background artifact polling` (hash: `2cfb18b9a`)

### Stream 4: Core/provider replay guarantees
1. [DONE] Сделать reopen/reconnect replay-first для usage snapshots и не ходить в provider refresh по idle session без явного lifecycle trigger. — scope: `packages/core/src/remote-bridge/handlers/websocket-manager.ts`, `packages/core/src/remote-bridge/handlers/session-provider-binding-service.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; commit: `fix(core): make usage telemetry replay-first on reopen`
2. [DONE] Git Commit: `fix(core): make usage telemetry replay-first on reopen` (hash: `0c538fe70`)
3. [DONE] Обеспечить terminal usage telemetry delivery в provider turn-completion paths без UI-owned refresh. — scope: `packages/Claude_Module/src/messaging/claude-message-finish-handler.ts`, `packages/Codex_Module/src/messaging/codex-message-finish-handler.ts`, `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`; commit: `fix(providers): deliver usage telemetry on turn completion`
4. [DONE] Git Commit: `fix(providers): deliver usage telemetry on turn completion` (hash: `b2f58abb4`)
5. [DONE] Добавить core/PM guards для replay-first `usageLimits` / `tokenUsage` и one-shot bootstrap refresh semantics. — scope: `packages/core/src/remote-bridge/handlers/websocket-manager.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.usage-limits.test.ts`, `src/client/project-manager/components/sessions/usage-limits-stream.test.ts`; commit: `test(core): guard replay-first usage telemetry`
6. [DONE] Git Commit: `test(core): guard replay-first usage telemetry` (hash: `f49cdaed2`)

## Phase 3 — SSOT sync and release closeout (owner: Codex, updated: 2026-04-18)

### Stream 1: Provider and PM docs
1. [DONE] Синхронизировать provider/PM docs под duplication finalization, optimistic reconciliation и event-driven telemetry ownership. — scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; commit: `docs: sync provider and PM duplication contracts`
2. [DONE] Git Commit: `docs: sync provider and PM duplication contracts` (hash: `4050cb970`)
3. [DONE] Синхронизировать cluster/system contracts под PM polling policy и replay-first usage ownership. — scope: `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; commit: `docs: sync PM telemetry and polling invariants`
4. [DONE] Git Commit: `docs: sync PM telemetry and polling invariants` (hash: `3438f5a6b`)
5. [DONE] Синхронизировать session/runtime contracts и Bug Registry под финальные fix decisions. — scope: `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`, `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`, `doc/BugRegistry.md`; commit: `docs: sync session contracts for duplication and replay fixes`
6. [DONE] Git Commit: `docs: sync session contracts for duplication and replay fixes` (hash: `966094008`)

### Stream 2: Release notes and build 1.2.18
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под будущий релиз `1.2.18`. — scope: `README.md`, `CHANGELOG.md`; commit: `docs: prepare 1.2.18 release notes for duplication and PM refresh fixes`
2. [DONE] Git Commit: `docs: prepare 1.2.18 release notes for duplication and PM refresh fixes` (hash: `12ac1909e`)
3. [DONE] Восстановить runtime entrypoints для `npm run check:knip`, чтобы release commit проходил Husky в clean worktree. — scope: `knip.json`; commit: `fix(repo): restore knip runtime entrypoints`
4. [DONE] Git Commit: `fix(repo): restore knip runtime entrypoints` (hash: `6ed8280b8`)
5. [DONE] Исправить типизацию `CustomEvent` shim, чтобы `build-release` проходил `typecheck:webview` на dialog snapshot replay guard. — scope: `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`; commit: `test(pm): fix dialog snapshot replay custom event typing`
6. [DONE] Git Commit: `test(pm): fix dialog snapshot replay custom event typing` (hash: `aed1607b9`)
7. [DONE] Прогнать таргетные тесты/сборки, затем `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version` в clean worktree от актуального `HEAD`; собрать `codeai-hub-1.2.18.vsix` и fresh tarballs `1.2.18`. — scope: release/build artifacts; commit: `chore: bump version to 1.2.18`
8. [DONE] Git Commit: `chore: bump version to 1.2.18` (hash: `4841a78bf`)

### Stream 3: Documentation cleanup and planning archive
1. [DONE] Архивировать umbrella и child planning-doc paths, а `Docs_Index.md` переключить с active references на archive references. — scope: `doc/SolidWorks-WorkFlow/Plans/Archive/*1.2.19 scope*`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; commit: `docs cleanup + planning archive`
2. [DONE] Git Commit: `docs cleanup + planning archive` (hash: `eb0ad1378`)
3. [DONE] Убрать экспериментальную execution language из planning/audit guidance и закрыть `BUG-2026-04-18-03..06` под официальный релиз `1.2.19`. — scope: `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md`, `doc/TODO/todo-plan.md`; commit: `docs cleanup + planning archive`
4. [DONE] Git Commit: `docs cleanup + planning archive` (hash: `eb0ad1378`)

### Stream 4: Final release notes and build 1.2.19
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под будущий релиз `1.2.19`, сохранив только фактический shipped scope duplication/PM refresh fix-set без experiment-контекста. — scope: `README.md`, `CHANGELOG.md`; commit: `docs: prepare 1.2.19 release notes for duplication and PM refresh fixes`
2. [DONE] Git Commit: `docs: prepare 1.2.19 release notes for duplication and PM refresh fixes` (hash: `ca6c5c5c5`)
3. [DONE] Прогнать таргетные сборки, затем `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version` в clean worktree; собрать `codeai-hub-1.2.19.vsix` и fresh tarballs `1.2.19`. — scope: release/build artifacts; commit: `chore: bump version to 1.2.19`
4. [DONE] Git Commit: `chore: bump version to 1.2.19` (hash: `06d65170d`)

### Stream 5: Todo-plan closeout
1. [DONE] Перенести исполненный plan в `doc/TODO/Archive/todo-plan-1.2.19-duplication-and-pm-refresh.md`, вернуть active `doc/TODO/todo-plan.md` в empty placeholder и подготовить neutral session report для закрытого scope. — scope: `doc/TODO/Archive/todo-plan-1.2.19-duplication-and-pm-refresh.md`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session051.md`; commit: `docs: close 1.2.19 duplication and PM refresh todo-plan`
2. [IN_PROGRESS] Git Commit: `docs: close 1.2.19 duplication and PM refresh todo-plan` (hash: TBD)
