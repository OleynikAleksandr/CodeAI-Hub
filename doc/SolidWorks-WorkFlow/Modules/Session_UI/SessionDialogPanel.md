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

## Reasoning translation projection

Visible provider `Thinking` / `Reasoning` uses a translation-first display contract:

- Core may emit source `content` with `translationState = "pending"` so the canonical transcript remains intact;
- `SessionDialogPanel` must not render pending source English as the first visible buffer;
- the pending visible text is local UI status copy such as `Перевод...`;
- when `localizedContent` arrives, the panel reveals translated text progressively;
- source `content` is shown only when translation explicitly falls back or does not arrive in time.

This contract depends on preserving `translationState` through every Session UI projection:

- runtime mode consumes live `session:message` / `session:message_translation` updates;
- dialog mode treats `dialog:message` as a signal to reread `dialog:history:result`;
- dialog history conversion must keep `translationState`, otherwise a reread can replace the pending placeholder with source English before the translation patch is applied.

When later translation patches add more translated reasoning blocks, the panel compares the new display text with what is already visible, keeps the longest common translated prefix, and streams only the suffix. The visible transcript must not clear and restart from the first translated paragraph on every new block.

## Особенности

- в dialog mode product SSOT для отображения — это именно dialog history;
- optimistic user append существует в dialog mode;
- hidden continuity/system messages фильтруются отдельно перед рендером.
