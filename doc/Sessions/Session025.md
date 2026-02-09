# Session 025 — Планирование фикса: auto-start Reviewer после `description.md`

**Date:** 2026-01-20 17:01 (CET)
**Branch:** main
**Version:** 1.1.456

---

# 1. Work Done in This Session

## Work summary
- Восстановлен контекст по предыдущим сессиям (Session023/Session024) и изменениям релиза 1.1.456.
- Актуализирована анкета в workspace-артефактах под текущую модель (one-shot Description без вопросов, без `runs/`, вопросы только на Reviewer этапе): `.codeai-hub/codeai-hub/description/questionnaire.md`.
- Зафиксировано текущее блокирующее поведение: после появления `.codeai-hub/<workspaceSlug>/description/description.md` **не запускается автоматически** следующий этап (Reviewer session), пайплайн `draft -> reviewer -> Final_Description.md` останавливается.

## Notes / Decisions
- Политика шага Description (MVP): **one-shot, без вопросов**. Любые уточнения переносятся на Reviewer стадию.
- Артефакты workflow: **file-first, current-only**, без модели `runs/`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- Нет новых коммитов в этой сессии.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`
2. `doc/SolidWorks-Flow/Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/Core/SessionContinuity_Architecture.md`
4. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
5. `doc/Sessions/Session024.md`
6. `doc/Sessions/Session025.md` (THIS REPORT)

## Plans for next session
- Воспроизвести проблему с логами Core: проверить `~/.codeai-hub/logs/core/core.log` и убедиться, что при записи `description.md` реально эмитится событие `workflow.artifact.written` (stage=`description`).
- Проверить `GET /api/v1/orchestrator/workflow-state`: присутствует ли ветка `description`, корректны ли `draftPath/finalPath`, и что происходит с `sessionRef`.
- Найти точку, где должен стартовать Reviewer (в ответ на `workflow.artifact.written` для `description/description.md`) и реализовать auto-start (idempotent: ровно 1 запуск на draft).
- Сохранить reviewer `SessionRef` в состоянии workflow (Description branch), чтобы UI мог показать `Continue` и чтобы появился/обновился `Final_Description.md`.
- Отдельно проверить/спроектировать поведение TemplateSync на апдейте релиза: установка должна гарантированно обновлять bundled templates до версии релиза (без ручных действий пользователя).
- Прогнать гейты качества и таргетные сборки затронутых пакетов (минимум: `@codeai-hub/core`, `build:project-manager`).
