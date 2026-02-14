# Session 048 — Core restart: исчезающие сессии в PM (workspacePath normalization)

**Date:** 2026-02-14 12:48 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.593

---

# 1. Work Done in This Session

## Work summary
- [IN_PROGRESS] Разобрать причину, почему после перезапуска Core в Project Manager пропадает/не открывается сессия агента (например, `Reviewer Codex`).
- [TODO] Исправить Core так, чтобы `workflow-state` не “терял” `description.sessionKind/session` из-за эквивалентных путей workspace (`/path/ws` vs `/path/ws/`).
- [TODO] Добавить тест на нормализацию workspacePath.
- [TODO] Синхронизировать документацию SolidWorks-Flow (контракт workspacePath, влияние на восстановление UI).
- [TODO] Собрать новый patch релиз и передать на тест.

## Key diagnosis (root cause)
- Core хранит snapshot `.codeai-hub/<workspaceSlug>/description/description-step.json` с полем `workspacePath`.
- При чтении snapshot в `workflow-state` выполнялась строгая проверка совпадения `workspacePath` и `workspaceRoot` из запроса.
- Если запрос приходил с `workspacePath` со слэшем на конце (или иной эквивалентной формой пути), сравнение строк не совпадало, Core очищал session refs как “stale/cross-workspace leak”, и PM не мог восстановить сессию.

## Git commits
- `03047fc7 docs(todo): archive Phase160 plan; start Phase161 (core restart sessions)`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session048.md` (THIS REPORT)

## Plans for next session
- Дофиксить `packages/core/src/workflow/description/description-step-store.ts`: нормализация путей, каноническое сохранение `workspacePath`, и тест.
- Пересобрать patch release и проверить сценарий: закрыть PM, перезапустить Core, открыть PM, кликнуть `Reviewer Codex` и увидеть диалог из кумулятивного JSONL.
