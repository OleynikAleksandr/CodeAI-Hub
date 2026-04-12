# Session Dialog Panel — Factual Module Inventory

**Surface:** история диалога  
**Primary code:** `src/client/ui/src/session/dialog-panel.tsx`, `src/client/ui/src/session/virtual-conversation.tsx`

## Роль

Показывает:
- сообщения диалога;
- thinking bubbles;
- segment boundaries;
- file links;
- scroll/pin behavior.

## Что принимает

- `messages`
- `providerLabel`
- `providerTheme`
- `onFileLinkActivate(target)`

## Откуда берет правду

UI читает не raw events, а уже собранные `virtualConversationMessages`.

Эти сообщения строятся из:
- continuity chain;
- snapshot messages.

### Runtime mode truth-path
- `session:history`
- `session:message`
- `session:error`
- continuity chain merge across session segments

### Dialog mode truth-path
- `dialog:list:result`
- `dialog:history:result`
- `dialog:message` как trigger для reread history, а не как отдельный display SSOT

## Как обновляется

### Runtime mode
- initial history через `loadSessionHistories()`;
- новые сообщения через `appendDedupedSessionMessageToSnapshots()`;
- continuity chain пересобирается при смене active session/snapshots.

### Dialog mode
- `requestDialogHistory()` после `dialog:list:result`;
- `dialog:message` вызывает refresh history;
- `dialog:send:ack(status=sent)` вызывает refresh history;
- `core:state` вызывает replay history + dialog list.

## Когда обновляется

- при первом hydrate/open;
- при каждом history batch / history tail;
- при каждом runtime message в runtime mode;
- после user send в dialog mode;
- после `dialog:message`, `dialog:send:ack`, `core:state`;
- при изменении настройки thinking visibility.

## Что отдает наружу

- file-link activation
- expand/collapse thinking messages

## Локальный state

- expanded thinking map
- scroll pinned state

## Особенности

- в dialog mode product SSOT для отображения — это именно dialog history;
- optimistic user append существует в dialog mode;
- hidden continuity/system messages фильтруются отдельно перед рендером.
