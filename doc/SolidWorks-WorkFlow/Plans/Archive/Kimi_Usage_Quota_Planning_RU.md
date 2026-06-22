# Kimi Usage Quota (5h / Weekly) — Planning (RU)

**Status:** Planning intake (2026-06-18). Scope: провайдер `kimiCode`.
**Owner:** orchestrator · **Branch:** main
**Verify-first:** endpoint и response shape подтверждены живым curl на реальном аккаунте пользователя 2026-06-18 (LEVEL_BASIC, FEATURE_CODING). Симптомы подтверждены скриншотами двух Kimi-сессий.

## 1. Постановка задачи

В верхней панели Kimi-сессии индикаторы **5h** и **Weekly** показывают «unavailable».
Аналогично сделанному для GLM (релиз 1.2.546), нужно наполнить их реальными значениями.
В отличие от GLM, у Kimi инфраструктура уже есть (`KimiUsageLimitsReader` + `refreshUsageLimits`),
поэтому это не постройка с нуля, а исправление двух дефектов.

Вне scope: GLM (уже сделан), `glmOpenCode` (тестовый).

## 2. Источник данных (подтверждено вживую)

```
GET https://api.kimi.com/coding/v1/usages
Authorization: Bearer <api_key>     # С Bearer (в отличие от z.ai)
```
Реальный ответ (curl, аккаунт пользователя, 2026-06-18):
```json
{ "usage": { "limit": "100", "used": "7", "remaining": "93", "resetTime": "2026-06-20T11:50:..." },
  "limits": [ { "window": { "duration": 300, "timeUnit": "TIME_UNIT_MINUTE" },
               "detail": { "limit": "100", "remaining": "100", "resetTime": "2026-06-18T22:50:..." } } ],
  "totalQuota": { "limit": "100", "remaining": "99" }, "parallel": { "limit": "10" } }
```
Маппинг:
- **5h** = `limits[0].detail` (`window.duration: 300` мин = 5 ч). Отдаёт `remaining`/`limit`, НЕ `used`.
- **Weekly** = top-level `usage` (`used`/`limit`). Отдаёт `used` напрямую.

## 3. Диагноз — две независимые причины

### Причина A: 5h reader bug (Kimi-модуль)
`packages/Kimi_Module/src/provider/kimi-usage-limits-reader.ts`: `readBucket`/`buildBucket` читают только
поле `used`; если `used === null` → bucket = `null`. Но 5h-detail отдаёт `remaining` (нет `used`), поэтому
`currentSession` всегда `null`. Weekly (`usage.used`) парсится корректно. → подтверждено сессией cd6
(Weekly 7% есть, 5h пусто).

### Причина B: refresh не доставляется надёжно (Core)
- `refreshUsageLimits` Core дёргает только на `binding_ready` (`session-request-handler.ts:331`).
  На свежей сессии binding_ready может случиться до готовности Wire, а warmup-dedup
  (`session-request-handler-usage-limits-warmup.ts`) помечает `warmed` уже на первом «unavailable»-broadcast
  и глушит повторные binding_ready.
- `turn_completed`-trigger полностью готов (тип `UsageTelemetryLifecycleTrigger`, тест
  `session-request-handler.usage-limits.test.ts:408`, `shouldDispatchUsageLimitsRefresh` всегда `true` для
  `turn_completed`, warmup его НЕ глушит), но в production **не подключён** — нет call-site после turn.
  Hook существует: `onTurnCompleted` (`session-request-handler-runtime-callbacks.ts:163`), инжектится в
  `session-request-handler.ts:145`. → подтверждено сессией e49 (оба «unavailable» даже после завершённого turn).

## 4. Фиксы (Ponytail-минимум)

### Fix A — 5h remaining (Kimi-модуль)
`kimi-usage-limits-reader.ts`: `UsageBucket` += `remaining`; `readBucket` мапит `remaining`; `buildBucket` —
если `used` отсутствует, но есть `limit` и `remaining`, вычислить `used = limit − remaining`. Weekly не меняется.
Обновить `kimi-usage-limits-reader.test.ts` реальным shape (detail с `remaining`, отброс `parallel`/`totalQuota`).

### Fix B — refresh on turn completion (Core)
`session-request-handler.ts:145`: обернуть `onTurnCompleted`, чтобы после внешнего callback вызвать
`this.handleRefreshUsageLimits({ sessionId, lifecycleTrigger: "turn_completed", providerId: "", providerSessionId: null })`
(provider/session резолвятся внутри `handleRefreshUsageLimitsFlow` из `sessionManager`/`providerSessions`).
turn_completed не глушится warmup, Wire к этому моменту готов → reader отдаёт данные. Это чинит ВСЕ провайдеры,
но критично для Kimi. Покрыть/обновить `session-request-handler.usage-limits.test.ts`.

## 5. Файлы
- Fix A: `packages/Kimi_Module/src/provider/kimi-usage-limits-reader.ts`, `...kimi-usage-limits-reader.test.ts` (2).
- Fix B: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `...session-request-handler.usage-limits.test.ts` (2).

## 6. Phases breakdown (для todo-plan)
- Phase 0 — Intake (этот документ).
- Phase 1 — Fix A (5h remaining reader + test).
- Phase 2 — Fix B (turn_completed refresh + test).
- Phase 3 — Verification (builds `kimi-module`/`core`/webview/typecheck + гейты + поведенческая проверка).
- Phase 4 — Release (README/CHANGELOG → build, после явного confirmation gate).
- Phase 5 — User Visual Acceptance Testing.
- Phase 6 — Scope Closeout.

## 7. Risks
1. Если `session-request-handler.ts` близок к 500-строчному лимиту — обёртку вынести в маленький private helper.
2. turn_completed refresh для всех провайдеров: убедиться, что не создаёт лишнего трафика (один вызов на turn — приемлемо; warmup/idle логика уже фильтрует прочие триггеры).
3. 5h `remaining`-вычисление не должно ломать Weekly (`usage` имеет `used` — путь сохраняется).
4. resetTime формат Kimi (ISO с дробными секундами) уже нормализуется `normalizeResetTime`.
