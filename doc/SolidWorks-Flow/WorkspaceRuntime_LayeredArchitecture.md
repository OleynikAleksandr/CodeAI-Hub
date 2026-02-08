# Workspace Runtime — Layered Architecture (Target)

**Date:** 2026-02-07  
**Scope:** SolidWorks-Flow multi-workspace + workflow tree (sessions + artifacts)

---

## 1. Цель документа

Зафиксировать **минимально необходимую** архитектуру, которая:
- изолирует состояние нескольких workspace в одном процессе (без пересечений);
- предотвращает “вечный lock” при потере terminal-событий;
- масштабируется на workflow tree (узлы, сессии, артефакты) без роста числа связей.

Документ разделяет:
- `MVP` (что нужно сделать сейчас, чтобы убрать класс багов по конструкции);
- `Future` (усиления при появлении реальных требований).

---

## 2. Главная проблема (почему возник регресс)

Текущая модель выросла из глобального runtime, где изоляция workspace достигается фильтрацией событий.

Это опасно: если terminal-маркер (`turn_state=idle` и/или unlock) не дошёл до scoped-клиента, UI остаётся в `running/blocked` и блокирует ввод.

Вывод: изоляция должна делаться **шардированием состояния**, а не post-filter доставкой событий.

---

## 3. MVP: минимально необходимое решение

Ниже 4 вещи, которые **закрывают класс проблемы**:

1) `Sharded Store`
- `Map<workspaceRoot, WorkspaceState>`
- никаких глобальных `sessionId`/`nodeId` без workspace.

2) `Snapshot-first` при переключении workspace
- при `workspace.select(workspaceRoot)` UI получает полный `WorkspaceSnapshot`;
- snapshot перетирает локальные stale состояния.

3) `Terminal rollback (watchdog) + heartbeat`
- watchdog гарантирует, что `turn_state` не может остаться `running` навсегда;
- heartbeat (любые stream-chunks/пинг) снижает риск ложного watchdog на длинных ответах.

4) `Compound keys в типах`
- `SessionKey = (workspaceRoot, nodeId, sessionId)`
- `NodeKey = (workspaceRoot, nodeId)`

MVP не требует event sourcing, CQRS и отдельного projection pipeline.

---

## 4. Identity и ключи (MVP)

### 4.1 `workspaceRoot` (routing identity)
- канонический абсолютный путь к корню workspace;
- используется как **единственный** routing key.

### 4.2 `workspaceSlug` (storage-only)
- используется только для путей `.codeai-hub/<workspaceSlug>/...` внутри `workspaceRoot`;
- не участвует в маршрутизации.

---

## 5. Контракт: Commands vs State (MVP)

### 5.1 Commands (ingress)
Команды — единственный способ менять состояние:
- `workspace.select(workspaceRoot)`
- `session.send(sessionKey, content, options)`
- `artifact.edit(nodeKey, artifactId, newContent)`
- `workflow.rebuild(nodeKey | subtreeKey)`

### 5.2 State + Snapshot (egress)
UI получает и отображает только `WorkspaceSnapshot`.

Ключевой принцип: UI не “лечит” runtime эвристиками.

---

## 6. Subscription Contract (MVP)

Обязательный принцип: **snapshot-first**.

При выборе workspace:
1) клиент получает полный `WorkspaceSnapshot`;
2) клиент подписывается на live updates выбранного workspace.

Важно: переключение workspace должно быть атомарным (отписка от старого + подписка на новый), чтобы исключить dual subscription.

---

## 7. Live updates: simplest MVP strategy

На MVP рекомендуется максимально простой и надёжный вариант:
- **push full snapshot** при каждом значимом изменении состояния активного workspace.

Перечень "значимых изменений" для snapshot push зафиксирован в `doc/SolidWorks-Flow/InterfaceMap_WorkspaceRuntime.md` (раздел 6.4).


Оптимизация (если понадобится): debounce/coalesce.

---

## 8. Session/Turn contract (MVP)

### 8.1 Канонический маркер
- `turn_state = running | idle` — единственный источник истины для input lock.

### 8.2 Формула блокировки
Lock вычисляется так:
- server-driven lock: `inputLocked = (turn_state != idle) OR (continuity_lock.active)`
- client-local доп. lock (если поддерживаем очередь сообщений): `inputLocked = serverLock OR (queuedMessage != null)`

Важно: `queuedMessage` — клиентское состояние, не часть snapshot.

### 8.3 Watchdog + heartbeat
- heartbeat: любой stream chunk/пинг во время активного turn;
- watchdog: если heartbeat отсутствует > `M` секунд, принудительно фиксируем terminal:
  - `turn_state=idle` + `turn_error(timeout)`.

Параметры `M` на MVP фиксируются консервативно (чтобы не ломать долгие ответы).

---

## 9. Workflow Tree: invalidation (MVP)

- `OUTDATED` выставляет только Graph logic при изменении upstream артефакта.
- При `OUTDATED` на MVP:
  - запрещаем новые `session.send` для downstream узлов;
  - показываем причину/зависимость в UI.

Graceful cancellation mid-stream — отдельная future фича (не часть MVP).

---

## 10. Минимальная структура модулей (MVP)

Чтобы не плодить фасады ради фасадов, достаточно:

- `WorkspaceRuntimeFacade` (публичный слой)
  - commands + `getSnapshot(workspaceRoot)` + `select(workspaceRoot)` + `subscribe(workspaceRoot)`.

Внутри него (как private modules, без публичных контрактов):
- `WorkspaceStore` (sharded state)
- `SessionRuntime` (turn_state/locks/watchdog)
- `ArtifactStore` (atomic writes + index)
- `WorkflowGraph` (статусы + outdated)

---

## 11. Future (не-MVP) — когда понадобится

Эти идеи добавляются только при появлении конкретной боли:

- `Projection pipeline / CQRS` — если snapshot станет тяжёлым и потребуется много специализированных read-model.
- `Event log / replay` — если нужна аудит/история/восстановление из логов.
- `Per-node serial queue` — если появится реальная параллельность узлов и нужен строгий single-writer per node.
- `Worker-per-workspace` — если нужен fault isolation или CPU-bound обработка.
- `Graceful cancellation` — если провайдеры/адаптеры реально поддерживают abort.

---

## 12. Definition of Done (MVP)

1. Невозможен cross-workspace apply: никакое событие/команда не применяется без `workspaceRoot`.
2. Переключение workspace всегда делает snapshot-first: stale `running/blocked` исчезает.
3. Любой accepted send приводит к terminal `turn_state=idle` (через normal path или watchdog).
4. `OUTDATED` корректно блокирует downstream новые send (без mid-stream cancel на MVP).
