# Session 051 — Description Refactor Planning (Help UX + TODO plan reset)

**Date:** 2026-03-01 09:36 (CET)
**Branch:** main
**Version:** 1.1.702

---

# 1. Work Done in This Session

## Work summary
- Восстановлен контекст по `Session050` (single-agent Description, финальный purge reviewer, релиз `1.1.702`).
- Подтверждён локальный baseline шаблонов: в `~/.codeai-hub/templates/description/` отсутствуют reviewer-файлы; остаются только collector-шаблоны.
- Согласован целевой UX для шага `Description` (user-facing):
  - до отправки анкеты: справа редактор `questionnaire.md`, слева подробный Help по шагу;
  - после отправки анкеты: слева UI сессии, справа артефакты + доступ к Help через переключатель `Artifacts/Help`.
- Архивирован старый `doc/TODO/todo-plan.md` (Phase 271–278) и создан новый `doc/TODO/todo-plan.md` для `Phase 279` (рефакторинг Description, без правок runtime промптов до отдельного обсуждения).
- Чтобы не потерять roadmap, `Phase 272 (Standalone Reviewer, DEFERRED)` вынесена в отдельный файл `doc/TODO/Phase272-StandaloneReviewer.md`.

## Git commits
- (Нет коммитов в этой сессии.)

WIP изменения (не закоммичены):
- `doc/TODO/todo-plan.md -> doc/TODO/Archive/todo-plan-up-to-phase278-2026-02-28.md` (архивирование)
- `doc/TODO/Phase272-StandaloneReviewer.md` (parked Phase 272)
- `doc/TODO/todo-plan.md` (новый план: Phase 279)
- `doc/Sessions/Archive/Session051.md` (этот отчёт)

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
5. `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md` (ключевой контракт шага Description)
6. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
7. `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
8. `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
9. `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
10. `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
11. `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md` (для унификации help-паттерна между шагами)
12. `doc/TODO/todo-plan.md` (Phase 279)
13. `doc/TODO/Phase272-StandaloneReviewer.md` (parked Phase 272)
14. `doc/TODO/Archive/todo-plan-up-to-phase278-2026-02-28.md` (история)
15. `doc/Sessions/Archive/Session050.md`
16. `doc/Sessions/Archive/Session051.md` (THIS REPORT)

## Plans for next session
- Начать `Phase 279 / Stream 0`: зафиксировать user-facing контракт help/UX в `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`.
- После утверждения контракта: реализовать UI изменения `Stream 1–2` по микро-задачам (≤3 файлов), строго следуя `todo-plan.md`.
- Промпты/темплейты Description: сначала сделать draft-файлы (не подключая в runtime) и обсудить содержимое, затем планировать интеграцию отдельными микро-задачами.

High-signal code entry points для реализации `Stream 1–2`:
- `src/client/project-manager/components/layout/main-area.tsx`
- `src/client/project-manager/components/layout/panel-container.tsx`
- `src/client/project-manager/components/description/description-questionnaire-panel.tsx`
- `src/client/project-manager/components/virtual-simulation/virtual-simulation-panel.tsx` (референс help-UX)
