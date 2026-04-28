# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Scope:** Runtime Stability Remediation
**Planning approval:** APPROVED 2026-04-28 18:25 CEST
**Current version at planning time:** `1.2.102`
**Target release:** `1.2.103` unless `package.json` version changes before execution

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Runtime_Stability_Remediation_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Runtime_Stability_Remediation_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Approval gate:** approved by user on 2026-04-28 18:25 CEST; implementation may proceed according to this plan.
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
  - `npm run build --workspace @codeai-hub/claude-module`
  - `npm run build --workspace @codeai-hub/codex-module`
  - `npm run build --workspace @codeai-hub/gemini-module`
- **Commit:** после зеленых гейтов — Git Commit с максимально релевантным описанием. Сразу после коммита обновить статус пункта и hash в этом файле.
- **Real-time документация:** todo-plan и связанные SSOT-документы обновляются до коммита, чтобы изменения кода и документации попадали вместе.
- **Phase release closeout:** финальная Phase завершается на чистом дереве через release stream: подготовка README/CHANGELOG на будущую версию, `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, перенос/проверка артефактов, архивирование плана и planning-doc.

Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

## Phase 0 — Approval and Baseline (owner: Codex, updated: 2026-04-28)

### Stream: Planning Approval
1. [DONE] Получить явное approval от пользователя на planning-документ перед кодом; scope: `doc/SolidWorks-WorkFlow/Plans/Runtime_Stability_Remediation_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: plan runtime stability remediation`
2. [DONE] Git Commit: `docs: plan runtime stability remediation` (hash: `374816119`)

## Phase 1 — WebSocket Lifecycle and Boundary Validation (owner: Codex, updated: 2026-04-28)

### Stream: Project Manager Socket Lifecycle
1. [DONE] Сделать `ProjectManagerApi.connect()` idempotent для `OPEN`/`CONNECTING`, добавить intentional `disconnect()` и cleanup из `MainLayout`; scope: `src/client/project-manager/api.ts`, `src/client/project-manager/services/project-manager-api-lifecycle.ts`, `src/client/project-manager/components/layout/main-layout.tsx`; expected commit message: `fix: harden project manager websocket lifecycle`
2. [DONE] Git Commit: `fix: harden project manager websocket lifecycle` (hash: `09432d779`)
3. [DONE] Добавить/обновить PM lifecycle regression coverage без расширения runtime surface; scope: `src/client/project-manager/services/project-manager-api-lifecycle.ts`, `src/client/project-manager/services/project-manager-api-lifecycle.test.ts`, `doc/TODO/todo-plan.md`; expected commit message: `test: cover project manager websocket lifecycle`
4. [DONE] Git Commit: `test: cover project manager websocket lifecycle` (hash: `a8ff9d8b0`)

### Stream: Project Manager Incoming Message Validation
5. [DONE] Ввести PM-side parser/type guards для incoming Core WS messages и заменить прямой `JSON.parse(...) as IncomingMessage`; scope: `src/client/project-manager/services/core-stream-message-validator.ts`, `src/client/project-manager/api.ts`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; expected commit message: `fix: validate project manager websocket messages`
6. [DONE] Git Commit: `fix: validate project manager websocket messages` (hash: `94ef9e9ff`)
7. [DONE] Покрыть PM parser malformed JSON / malformed payload / accepted known message cases; scope: `src/client/project-manager/services/core-stream-message-validator.ts`, `src/client/project-manager/services/core-stream-message-validator.test.ts`, `doc/TODO/todo-plan.md`; expected commit message: `test: cover project manager websocket validation`
8. [DONE] Git Commit: `test: cover project manager websocket validation` (hash: `86ee5e08e`)

### Stream: Core Incoming Command Validation
9. [DONE] Ввести Core-side incoming WS command parser перед router dispatch; scope: `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts`, `packages/core/src/remote-bridge/handlers/websocket-manager.ts`, `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`; expected commit message: `fix: validate core websocket commands`
10. [DONE] Git Commit: `fix: validate core websocket commands` (hash: `67ab20130`)
11. [DONE] Покрыть Core validation/rejection path в WebSocketManager tests; scope: `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts`, `packages/core/src/remote-bridge/handlers/websocket-manager.test.ts`, `doc/TODO/todo-plan.md`; expected commit message: `test: cover core websocket command validation`
12. [IN_PROGRESS] Git Commit: `test: cover core websocket command validation` (hash: TBD)
13. [TODO] Закрыть Phase 1 таргетными проверками `npm run build:webview`, `npm run typecheck:webview`, `npm run build --workspace @codeai-hub/core`; scope: UI bundle, Core package, `doc/TODO/todo-plan.md`; expected commit message: `chore: verify websocket hardening`
14. [TODO] Git Commit: `chore: verify websocket hardening` (hash: TBD)

## Phase 2 — Settings Snapshot Caching (owner: Codex, updated: 2026-04-28)

### Stream: Core Settings Cache
1. [TODO] Добавить path-scoped TTL JSON cache и перевести provider settings snapshot reads на него; scope: `packages/core/src/config/json-file-snapshot-cache.ts`, `packages/core/src/config/provider-settings-snapshot.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit message: `fix: cache core provider settings snapshots`
2. [TODO] Git Commit: `fix: cache core provider settings snapshots` (hash: TBD)
3. [TODO] Покрыть Core settings cache TTL, malformed JSON и path isolation; scope: `packages/core/src/config/json-file-snapshot-cache.ts`, `packages/core/src/config/provider-settings-snapshot.test.ts`, `doc/TODO/todo-plan.md`; expected commit message: `test: cover core settings snapshot cache`
4. [TODO] Git Commit: `test: cover core settings snapshot cache` (hash: TBD)
5. [TODO] Перевести session translation policy settings/bootstrap reads на shared cache и invalidation on settings save/reset where practical; scope: `packages/core/src/session-translation/session-translation-policy-resolver.ts`, `packages/core/src/remote-bridge/handlers/settings-persistence-service.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit message: `fix: cache session translation settings reads`
6. [TODO] Git Commit: `fix: cache session translation settings reads` (hash: TBD)
7. [TODO] Обновить translation policy tests для cache/invalidation behavior; scope: `packages/core/src/session-translation/session-translation-policy-resolver.test.ts`, `packages/core/src/session-translation/session-translation-policy-resolver.ts`, `doc/TODO/todo-plan.md`; expected commit message: `test: cover session translation settings cache`
8. [TODO] Git Commit: `test: cover session translation settings cache` (hash: TBD)

### Stream: Provider-Local Settings Cache
9. [TODO] Добавить Codex provider-local TTL cache для reasoning summary settings read; scope: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`; expected commit message: `fix: cache codex reasoning summary settings`
10. [TODO] Git Commit: `fix: cache codex reasoning summary settings` (hash: TBD)
11. [TODO] Покрыть Codex settings cache behavior; scope: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`, `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.test.ts`, `doc/TODO/todo-plan.md`; expected commit message: `test: cover codex settings cache`
12. [TODO] Git Commit: `test: cover codex settings cache` (hash: TBD)
13. [TODO] Добавить Claude provider-local TTL cache для SDK query settings snapshot; scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/TODO/todo-plan.md`; expected commit message: `fix: cache claude settings snapshots`
14. [TODO] Git Commit: `fix: cache claude settings snapshots` (hash: TBD)
15. [TODO] Покрыть Claude settings cache behavior; scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.test.ts`, `doc/TODO/todo-plan.md`; expected commit message: `test: cover claude settings cache`
16. [TODO] Git Commit: `test: cover claude settings cache` (hash: TBD)
17. [TODO] Добавить Gemini provider-local TTL cache для session settings resolver; scope: `packages/Gemini_Module/src/session/gemini-session-settings-resolver.ts`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`, `doc/TODO/todo-plan.md`; expected commit message: `fix: cache gemini session settings snapshot`
18. [TODO] Git Commit: `fix: cache gemini session settings snapshot` (hash: TBD)
19. [TODO] Покрыть Gemini settings cache behavior; scope: `packages/Gemini_Module/src/session/gemini-session-settings-resolver.ts`, `packages/Gemini_Module/src/session/gemini-session-settings-resolver.test.ts`, `doc/TODO/todo-plan.md`; expected commit message: `test: cover gemini settings cache`
20. [TODO] Git Commit: `test: cover gemini settings cache` (hash: TBD)
21. [TODO] Закрыть Phase 2 таргетными сборками Core + provider packages; scope: Core, Claude module, Codex module, Gemini module; expected commit message: `chore: verify settings cache remediation`
22. [TODO] Git Commit: `chore: verify settings cache remediation` (hash: TBD)

