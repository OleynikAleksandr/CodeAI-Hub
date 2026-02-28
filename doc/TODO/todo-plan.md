# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
  - `doc/Sessions/Session050.md`
- TODO Plan состоит из Phase/Stream, каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещен).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.

---

## Phase 271 — Release verification for session changes (owner: Oleksandr, updated: 2026-02-28)

**Контекст:** после документных и архитектурных изменений текущей сессии нужен отдельный цикл проверки релизной сборкой.

### Stream 0: Build and release verification
1. [TODO] На чистом дереве выполнить `./scripts/build-all.sh` и зафиксировать новую версию (scope: release manifests + versions; expected commit: `chore(release): build-all vX.Y.Z`).
2. [TODO] Git Commit: `chore(release): build-all vX.Y.Z` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить release output checklist (`Verifying SDK exclusions`, `Removing dev dependencies`, `✅ Package created`) и зафиксировать итоги в session report (scope: `doc/Sessions/Session050.md`; expected commit: `docs(session): record release verification for phase271`).
4. [TODO] Git Commit: `docs(session): record release verification for phase271` (hash: TBD)

---

## Phase 272 — Standalone Reviewer module (DEFERRED / NOT STARTED) (owner: Oleksandr, updated: 2026-02-28)

**Контекст:** фаза специально оставлена «висящей», чтобы не потерять модуль в roadmap.
**Ссылка на архитектурный черновик:** `doc/SolidWorks-WorkFlow/Contracts/StandaloneReviewer_Module.md`

### Stream 0: Design Gate (parking)
1. [TODO] При старте фазы провести review/апдейт архитектурного черновика `StandaloneReviewer_Module.md` и подтвердить финальный контракт standalone reviewer (scope: `doc/SolidWorks-WorkFlow/Contracts/StandaloneReviewer_Module.md`; expected commit: `docs(reviewer): approve standalone reviewer module contract`).
2. [TODO] Git Commit: `docs(reviewer): approve standalone reviewer module contract` (hash: TBD)
3. [BLOCKED] После утверждения контракта пользователем синхронизировать SSOT workflow boundary (`WorkflowSteps_Overview.md`, `SystemArchitecture.md`) (scope: `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(workflow): approve standalone reviewer module boundary`).
4. [BLOCKED] Git Commit: `docs(workflow): approve standalone reviewer module boundary` (hash: TBD)

### Stream 1: Execution planning (после Design Gate)
1. [BLOCKED] Раскрыть фазу реализации standalone reviewer на микро-задачи (runtime/core, PM/UI, templates) с лимитом ≤3 файлов на подзадачу и обязательными commit-step пунктами (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(todo): expand standalone reviewer execution streams`).
2. [BLOCKED] Git Commit: `docs(todo): expand standalone reviewer execution streams` (hash: TBD)
