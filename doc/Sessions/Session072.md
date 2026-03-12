# Session 072 — Post-Release PM Tree Regression Triage

**Date:** 2026-03-12 18:05 (CET)
**Branch:** main
**Version:** 1.1.717

---

# 1. Work Done in This Session

## Work summary
- Зафиксирован post-release regression report после ручного smoke-test локального релиза `v1.1.717`.
- Подтверждён новый фокус следующего расследования: Project Manager не гидратирует дерево workflow и stage completion, хотя workflow в фоне создаёт файлы и позволяет перейти к следующим шагам.
- Под отдельное расследование сохранены два реальных проблемных workspace и директория логов Core/PM.
- Утверждён отдельный repair SSOT: `ProjectManager_WorkflowState_Reconciliation.md`.
- Закрыт `Phase 301 / Stream 1`: internal metadata `description-step.json` и `description-step.json.tmp-*` больше не должны попадать в watcher/runtime user-facing artifact path.
- Таргетная проверка зелёная: `npm exec --workspace packages/core tsx --test src/workflow/workflow-internal-metadata-artifacts.test.ts` и `npm run build --workspace @codeai-hub/core`.

## Reported runtime issues to investigate next
- Workspace Claude: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub claude/.codeai-hub/codeai-hub-claude`
- Workspace Codex 5.4: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4`
- Logs directory: `/Users/oleksandroliinyk/.codeai-hub/logs`

- Симптом 1: после `Submit questionnaire` workflow в фоне продолжает работать штатно, а в файловой системе появляются артефакты, включая `Final_Description.md`.
- Симптом 2: в Project Manager слева не появляются ни session узел шага `Description`, ни `questionnaire.md`, ни `Final_Description.md`.
- Симптом 3: шаги workflow в левом sidebar не становятся выполненными и не показывают артефакты/сессии, хотя соответствующие файлы уже существуют на диске.
- Симптом 4: если дождаться появления `Final_Description.md` на диске и вручную нажать `Virtual Simulation`, шаг запускается.
- Симптом 5: после запуска `Virtual Simulation` слева может начать отображаться session `Description` вместо session `Virtual Simulation`.
- Симптом 6: справа при этом может открываться уже `virtual-simulation.md`, то есть filesystem/runtime progress и PM tree state расходятся.

## Confirmed investigation findings
- `workflow-state` read API для проблемных workspace уже возвращает `description`, `continuity`, `executionProfile` и `gating`, то есть filesystem recovery и continuity persistence работают лучше, чем показывает PM UI.
- `workflow.stage.completed` в production path не эмитится, поэтому stage completion сейчас нельзя честно вывести только из watcher events.
- Internal metadata leakage подтверждён live API ответом: `state.stages.description.artifacts` включает `description-step.json.tmp-*`, то есть atomic-write temp files попадают в user-facing state.
- `lastActive` остаётся смещённым к `description/questionnaire.md`, даже когда workspace уже дошёл до `Final_Description.md` и `virtual-simulation.md`.
- `ProjectManagerSessionView` слепо восстанавливает последний dialog intent из `localStorage`, что объясняет reopen/stale restore в старый `Description` dialog.
- Stage-to-panel sync в PM edge-triggered: если `Virtual Simulation` выбран до появления continuity/session, artifact pane может обновиться позже, а dialog pane остаётся на старом `Description`.
- `virtual-simulation.md` на реальном Codex workspace использует `### Сценарий N`, а validator ждёт `## Сценарий N`, поэтому live Core API уже помечает шаг как `invalid`.

## Git commits
- `81ab9099 docs(architecture): capture pm workflow regression repair`
- `0b63cb54 fix(core): filter internal workflow metadata artifacts`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session071.md`
6. `doc/Sessions/Session072.md` (THIS REPORT)
7. `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowState_Reconciliation.md`

## Plans for next session
- Реализация должна идти по `Phase 301` из `doc/TODO/todo-plan.md`; следующий активный шаг уже `Stream 2: read-side stage reconciliation`.
- Особое внимание: `lastActive` cross-stage, stale dialog restore из `localStorage`, reactive resync после появления VS continuity/session.
- Перед кодовыми правками держать открытым `ProjectManager_WorkflowState_Reconciliation.md` как SSOT текущего repair track.
