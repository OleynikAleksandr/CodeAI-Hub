# План разработки (Development TODO Plan)

## Архивный статус
- Этот план не был реализован и не был закрыт кодом.
- Он заархивирован как **superseded** после смены приоритета 2026-03-12: сначала стабилизация workspace identity / PM workflow state, затем отдельное возвращение к retry submit UX.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_TurnStarted_ACK.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Claude_Workflow_TurnStarted_ACK.md`
  - `doc/Sessions/Session067.md`
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Release stream закрывается только на чистом дереве и строго по `Release Build Checklist`.

---

## Phase 295 — Retry Submit UX Design Gate (owner: Oleksandr, updated: 2026-03-12)

### Stream 0: Awaiting approved architecture
1. [BLOCKED] Новый implementation plan не открывать до отдельного утверждённого архитектурного документа для `Повторить отправку сообщения` / failed workflow submit у Codex и Claude; завершённый план `Phase 293` + `Phase 294` закрыт и заархивирован в `doc/TODO/Archive/todo-plan-up-to-phase294-2026-03-12.md` (scope: `doc/SolidWorks-WorkFlow/Contracts/`, `doc/TODO/todo-plan.md`; expected commit: `docs(architecture): approve retry submit design`).
2. [BLOCKED] Git Commit: `docs(architecture): approve retry submit design` (hash: TBD)
