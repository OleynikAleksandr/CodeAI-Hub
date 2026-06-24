# Session ID + Usage Limits Bar — Module Contract

**Surface:** панель `providerSessionId` + usage limits в session header  
**Primary code:** `src/client/ui/src/session/session-id-bar.tsx`

## Роль модуля

Панель одновременно решает две задачи:
- показывает короткий `providerSessionId` для активной runtime session;
- показывает live usage limits для активного provider scope.

Это не чисто read-only projection. Панель сама участвует в refresh-механизме: при переходе active session в валидное `ready`-состояние она инициирует `refreshUsageLimits(...)`.

## Входной контракт

`SessionIdBar` принимает:
- `binding`
- `status`
- `sessionId`
- `onRefreshUsageLimits({ sessionId, providerId, providerSessionId })`

Критично, что refresh больше не строится вокруг synthetic provider bucket. Панель всегда отправляет запрос в контексте реальной runtime session:
- `sessionId` = реальный runtime session id;
- `providerId` = текущий provider активной модели;
- `providerSessionId` = bound continuity id провайдера.

## Источник правды

Панель не хранит локальное состояние.

Её truth sources:
- `binding.providerSessionId` и `binding.status` приходят из live snapshot/binding path;
- `status.usageLimits` и `status.usageLimitLabels` приходят только из live snapshot;
- provider scope для usage limits нормализован в provider-global contract (`claude:global`, `codex:global`, `kimi:global`);
- persistent fallback cache для usage limits отсутствует.

Следствие: если snapshot не получил реальный runtime binding или usage-limits stream event, панель ничего не "вспомнит" из старого кэша и не нарисует лимиты искусственно.

## Алгоритм рендера

### Session ID

Панель рисует идентификатор по `binding`:
- если `binding.providerSessionId` есть, показывается короткий префикс `ID: XXXXXXXX-...`;
- если `binding.status === "pending"`, показывается `ID: pending...`;
- иначе показывается `ID: unavailable`.

### Usage limits rows

Панель строит до трёх строк:
- `currentSession`
- `currentWeekAllModels`
- `currentWeekSonnetOnly`

Особенности:
- для `claude/codex` fallback labels = `Session`, `Weekly`, `Model Weekly`;
- для `kimi` labels = `5h`, `Weekly`, `Parallel`, потому что Kimi endpoint возвращает rolling 300-minute window, weekly quota и concurrency limit;
- третья строка рендерится только если для неё реально известен `percentUsed`;
- reset label строится из `resetsAt` и подставляется в подпись строки.

Один usage-limits stream event может обновить не только текущий snapshot, а все snapshots той же provider family, потому что contract теперь provider-global.

## Алгоритм refresh

Панель использует `useEffect()` и инициирует `onRefreshUsageLimits(...)` только если одновременно выполнены все условия:
- `binding.status === "ready"`;
- известен `rawProviderId`;
- передан `onRefreshUsageLimits`.

Refresh effect перевычисляется при изменении:
- `binding.status`
- `binding.providerSessionId`
- `rawProviderId`
- `sessionId`

Это важный инвариант: панель не имеет права отправлять refresh для placeholder session, пока у неё нет подтверждённой runtime identity.

### Chosen-provider start path

Если новый trunk step был запущен с confirmation card на провайдере, отличном от previous-step default:
- bootstrap snapshot всё равно должен нести provider identity выбранного шага, чтобы usage surface не осталась привязанной к старой provider family;
- пока binding ещё `pending`, панель может показывать только pending/unavailable state и не должна отправлять refresh;
- как только PM принимает materialized runtime session и binding становится `ready`, refresh обязан уйти с `sessionId` + `providerId` + `providerSessionId` именно нового выбранного provider path;
- после этого `status.providerScopeKey` / fallback labels и live limits принадлежат новой provider family (`claude`, `codex` или `kimi`), а не предыдущему trunk step.

## Финальный dialog/auto-select contract после 1.1.971

Проблемный path был связан не с рендером самих полос, а с тем, какая session считалась активной в момент первого auto-open.

### Что происходит при cold open dialog step

1. Project Manager поднимает bootstrap snapshot для шага/dialog continuity.
2. Если реальная runtime session ещё не материализована, bootstrap snapshot остаётся в `binding.status = "pending"`.
3. `SessionIdBar` в этом состоянии может показать только `ID: pending...` и не должен отправлять `refreshUsageLimits(...)`.
4. Позже Core присылает реальный `session:created` для materialized runtime session.
5. Project Manager обязан заменить placeholder snapshot на реальную runtime session.
6. Только после этого панель получает `binding.status = "ready"` и запускает refresh.

### Как PM понимает, что placeholder нужно заменить

