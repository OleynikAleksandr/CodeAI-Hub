# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Commentary_Restore.md`
  - `doc/Sessions/Session064.md`
  - `doc/Sessions/Session065.md` (после создания)
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Release stream закрывается только на чистом дереве и строго по `Release Build Checklist`.

---

## Phase 291 — Post-release validation for GPT-5.4 workflow commentary (owner: Oleksandr, updated: 2026-03-06)

### Stream 0: Smoke `v1.1.715` in Project Manager
1. [TODO] Прогнать пользовательский smoke релиза `v1.1.715` на fresh workflow sessions `Description` и `Virtual Simulation` с `gpt-5.4`; сверить live dialog в PM, provider rollout JSONL и unified session JSONL, чтобы подтвердить возврат промежуточных commentary messages и отсутствие регрессии по history hydration (scope: runtime artifacts, PM workflow sessions; expected commit: `docs(plan): open phase 291 post-release validation`).
2. [TODO] Git Commit: `docs(plan): open phase 291 post-release validation` (hash: TBD)
3. [TODO] Если smoke покажет residual mismatch, сначала обновить или создать новый архитектурный contract под follow-up fix и только потом нарезать следующую implementation phase; без нового SSOT в код не идти (scope: `doc/SolidWorks-WorkFlow/Contracts/`, `doc/TODO/todo-plan.md`; expected commit: `docs(architecture): open follow-up commentary fix`).
4. [TODO] Git Commit: `docs(architecture): open follow-up commentary fix` (hash: TBD)
