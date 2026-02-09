# Session 69 — Codex token usage: `/status` invalid via `exec`, pivot to `token_count`

**Date:** 2026-02-02 (local)
**Branch:** main
**Version:** 1.1.493

---

# 1. Work Done in This Session

## Work summary
- Проверили на практике, что `/status` — это TUI slash-команда и **не может** быть надёжным источником истины в non-interactive режиме (`codex exec --json`/SDK): строка `Context window: ...` не возвращается, а отправка `"/status"` трактуется как обычный prompt (и портит контекст).
- Нашли программный источник истины без CLI-вызовов: в rollout JSONL присутствует событие `token_count` в конце turn.
  - `used = token_count.info.last_token_usage.total_tokens`
  - `limit = token_count.info.model_context_window`
  - `%remaining` для продукта считаем сами: `round((limit - used) / limit * 100)`.
  - Процент из TUI `/status` может расходиться с арифметикой — верифицируем только `used/limit` (значения в скобках).
- Синхронизировали документы и план Phase 86 под новый source-of-truth (rollout `token_count`).

## Git commits
- `7b7e774c docs(todo): clean Phase 86 plan for execution`
- `678753dc docs(session): Session069 Phase 86 preflight`
- `23bca730 docs(todo): pivot Phase 86 to token_count rollout source`
- `d6d851b7 docs: revise Codex token usage architecture to token_count`
- `70e1a951 docs(todo): remove completed design steps after token_count pivot`
- `b668580b docs: clarify Codex token usage via token_count`

---

# 2. Instructions for Next Session

## Required documents to review before work (read in this order)

### A) Architecture (source of truth)
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md` (multi-tenant: `workspacePath` — свойство Session)
2. `doc/SolidWorks-Flow/TokenUsage/CodexTokenUsage_Architecture.md` (revised: source-of-truth = rollout `token_count`)
3. `doc/SolidWorks-Flow/Stacks/Codex_SDK_Module.md` (revised note: `/status` TUI-only; token usage via `token_count`)
4. `doc/SolidWorks-Flow/TokenUsage/ClaudeTokenUsage_Architecture.md` (reference pattern: throttling + in-flight lock + internal-only + continuity)

### B) Multi-workspace / history pitfalls (обязательно)
5. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md` (workspaceKey должен быть пер-сессионный)

### C) Session continuity / persistence
6. `doc/Sessions/Session065.md` (tokenUsage persistence/restore через continuity `chain.json`)

### D) Контекст (история решений)
7. `doc/Sessions/Session068.md` (historical: `/status` approach; superseded)
8. `doc/Sessions/Session069.md` (THIS REPORT)

### E) План исполнения
9. `doc/TODO/todo-plan.md` (THIS FILE)

## Plans for next session
- Выполнить Phase 86 из `doc/TODO/todo-plan.md` (начиная со Stream: spike) строго микрозадачами ≤3 файлов + отдельный коммит после каждой микрозадачи.
- После реализации и верификации создать `doc/Sessions/Session070.md` (implementation + verification).