Финальный рабочий adoption path в `use-project-manager-dialog-session-controller.ts` использует только реальные continuity/runtime признаки:
- тот же `workspacePath`;
- тот же `stage`;
- тот же `runSlug`;
- тот же provider;
- и один из runtime identity matches:
  - `isSameSession`;
  - `isRolloverChild`;
  - `isRestoreMaterialization` по continuity через одинаковый `providerSessionId`, если текущий snapshot ещё не `ready`.

После adoption:
- активная session в PM переключается на реальный runtime session;
- placeholder snapshot удаляется;
- все накопленные messages/todos переносятся на materialized session;
- `SessionIdBar` получает новый `sessionId` + `binding.status = "ready"` и триггерит session-scoped refresh.

Для provider override start path этот же adoption contract критичен ещё и для provider family:
- placeholder snapshot уже должен быть seeded выбранным provider;
- materialized runtime session должна совпасть по тому же provider path;
- только тогда первый ready-refresh покажет лимиты выбранного провайдера без промежуточного показа лимитов предыдущего шага.

## Что именно было исправлено

### Шаг 1: готовность панели ограничили `ready`

Раньше проблема частично маскировалась тем, что refresh пытался запускаться слишком рано. Поэтому панель была зафиксирована в simple contract:
- никакого refresh до `binding.status === "ready"`;
- никакого synthetic session bucket;
- только реальный runtime `sessionId`.

### Шаг 2: убран ложный blocker в adoption path

Оставшийся баг оказался проще: PM bootstrap session несла `sessionKind: "collector"`, а Core runtime `session:created` этот флаг не сериализует. Из-за этого placeholder snapshot не принимал реальную runtime session, потому что adoption был привязан к PM-only полю, которого у runtime события просто нет.

Финальный fix в `1.1.971` был минимальным:
- из dialog restore adoption убран blocking match по `sessionKind`;
- вся остальная логика сохранена;
- добавлен regression guard, что adoption не зависит от `sessionKind`.

Это и есть ключевой результат: панель лимитов не менялась сложной новой логикой, а вернулась к простому инварианту:
- сначала PM обязан принять реальную runtime session;
- потом `SessionIdBar` делает один корректный refresh из ready-session контекста.

## Почему раньше лимиты появлялись после ручного переключения шага

Исторический симптом объясняется этой же схемой:
- при первом auto-select панель оставалась привязанной к placeholder `pending` snapshot и refresh не происходил;
- при последующих переключениях UI уже попадал в состояние, где runtime session была материализована и принята PM;
- после возврата на шаг панель наконец видела `ready` binding и лимиты появлялись.

То есть корень был не в "медленном рендере" полосы, а в неверной session identity на первом auto-open path.

## Внешние зависимости

Binding side:
- `session:binding`
- `session:created`
- `applyBindingToSessionSnapshot(...)`

Usage limits side:
- `session:stream` usage-limit payloads
- `updateSnapshotsWithUsageLimits(...)`
- manual refresh через `api.refreshUsageLimits({ sessionId, providerId, providerSessionId })`

### Kimi usage source discovery (2026-05-19)

Kimi Code Console / community quota tracker discovery confirmed an authenticated usage endpoint:

- `GET https://api.kimi.com/coding/v1/usages`
- Authorization: `Bearer <Kimi Code API key>`

The response shape includes:

- `usage.limit/used/remaining/resetTime` — weekly quota. In observed data the limit is `"100"`, so this is a percentage-like credit scale, not raw request count.
- `limits[0].window.duration = 300` and `timeUnit = TIME_UNIT_MINUTE` — rolling 5-hour window.
- `limits[0].detail.limit/used/remaining/resetTime` — current 5-hour window usage.
- `parallel.limit` — concurrent task/session limit; it is a capacity value, not a percent-used value. UI may expose it as a third informational row only if the row contract supports non-percent capacity labels, otherwise it should stay out of the bar until the UI contract is extended.

Kimi module implication:
- `currentSession` should map to the rolling 300-minute window (`5h`) percent used.
- `currentWeekAllModels` should map to weekly quota percent used.
- `currentWeekSonnetOnly` must not be reused for fake model-weekly data; for Kimi it can only represent `Parallel` if the UI supports capacity-only labels without a progress fill.
- On `401` / `403` / timeout / malformed payload the adapter must keep the explicit unavailable state instead of showing stale or guessed values.

## Инварианты, которые нельзя ломать дальше

- Панель не должна иметь собственный persistent cache usage limits.
- Refresh нельзя отправлять из `pending` bootstrap session.
- Refresh должен идти только в реальный runtime `sessionId`.
- Dialog restore adoption нельзя снова привязывать к PM-only полям, которых нет в Core runtime events.
- Если PM не принял materialized runtime session, панель принципиально не сможет показать лимиты на первом auto-open path.
