# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Новый implementation scope начинается только после утверждённого planning-документа в `doc/SolidWorks-WorkFlow/Plans/`.
- Если активного planning scope нет, кодовые изменения не начинать: сначала оформить новый план и только потом нарезать execution stream-ы.
- Любые изменения логики и архитектуры синхронно отражать в `doc/` до коммита.
- Финальный release stream разрешён только с чистого дерева и актуальными release-facing документами.

## Phase 0 — Awaiting Next Approved Scope (owner: Docs, updated: 2026-04-01)
### Stream: Planning Intake
1. [TODO] Review the latest release/session handoff, then create or approve the next planning document before opening a new implementation stream. Scope: `doc/Sessions/Session020.md`, `doc/SolidWorks-WorkFlow/Plans/*`, `doc/TODO/todo-plan.md`. Target commit: `docs(plan): define next scope`
2. [TODO] Git Commit: `docs(plan): define next scope` (hash: TBD)
