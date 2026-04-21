# План разработки (Development TODO Plan)

**Execution Scope Status:** COMPLETED (archived 2026-04-21, release 1.2.39)

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
1. [DONE] `SessionManager.registerSessionWithId` добавлен.
2. [DONE] Git Commit: `feat: add externally-id-preserving session registration to session manager` (hash: 6dafa1523)
3. [DONE] `SessionProviderBindingService.registerRestoredBinding` добавлен.
4. [DONE] Git Commit: `feat: register restored provider binding without adapter turn` (hash: 1c917a5eb)

### Stream B: Continuity materializer + dialog:list integration
5. [DONE] Создан materializer + интегрирован в `handleDialogList` через `SessionRequestHandler.getProviderBindingService()` getter и новые router deps (4 файла в одном коммите ради knip-чистоты).
6. [DONE] Git Commit: `feat: materialize runtime sessions on dialog list` (hash: 58ac6bb33)

### Stream C: Regression tests
7. [DONE] Materializer test — happy path + idempotency + skip incomplete entries.
8. [DONE] Git Commit: `test: cover continuity materializer happy path and idempotency` (hash: 7787c4a4c)
9. [DONE] Stop preconditions post-materialize.
10. [DONE] Git Commit: `test: cover stop path preconditions for materialized continuity session` (hash: bda2f58cc)

### Stream D: SSOT sync
11. [DONE] `SessionInputLock_SSOT_StateMachine.md` §3.3 + `SessionUI_Behavior.md` §4.4.
12. [DONE] Git Commit: `docs: record runtime session materialization invariant` (hash: 896f0075e)
13. [DONE] `CoreOrchestrator.md` §3 + `SystemArchitecture.md` §3 Invariant 1 + `BugRegistry.md` BUG-2026-04-21-01.
14. [DONE] Git Commit: `docs: sync cluster map, system invariant and bug registry` (hash: 5dd1ed1e5)

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
