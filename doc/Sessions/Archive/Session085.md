# Session 085 — Diagram Contract Alignment Test Release

**Date:** 2026-03-16 17:58 (CET)
**Branch:** main
**Version:** 1.1.732

---

# 1. Work Done in This Session

## Work summary
- Закрыт corrective stream между DSL foundation и visual shell: Project Manager переведён с legacy Mermaid filenames на canonical artifacts `module-map.md` и `facade-map.md`.
- Обновлены workflow gating, artifact availability hooks, tree nodes, panels и help-copy, чтобы шаги `Diagram Modules` и `Diagram Facades` больше не зависели от `modules-diagram.mmd` / `facades-graph.mmd`.
- Подготовлены release-facing документы `README.md` и `CHANGELOG.md` под test release `1.1.732`.
- Выполнен release cycle:
  - `./scripts/build-all.sh` поднял версию до `1.1.732` и собрал tarball'ы в `~/.codeai-hub/releases/` и `doc/tmp/releases/`;
  - `./scripts/build-release.sh --use-current-version` завершился успешно;
  - VSIX собран: `codeai-hub-1.1.732.vsix`.

## Manual verification checklist for 1.1.732
- Установить `codeai-hub-1.1.732.vsix` и открыть Project Manager.
- Проверить, что верхний toolbar step `Diagram Modules` запускает agent session без требования legacy `.mmd` файла.
- Проверить, что верхний toolbar step `Diagram Facades` стартует по новому контракту и использует gating от `module-map.md`.
- Убедиться, что tree/panels открывают `module-map.md` и `facade-map.md`, а не Mermaid `.mmd`.
- Убедиться, что в PM нет user-facing labels/help-copy со старыми именами `modules-diagram.mmd` и `facades-graph.mmd`.
- Быстро проверить, что остальной workflow не регресснул после PM/UI alignment.

## Git commits
- `7e26377e docs(plan): add diagram contract alignment stream`
- `d5836ee2 fix(workflow): align diagram stage gating with markdown dsl`
- `59e9b91d fix(ui): align diagram artifact availability with markdown dsl`
- `f9bfe14e fix(ui): sync diagram panels with markdown dsl artifacts`
- `9a3d84b5 docs(ui): remove mermaid references from diagram workflow help`
- `33b25bf8 docs(release): prep diagram contract alignment release`
- `881cd66f chore(release): build diagram contract alignment release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session085.md` (THIS REPORT)
7. `doc/SolidWorks-WorkFlow/Plans/DiagramSteps_InteractiveDSL_Architecture.md`

## Plans for next session
- Получить ручной feedback по релизу `1.1.732` и зафиксировать, что PM/UI seam для diagram workflow закрыт.
- Продолжить `Phase 2 — visual shell with React Flow and ELK` со stream `Graph adapters`.
- Сначала реализовать `domainModelToReactFlow()` для `module-map.md`, затем расширить adapter под `facade-map.md`.
- После adapters перейти к `DiagramEditorFacade`, `DiagramLayoutFacade` и read-only visual shell с `*.flow.json`.
