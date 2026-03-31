# Session 036 — Workspace-scoped task timer storage: analysis, refactor, release v1.1.676

**Date:** 2026-02-26 08:45 (CET)
**Branch:** main
**Version:** 1.1.676

---

# 1. Work Done in This Session

## Work summary
- Восстановлен контекст после Session 033 (релиз v1.1.675, удаление кнопки Back).
- Обнаружен и проанализирован баг: Total-счётчик таймера в UI сессии суммировал время
  всех попыток (в т.ч. тестовых) и не сбрасывался при очистке workspace-артефактов.
- Установлена root cause: `task-timers.json` хранился глобально в `~/.codeai-hub/state/`,
  вне workspace. Данные в памяти core пережигали удаление файла и пересоздавали его при dispose.
- Принято архитектурное решение: перенести хранилище в `<workspaceRoot>/.codeai-hub/state/`.
- Реализован Phase 258 (4 стрима):
  - **Stream 0**: `TaskTimerStorage` — workspace-scoped путь, flat формат v2 (`{ schemaVersion, totals }`),
    статический метод `cleanupLegacy()` для удаления старого глобального файла.
  - **Stream 1**: `WorkspaceRuntimeFacade` — per-workspace инстансы через `taskTimerStorageFactory`,
    новый `getOrCreateStorage()`, `persistTaskTimers()` пишет каждый workspace в свой файл.
  - **Stream 2**: тест `preserves task timer totals across Stop/Play restarts` адаптирован
    под новый API (`taskTimerStorageFactory` вместо `taskTimerStorage`).
  - **Stream 3**: legacy cleanup реализован в Stream 0/1 (cleanupLegacy + вызов в конструкторе).
- Release build v1.1.676.
- Поведение подтверждено: после перезапуска core файл создаётся в `<workspace>/.codeai-hub/state/task-timers.json`.

## Build / verification
- `npm run build --workspace packages/core` ✅
- `./scripts/build-all.sh` ✅
- `./scripts/build-release.sh --use-current-version` ✅ (`✅ Package created`)
- Artifacts:
  - `doc/tmp/releases/codeai-hub-1.1.676.vsix`

## Git commits
- `96655ccd docs: archive Phase 257 todo-plan, create Phase 258 plan and Session 034 report`
- `51dfb42e refactor(core): make task timer storage workspace-scoped`
- `d7a5861d refactor(core): use per-workspace task timer storage`
- `fc260f6a test(core): adapt task timer tests for workspace-scoped storage`
- `c874e76e docs(todo): record Phase 258 hashes (streams 0-3)`
- `df29ffaa chore(release): build-all`
- `fc026271 chore(release): package vsix`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session036.md` (THIS REPORT)

## Plans for next session
- Установить `doc/tmp/releases/codeai-hub-1.1.676.vsix` и провести полноценное тестирование:
  проверить что Total сбрасывается при удалении `.codeai-hub/` в workspace.
- Продолжить разбор багов из `doc/BugRegistry.md`.
