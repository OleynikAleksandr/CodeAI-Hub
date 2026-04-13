# Session ID + Usage Limits Bar — Factual Module Inventory

**Surface:** панель `providerSessionId` + usage limits  
**Primary code:** `src/client/ui/src/session/session-id-bar.tsx`

## Роль

Показывает:
- short `providerSessionId`;
- usage limits rows для активной session/provider scope.

## Что принимает

- `binding`
- `status`
- `sessionId`
- `onRefreshUsageLimits({ sessionId, providerId, providerSessionId })`

## Откуда берет правду

- `binding.providerSessionId` и `binding.status` из snapshot/binding path;
- `status.usageLimits` и `status.usageLimitLabels` из snapshot;
- persistent fallback cache для usage limits отсутствует.

## Как обновляется

### Binding side
- `session:binding`
- `session:created`
- `applyBindingToSessionSnapshot(...)`

### Usage limits side
- `session:stream` usage-limit payloads;
- `updateSnapshotsWithUsageLimits(...)`;
- manual refresh через `api.refreshUsageLimits({ sessionId, providerId, providerSessionId })`, но только когда `binding.status === ready`.

## Когда обновляется

- при создании initial snapshot;
- при любом `session:binding`;
- при каждом релевантном usage-limits stream event;
- при смене активной сессии;
- при cold-start restore active session;
- при смене `providerSessionId` у active session после restore/rebind;
- при переходе placeholder dialog bootstrap session из `pending` в materialized runtime session;
- при mount/session change/provider change самой панели, если binding уже `ready`.

## Что отдает наружу

Панель сама триггерит side effect:
- в `useEffect()` вызывает session-scoped `onRefreshUsageLimits(...)` для текущей active session.

## Локальный state

Отсутствует.

## Особенности

- один usage-limits event может обновить не только текущий snapshot, а все snapshots того же provider family;
- для usage limits canonical `providerScopeKey` теперь provider-global (`claude:global`, `codex:global`, `gemini:global`);
- это не чисто read-only projection panel: она сама участвует в refresh-механизме.
- в dialog auto-select path panel не должна запускать refresh на bootstrap placeholder без runtime session; сначала PM обязан принять materialized runtime session и только потом панель шлет refresh.
- manual refresh больше не использует synthetic provider session bucket в UI-path: refresh должен вернуться в реальный runtime `sessionId`, иначе panel не получит rerender через snapshots.
