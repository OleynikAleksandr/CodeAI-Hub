# Session 049 — Single-agent Description (Final_Description.md) + план миграции (без auto-reviewer)

**Date:** 2026-02-28 19:25 (CET)
**Branch:** main
**Version:** 1.1.697

---

# 1. Work Done in This Session

## Work summary
- Принято архитектурное решение: узел `description` должен быть **одним** агентом с бесконечной (resume) сессией и финальным артефактом `Final_Description.md`.
- Отложено: standalone/manual Reviewer как кросс-стадийный инструмент. Это вынесено в `Backlog Module R1 (DEFERRED)` и не входит в ближайшую реализацию.
- Заархивирован старый план разработки и создан новый `todo-plan.md` под миграцию Description.
- Подготовлен SSOT/контракт для нового поведения шага Description.
- В `todo-plan.md` выполнена проверка связей с текущей автоматизацией в коде: зафиксированы обязательные места правок (Core allowlist/paths/validation, PM wiring, downstream prompts), чтобы не оставить legacy «хвосты» вокруг `description.md` и auto-reviewer.

## Artifacts / Docs created or updated
- Новый SSOT контракт: `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- Новый активный план: `doc/TODO/todo-plan.md`
- Архив старого плана: `doc/TODO/Archive/todo-plan-up-to-phase265-2026-02-28.md`

## Git commits
- (Нет коммитов в этой сессии — изменения внесены в `doc/` и требуют последующей реализации/коммитов по фазам плана.)

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
5. `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md` (NEW — SSOT контракт)
6. `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md` (LEGACY — подлежит обновлению под новую модель)
7. `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
8. `doc/TODO/todo-plan.md` (актуальный план фаз 266–270)
9. `doc/Sessions/Session048.md`
10. `doc/Sessions/Session049.md` (THIS REPORT)

## Context hot spots in code (high-signal files)
Эти файлы зашивают текущую автоматизацию `questionnaire → description.md → auto-reviewer → Final_Description.md` и должны быть изменены при миграции:
- Core runtime auto-reviewer: `packages/core/src/workflow/runtime/workflow-runtime.ts`
- Session resume modes (collector сейчас `no_resume`): `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
- Workflow artifact allowlist/paths/validation (Description сейчас = `description.md`):
  - `packages/core/src/workflow/paths/workflow-paths-types.ts`
  - `packages/core/src/workflow/paths/workflow-artifact-paths.ts`
  - `packages/core/src/remote-bridge/handlers/http-api-router.ts`
- PM prompt pack и output-path логика (Description сейчас пишет `description.md`, часто в `runs/`):
  - `src/client/project-manager/services/prompt-pack-builder.ts`
  - `src/client/project-manager/services/idea-collector-submit-service.ts`
  - `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`
- PM/UX copy, где упоминается draft+reviewer: `src/client/project-manager/components/description/description-questionnaire-panel.tsx`
- Downstream prompts, которые сейчас требуют `description.md` как вход:
  - `packages/core/src/templates/source/virtual-simulation-prompt.md`
  - `packages/core/src/templates/source/modules-diagram-prompt.md`
  - `packages/core/src/templates/source/facades-graph-prompt.md`

## Plans for next session (implementation start)
- Утвердить (или правками довести до утверждения) контракт `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`.
- Начать реализацию по `doc/TODO/todo-plan.md`:
  - Phase 267: убрать auto-reviewer и включить resume для Description.
  - Phase 267: перевести Core allowlist/paths/validation и workflow artifact plumbing на `Final_Description.md`.
  - Phase 268: переключить PM wiring так, чтобы Description писал стабильный `.codeai-hub/<workspaceSlug>/description/Final_Description.md` (без `runs/`).
  - Phase 269: обновить downstream prompts на `Final_Description.md` и синхронизировать bundled templates.
- Обновить LEGACY SSOT: `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md` и `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md` под single-agent модель.

---

## Addendum (2026-02-28 20:14 CET)

- Фазы 266–269 реализованы и закрыты в `doc/Sessions/Session050.md`.
- Базовый workflow закреплён как single-agent Description (`Final_Description.md` как SSOT).
- Standalone Reviewer остаётся в `Backlog Module R1 (DEFERRED)` и не входит в обязательный поток шага 1.
