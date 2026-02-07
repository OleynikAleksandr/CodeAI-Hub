# Project Manager Workspace-Scoped Session Isolation Architecture

**Status:** Draft baseline for Phase 104 implementation  
**Last Updated:** 2026-02-07  
**Owner:** Project Manager + Remote Bridge

---

## 1. Problem Statement

Текущее поведение PM/Core допускает cross-workspace утечки:
- PM получает и обрабатывает `session:*` события от чужих workspace.
- `session:created` может авто-переключать фокус на out-of-scope сессию.
- При reconnect и переключении workspace возможны гонки между resume/create и сменой scope.

Это нарушает инвариант: UI выбранного workspace не должен видеть, фокусить или отправлять сообщения в сессии другого workspace.

---

## 2. Goals and Non-Goals

### 2.1 Goals

1. Ввести строгую изоляцию `session:*` по ключу `workspacePath` (absolute path).
2. Ввести явный handshake `workspace:scope:set` -> `workspace:scope:ack`.
3. Гарантировать ordering:
   - PM отправляет scope до `workspace-activate`.
   - PM отправляет scope до resume/create.
4. Устранить race, при которой `session:created`/resume может быть потерян из-за переключения workspace или reconnect.
5. Сохранить non-regression path reopen/resume после перезапуска Core/компьютера.

### 2.2 Non-Goals

1. Не меняем ключ файловой структуры workflow (`workspaceSlug` сохраняется как workflow/metadata id).
2. Не заменяем существующий HTTP `workspace-activate` поток; добавляем strict ordering и deterministic handshake.
3. Не убираем defence-in-depth в UI: server-side фильтрация не отменяет client-side guard.

---

## 3. Scope Key and Identity

1. **Единственный ключ изоляции**: `workspacePath` (абсолютный путь).
2. `workspaceSlug` разрешён только как metadata/workflow id.
3. Любая проверка видимости/доставки `session:*` должна основываться на `workspacePath`.

---

## 4. Protocol Contract (PM <-> Core Bridge)

## 4.1 Outgoing: `workspace:scope:set`

PM отправляет:

```json
{
  "type": "workspace:scope:set",
  "payload": {
    "workspacePath": "/absolute/path" | null,
    "workspaceSlug": "slug-or-null",
    "requestId": "uuid",
    "reason": "workspace_selected" | "reconnect" | "workspace_cleared"
  }
}
```

Правила:
1. `workspacePath` обязателен как absolute path, либо `null` (clear scope).
2. `requestId` обязателен и уникален на запрос.
3. Если `workspacePath !== null`, то `workspaceSlug` опционален (metadata only).

## 4.2 Incoming: `workspace:scope:ack`

Core отвечает:

```json
{
  "type": "workspace:scope:ack",
  "payload": {
    "requestId": "uuid",
    "status": "applied" | "rejected",
    "workspacePath": "/absolute/path" | null,
    "error": "string-or-null"
  }
}
```

Правила:
1. `ack` обязателен для каждого `workspace:scope:set`.
2. `requestId` в `ack` должен совпадать с запросом.
3. При `rejected` PM не запускает `workspace-activate`, resume или `session:create` для этого scope.

---

## 5. Ordering and Handshake Rules (CRITICAL)

1. PM обязан выполнить `workspace:scope:set` и дождаться `workspace:scope:ack(status=applied)` **до**:
   - `POST /api/v1/orchestrator/workspace-activate`
   - dispatch resume intent
   - `session:create`
2. На reconnect PM повторяет handshake для текущего выбранного workspace.
3. Пока `ack` не получен, любые операции, создающие/резюмирующие сессии, считаются заблокированными.
4. При отсутствии выбранного workspace PM отправляет `workspace:scope:set(workspacePath=null)` и ждёт `ack`.

---

## 6. Core Delivery Rules for `session:*`

Для каждого WebSocket-клиента Core ведёт scope-state:
- `scopedClient: boolean`
- `workspacePath: string | null`
- `lastScopeAckRequestId: string | null`

### 6.1 Scoped client mode

1. Клиент становится scoped-client после первого валидного `workspace:scope:set`.
2. Для scoped-client Core доставляет `session:*` событие только если:
   - событие относится к session с `session.workspacePath === client.workspacePath`, и
   - `client.workspacePath !== null`.
3. Если у scoped-client scope `null`, Core не доставляет `session:*`.

### 6.2 Unscoped channels

События, не относящиеся к session lifecycle (`projects:*`, `settings:*`, status), остаются без изменений.

---

## 7. Anti-Race Contract

### 7.1 PM-side anti-race

1. PM использует `requestId` и применяет `ack` только для последнего активного запроса scope.
2. Устаревшие `ack` (не совпали по `requestId`) игнорируются.
3. Резюмирование/создание сессий разрешается только после актуального `ack(applied)`.

### 7.2 Core-side anti-race

1. Core применяет scope атомарно per-client.
2. После применения scope Core отправляет `ack` в том же socket-контексте.
3. С этого момента все новые `session:*` для клиента фильтруются новым scope.

### 7.3 Deterministic reopen/resume path

Гарантированный порядок при выборе workspace:
1. PM -> `workspace:scope:set`
2. Core -> `workspace:scope:ack(applied)`
3. PM -> `workspace-activate` (HTTP)
4. Core создаёт/резюмирует session (если нужно)
5. Core -> `session:created` (уже в корректном scope)
6. PM может безопасно фокусить только in-scope session.

---

## 8. Defence-in-Depth UI Rules

Даже при server-side фильтрации UI обязан:
1. Не автофокусить `session:created`, если `session.workspacePath !== selectedWorkspacePath`.
2. Не рендерить `activeSessionId`, если он out-of-scope; выполнять reconciliation на in-scope fallback.
3. Блокировать send в out-of-scope session (`hard send guard`).

---

## 9. Non-Regression Requirements

1. После перезапуска Core/компьютера сценарий reopen/resume из дерева workspace должен оставаться рабочим.
2. Reviewer visibility path (`workspace-activate` -> description snapshot -> reviewer session focus) не должен ломаться.
3. Изоляция не должна ломать polling workflow-state и открытие артефактов.

---

## 10. Test Matrix (Phase 104)

1. PM UI regression:
   - switch workspace + foreign `session:created` -> нет автофокуса, нет рендера, нет send.
2. Core bridge regression:
   - конкурентные сессии в разных workspace -> нет cross-workspace delivery в scoped PM client.
3. Reconnect regression:
   - reconnect -> повторный `workspace:scope:set` + `ack` -> корректная доставка событий.
4. Non-regression restart path:
   - restart -> workspace select -> scope handshake -> workspace-activate -> resume/reviewer visibility.

---

## 11. Acceptance Criteria

1. Не существует user-visible cross-workspace `session:*` событий в PM.
2. Нет auto-focus на foreign session.
3. Нет успешной отправки сообщения в out-of-scope session.
4. Для каждого scope set приходит ack.
5. Reopen/resume после restart проходит без деградации.

---

## 12. Related Documents

1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`
3. `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_TurnEnd_AtomicLock_Architecture.md`
