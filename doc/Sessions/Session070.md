# Session 70 — Codex Token Usage via `token_count`: Implementation + Fix

**Date:** 2026-02-02 (local)
**Branch:** main
**Version:** 1.1.494

---

# 1. Work Done in This Session

## Work summary
- **Реализован Phase 86** — Codex token usage через `token_count` события в rollout JSONL:
  - Создан `codex-token-usage-resolver.ts` — resolver для поиска rollout JSONL по `providerSessionId` (pattern-based + fallback scan)
  - Создан `codex-token-usage-snapshot.ts` — extractor snapshot из `token_count` событий (`used=last_token_usage.total_tokens`, `limit=model_context_window`)
  - Создан `codex-token-usage-reader.ts` — reader с throttling (1500ms) и in-flight lock, last-known snapshot cache
  - Интегрировано в `message-processor.ts` — эмит `stream_event` с `tokenUsage` после `turn.completed`
- **Исправлена критическая ошибка** в парсинге JSONL:
  - Ошибка: искали `type` и `info` на верхнем уровне события
  - Правильная структура: `event.type === "event_msg"`, `event.payload.type === "token_count"`, `event.payload.info`
- **Собраны релизы** 1.1.494 и 1.1.495 с фиксом

## Git commits
- `6685a33a feat(codex-module): resolve codex rollout file by session id`
- `ad22fc1d docs(todo): mark Phase 86 filesystem and parser streams as done`
- `b42b72bc feat(codex-module): emit token usage stream events`
- `7bf3a4f4 docs(todo): mark Phase 86 provider → core event wiring as done`
- `b807da24 chore(release): bump version to 1.1.494`
- `3e2bf624 fix(codex-module): correct token_count event parsing from rollout JSONL`
- `2953fb3e chore(release): bump version to 1.1.495`

## Files created/modified
```
packages/Codex_Module/src/token-usage/
├── codex-token-usage-resolver.ts      # NEW: Resolver rollout JSONL
├── codex-token-usage-snapshot.ts      # NEW: Extractor token_count snapshot
├── codex-token-usage-reader.ts        # NEW: Reader с throttling
└── index.ts                           # NEW: Public exports

packages/Codex_Module/src/messaging/message-processor.ts  # MOD: +token usage emit
```

---

# 2. Technical Details

## Architecture decisions
- **Source-of-truth:** `token_count` события в rollout JSONL (не `/status` CLI)
- **Throttling:** минимум 1500ms между запросами на сессию
- **In-flight lock:** параллельные запросы для одной сессии блокируются
- **Error handling:** ошибки не сбрасывают UI в 0, используем last-known snapshot
- **Internal-only:** чтение rollout не создаёт записей в unified history

## Key implementation notes
1. **Rollout file path pattern:** `CODEX_HOME/sessions/YYYY/MM/DD/rollout-*-<providerSessionId>.jsonl`
2. **Token count event structure:**
   ```json
   {
     "type": "event_msg",
     "payload": {
       "type": "token_count",
       "info": {
         "last_token_usage": { "total_tokens": 14382 },
         "model_context_window": 258400
       }
     }
   }
   ```
3. **UI percentage formula:** `round((limit - used) / limit * 100)`

## Bug fix details
**Problem:** UI показывал `0 / 200,000 (100%)` вместо реальных значений.

**Root cause:** Неверная навигация по структуре JSONL:
```typescript
// BEFORE (wrong):
if (event.type !== "token_count") return null;  // event.type === "event_msg"
const info = event.info;  // undefined

// AFTER (correct):
if (event.type !== "event_msg") return null;
const payload = event.payload;
if (payload.type !== "token_count") return null;
const info = payload.info;  // correct
```

---

# 3. Verification Status

## Automated gates (all passed)
- ✅ `./scripts/check-architecture.sh` — file sizes, facades, duplication
- ✅ `npx ultracite check` — linting, formatting
- ✅ `npx ts-prune` — dead code check
- ✅ `npx jscpd` — duplication < 3%
- ✅ `npm run build --workspace=@codeai-hub/codex-module` — TypeScript compilation
- ✅ `./scripts/build-all.sh` — full release build
- ✅ `./scripts/build-release.sh` — VSIX package

## Manual verification (pending user testing)
- [ ] `used/limit` в UI совпадает со значениями в скобках `/status`
- [ ] Restore после Core restart работает корректно
- [ ] Multi-workspace сценарий (workspace A → restart из B)

---

# 4. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/TokenUsage/CodexTokenUsage_Architecture.md`
3. `doc/Sessions/Session070.md` (THIS REPORT)

## Plans for next session
- Ручное тестирование token usage в UI (verification checklist выше)
- Если найдены баги — фикс и новый релиз
- Если всё работает — создание Session071.md с финальной верификацией
- Stream: session report (Session070) — THIS FILE

## Open questions
- Нужна ли дополнительная документация по интеграции token usage в UI?
- Требуется ли расширенное логирование для диагностики?

---

# 5. Release Artifacts

| Component | Version | Location |
|-----------|---------|----------|
| VSIX | 1.1.495 | `codeai-hub-1.1.495.vsix` |
| Codex Module | 1.1.495 | `doc/tmp/releases/codex-module-1.1.495.tar.bz2` |
| Core | 1.1.495 | `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.1.495.tar.bz2` |
| Project Manager | 1.1.495 | `doc/tmp/releases/project-manager-1.1.495.tar.bz2` |
| VSCode Webview | 1.1.495 | `doc/tmp/releases/vscode-webview-1.1.495.tar.bz2` |
| CEF Launcher | 1.1.495 | `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.1.495.tar.bz2` |
