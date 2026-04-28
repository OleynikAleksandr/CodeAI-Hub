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
- initial snapshot строится из `SessionRecord.modelBinding`, если он есть; такой label помечается `ModelInfo.source = "binding"`;
- restored dialog/bootstrap snapshot обязан принимать persisted `modelBinding` из Core dialog list / continuity materializer до первого provider hydration;
- `useSettingsModelsSync()` на change provider settings обновляет только settings-owned snapshots и не переписывает `binding`/`runtime` sources;
- `useRuntimeModelSync()` на `session:model:update` применяет Core-confirmed runtime identity и помечает её `ModelInfo.source = "runtime"`;
- `useRuntimeModelSync()` не заменяет binding-owned label unbound runtime fallback-ом; runtime payload должен нести `modelBinding` или Core-confirmed effective identity этой logical session.
- для нового trunk-step dialog/bootstrap snapshot provider/model seed сначала берётся из explicit `pm:dialog:open` / startup intent provider, если dialog list payload ещё не дал нормализованный provider;
- после materialization runtime session панель обязана converge-иться к live provider/model identity через обычный `useRuntimeModelSync()` path.

### Token side
- `session:stream` token-usage events -> `updateSnapshotsWithTokenUsage(...)`.

### Debug summary side
- пересчитывается по runtime chain или dialog history.

## Когда обновляется

- при старте PM/workspace hydrate;
- при restart/reconnect Core;
- при change настроек модели/reasoning только для snapshots без `binding`/`runtime` ownership;
- при `session:model:update`;
- при новых token usage/history данных.

## Что отдает наружу

Ничего. Это read-only projection panel.

## Локальный state

Отсутствует.

## Особенности

- в dialog mode `useRuntimeModelSync()` умеет fallback-обновлять snapshot по `activeSessionId`, если runtime broadcast пришёл с другим `sessionId`;
- панель зависит сразу от двух truth-lines: Core connection и active snapshot status.
- две logical sessions одного provider могут одновременно показывать разные модели, потому что label принадлежит session binding, а не текущему provider default в Settings.
- continuation session, созданная после `Remaining context threshold (%)`, должна показывать inherited binding предыдущей logical session, даже если Settings default у provider уже изменён.
- для `Virtual Simulation` / `Diagram Modules`, стартующих с confirmation card, нижняя панель не должна сохранять provider/model summary предыдущего trunk step: выбранный на карточке provider seed-ит bootstrap snapshot сразу, а затем live runtime model update уточняет effective model без возврата к старому provider context.
