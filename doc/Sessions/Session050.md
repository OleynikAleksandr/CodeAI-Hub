# Session 050 — Codex: фиксация guardrails + draft Startup Lock дизайн

**Date:** 2026-01-05 08:30 (CET)
**Branch:** main
**Version:** 1.1.381

---

# 1. Work Done in This Session

## Work summary
- Закоммичены изменения из рабочей ветки по защите от misrouting Codex thread:
  - `thread_id` фиксируется только на первом `thread.started` (SDK patch + Hub message processor).
  - временный `sessionId` до bind стал `codex_<uuid>`.
- Добавлена defense-in-depth изоляция Codex state:
  - дефолтный `CODEX_HOME` для CodeAI Hub = `~/.codeai-hub/providers/codex/home`.
  - миграция `auth.json` (+ `config.toml`) из `~/.codex` при первом запуске.
- Подготовлен и закоммичен дизайн‑док Phase 3: **Startup Lock** для сериализации первого `thread.runStreamed` до получения `thread.started`.
- Обновлён `doc/TODO/todo-plan.md`: добавлен Phase 3 (Startup Lock stream).

## Verification
- `./scripts/check-architecture.sh`
- `npx ultracite check`
- `npx ts-prune`
- `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
- `npm run check:links`
- `npm run build --workspace @codeai-hub/codex-module`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `06a72fa fix(codex): lock thread id on first turn`
- `e4075a1 fix(codex): default CODEX_HOME to hub directory`
- `39783cc docs(codex): add lock-on-first-turn architecture`
- `cb85bcf docs(todo): add codex startup lock phase`
- `b25e33c docs(codex): add startup lock thread binding architecture`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/Codex_ThreadId_StartupLock_Architecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Project_Docs/Codex_ThreadId_LockOnFirstTurn_Architecture.md`
4. `doc/Project_Docs/Stacks/Codex_SDK_Module.md`
5. `doc/Sessions/Session050.md` (THIS REPORT)

## Plans for next session
- Согласовать (апрув) дизайн Startup Lock из `doc/Project_Docs/Codex_ThreadId_StartupLock_Architecture.md`.
- После апрува: обновить `doc/TODO/todo-plan.md` (пункты 1–2 Stream: статус + hash `b25e33c`).
- Реализовать Phase 3 / Stream 3–4: `codex-startup-lock.ts` + интеграция в `message-processor.ts` и `codex-sdk-manager.ts`.
- Прогнать гейты и таргетную сборку `@codeai-hub/codex-module`, затем закрыть Stream коммитами по TODO-плану.
