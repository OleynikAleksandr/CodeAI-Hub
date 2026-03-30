# Session 193 — Project Manager Central Panels Planning Merge

**Date:** 2026-03-29 18:13 (CEST)
**Branch:** main
**Version:** 1.1.837

---

# 1. Work Done in This Session

## Work summary
- Проведена перекрёстная ревизия двух planning-документов по проблемам отображения средней зоны Project Manager: post-submit flicker в `Description` и ложный `Final_Description.md`.
- На основе двух документов собран единый execution-source документ [ProjectManager_CentralPanels_ExecutionPlanning_Source.md](../SolidWorks-WorkFlow/Plans/ProjectManager_CentralPanels_ExecutionPlanning_Source.md), уже ориентированный на следующий `doc/TODO/todo-plan.md`.
- В merged-документ добавлены: `P0/P1` стратегия, open investigation item по race бага 1, path-contract/readability checks для `draftPath`, acceptance criteria и рекомендуемая нарезка на будущие microtasks.
- Выполнен cleanup структуры `Plans`: merged-док перенесён из временной подпапки `Codex` в основной `doc/SolidWorks-WorkFlow/Plans/`, папки `doc/SolidWorks-WorkFlow/Plans/Codex/` и `doc/SolidWorks-WorkFlow/Plans/Claude/` удалены, чтобы не оставлять конкурирующие planning-источники.
- Placeholder `doc/TODO/todo-plan.md` заменён на полноценный phase/stream execution-plan с `Phase 101–105`, включая обязательный финальный stream релизной сборки по release checklist.
- Код приложения в этой сессии не менялся; сессия завершена на уровне planning + documentation preparation.

## Git commits
- Финальный documentation commit этой сессии создаётся вместе с данным отчетом и поэтому не может быть перечислен здесь заранее.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session193.md` (THIS REPORT)
6. `doc/SolidWorks-WorkFlow/Plans/ProjectManager_CentralPanels_ExecutionPlanning_Source.md`

> Далее: перед началом реализации открыть связанные PM-файлы из `src/client/project-manager/components/layout/` и workflow handlers из `packages/core/src/remote-bridge/handlers/`, которые перечислены в merged planning-документе.

## Plans for next session
- Использовать `doc/SolidWorks-WorkFlow/Plans/ProjectManager_CentralPanels_ExecutionPlanning_Source.md` как единственный planning-source и текущий `doc/TODO/todo-plan.md` как execution-source для реализации.
- Начинать следующую сессию с `Phase 101`, сначала user-facing `P0-A` fix для stabilizing post-submit `Description`, затем `P0-B` availability/readability scope.
- Не пропустить отдельную investigation-задачу из `todo-plan.md` по точной причине race, при котором после `session:created` polling иногда возвращает snapshot без `primarySession`.
- Завершать scope только после финального release stream из `Phase 105`: docs sync, `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, новый session report и release artifacts.
