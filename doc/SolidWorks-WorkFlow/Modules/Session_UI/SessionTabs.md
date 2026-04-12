# Session Tabs — Factual Module Inventory

**Surface:** верхняя строка с вкладками Session UI  
**Primary code:** `src/client/ui/src/session/virtual-conversation.tsx`, `src/client/ui/src/session/session-tabs.tsx`

## Роль

Показывает активные сессии, позволяет:
- выбрать сессию;
- закрыть сессию.

## Что принимает

- `sessions`
- `activeSessionId`
- `providerLabels`
- `onSelectSession(sessionId)`
- `onCloseSession(sessionId)`

## Откуда берет правду

### Runtime mode
- список сессий гидратируется из `/api/v1/status`;
- затем обновляется событиями `session:created` / `session:deleted`;
- поверх этого применяется PM-visible filtering по stage/workspace через `useSessionVisibility()`.

### Dialog mode
- реального session list нет;
- контроллер materialize-ит синтетический список из одной session, соответствующей открытому dialog.

## Как обновляется

- `hydrateFromState()` после status hydrate;
- `session:created`;
- `session:deleted`;
- `preferredSessionId`;
- `pm:dialog:open`;
- `pm:stage:activated`;
- visibility filtering по active stage.

## Когда обновляется

- при открытии workspace;
- после `core:state` rehydrate;
- при новом dialog intent;
- при выборе, скрытии, удалении или создании сессии.

## Что отдает наружу

- `select session`
- `close session`

## Локальный state

Отсутствует.

## Особенности

- `close` сейчас существует как пользовательское действие, хотя потенциально может быть удален позже;
- truth-path панели зависит не только от session list, но и от PM routing/visibility scope.
