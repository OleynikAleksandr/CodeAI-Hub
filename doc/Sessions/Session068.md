# Session 68 — Codex token usage via `/status` (design + Phase 86 plan)

**Date:** 2026-02-01 20:36 (CET)
**Branch:** main
**Version:** 1.1.493

---

# Update (2026-02-02)

В ходе практической проверки выяснилось, что `/status` — это TUI slash-команда и не может быть использована как программный source-of-truth в non-interactive режиме (`codex exec --json`/SDK). Актуальный источник истины для `used/limit` — событие `token_count` в rollout JSONL (см. `doc/SolidWorks-Flow/TokenUsage/CodexTokenUsage_Architecture.md` и `doc/Sessions/Session069.md`).

# 1. Work Done in This Session

## Work summary
- Заархивировали завершённый `doc/TODO/todo-plan.md` (Phase 85 docs sync) и создали новый план Phase 86 строго под Codex token usage через CLI `/status`.
- Подготовили архитектурный документ `CodexTokenUsage_Architecture.md`:
  - source-of-truth для `used/limit` — строка `Context window: ... (55.3K used / 258K)` из `/status`;
  - зафиксировали файловый контракт Codex session logs в `CODEX_HOME`:
    `~/.codeai-hub/providers/codex/home/sessions/YYYY/MM/DD/rollout-*-<providerSessionId>.jsonl`.
- В `todo-plan.md` проставили хеши bootstrap и архитектурного коммита.

## Approval
- ✅ Апрув: `doc/SolidWorks-Flow/TokenUsage/CodexTokenUsage_Architecture.md` (зафиксировать в `doc/TODO/todo-plan.md` на старте следующей сессии отдельной микрозадачей + коммит).

## Git commits
- `55932f99 docs(todo): start Phase 86 codex token usage via status`
- `e041c966 docs: add Codex token usage architecture`
- `9fc6e334 docs(todo): record Phase 86 hashes`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Stacks/Codex_SDK_Module.md`
3. `doc/SolidWorks-Flow/TokenUsage/CodexTokenUsage_Architecture.md` (THIS APPROVED DESIGN)
4. `doc/SolidWorks-Flow/TokenUsage/ClaudeTokenUsage_Architecture.md` (reference pattern)
5. `doc/Sessions/Session065.md` (token usage persistence via continuity `chain.json`)
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Session068.md` (THIS REPORT)

## Plans for next session
- Обновить `doc/TODO/todo-plan.md`: отметить апрув `CodexTokenUsage_Architecture.md` как `[DONE]` и зафиксировать отдельным `Git Commit: ...`.
- Реализовать в `@codeai-hub/codex-module` чтение token usage через `/status`:
  - resolver rollout JSONL по `providerSessionId` (сессии Codex в `CODEX_HOME/sessions/.../rollout-*-<id>.jsonl`),
  - парсер строки `Context window: ... (X used / Y)` → `{ used, limit }` (K/M суффиксы),
  - throttling + in-flight lock, чтобы не спамить CLI,
  - эмит `stream_event` с `tokenUsage` после завершения turn.
- Прогнать гейты и таргетный билд `npm run build --workspace @codeai-hub/codex-module`, обновлять `doc/TODO/todo-plan.md` после каждого коммита.
