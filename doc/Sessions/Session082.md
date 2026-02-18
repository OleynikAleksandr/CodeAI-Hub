# Session 082 — Reviewer Unlock + Token Usage Fix (v1.1.632–633)

**Date:** 2026-02-18 09:30–10:15 (CET)
**Branch:** main
**Version:** 1.1.633

---

# 1. Work Done in This Session

## Work summary

### Блок 1 — BUG-2026-02-18-04: Reviewer input не разблокируется после turn (v1.1.632)

**Симптом:** После того как Reviewer Agent задавал свои вопросы (bootstrap turn), поле ввода
оставалось заблокированным навсегда. Пользователь не мог ответить без ручного форс-анлока.

**Root cause (Core):**
- В `handleFlowNodeContinuityProviderEvent`, если `turn_completed` event не содержал
  token usage (`extractTokenUsage(event) = null`), функция делала ранний `return` без
  записи `contextDecision`.
- `handleTurnCompletedEvent` → `contextDecision = null` → ранний return → ни
  `emitTurnStateEvent("idle")`, ни `emitResumeInPlaceNoRolloverUnlock` не вызывались.
- Workspace runtime: `turnState` оставался "running", `continuityLockActive = true` навсегда.

**Root cause (UI):**
- В `applyTurnStateStreamDataToSnapshot`, `turn_state:idle` event игнорировался при
  `connectionState === "blocked"` (защита от rollover). Дополнительный барьер.

**Fix:**
- Core (`session-request-handler.ts`): при `!usage` → вызов
  `registerPostTurnNoRolloverDecision(sessionId)` вместо пустого return.
  Fallback: нет данных = rollover невозможен = разблокировка.
- UI (`session-stream-snapshot-sync.ts`): смягчение условия — `turn_state:idle`
  разрешён разблокировать "blocked" если `continuityLock.active !== true`.

**Verified:** v1.1.632 — разблокировка подтверждена пользователем.

---

### Блок 2 — Tokens: 0 (100%) после turn Reviewer (v1.1.633)

**Симптом:** После fix разблокировки токены отображаются как `Tokens: 0 (100%)`. Usage
limits (session 1%, weekly 13%) приходили корректно.

**Root cause:**
Claude использует отдельный subprocess для чтения token usage:
```
claude -p --verbose --output-format stream-json --model haiku --resume <id> /context
```
При активном **five-hour rate limit**, этот probe получает `rate_limit_event {status: "rejected"}`
и завершается без snapshot. Из логов:
```
[claude] Claude /context token read failed: Claude /context did not produce token usage snapshot
stdout: {"type":"rate_limit_event","rate_limit_info":{"status":"rejected","rateLimitType":"five_hour",...}}
```
`refreshTokenUsageFromContext() = null` → `turn_completed` без tokenUsage → Tokens: 0.

Usage limits работали через отдельный HTTP API путь (не rate limited аналогично).

**Fix:**
Добавлен `extractTokenUsageFromResultMessage()` в `message-processor.ts`.
SDK `result` message уже содержит `modelUsage` с:
- `contextWindow` → limit (например 200000)
- `inputTokens + outputTokens + cacheReadInputTokens + cacheCreationInputTokens` → used

```json
"modelUsage": {
  "claude-sonnet-4-6": {
    "inputTokens": 6, "outputTokens": 3950,
    "cacheReadInputTokens": 101968, "cacheCreationInputTokens": 16679,
    "contextWindow": 200000
  }
}
```
→ `used = 122603`, `limit = 200000`

При `/context` probe = null → fallback на `extractTokenUsageFromResultMessage(message)`.
`/context` probe при успехе (без rate limit) по-прежнему имеет приоритет — данные точнее.

**Замечание о замочке:** Ручной форс-анлок (замочек) не виноват в баге разблокировки —
он UI-only. Возможно пользователь замечал его именно потому что input был постоянно заблокирован.

## Technical notes

| Область         | Файл | Изменение |
|----------------|------|-----------|
| Core           | `packages/core/src/remote-bridge/handlers/session-request-handler.ts:2608` | `!usage` → fallback `registerPostTurnNoRolloverDecision` |
| UI stream      | `src/client/ui/src/app-host/session-stream-snapshot-sync.ts:60` | guard smeared: blocked→idle разрешён если `continuityLock.active !== true` |
| Claude Module  | `packages/Claude_Module/src/messaging/message-processor.ts` | `extractTokenUsageFromResultMessage()` + fallback в `handleResultLifecycle` |

## Git commits
- `d449725d fix(core/ui): unlock reviewer input after turn completion`
- `b4b3d971 docs(bugs): register BUG-2026-02-18-04 reviewer unlock fix + Phase 215`
- `1b84d1ed chore(build): rebuild webview after reviewer unlock fix`
- `3bf78132 feat(release): v1.1.632 - fix reviewer unlock after turn completion`
- `4d838c84 docs(sessions): add Session081 report`
- `e8681864 fix(claude): fallback token usage from result message when /context probe fails`
- `3fb06dec feat(release): v1.1.633 - fix token usage fallback from result message`
- `c7a78f77 docs(sessions): add Session082 report`

## Artefacts
- VSIX: `codeai-hub-1.1.632.vsix`, `codeai-hub-1.1.633.vsix`
- Tarballs: `~/.codeai-hub/releases/*-1.1.633.tar.bz2`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
2. `doc/BugRegistry.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session082.md` (THIS REPORT)

## Plans for next session

### Верификация
- Проверить что токены отображаются корректно в Reviewer после turn (при rate limit и без).
- Убедиться что BUG-2026-02-18-01 (FIXED в v1.1.629) обновлён в BugRegistry → FIXED.

### Open bugs для работы
- **BUG-2026-02-18-03** (OPEN, cosmetic): macOS "Keychain Not Found" диалог — 3 варианта fix:
  1. Писать credentials в `provider-home/.claude/.credentials.json` после auth probe
  2. Симлинк `.credentials.json` на нативный `~/.claude/.credentials.json`
  3. Найти env var для подавления Keychain write в Claude CLI
- **BUG-2026-02-17-04/05/06** (OPEN): Claude 401 recovery flow — input locked, нет recovery UI.
  Следующая функциональная задача после закрытия kosmeticheskikh багов.

### Phase 215 cleanup
- Обновить todo-plan.md: отметить Phase 215 Stream 2 DONE после верификации.
- Добавить в BugRegistry запись о token usage fallback fix (BUG-2026-02-18-05 или закрыть неявно).
