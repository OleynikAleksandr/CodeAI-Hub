# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionInputLock_RuntimeMaterialization_Architecture.md`
- **Read this context before implementation:**
  - `packages/core/src/session-manager/index.ts`
  - `packages/core/src/remote-bridge/handlers/dialog-list-service.ts`
  - `packages/core/src/remote-bridge/handlers/session-provider-binding-service.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-stop-action.ts`
  - `packages/core/src/remote-bridge/remote-bridge-dialog-command-router.ts`
  - `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`
  - `packages/core/src/workspace-runtime/session-runtime.ts`
  - `packages/core/src/session-continuity/index-registry.ts`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (§3 Invariant 1)
  - `doc/BugRegistry.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача ≤ 3 файлов, после каждой — отдельный `Git Commit: ...`.
- Husky hooks (pre-commit / pre-push) прогоняют архитектуру, lint, knip, format, dup и link checks.
- PM-side не трогаем: fix целиком Core-side.
- Таргетные сборки (`npm run build --workspace=@codeai-hub/core`) перед закрытием Phase.
- Artefacts / historical материал (CHANGELOG, BugRegistry, Plans/Archive, Sessions) за исключением явно перечисленных SSOT — не трогать.

## Phase 1 — Core Runtime Session Materialization (owner: CodeAI Hub Bot, updated: 2026-04-21)

### Stream A: SessionManager + SessionProviderBindingService public surface
1. [TODO] Добавить `SessionManager.registerSessionWithId({ sessionId, providerId, workspacePath, providerSessionId, stage, initiativeSlug? })` — noop если session уже существует; иначе создаёт `Session` с `providerSessionStatus: "ready"` и сохраняет в `sessions` Map — scope: `packages/core/src/session-manager/index.ts`.
2. [TODO] Git Commit: `feat: add externally-id-preserving session registration to session manager` (hash: TBD)
3. [TODO] Добавить `SessionProviderBindingService.registerRestoredBinding({ sessionId, providerId, providerSessionId })` — регистрирует paper-binding в `providerSessions` Map и помечает session `providerSessionStatus: "ready"` через session manager seam; без provider adapter call — scope: `packages/core/src/remote-bridge/handlers/session-provider-binding-service.ts`.
4. [TODO] Git Commit: `feat: register restored provider binding without adapter turn` (hash: TBD)

### Stream B: Continuity materializer + dialog:list integration
5. [TODO] Создать `packages/core/src/remote-bridge/handlers/session-continuity-materializer.ts`: экспортирует `materializeContinuityEntries(entries, workspacePath, deps)` — для каждой entry с `latestSessionId && providerSessionId && !sessionManager.getSession(latestSessionId)` вызывает `registerSessionWithId` + `registerRestoredBinding` + `notifySessionCreated` с `turnState: "idle"`, `continuityLockActive: false`, `bindingStatus: "ready"`.
6. [TODO] Git Commit: `feat: add continuity materializer for dialog list restore path` (hash: TBD)
7. [TODO] Интегрировать materializer в `remote-bridge-dialog-command-router.handleDialogList` — вызов после `dialogListService.listDialogs()`, перед отправкой `dialog:list:result` — scope: `packages/core/src/remote-bridge/remote-bridge-dialog-command-router.ts`.
8. [TODO] Git Commit: `feat: materialize runtime sessions on dialog list` (hash: TBD)

### Stream C: Regression tests
9. [TODO] Тест materializer: создать stub session для previously-unknown continuity entry, убедиться что session manager + binding service + workspace store хранят корректный state — scope: `packages/core/src/remote-bridge/handlers/session-continuity-materializer.test.ts`.
10. [TODO] Git Commit: `test: cover continuity materializer happy path and idempotency` (hash: TBD)
11. [TODO] Тест handleStop post-materialize: после materializer работает `handleStop(sessionId)` без `"Session not found"` — scope: `packages/core/src/remote-bridge/handlers/session-request-handler-stop-action.test.ts` (либо дополнение в `session-request-handler.stop.test.ts`).
12. [TODO] Git Commit: `test: cover stop path for materialized continuity session` (hash: TBD)

### Stream D: SSOT sync
13. [TODO] Обновить `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md` + `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`: зафиксировать инвариант "reopened workflow dialog всегда имеет runtime session в workspace snapshot после первого dialog:list".
14. [TODO] Git Commit: `docs: record runtime session materialization invariant` (hash: TBD)
15. [TODO] Обновить `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md` (materializer как часть dialog:list path) + `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 Invariant 1 (snapshot-first lock contract дополнение) + `doc/BugRegistry.md` (новая запись bug + fix).
16. [TODO] Git Commit: `docs: sync cluster map, system invariant and bug registry` (hash: TBD)

## Phase 2 — Release 1.2.39 (owner: CodeAI Hub Bot, updated: 2026-04-21)

### Stream E: Release prep
17. [TODO] Обновить `README.md` (`## Current Release — v1.2.39` + summary) и `CHANGELOG.md` (секция `## [1.2.39] - 2026-04-21` с Fixed / Added / Docs) — scope: `README.md`, `CHANGELOG.md`.
18. [TODO] Git Commit: `docs: prepare runtime session materialization release notes (1.2.39)` (hash: TBD)

### Stream F: Build
19. [TODO] Run `./scripts/build-all.sh` (version bumps до 1.2.39 + tarballs в `doc/tmp/releases/`).
20. [TODO] Git Commit: `build: release 1.2.39` (hash: TBD)
21. [TODO] Run `./scripts/build-release.sh --use-current-version` → produces `codeai-hub-1.2.39.vsix`.

### Stream G: Cycle closeout
22. [TODO] Archive planning-doc → `doc/SolidWorks-WorkFlow/Plans/Archive/SessionInputLock_RuntimeMaterialization_Architecture.md`; archive todo-plan → `doc/TODO/Archive/todo-plan-phase4-session-input-lock-materialization.md`; update `doc/SolidWorks-WorkFlow/Docs_Index.md`; recreate empty `doc/TODO/todo-plan.md` stub.
23. [TODO] Git Commit: `docs: archive session input lock materialization cycle (1.2.39)` (hash: TBD)
24. [TODO] Create `doc/Sessions/Session076.md` (completion report, type A).
