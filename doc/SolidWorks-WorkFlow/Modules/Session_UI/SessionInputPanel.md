# Session Input Panel — Factual Module Inventory

**Surface:** textarea + send/stop area  
**Primary code:** `src/client/ui/src/session/input-panel.tsx`

## Роль

Соединяет:
- локальный ввод пользователя;
- Core-controlled runtime state (`lock`, `turnState`, `continuity`, `timers`, `terminal` behavior).

Показывает:
- textarea;
- play/stop button;
- wait copy overlay;
- turn timer overlay;
- total timer footer;
- read-only/blocked behavior.

## Что принимает

- `connectionState`
- `continuityLockActive`
- `continuityErrorCopy`
- `draft`
- `isQueued`
- `onSubmit(text)`
- `providerTheme`
- `sessionId`
- `taskTimer`
- `terminalNoResume`

## Откуда берет правду

### Core-controlled truth
- `turnState`
- `continuityLock`
- `binding.status`
- `taskTimer`
- `terminalNoResume`
- queued-send state

### User-controlled truth
- textarea value

## Ключевой факт текущей реализации

`draft` формально приходит из snapshot, но в текущем baseline:
- initial snapshot создаёт `draft: ""`;
- после mount реальное значение textarea живёт локально в `InputPanel` через `useState`.

То есть полноценного shared draft-owner сейчас нет.

## Как обновляется

### Local input side
- каждый keystroke обновляет local `useState`.

### Runtime state side
- `workspace:snapshot` -> `applyWorkspaceSnapshotToSnapshots(...)`;
- derived connection/binding state в `SessionView`.

### Submit path
- runtime mode -> `api.sendSessionMessage(...)`;
- dialog mode -> `api.dialogs.sendDialogMessage(...)`.

### Stop path
- `stopSession(sessionId)`.

## Когда обновляется

- локально на каждый ввод пользователя;
- при remount/switch active session;
- при snapshot update, который меняет `turnState`, lock или `taskTimer`;
- при queued send;
- при stop;
- при переходе в `terminal no-resume`.

## Что отдает наружу

- send message
- stop session

## Локальный state

- textarea value
- `optimisticStopActive`

## Особенности

- это самая смешанная панель в Session UI: local UI state + Core-owned runtime truth;
- input lock должен оставаться snapshot-first, даже если stream path приходит раньше.