## Phase 3 — Listener Cleanup, Diagnostics, and Runtime Wiring (owner: Codex, updated: 2026-04-28)

### Stream: Gemini Listener Cleanup
1. [TODO] Сделать cleanup adapter-registered Gemini session event listeners deterministic on close/sessionIdChanged; scope: `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`, `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`; expected commit message: `fix: clean up gemini session listeners`
2. [TODO] Git Commit: `fix: clean up gemini session listeners` (hash: TBD)
3. [TODO] Добавить regression coverage на отсутствие duplicate forwarding/listener retention after close; scope: `packages/Gemini_Module/src/provider/gemini-provider-adapter.test.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.stop-resume.test.ts`, `doc/TODO/todo-plan.md`; expected commit message: `test: cover gemini listener cleanup`
4. [TODO] Git Commit: `test: cover gemini listener cleanup` (hash: TBD)

### Stream: UI Core Bridge Diagnostics
5. [TODO] Добавить sanitized diagnostics helper для `src/client/ui/src/core-bridge` и заменить silent catches в server/history paths; scope: `src/client/ui/src/core-bridge/core-bridge-logger.ts`, `src/client/ui/src/core-bridge/server-message-handler.ts`, `src/client/ui/src/core-bridge/session-history.ts`; expected commit message: `fix: log core bridge parsing and history failures`
6. [TODO] Git Commit: `fix: log core bridge parsing and history failures` (hash: TBD)
7. [TODO] Заменить silent best-effort catches в supervisor/status reconnect paths без изменения UX; scope: `src/client/ui/src/core-bridge/supervisor-requests.ts`, `src/client/ui/src/core-bridge/core-bridge.ts`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; expected commit message: `fix: log core bridge supervisor failures`
8. [TODO] Git Commit: `fix: log core bridge supervisor failures` (hash: TBD)

