# Session Status Panel — Factual Module Inventory

**Surface:** нижняя статусная строка  
**Primary code:** `src/client/ui/src/session/status-panel.tsx`, `src/client/project-manager/components/sessions/status-hydrator.ts`, `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`

## Роль

Показывает:
- connection status Core;
- models summary;
- token summary;
- token debug summary.

## Что принимает

- `connectionStatus`
- `connectionDetail`
- `status`
- `tokenDebugSummary`

## Откуда берет правду

- `connectionStatus` / `connectionDetail` из `useProjectManagerCoreStatusHydrator()`;
- `status.models` / `status.tokenUsage` из snapshot;
- `tokenDebugSummary` либо вычисляется по chain/messages, либо в dialog mode приходит как override из parsed dialog history.

## Как обновляется

### Connection side
- `/api/v1/status` hydrate;
- `core:state` rehydrate.

### Models side
- `useSettingsModelsSync()` на change provider settings;
- `useRuntimeModelSync()` на `session:model:update`.

### Token side
- `session:stream` token-usage events -> `updateSnapshotsWithTokenUsage(...)`.

### Debug summary side
- пересчитывается по runtime chain или dialog history.

## Когда обновляется

- при старте PM/workspace hydrate;
- при restart/reconnect Core;
- при change настроек модели/reasoning;
- при `session:model:update`;
- при новых token usage/history данных.

## Что отдает наружу

Ничего. Это read-only projection panel.

## Локальный state

Отсутствует.

## Особенности

- в dialog mode `useRuntimeModelSync()` умеет fallback-обновлять snapshot по `activeSessionId`, если runtime broadcast пришёл с другим `sessionId`;
- панель зависит сразу от двух truth-lines: Core connection и active snapshot status.
