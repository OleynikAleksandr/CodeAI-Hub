# Session 041 — Application Foundation Envelope planning and execution slicing

**Date:** 2026-04-05 10:22 (CEST)
**Branch:** main
**Version:** 1.1.887

---

# 1. Work Done in This Session

## Work summary
- Архитектурное обсуждение было переориентировано: `Implementation Foundation` признан поздним шагом, а ближайшим реалистичным scope стал новый шаг `Application Foundation Envelope`.
- Подтверждена новая логика workflow:
  - `Diagram Modules`
  - `Application Foundation Envelope`
  - `Product Part / Cluster / Module Specifications`
  - required contracts
  - `Implementation Foundation`
- Уточнено, что `Application Foundation Envelope` должен быть лёгким structural step сразу после `Diagram Modules`, а не ранней реализацией environments/toolchains.
- Подтверждён паттерн шага:
  - canonical source of truth — текстовый `.md` документ;
  - визуализация — projection из него;
  - но в первой implementation wave визуализация сознательно откладывается.
- Обновлён planning-док [Application_Foundation_Envelope_Architecture.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-WorkFlow/Plans/Application_Foundation_Envelope_Architecture.md):
  - добавлен audit текущей кодовой базы;
  - перечислены реальные точки расширения core/client;
  - зафиксирован правильный upstream gate через `diagramModulesProgress.aggregateReady`;
  - зафиксирован первый реалистичный scope как `stage shell` с одним canonical артефактом `application-foundation-envelope.md`.
- Подтверждено, что визуальная диаграмма и `application-envelope.flow.json` должны идти отдельной следующей wave после stage shell.
- Создан новый execution plan в [todo-plan.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md) под первую implementation wave шага `Application Foundation Envelope`.
- Новый `todo-plan.md` режет работу на четыре execution stream:
  - `Core Stage Contract`
  - `Core Contract Endpoint And Persistence`
  - `Project Manager Service Wiring`
  - `Project Manager UI Shell`
- Реализация кода в этой сессии **не начиналась**: пользователь остановил переход к коду и потребовал сначала зафиксировать planning + `todo-plan`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- В этой сессии новых коммитов не было.
- Изменения остаются незакоммиченными в рабочем дереве и должны быть прочитаны напрямую из файлов:
  - `AGENTS.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/TODO/todo-plan.md`
  - `doc/Sessions/Session040.md`
  - `doc/SolidWorks-WorkFlow/Plans/Application_Foundation_Envelope_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Implementation_Foundation_Architecture.md`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session040.md`
7. `doc/Sessions/Session041.md` (THIS REPORT)
8. `doc/SolidWorks-WorkFlow/Plans/Application_Foundation_Envelope_Architecture.md`
9. `doc/SolidWorks-WorkFlow/Plans/Implementation_Foundation_Architecture.md`
10. `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
11. `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_DescriptionEntry_CopyRefactor.md`
12. `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
13. `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`

> Далее: при начале реализации открыть конкретные файлы из `packages/core/src/workflow/`, `packages/core/src/remote-bridge/handlers/`, `src/client/project-manager/services/` и `src/client/project-manager/components/layout/`, перечисленные в planning-доке `Application_Foundation_Envelope_Architecture.md` section `6.2`.

## Plans for next session
- Начать **реализацию только по** [todo-plan.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md), не перепрыгивая сразу к произвольным правкам.
- Работать только в рамках первой implementation wave: `Application Foundation Envelope stage shell`.
- Не добавлять в первой wave:
  - `application-envelope.flow.json`
  - визуальную диаграмму
  - `React Flow` integration
  - visual editor/layout persistence
- Первый таргет implementation:
  - новый workflow-stage `application_foundation_envelope`
  - gating после завершённого `Diagram Modules`
  - contract endpoint
  - canonical markdown artifact `application-foundation-envelope.md`
  - Project Manager button/tree/panel shell
- Критичный architectural invariant для реализации:
  - gate нового шага должен опираться на `diagramModulesProgress.aggregateReady === true`, а не только на наличие `product-parts.index.md`.
- После каждого микрошагa обновлять [todo-plan.md](/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md) в реальном времени и делать отдельный commit-pair по правилам плана.
