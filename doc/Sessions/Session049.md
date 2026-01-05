# Session 049 — Codex: lock-on-first-turn + план startup lock

**Date:** 2026-01-04 17:59 (CET)
**Branch:** main
**Version:** 1.1.381

---

# 1. Work Done in This Session

## Work summary
- Зафиксировано требование: после старта сессии Codex сообщения должны **всегда** идти в «свой» thread.
- Реализована защита **lock-on-first-turn**: `thread_id` фиксируется только на первом `thread.started`, дальнейшие попытки смены ID игнорируются (SDK patch + message processor).
- Устранён риск коллизий временных sessionId до первого bind: temp id теперь `codex_<uuid>`.
- Добавлена изоляция Codex state от внешних процессов: дефолтный `CODEX_HOME` для CodeAI Hub = `~/.codeai-hub/providers/codex/home` с миграцией `auth.json` (+ `config.toml`) из `~/.codex` (defense-in-depth; не решает внутреннюю конкуренцию стартовых turn).
- Обновлены документы и план: добавлен дизайн-док lock-on-first-turn, обновлён стек-док Codex, добавлен новый Phase/Stream в TODO под startup lock.

## Files changed
- `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`
- `packages/Codex_Module/src/messaging/message-processor.ts`
- `packages/Codex_Module/src/session/session-lifecycle.ts`
- `packages/Codex_Module/src/auth/sdk-auth-manager.ts`
- `doc/Project_Docs/Codex_ThreadId_LockOnFirstTurn_Architecture.md`
- `doc/Project_Docs/Stacks/Codex_SDK_Module.md`
- `doc/TODO/todo-plan.md`

## Verification
- `npm run build --workspace @codeai-hub/codex-module`
- `npx ultracite check`
- `./scripts/check-architecture.sh`
- `npx ts-prune`
- `npm run check:links`

## Git commits
(нет коммитов в этой сессии; изменения остаются в рабочем дереве)

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Sessions/Session048.md` — расследование misrouting и точки перепривязки `sessionId/thread_id`.
2. `doc/Sessions/Session049.md` (THIS REPORT) — текущее состояние и выбор стратегии.
3. `doc/Project_Docs/Codex_ThreadId_LockOnFirstTurn_Architecture.md` — инварианты lock-on-first-turn (уже в коде).
4. `doc/TODO/todo-plan.md` — Phase 3 (startup lock), порядок микрозадач и сообщения коммитов.
5. `doc/Project_Docs/Stacks/Codex_SDK_Module.md` — контекст `codex exec`, `resume`, `CODEX_HOME`.

## Plans for next session
Выполнять `doc/TODO/todo-plan.md` → **Phase 3 — Codex thread_id Startup Lock** → Stream: **Startup lock на первый turn (Codex)**.

1) **Сделать дизайн (обязательно до кода):**
- Выполнить пункт 1 Stream: создать `doc/Project_Docs/Codex_ThreadId_StartupLock_Architecture.md`.
- Зафиксировать контракт:
  - глобальный mutex только на окно «первый `thread.runStreamed` до получения первого `thread.started`»;
  - lock освобождается сразу после bind `thread_id` (не ждём `turn.completed`);
  - таймаут/ошибка: гарантированный release (без дедлоков), политика retry.

2) **Реализация startup lock (после утверждения дизайна):**
- Выполнить пункт 3 Stream: реализовать global startup lock (≤3 файлов по плану).

3) **Гейты и коммиты:**
- Выполнить пункт 5 Stream: прогнать гейты и таргетную сборку; затем сделать коммиты ровно как в TODO-плане.

## Почему выбран startup lock (а не только CODEX_HOME)
- Изоляция `CODEX_HOME` снижает влияние **внешних** процессов (interactive codex и т.п.), но не устраняет конкуренцию между несколькими параллельными стартами **внутри** CodeAI Hub.
- Требование «всегда писать в свой thread» при параллельных стартах можно обеспечить либо `CODEX_HOME per-session`, либо сериализацией «первого turn до bind thread_id».
- Выбран **startup lock**, потому что он:
  - даёт детерминизм на критическом участке получения `thread_id`;
  - сохраняет параллельность после bind (lock держится кратко);
  - требует минимальных изменений (без Core/UI) и проще в сопровождении, чем `CODEX_HOME per-session`.