### Stream: Runtime Factory Wiring Safety
9. [TODO] Убрать definite assignment assertions из runtime-core factory через safe lazy refs без поведения change; scope: `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts`, `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`, `doc/TODO/todo-plan.md`; expected commit message: `refactor: make session runtime wiring explicit`
10. [TODO] Git Commit: `refactor: make session runtime wiring explicit` (hash: TBD)
11. [TODO] Добавить/обновить lightweight coverage для runtime factory construction if feasible; scope: `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.test.ts`, `doc/TODO/todo-plan.md`; expected commit message: `test: cover session runtime wiring`
12. [TODO] Git Commit: `test: cover session runtime wiring` (hash: TBD)
13. [TODO] Закрыть Phase 3 таргетными сборками UI/Core/Gemini; scope: UI bundle, Core package, Gemini module; expected commit message: `chore: verify listener and diagnostics remediation`
14. [TODO] Git Commit: `chore: verify listener and diagnostics remediation` (hash: TBD)

## Phase 4 — SSOT Closeout Before Release (owner: Codex, updated: 2026-04-28)

### Stream: Documentation Synchronization
1. [TODO] Сверить System/Cluster SSOT с фактической реализацией remediation scope; scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`; expected commit message: `docs: document runtime stability remediation`
2. [TODO] Git Commit: `docs: document runtime stability remediation` (hash: TBD)
3. [TODO] Сверить Module SSOT provider/UI updates with implemented behavior; scope: `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`; expected commit message: `docs: sync provider and ui stability contracts`
4. [TODO] Git Commit: `docs: sync provider and ui stability contracts` (hash: TBD)
5. [TODO] Сверить Claude docs and Docs Index references, keeping active planning-doc visible until archive; scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: sync runtime remediation navigation`
6. [TODO] Git Commit: `docs: sync runtime remediation navigation` (hash: TBD)

### Stream: Pre-Release Verification
7. [TODO] Запустить финальные targeted builds/checks before release phase: `npm run build:webview`, `npm run typecheck:webview`, `npm run build --workspace @codeai-hub/core`, provider package builds; scope: UI bundle, Core package, provider packages; expected commit message: `chore: verify runtime remediation before release`
8. [TODO] Git Commit: `chore: verify runtime remediation before release` (hash: TBD)

## Phase 5 — Release Build 1.2.103 (owner: Codex, updated: 2026-04-28)

### Stream: Release Preparation
1. [TODO] Определить будущую версию from current `package.json` + 1 and update release-facing docs before build; expected target if unchanged: `1.2.103`; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: prepare release 1.2.103`
2. [TODO] Git Commit: `docs: prepare release 1.2.103` (hash: TBD)
3. [TODO] Убедиться, что working tree clean и зависимости установлены (`npm install` только если node_modules/deps отсутствуют); scope: repo workspace, `doc/TODO/todo-plan.md`; expected commit message: `chore: verify release prerequisites`
4. [TODO] Git Commit: `chore: verify release prerequisites` (hash: TBD)

### Stream: Release Build and Package
5. [TODO] Выполнить `./scripts/build-all.sh` из repo root, проверить tarball outputs and version bump results; scope: release scripts output, package manifests, `doc/tmp/releases/`; expected commit message: `chore: build release 1.2.103`
6. [TODO] Git Commit: `chore: build release 1.2.103` (hash: TBD)
7. [TODO] Выполнить `./scripts/build-release.sh --use-current-version` on clean tree and verify `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`; scope: VSIX artifact, release output, `doc/tmp/releases/`; expected commit message: `chore: package release 1.2.103`
8. [TODO] Git Commit: `chore: package release 1.2.103` (hash: TBD)

### Stream: Scope Archive and Session Report
9. [TODO] После успешного релиза архивировать completed todo-plan и planning-doc, обновить `Docs_Index.md`, создать новый no-active-scope `doc/TODO/todo-plan.md`; scope: `doc/TODO/Archive/todo-plan-phase5-runtime-stability-remediation.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Runtime_Stability_Remediation_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs: archive runtime stability remediation plan`
10. [TODO] Git Commit: `docs: archive runtime stability remediation plan` (hash: TBD)
11. [TODO] Создать next `doc/Sessions/SessionXXX.md` после последнего substantive commit; scope: `doc/Sessions/SessionXXX.md`; closeout note: session report remains uncommitted by project rule
12. [TODO] Git Commit: `N/A — session report remains uncommitted by closeout rule` (hash: N/A)
