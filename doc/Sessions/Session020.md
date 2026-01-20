# Session 020 — Remove RUNS: Edit Step + Single-Current Artifacts (Phase 63)

**Date:** 2026-01-20 10:20 (CET)
**Branch:** main
**Version:** 1.1.454

---

# 1. Work Done in This Session

## Work summary
- Принято решение: **убрать RUNS как сущность** (без run picker/выбора current run). Повторные попытки = `Edit Step` с перезаписью текущих артефактов.
- Синхронизирована архитектура (Workflow Tree + file-first): удалены упоминания `runs/`, закреплён канон путей без `runs/`.
- Обновлён `doc/TODO/todo-plan.md`: добавлена Phase 63 + расписаны стримы вычистки runs/runSlug, зафиксирован прогресс с хешами.
- Начата кодовая вычистка:
  - Core: workflow-артефакты теперь пишутся в `.codeai-hub/<workspaceSlug>/<stage>/<file>` (без `runs/<runSlug>/...`), allowlist/Watcher адаптированы.
  - Core: удалены HTTP endpoints для `/initiatives/:initiativeSlug/runs`.
  - UI (webview): удалён run picker и runs-client, пересобран bundle.
  - Project Manager: prompt-pack paths переведены на канон без `runs/`, обновлён UI copy пути Description.

## Verification
- `./scripts/check-architecture.sh` (PASS with warnings: файлы 250–300 строк)
- `npx ultracite check` (OK)
- `npm run check:links` (OK)
- `npm run build --workspace @codeai-hub/core` (OK)
- `npm run build:webview` + `npm run typecheck:webview` (OK)
- `npm run build:project-manager` (OK)

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `02f5c8a8 docs(todo): record phase 63 progress`
- `2a9b7235 docs(project-manager): update description artifact path`
- `bdad937e refactor(project-manager): drop runs from prompt pack`
- `2ecbf54c chore(webview): rebuild bundle`
- `ab574fd7 refactor(ui): remove run picker (use edit step)`
- `aeaa16f5 refactor(core): remove runs endpoints`
- `2221ac6a refactor(core): remove runs from workflow paths`
- `3da4778f docs(todo): add phase 63 (remove runs entity)`
- `50844126 docs(curator): remove runSlug (use session checkpoints)`
- `98c2caf0 docs(core): remove runs from file-first workflow`
- `fe2f5218 docs(workflow-tree): remove runs (use edit)`
- `f14a1ccf docs(workflow-tree): clarify runs policy`
- `42a39a59 docs(todo): record session continuity architecture`
- `b3461817 docs(system): mark session continuity as critical`
- `40285931 docs(session-continuity): add architecture`
- `4c6eeaed docs(workflow-tree): apply step branch pattern`
- `5d091371 docs(todo): record description step lifecycle update`
- `b8ccbbe2 docs(workflow-tree): refine description step lifecycle`
- `e7f0378a docs(todo): record phase 62 kickoff commits`
- `4840a5e8 docs: add session 019 and phase 62 plan`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/Workflow_CLI_Steps_And_Watcher_Architecture.md`
3. `doc/Project_Docs/QuestionnaireCurator/QuestionnaireCurator_Architecture.md`
4. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
5. `doc/SolidWorks-Flow/Architecture/WorkflowTree_StepSplit_Architecture.md`
6. `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`
7. `doc/Project_Docs/SessionContinuity/SessionContinuity_Architecture.md`
8. `doc/TODO/todo-plan.md`
9. `doc/Sessions/Session020.md` (THIS REPORT)

## Plans for next session
- Дожать вычистку `runSlug` из session context (core remote-bridge types + shared session types + UI core-bridge).
- Удалить `RunStore`/`currentRunId` и весь runs-слой из `@codeai-hub/initiatives` + вычистить `auto-run-service`.
- Привести `questionnaire curator` код к новой модели checkpointId (без runSlug/runId), синхронизировать промпт `questionnaire-curator.md`.
- Обновить Project Manager API/Workflow Events Client: убрать `runSlug` из payload’ов.
