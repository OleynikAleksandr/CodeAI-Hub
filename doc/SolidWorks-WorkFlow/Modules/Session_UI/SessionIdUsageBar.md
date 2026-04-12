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
- `onRefreshUsageLimits(providerId)`

## Откуда берет правду

- `binding.providerSessionId` и `binding.status` из snapshot/binding path;
- `status.usageLimits` и `status.usageLimitLabels` из snapshot;
- fallback path — `usage-limits-cache`, если snapshot ещё не наполнен.

## Как обновляется

### Binding side
- `session:binding`
- `session:created`
- `applyBindingToSessionSnapshot(...)`

### Usage limits side
- `session:stream` usage-limit payloads;
- `updateSnapshotsWithUsageLimits(...)`;
- write/read through `usage-limits-cache`;
- manual refresh через `api.refreshUsageLimits(providerId)`.

## Когда обновляется

- при создании initial snapshot;
- при любом `session:binding`;
- при каждом релевантном usage-limits stream event;
- при смене активной сессии;
- при mount/provider change самой панели.

## Что отдает наружу

Панель сама триггерит side effect:
- в `useEffect()` вызывает `onRefreshUsageLimits(providerId)`.

## Локальный state

Отсутствует.

## Особенности

- один usage-limits event может обновить не только текущий snapshot, а все snapshots того же `providerScopeKey`;
- это не чисто read-only projection panel: она сама участвует в refresh-механизме.
