# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
  - `doc/Sessions/Archive/Session052.md`
- TODO Plan состоит из Phase/Stream, каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещен).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.

---

## Parked Phases (вынесены в отдельные файлы)
- `Phase 272 (Standalone Reviewer, DEFERRED)`: `doc/TODO/Phase272-StandaloneReviewer.md`

## Архив
- Предыдущий общий план (Phase 271–278): `doc/TODO/Archive/todo-plan-up-to-phase278-2026-02-28.md`
- Завершённый план Phase 279: `doc/TODO/Archive/todo-plan-up-to-phase279-2026-03-01.md`

---

## Phase 280 — Description Draft Templates Review & Integration Plan (owner: Oleksandr, updated: 2026-03-01)

**Scope этой фазы:** только ревью и согласование шаблонов шага `Description`.

**Цель:**
- получить утверждённые user-facing и agent-facing шаблоны;
- подготовить микро-план интеграции в runtime после пользовательского утверждения.

### Stream 0: Review Gate (with user)
1. [TODO] Провести ревью и согласовать правки для `doc/Description_Step_Help_Template.draft-v1.md` (scope: `doc/Description_Step_Help_Template.draft-v1.md`; expected commit: `docs(help): approve description step help template v1`).
2. [TODO] Git Commit: `docs(help): approve description step help template v1` (hash: TBD)
3. [TODO] Провести ревью и согласовать правки для `doc/Description_Agent_Instructions_Template.draft-v2.md` (scope: `doc/Description_Agent_Instructions_Template.draft-v2.md`; expected commit: `docs(prompt): approve description agent instructions template v2`).
4. [TODO] Git Commit: `docs(prompt): approve description agent instructions template v2` (hash: TBD)

### Stream 1: Integration planning (post-approval)
1. [BLOCKED] Зафиксировать интеграционный план: какие draft-файлы становятся runtime-asset источником истины и какие файлы/модули нужно менять (scope: `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(description): define integration plan for approved templates`).
2. [BLOCKED] Git Commit: `docs(description): define integration plan for approved templates` (hash: TBD)

---

## Phase 281 — Description Resume Regression Fixes (Play/Stop + Continuity Trigger) (owner: Oleksandr, updated: 2026-03-01)

**Scope этой фазы:** точечный фикс двух регрессий шага `Description` после миграции с one-shot на resume.

**Цель:**
- вернуть в runtime `Description` стандартный input toggle `Play/Stop` (без `Retry`);
- восстановить реакцию Core на threshold context window (например, 80%) в бесконечной `Description`-сессии.

### Stream 0: Registry + bug contract
1. [DONE] Завести запись бага и контракт фикса в `doc/BugRegistry.md` (scope: `doc/BugRegistry.md`; expected commit: `docs(bug): register description resume regressions`).
2. [DONE] Git Commit: `docs(bug): register description resume regressions` (hash: `afccb439`)

### Stream 1: Session UI — убрать legacy restart из runtime Description
1. [DONE] Убрать подмену action-кнопки input на `Restart attempt` для runtime `Description` и вернуть стандартный `Play/Stop` (scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/input-play-stop-button.tsx`, `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit: `fix(ui): restore play-stop action for description runtime`).
2. [DONE] Git Commit: `fix(ui): restore play-stop action for description runtime` (hash: `473523a6`)
3. [DONE] Добавить UI regression test для runtime `Description`, подтверждающий отображение `Play`/`Stop` без restart-ветки (scope: `src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts`; expected commit: `test(ui): guard description runtime play-stop action`).
4. [DONE] Git Commit: `test(ui): guard description runtime play-stop action` (hash: `9419eb0e`)

### Stream 2: Core continuity — восстановить threshold rollover eligibility
1. [DONE] Синхронизировать flow-node continuity eligibility с современной `Description` resume-сессией (compat для `runSlug=null`) и исключить mismatch с legacy `collector` фильтром (scope: `packages/core/src/flow-node-continuity/flow-node-continuity-types.ts`, `packages/core/src/flow-node-continuity/flow-node-continuity-facade.test.ts`; expected commit: `fix(core): restore description continuity threshold trigger`).
2. [DONE] Git Commit: `fix(core): restore description continuity threshold trigger` (hash: `8d1f47f3`)

### Stream 3: Guards + release
1. [DONE] Прогнать таргетные проверки (минимум: тесты/сборки для затронутых UI/Core путей) и зафиксировать в отчёте сессии (scope: `doc/Sessions/Archive/Session053.md`; expected commit: `docs(session): record phase281 validation`).
2. [DONE] Git Commit: `docs(session): record phase281 validation` (hash: `b423a36a`)
3. [DONE] Выполнить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` после фикса и зафиксировать release результаты (scope: release manifests + `doc/Sessions/Archive/Session053.md`; expected commit: `chore(release): build-all vX.Y.Z`).
4. [DONE] Git Commit: `chore(release): build-all v1.1.704` (hashes: `3d6655d4`, `60f1053d`, `308ba8df`, `e872cf4d`, `baed7154`)

### Stream 4: Bug closure
1. [DONE] Обновить запись `BUG-2026-03-01-01` до `FIXED`: root cause/fix/commits/release/guards (scope: `doc/BugRegistry.md`; expected commit: `docs(bug): close description resume regressions`).
2. [DONE] Git Commit: `docs(bug): close description resume regressions` (hash: `d5c74e59`)
