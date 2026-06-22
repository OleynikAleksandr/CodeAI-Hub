# GLM Native Usage Quota (5h / Weekly) — Planning (RU)

**Status:** Planning intake (2026-06-18). Scope: только провайдер `glmNative`.
**Owner:** orchestrator
**Branch:** main · **Base head:** f03168e3d
**Verify-first:** monitor endpoint и response shape подтверждены живым curl на реальном аккаунте пользователя 2026-06-18 (tier `pro`).

## 1. Постановка задачи

В верхней панели сессии (`session-id-bar`) для провайдера `glmNative` индикаторы
**5h** и **Weekly** всегда `unavailable`. Под них уже заготовлено место в UI.
Задача — наполнить их реальными значениями (`percentUsed` + время reset) для
GLM-сессий, чтобы они появились в следующем релизе.

НЕ трогаем: контекстное окно GLM (работает через отдельный `token_usage` канал),
сам GLM-провайдер (сессии/стриминг), Core, UI. Вне scope: Kimi (`kimiCode`,
отдельный backend `api.kimi.com`, отдельный цикл позже) и тестовый `glmOpenCode`.

## 2. Источник данных (подтверждено вживую)

```
GET {origin}/api/monitor/usage/quota/limit
Authorization: <api_key>        # БЕЗ префикса Bearer (с Bearer → 401)
```
- `origin` выводится из `baseUrl` провайдера (`https://api.z.ai/...` → `https://api.z.ai`);
  это автоматически поддержит CN-хост `open.bigmodel.cn`, если пользователь сменит baseUrl.
- Это отдельный HTTP GET, НЕ часть GLM SSE-ответа модели (в SSE только context tokens).

Реальный response (curl, аккаунт пользователя, 2026-06-18):
```json
{ "code": 200, "success": true, "data": { "level": "pro", "limits": [
  { "type": "TIME_LIMIT",   "unit": 5, "number": 1, "percentage": 1,  "nextResetTime": 1784350574995 },
  { "type": "TOKENS_LIMIT", "unit": 3, "number": 5, "percentage": 2,  "nextResetTime": 1781816712109 },
  { "type": "TOKENS_LIMIT", "unit": 6, "number": 1, "percentage": 15, "nextResetTime": 1782363374989 }
] } }
```

Классификация **по признакам, не по позиции** (порядок бакетов нестабилен):
- **5h** = `type=TOKENS_LIMIT` && `unit=3`.
- **Weekly** = `type=TOKENS_LIMIT` && `unit=6`.
- Отбросить = `type=TIME_LIMIT` (месячный потолок MCP-инструментов).
- Фоллбэк, если коды `unit` поедут: среди `TOKENS_LIMIT` ближайший `nextResetTime` → 5h, дальний → Weekly.
- Доступны только `percentage` (0..100) + `nextResetTime` (Unix ms).

## 3. Минимальный путь (Ponytail)

Core уже дёргает `adapter.refreshUsageLimits(...)` у любого адаптера, где этот метод
просто существует (duck-typing, `session-request-handler-usage-limits-refresh.ts:110`),
и сам нормализует/доставляет payload в UI. GLM-адаптер уже резолвит `apiKey`+`baseUrl`
через `buildProfile()` и уже эмитит `token_usage` через `this.emit`. Значит достаточно
добавить GLM-адаптеру метод `refreshUsageLimits` — Core подхватит его автоматически,
как Gemini/Kimi. Core и UI не меняются.

### Файлы (всё в `packages/GLM_Module/src/provider/`)
1. **`glm-usage-limits-reader.ts`** (новый): `readGlmUsageLimits({ apiKey, baseUrl })` →
   `fetch` monitor endpoint (голый Authorization, origin из baseUrl) → классификация
   5h/Weekly → `{ usageLimits, usageLimitLabels, providerScopeKey } | null`. `null` при
   отсутствии ключа / не-200 / сетевой ошибке. Вынесен отдельно (адаптер уже 483/500 строк).
2. **`glm-native-provider-adapter.ts`**: добавить `async refreshUsageLimits(params)` (~15 строк):
   `profile = this.buildProfile()`, вызвать reader, при результате — `params.broadcast(payload)`.
3. **`glm-usage-limits-reader.test.ts`** (новый): классификация (5h/Weekly/отброс TIME_LIMIT),
   голый auth, `null` на ошибке.

### Payload (формат, который Core нормализует и UI рендерит)
```
{ providerScopeKey: "glmNative:global",
  usageLimits: { currentSession: {percentUsed, resetsAt}, currentWeekAllModels: {percentUsed, resetsAt} },
  data: { kind: "usage_limits",
          usageLimits: { ... },
          usageLimitLabels: { currentSession: "5h", currentWeekAllModels: "Weekly" },
          providerScopeKey: "glmNative:global", source: "glm_monitor", collectedAt } }
```
`source` — свободная строка в payload (не Core enum), поэтому Core types не трогаем.

## 4. Verification
- Таргетные сборки: `npm run build --workspace @codeai-hub/glm-module`, `@codeai-hub/core`, `build:webview`, `typecheck:webview`; гейты.
- Поведенческая проверка: 5h/Weekly показываются в GLM-сессии; в Kimi-сессии не появляются (раздельность по `providerScopeKey`).

## 5. Risks
1. Endpoint недокументирован: коды `unit` могут измениться → классификация `(type, unit)` + фоллбэк по `nextResetTime`, изолированы в reader.
2. Матчинг payload по `providerScopeKey` — убедиться, что данные GLM видны только в GLM-сессии (в UI kimi/glm в одной label-группе). Если протекает — узкая UI-правка отдельной задачей.
3. Cold-open: без in-adapter cache до первого refresh индикатор показывает loading; приемлемо для MVP.

## 6. Ponytail обоснование
- YAGNI: только `refreshUsageLimits` для glmNative, без Core facade/bridge/types и без задела под kimi/opencode.
- Reuse: `buildProfile()` (credential уже есть), `this.emit`-шов, Core duck-typing refresh, существующий UI-рендер.
- Минимальный diff: 3 файла в одном пакете, Core/UI = 0 изменений.
