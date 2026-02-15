# Phase 169 Progress Report — Core Bridge: dialog:* APIs keyed by dialogId

**Date:** 2026-02-14 (CET)

**Architecture (source of truth):**
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

## Goal (Phase 169)
Дать Project Manager стабильный API слой `dialog:*`, который не зависит от runtime `sessionId` Core:
- list/open/history/send по `dialogId`,
- live stream событий по `dialogId`.

## What Was Implemented
### 1. dialog:list
- Добавлен WS-командный вход `IncomingMessage.type = dialog:list`.
- Ответ в `BridgeEvent.type = dialog:list:result`.
- Источник: `continuity/index.json` (если отсутствует, fallback на скан `chain.json`).

### 2. dialog:open
- Добавлен `IncomingMessage.type = dialog:open`.
- Ответ в `BridgeEvent.type = dialog:open:result`.
- Сейчас это **lookup** в индексе (без отдельного runtime-binding объекта). Это осознанный шаг для постепенного перехода.

### 3. dialog:history (replay)
- Добавлен `IncomingMessage.type = dialog:history`.
- Ответ в `BridgeEvent.type = dialog:history:result`.
- Реализация читает накопительный JSONL: `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl`.
- Дедуп по `messageId`, сортировка по `timestamp`.

### 4. dialog:send
- Добавлен `IncomingMessage.type = dialog:send`.
- ACK: `BridgeEvent.type = dialog:send:ack`.
- Реализация в Core делегирует отправку в `SessionRequestHandler.handleDialogSend()`:
  - находит chain по `dialogId`,
  - берёт `segments[last].providerSessionId` и `providerId`,
  - если runtime session уже есть, шлёт в неё,
  - если нет, делает resume provider session и создаёт runtime session, pin’ит её на `rootSessionId = dialogId`, затем отправляет.
  - `runSlug` пока infer’ится из суффикса `dialogId` (`-reviewer/__reviewer`, `-collector/__collector`).

### 5. dialog:message (live)
- Добавлен live event `BridgeEvent.type = dialog:message`.
- Эмитится из `SessionRequestHandler` при каждом добавлении сообщения в session: дополнительно к `session:message`.
- В payload передаётся `dialogId` (берётся как continuity root для session), плюс `sessionId` для workspace-scope фильтра.
- `websocket-session-scope` обновлён: `dialog:message` теперь фильтруется по workspace scope так же, как session events.

## Git Commits (Phase 169)
- `83ce4e10 feat(core): dialog list (index-backed)`
- `0bd8ddbb feat(core): dialog open (index-backed)`
- `d79ae6b3 feat(core): dialog history (jsonl replay)`
- `7f7385f1 feat(core): dialog send (resume + delegate to session handler)`
- `fe238b17 feat(core): dialog message live event by dialogId`

## Notes / Known Gaps
- `dialog:open` пока не создаёт отдельный runtime-binding объект; это будет уточняться/усиливаться вместе с переходом PM на `dialogId` tabs.
- В цепочке continuity пока нет явного `runSlug` как поля в `chain.json/index.json`; временно используем inference из `dialogId` для resume.

## Next (Phase 170)
- Перевести PM на `dialogId` tabs + persistence и replay через `dialog:history`.
