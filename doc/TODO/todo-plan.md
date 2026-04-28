# План разработки (Development TODO Plan)

**Plan ID:** `SMB-001`  
**Status:** `ACTIVE` — активный execution owner в `doc/TODO/todo-plan.md`  
**Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionScoped_ModelBinding_Architecture.md`  
**Created:** 2026-04-28  
**Started:** 2026-04-28  

> Activation note: queued plan активирован из `doc/TODO/Planned/todo-plan-SMB-001-session-scoped-model-binding.md`. Одновременно активным может быть только один план.

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionScoped_ModelBinding_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача должна затрагивать не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Если по факту задача затрагивает больше 3 файлов/пакетов, перед реализацией разбить ее на более мелкие пункты.
- Гейты запускаются через Husky на `git commit`; не обходить hooks.
- Таргетные проверки для этого плана: `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`.
- После каждого коммита при активном выполнении обновить статус пункта и hash в активном `doc/TODO/todo-plan.md`.

## Phase 1 — Core Binding Contract (owner: Codex, updated: 2026-04-28)

### Stream: New Core Module
1. [DONE] Создать Core-модуль `session-model-binding` с фасадом, типами и единой точкой входа — scope: `packages/core/src/session-model-binding/session-model-binding-types.ts`, `packages/core/src/session-model-binding/session-model-binding-facade.ts`, `packages/core/src/session-model-binding/index.ts`; expected commit message: `feat: add session model binding facade`.
2. [DONE] Git Commit: `feat: add session model binding facade` (hash: `cdbe60003`)

### Stream: Binding Resolver
3. [DONE] Добавить резолв binding из Settings/default или explicit model selection с тестами effective identity — scope: `packages/core/src/session-model-binding/session-model-binding-resolver.ts`, `packages/core/src/session-model-binding/session-model-binding-facade.test.ts`, `packages/core/src/config/provider-turn-config-resolver.ts`; expected commit message: `feat: resolve session model binding identity`.
4. [DONE] Git Commit: `feat: resolve session model binding identity` (hash: `0c8eaf020`)

## Phase 2 — Core Session Integration (owner: Codex, updated: 2026-04-28)

### Stream: Transport And Serialization
5. [DONE] Расширить session model binding в Core session/transport contract — scope: `packages/core/src/session-manager/index.ts`, `packages/core/src/remote-bridge/session-stream-contracts.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit message: `feat: serialize session model bindings`.
6. [DONE] Git Commit: `feat: serialize session model bindings` (hash: `9362302ad`)

### Stream: Session Creation
7. [DONE] Протянуть explicit model selection из `session:create` до bootstrap options — scope: `packages/core/src/remote-bridge/remote-bridge-session-create-router.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-session-resolution.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-types.ts`; expected commit message: `feat: pass session model selection through create`.
8. [DONE] Git Commit: `feat: pass session model selection through create` (hash: `10fde8e43`)
9. [DONE] Создать session model binding в shell factory до `session:created` broadcast — scope: `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-session-bootstrap.ts`, `packages/core/src/remote-bridge/handlers/session-shell-factory.ts`; expected commit message: `feat: bind model during session creation`.
10. [DONE] Git Commit: `feat: bind model during session creation` (hash: `8fd0a2389`)

### Stream: Applied Turn Config
11. [DONE] Перевести outbound applied turn config на session-bound identity вместо live Settings для существующих сессий — scope: `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit message: `feat: use session-bound model for turns`.
12. [DONE] Git Commit: `feat: use session-bound model for turns` (hash: `60b7f294f`)

### Stream: Explicit Switch Path
13. [DONE] Сделать `switch_model` явной mutation path для session binding и сохранить effective broadcast contract — scope: `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts`, `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.create-resume.test.ts`; expected commit message: `feat: route model switches through session binding`.
14. [DONE] Git Commit: `feat: route model switches through session binding` (hash: `a66d62a1f`)

## Phase 3 — PM/UI Binding Display (owner: Codex, updated: 2026-04-28)

### Stream: Shared UI ModelInfo
15. [DONE] Расширить `SessionRecord`/`ModelInfo` binding source и builder fallback — scope: `src/types/session.ts`, `src/client/ui/src/session/model-info-builder.ts`, `src/client/ui/src/session/model-info-builder.test.ts`; expected commit message: `feat: display session-bound model identity`.
16. [IN_PROGRESS] Git Commit: `feat: display session-bound model identity` (hash: TBD)

### Stream: Snapshot Seeding
17. [TODO] Сделать initial snapshots binding-first в runtime/dialog controllers — scope: `src/client/ui/src/session/helpers.ts`, `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`, `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`; expected commit message: `feat: seed session snapshots from model binding`.
18. [TODO] Git Commit: `feat: seed session snapshots from model binding` (hash: TBD)

### Stream: Settings Sync Guard
19. [TODO] Запретить `useSettingsModelsSync` переписывать bound/runtime sessions после изменения Settings — scope: `src/client/ui/src/app-host/use-settings-models-sync.ts`, `src/client/ui/src/app-host/use-settings-models-sync.test.ts`, `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`; expected commit message: `fix: keep settings sync from rewriting bound session models`.
20. [TODO] Git Commit: `fix: keep settings sync from rewriting bound session models` (hash: TBD)

### Stream: PM Regression Coverage
21. [TODO] Добавить UI regression: две сессии одного provider показывают разные bound models — scope: `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`, `src/client/project-manager/components/sessions/session-stream.test.ts`, `src/client/project-manager/core-stream-message-types.ts`; expected commit message: `test: cover session-scoped model labels`.
22. [TODO] Git Commit: `test: cover session-scoped model labels` (hash: TBD)

## Phase 4 — Documentation And Verification (owner: Codex, updated: 2026-04-28)

### Stream: SSOT Documentation
23. [TODO] Обновить SSOT по session-scoped model binding и Settings-as-seed contract — scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`, `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`; expected commit message: `docs: document session-scoped model binding`.
24. [TODO] Git Commit: `docs: document session-scoped model binding` (hash: TBD)

### Stream: Targeted Builds And Closeout
25. [TODO] Прогнать таргетные сборки Core/Webview, обновить активный todo-plan результатами и закрыть queued scope после активации — scope: `@codeai-hub/core`, `webview`, `doc/TODO/todo-plan.md`; expected commit message: `chore: verify session-scoped model binding`.
26. [TODO] Git Commit: `chore: verify session-scoped model binding` (hash: TBD)
