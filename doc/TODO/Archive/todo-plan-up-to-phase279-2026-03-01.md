# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
  - `doc/Sessions/Archive/Session050.md`
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

---

## Phase 279 — Description Step Refactor (PM UX + agent behavior) (owner: Oleksandr, updated: 2026-03-01)

**Scope этой фазы:** только шаг `Description`.

**Цель:**
- до отправки анкеты пользователь видит справа редактор анкеты, слева подробный Help по шагу;
- после отправки анкеты слева появляется UI сессии, справа показывается артефакт (questionnaire/Final_Description) и Help доступен через переключатель `Artifacts/Help`.

**Out of scope (пока):**
- Virtual Simulation анкета/UX (будет отдельной фазой после стабилизации Description).
- Финальные правки промптов/темплейтов в runtime (сначала обсуждаем и делаем draft).

### Stream 0: Design Gate (user-facing contract)
1. [DONE] Зафиксировать user-facing контракт шага Description (что показываем до/после submit анкеты, где живёт Help, какие обязательные пункты объяснения) (scope: `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`; expected commit: `docs(description): specify user-facing help UX for description step`).
2. [DONE] Git Commit: `docs(description): specify user-facing help UX for description step` (hash: `7a07b4ff`)

### Stream 1: PM UI — Pre-submit Help (левый слот)
1. [DONE] Добавить компонент help-контента для Description и показывать его в левой панели вместо Sessions, пока пользователь заполняет анкету и сессия ещё не создана (scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `src/client/project-manager/components/description/description-step-help.tsx`; expected commit: `feat(pm): show description help before session starts`).
2. [DONE] Git Commit: `feat(pm): show description help before session starts` (hash: `e4db6081`)

### Stream 2: PM UI — Artifacts/Help toggle (правый слот)
1. [DONE] Добавить переключатель `Artifacts/Help` в заголовок правой панели и подключить тот же help-контент для Description после submit анкеты (scope: `src/client/project-manager/components/layout/panel-container.tsx`, `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/description-artifact-header-toggle.tsx`; expected commit: `feat(pm): add artifacts/help toggle for description step`).
2. [DONE] Git Commit: `feat(pm): add artifacts/help toggle for description step` (hash: `a436451a`)

### Stream 3: Drafts — prompts/templates (обсуждение обязательно)
1. [DONE] Подготовить draft v2 для инструкций Description Agent (file-first + canvas-first: агент обновляет `Final_Description.md` итеративно и не вываливает полный документ в чат; вопросы задаёт после первичного черновика) без включения в runtime, в корне `doc/` для ревью (scope: `doc/Description_Agent_Instructions_Template.draft-v2.md`; expected commit: `docs(prompt): draft description agent system prompt v2`).
2. [DONE] Git Commit: `docs(prompt): draft description agent system prompt v2` (hash: `2656382b`)
3. [DONE] Подготовить draft шаблона Help для пользователя шага Description (pre-submit и post-submit guidance) в корне `doc/` для ревью (scope: `doc/Description_Step_Help_Template.draft-v1.md`; expected commit: `docs(template): draft description help template for step1`).
4. [DONE] Git Commit: `docs(template): draft description help template for step1` (hash: `013c3f00`)

### Stream 4: Validation (после UI правок)
1. [DONE] Прогнать таргетную валидацию PM/UI (typecheck/build/test по необходимости) и зафиксировать итог в session report (scope: `doc/Sessions/Archive/Session052.md`; expected commit: `docs(session): record description refactor validation`).
2. [DONE] Git Commit: `docs(session): record description refactor validation` (hash: `9542566c`)
