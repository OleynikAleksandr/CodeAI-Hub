# Session 024 — Test 1.1.456: one-shot Description OK, auto-start Reviewer не запускается

**Date:** 2026-01-20 16:53 (CET)
**Branch:** main
**Version:** 1.1.456

---

# 1. Work Done in This Session

## Work summary
- Обновлены ответы анкеты под актуальную архитектуру (без `runs/`, с Reviewer stage): `.codeai-hub/codeai-hub/description/questionnaire.md`.
- Подтверждено на практике: Description Agent теперь создаёт `.codeai-hub/codeai-hub/description/description.md` с первого раза **без вопросов**.
- Выявлена проблема: при появлении `description.md` **не запускается автоматом** следующий этап (Reviewer session) и пайплайн `draft -> reviewer -> Final_Description.md` останавливается.

## Observed behavior (bug)
- Expected: после записи `.codeai-hub/<workspaceSlug>/description/description.md` Core/Project Manager создаёт Reviewer-сессию, сохраняет `SessionRef`, и дальше появляется/обновляется `Final_Description.md`.
- Actual: `description.md` появляется, но Reviewer-сессия не стартует автоматически.

## Notes / Hypothesis
- Вероятное место разрыва: нет (или не срабатывает) обработчик `workflow.artifact.written` для `stage=description` + `fileName=description.md`, который должен инициировать `session:create` для reviewer-провайдера и переключить `DescriptionStepStore` на reviewer `SessionRef`.
- Потенциально релевантные точки кода для следующей сессии:
  - `packages/core/src/workflow/watcher/workflow-watcher.ts` (эмит `workflow.artifact.written`)
  - `packages/core/src/workflow/state/workflow-state-store.ts` (статусы + OUTDATED)
  - `packages/core/src/workflow/description/description-step-store.ts` (draft/final/sessionRef)
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts` (persist `SessionRef`)
  - `packages/core/src/remote-bridge/handlers/workflow-state-service.ts` (expose description branch)

## Verification
- Manual UI test (Claude): `description.md` создан; авто-старт Reviewer не произошёл.

## Git commits
- Нет новых коммитов в этой сессии (только тестирование и обновление `.codeai-hub/**` артефактов).

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`
2. `doc/SolidWorks-Flow/Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/Core/SessionContinuity_Architecture.md`
4. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
5. `doc/Sessions/Session024.md` (THIS REPORT)

## Plans for next session
- Воспроизвести авто-старт Reviewer с логами Core (`~/.codeai-hub/logs/core/core.log`) и проверить, приходит ли событие `workflow.artifact.written` на запись `description.md`.
- Проверить ответ `GET /api/v1/orchestrator/workflow-state` на наличие поля `description` и актуальных путей `draftPath/finalPath/session`.
- Реализовать авто-старт Reviewer при появлении draft `description.md` (idempotent: запуск ровно 1 раз на draft) + запись reviewer `SessionRef` в `DescriptionStepStore`.
- Довести UI-ветку Description до ожидаемого поведения: после auto-start должен появляться `Session: Reviewer` с `Continue`, а после финала — `Final_Description.md`.
- Прогнать гейты и таргетные сборки затронутых пакетов (минимум: `@codeai-hub/core`, `build:project-manager`).
