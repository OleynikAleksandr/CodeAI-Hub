# Session 95 — Claude one-shot migration complete + QA release 1.1.515

**Date:** 2026-02-06 12:35 (CET)
**Branch:** main
**Version:** 1.1.515

---

# 1. Work Done in This Session

## Work summary
- Завершена миграция `Claude_Module` на one-shot turn model (FIFO queue, deterministic lifecycle, resume без fork, сохранение full-access options).
- Сохранена совместимость с continuity/UI контрактом: `turn_state`, `sessionIdChanged`, `token_usage`, thinking/structured-output pipeline.
- Добавлены и прогнаны таргетные regression tests для `Claude_Module` и `core` (`session-request-handler`).
- Пройден verification stream: `check-architecture`, `ultracite`, `ts-prune`, `jscpd`, `check:links`, таргетные сборки/тесты, `build:webview`, `typecheck:webview`.
- Выполнен QA релизный цикл: `./scripts/build-all.sh` (bump до `1.1.515`) и `./scripts/build-release.sh --use-current-version` с успешной сборкой VSIX `codeai-hub-1.1.515.vsix`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `5a4efdd5 docs(arch): approve claude one-shot session architecture`
- `02c0e518 docs(system): align continuity contract for claude one-shot`
- `eb8a92b6 docs(stack): document claude one-shot session lifecycle`
- `21695d17 refactor(claude): extend session types for one-shot queue`
- `c342f951 refactor(claude): align session manager with one-shot queue`
- `7f936f57 refactor(claude): harden one-shot session shutdown`
- `bcccb0de refactor(claude): switch sdk manager to one-shot dispatch`
- `58af0acd refactor(claude): preserve full-access query options in one-shot mode`
- `ffad6ae5 fix(claude): use sdk session id as resume source of truth`
- `ce0074d2 refactor(claude): add one-shot turn queue processor`
- `81e73f09 fix(claude): enforce deterministic turn lifecycle events`
- `5a61d582 refactor(claude): keep structured and thinking pipeline in one-shot mode`
- `f88046a7 fix(claude): preserve token usage stream in one-shot mode`
- `8687ea20 fix(claude): append logs on resume without truncation`
- `2f420558 fix(claude): preserve buffered logs during session promotion`
- `0a6a6911 refactor(claude): stabilize provider listener routing in one-shot mode`
- `4a26d26a test(claude): cover one-shot queue lifecycle`
- `1b116739 test(claude): cover logger append semantics`
- `346f0a02 test(core): guard continuity contract for claude one-shot`
- `4fdad35e chore(qa): verify claude one-shot migration gates`
- `a9621a6c chore(release): build artifacts for claude one-shot qa`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Stacks/Claude.md`
3. `doc/SolidWorks-Flow/SessionContinuity/Claude_OneShot_Session_Architecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session095.md` (THIS REPORT)

## Plans for next session
- Провести QA smoke в Project Manager: long session + continuity rollover + resume для Claude one-shot.
- При подтверждении smoke и по запросу пользователя подготовить/передать релизные артефакты `1.1.515` (VSIX + tarballs).
- Закрыть/архивировать текущий `todo-plan.md` после финального подтверждения фазы и создать новый план под следующую фазу.
