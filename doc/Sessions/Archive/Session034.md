# Session 034 — Task timer scoping analysis + planning

**Date:** 2026-02-26 08:00 (CET)
**Branch:** main
**Version:** 1.1.675

---

# 1. Work Done in This Session

## Work summary
- Протестирован релиз v1.1.675 — UX артефактов без кнопки Back работает корректно.
- Обнаружен баг: Total-счётчик суммирует время всех попыток (включая тестовые), не сбрасывается при очистке workspace-артефактов.
- Проведён глубокий анализ механизма хранения Total:
  - **In-memory**: `taskTimersByWorkspaceRoot` Map в `WorkspaceRuntimeFacade`
  - **On-disk**: `~/.codeai-hub/state/task-timers.json` (глобальный, вне workspace)
  - **Причина бага**: файл живёт вне workspace; даже при удалении данные остаются в памяти core и пересоздаются при `dispose()`
- Архивирован `todo-plan.md` (up-to-phase257)
- Создан новый `todo-plan.md` — Phase 258: перенос `task-timers.json` в каталог workspace

## Affected files (analysis only, no code changes)
- `packages/core/src/workspace-runtime/task-timer-storage.ts` — текущее глобальное хранилище
- `packages/core/src/workspace-runtime/workspace-runtime-facade.ts` — in-memory таймеры + persist/seed логика
- `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts` — тесты таймеров

## Git commits
- (no code commits — planning session only)

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Archive/Session034.md` (THIS REPORT)

## Key files to review before implementation
1. `packages/core/src/workspace-runtime/task-timer-storage.ts` — рефакторинг хранилища (Stream 0)
2. `packages/core/src/workspace-runtime/workspace-runtime-facade.ts` — адаптация фасада (Stream 1)
3. `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts` — обновление тестов (Stream 2)

## Plans for next session
- Выполнить Phase 258 из `todo-plan.md`:
  - **Stream 0**: Рефакторинг `TaskTimerStorage` — путь формируется из `workspaceRoot`, flat-формат без вложенности `workspaces{}`
  - **Stream 1**: Адаптация `WorkspaceRuntimeFacade` — per-workspace инстансы storage, persist каждого workspace в свой файл
  - **Stream 2**: Обновление тестов
  - **Stream 3**: Очистка legacy `~/.codeai-hub/state/task-timers.json`
  - **Stream 4**: Release build

## Architecture decision
- **Было**: `~/.codeai-hub/state/task-timers.json` (глобальный, один файл для всех workspace)
- **Будет**: `<workspaceRoot>/.codeai-hub/state/task-timers.json` (per-workspace, удаляется вместе с артефактами)
- **Формат файла**: упрощается с `{ schemaVersion, workspaces: { root: { nodeId: sec } } }` до `{ schemaVersion, totals: { nodeId: sec } }` (workspace root уже определён расположением файла)
