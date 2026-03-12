# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkspaceIdentity_Stabilization.md`
  - `doc/Sessions/Session070.md`
  - `doc/Sessions/Session071.md`
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Release stream закрывается только на чистом дереве и строго по `Release Build Checklist`.

---

## Phase 300 — Post-Release Smoke And Next Design Gate (owner: Oleksandr, updated: 2026-03-12)

### Stream 1: Release smoke verification
1. [TODO] Проверить локально установленный `codeai-hub-1.1.717.vsix` и пройти smoke-сценарий workspace identity stabilization в Project Manager: reopen workspace, visibility `questionnaire.md` / `Final_Description.md`, locked provider summary, provider picker warning (scope: локальный smoke + `doc/Sessions/`; expected commit: `test(release): smoke workspace identity stabilization`).
2. [TODO] Git Commit: `test(release): smoke workspace identity stabilization` (hash: TBD)

### Stream 2: Next architecture gate
3. [BLOCKED] До следующего implementation track утвердить новый architecture doc для post-MVP задачи после stabilization release; без этого новый кодовый `todo-plan` не открывать (scope: `doc/SolidWorks-WorkFlow/`; expected commit: `docs(architecture): approve next post-release track`).
4. [BLOCKED] Git Commit: `docs(architecture): approve next post-release track` (hash: TBD)
