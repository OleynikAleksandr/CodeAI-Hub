# Session 082 — Token Usage Fallback Fix (v1.1.633)

**Date:** 2026-02-18 10:15 (CET)
**Branch:** main
**Version:** 1.1.633

---

# 1. Work Done in This Session

## Work summary

### Фикс BUG: Tokens: 0 (100%) после turn Reviewer

**Проблема:** После исправления разблокировки Reviewer (v1.1.632) обнаружено что токены показывают 0 (100%) — начальное дефолтное значение не обновляется.

**Root cause:**
Claude CLI использует отдельный `/context` probe (lightweight request с `--resume <sessionId> /context`) для чтения token usage после каждого turn. Этот probe запускает Claude CLI subprocess.

Из логов:
```
five_hour rate limit: rejected
Claude /context did not produce token usage snapshot
```

При активном 5-hourly rate limit, `claude --resume <id> /context` получает `rate_limit_event {status: "rejected"}` и завершается без token snapshot. Результат: `refreshTokenUsageFromContext()` = null → `turn_completed` event без tokenUsage → Tokens: 0.

При этом usage limits (session %, weekly %) работали через отдельный HTTP API путь.

**Fix:** Добавлен fallback `extractTokenUsageFromResultMessage()` в `message-processor.ts`. SDK `result` message уже содержит `modelUsage` с `contextWindow` (limit) и суммарными токенами `inputTokens + outputTokens + cacheCreationInputTokens + cacheReadInputTokens` (used). Используется как fallback когда `/context` probe недоступен.

**Данные в result message (пример):**
```json
"modelUsage": {
  "claude-sonnet-4-6": {
    "inputTokens": 6,
    "outputTokens": 3950,
    "cacheReadInputTokens": 101968,
    "cacheCreationInputTokens": 16679,
    "contextWindow": 200000
  }
}
```

→ `used = 122603`, `limit = 200000`

## Git commits
- `e8681864 fix(claude): fallback token usage from result message when /context probe fails`
- `3fb06dec feat(release): v1.1.633 - fix token usage fallback from result message`

## Artefacts
- VSIX: `codeai-hub-1.1.633.vsix`
- Tarballs: `~/.codeai-hub/releases/*-1.1.633.tar.bz2`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/BugRegistry.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session082.md` (THIS REPORT)

## Plans for next session
- Верифицировать: токены теперь показываются корректно после каждого turn Reviewer.
- BUG-2026-02-18-03 (cosmetic): macOS "Keychain Not Found" диалог.
- BUG-2026-02-17-04/05/06 (OPEN): Claude 401 recovery.
- Обновить BugRegistry: закрыть BUG-2026-02-18-01 (FIXED в v1.1.629).
