# Session 129 — Smoke валидация Phase 116 (Claude/Codex) и особенность Gemini

**Date:** 2026-02-09 10:52 (CET)
**Branch:** main
**Version:** 1.1.535

---

# 1. Work Done in This Session

## Work summary
- Проведена smoke-валидация релиза `1.1.535` на сценариях rollover/normal turn в reviewer-потоке.
- Подтверждено, что исправления Phase 115/116 работают стабильно для `claudeCodeCli`: отсутствует повторный post-resume relock, нет повторного `blocked(resuming)` после `resume_ready`.
- Подтверждено, что исправления Phase 115/116 работают стабильно для `codexCli`: отсутствует regression `unlock -> relock`, lifecycle проходит по canonical path `context_check_pending -> no_rollover_needed`.
- Разобрана жалоба на «долгую» блокировку после смены сессии в Codex: по логам это штатное поведение (bootstrap turn длиннее, lock снимается после первого `assistant`/`resume_ready`).
- Зафиксирована особенность третьего провайдера `geminiCli`: в текущем окружении наблюдается ошибка инициализации SDK-модуля (`nonInteractiveToolExecutor.js`), поэтому в данном smoke не участвовал в reviewer continuity-проверке.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `(no commits) validation-only session`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session129.md` (THIS REPORT)

## Plans for next session
- При необходимости выполнить дополнительный targeted smoke на других flow-node/stage комбинациях для `claudeCodeCli` и `codexCli`.
- Отдельно разобрать и устранить bootstrap/инициализацию `geminiCli` в окружении (`@google/gemini-cli-core` path resolution), затем повторить provider smoke.
- После принятия новой задачи подготовить следующий архитектурный цикл (новый architecture doc -> новый `todo-plan.md` или архив текущего плана, если полностью завершён).
