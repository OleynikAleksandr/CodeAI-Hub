# Session 101 — Manual-Layout First Release

**Date:** 2026-03-19 11:02 (CET)
**Branch:** main
**Version:** 1.1.748

---

# 1. Work Done in This Session

## Work summary
- Диаграммный UX переведён в режим `manual-layout first`: из `Diagram Modules` / `Diagram Facades` удалены `Auto-layout`, profile chooser и `Layout saved` chrome; диаграмма теперь живёт как `AI-generated semantic structure + persisted manual layout`.
- ELK-пайплайн вычищен из runtime и UI: удалены `diagram-layout-facade`, `auto-layout-button`, `save-status-indicator`, поле `layoutProfile` из `*.flow.json` и зависимость `elkjs`.
- Shared React Flow shell упрощён до user-owned drag/persist surface; `Edit Modules` / `Edit Relations` и facade editing sections сохранены как вторичные inline-редакторы canonical DSL под основным canvas.
- `README.md`, `CHANGELOG.md`, `SystemArchitecture.md`, planning-док `DiagramWorkflow_UserSurface_Architecture.md` и `todo-plan.md` синхронизированы с новым продуктовым контрактом.
- Собран локальный релиз `codeai-hub-1.1.748.vsix`.

## Verification
- `node --test --import tsx src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## Git commits
- `dce318fc docs(plan): scope manual-layout first diagrams`
- `fdeb958e refactor(diagrams): remove elk auto-layout pipeline`
- `8ad17dc7 docs(plan): record manual-layout cleanup progress`
- `9e38fc01 docs(release): prep manual-layout first release`
- `e9388a42 chore(release): build manual-layout first release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session101.md` (THIS REPORT)

> Далее: открыть `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramWorkflow_UserSurface_Architecture.md` и перейти к формированию эталонного `module-map.md` / golden reference для `Diagram Modules`.

## Plans for next session
- Проверить `v1.1.748` в реальном Project Manager: toolbar диаграммы должен остаться без `Auto-layout` и профилей, а ручной drag должен сохраняться после reopen/resume.
- Сформировать эталонный `module-map.md` для `Diagram Modules`, который задаёт правильную семантику кластеров, модулей и основных связей.
- После утверждения эталонного артефакта спроектировать примитивные manual alignment tools в React Flow: horizontal align, vertical align, distribute spacing и multi-select workflow.
