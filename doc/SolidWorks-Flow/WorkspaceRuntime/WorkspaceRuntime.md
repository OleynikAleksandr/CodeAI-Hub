# Workspace Runtime (SolidWorks-Flow) — Multi-workspace + Snapshot-first + Lock Contract (Source of Truth)

**Status:** Active
**Updated:** 2026-02-15 (release 1.1.606)
**Owner:** Oleksandr + Codex

---

## 0) Scope

Этот документ фиксирует **канонический runtime‑контракт** между Core и UI (Project Manager) для FLOW:
- multi-workspace изоляция;
- snapshot-first подписка;
- wire‑контракт команд/снапшотов (WebSocket);
- lock/unlock инварианты для turn lifecycle + continuity/rollover;
- запрет cross-workspace применения событий/команд.

Связанные каноны:
- Session Continuity: `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`

---

## 1) Problem

Исторически runtime строился вокруг “глобального состояния + фильтрации событий”. Это приводит к регрессиям:
- stale `running/blocked` при переключении workspace;
- некорректный unlock input (особенно на границах `turn_completed` и continuity lock);
- потенциальный cross-workspace apply.

Решение: **шардирование состояния** по workspace + snapshot-first.

---

## 2) MVP Architecture (Layered)

Ниже — минимально необходимое решение, закрывающее класс проблем:

1) `Sharded Store`
- `Map<workspaceRoot, WorkspaceState>`

2) `Snapshot-first` при переключении workspace
- `workspace:select(workspaceRoot)` → полный `WorkspaceSnapshot` → только потом live updates.

3) `Terminal rollback (watchdog) + heartbeat`
- watchdog не даёт `turnState=running` зависнуть навсегда;
- heartbeat снижает риск ложного watchdog.

4) `Compound keys`
- `NodeKey = (workspaceRoot, nodeId)`
- `SessionKey = (workspaceRoot, nodeId, sessionId)`

---

## 3) Terms & Keys

### 3.1 Identity
- `workspaceRoot: string` — канонический абсолютный путь к корню workspace. Единственный routing key.
- `workspaceSlug: string` — storage-only (пути `.codeai-hub/<slug>/...`), вне маршрутизации.

### 3.2 IDs
- `nodeId: string` — идентификатор узла workflow tree (`description`, `virtual_simulation`, ...).
- `sessionId: string` — UUID (генерируется Core).
- `providerId: string` — id провайдера (например: `claudeCodeCli`, `codexCli`, `geminiCli`).
- `providerSessionId: string` — provider-native id конкретного segment (используется для resume/focus и привязки provider events).
- `dialogId: string` — **стабильный** id логического диалога агента для UI-истории (basename JSONL; не меняется при rollover/resume).
- `artifactId: string` — id артефакта внутри узла (`draft`, `final`, `report`).

### 3.3 Compound keys

```ts
type NodeKey = {
  workspaceRoot: string;
  nodeId: string;
};

type SessionKey = {
  workspaceRoot: string;
  nodeId: string;
  sessionId: string;
};
```

### 3.4 UI Session History (normative)

История диалога в UI читается **не из провайдерных логов**, а из unified-session JSONL в `~/.codeai-hub/sessions/**`.

Нормативные правила:
- `providerSessionId` может меняться при rollover/resume, но `dialogId` **не меняется**.
- имя файла истории для UI должно быть `dialogId` (иначе история распадается на сегменты и после рестарта Core/PM будет показываться только “последний кусок”).
- это требование применяется для всех **следующих агентов** и flow-ноды/шагов, где диалог длительный и может переживать rollover/resume.

---

## 4) Lock / Unlock Contract (normative)

### 4.1 Canonical markers
- `turnState = running | idle`
- `resumeMode = no_resume | resume_in_place | resume_via_rollover`
- `continuityLockActive: boolean`
- `continuityLockReason: string | null`
- `finalTurnCompleted: boolean`

### 4.2 Server-driven lock formula

`inputLocked = sessionTerminal OR (turnState != idle) OR continuityLockActive`

Где:
- `sessionTerminal = (resumeMode == no_resume) AND finalTurnCompleted`.

### 4.3 Unlock rules
- `no_resume`: после финального ответа input **никогда** не unlock (terminal/read-only).
- `resume_in_place`: unlock **только если одновременно**:
  - `turnState=idle` (turn завершён), и
  - Core подтвердил `no_rollover_needed` (continuity arbitration завершён), и
  - `continuityLockActive=false`.
- если threshold exceeded / rollover required: input остаётся locked; меняется только reason/copy.
- `resume_via_rollover`: input locked в старом и новом segment; unlock только после первого bootstrap assistant answer в новом segment.

Запрещён сценарий `running -> unlocked -> locked` для одного и того же turn.

---

## 5) Wire Envelope

```ts
type WireMessage = {
  type: string;
  payload?: unknown;
};
```

---

## 6) Commands (PM/UI -> Core)

### 6.1 `workspace:select`
Атомарное переключение активного workspace.

```ts
type WorkspaceSelect = {
  type: "workspace:select";
  payload: {
    requestId: string;
    workspaceRoot: string | null;
    reason: "workspace_selected" | "reconnect" | "workspace_cleared";
  };
};
```

### 6.2 `workspace:snapshot:request` (optional)

```ts
type WorkspaceSnapshotRequest = {
  type: "workspace:snapshot:request";
  payload: {
    requestId: string;
    workspaceRoot: string;
    reason: "resync" | "debug";
  };
};
```

### 6.3 `session:message` (low-level)

```ts
type SessionMessage = {
  type: "session:message";
  payload: {
    sessionId: string;
    content: string;
  };
};
```

Примечание: это низкоуровневая отправка “в конкретную runtime‑сессию”. Для UI панели диалога в PM канонический путь — `dialog:send` по `dialogId` (см. ниже).

### 6.4 `dialog:*` (канонический UI‑диалог)

Все операции UI‑диалогов идут по `dialogId` (basename JSONL) и не зависят от runtime `sessionId`:

```ts
type DialogList = {
  type: "dialog:list";
  payload: { requestId: string; workspaceSlug: string };
};

type DialogOpen = {
  type: "dialog:open";
  payload: { requestId: string; workspaceSlug: string; dialogId: string };
};

type DialogHistory = {
  type: "dialog:history";
  payload: {
    requestId: string;
    workspaceSlug: string;
    dialogId: string;
    cursor?: number;
  };
};

type DialogSend = {
  type: "dialog:send";
  payload: {
    requestId: string;
    workspaceSlug: string;
    dialogId: string;
    content: string;
  };
};
```

### 6.5 `artifact:edit`

```ts
type ArtifactEdit = {
  type: "artifact:edit";
  payload: {
    requestId: string;
    nodeKey: NodeKey;
    artifactId: string;
    newContent: string;
    reason?: "user_edit" | "retry";
  };
};
```

### 6.6 `workflow:rebuild`

```ts
type WorkflowRebuild = {
  type: "workflow:rebuild";
  payload: {
    requestId: string;
    nodeKey: NodeKey;
    scope: "node" | "subtree";
  };
};
```

---

## 7) Responses & Snapshots (Core -> PM/UI)

### 7.1 `workspace:select:ack`

```ts
type WorkspaceSelectAck = {
  type: "workspace:select:ack";
  payload: {
    requestId: string;
    status: "applied" | "rejected";
    workspaceRoot: string | null;
    selectionId: string | null;
    error?: string | null;
  };
};
```

### 7.2 `workspace:snapshot`

```ts
type WorkspaceSnapshotPush = {
  type: "workspace:snapshot";
  payload: {
    workspaceRoot: string;
    selectionId: string;
    sequence: number;
    generatedAt: string;
    snapshot: WorkspaceSnapshot;
  };
};
```

Client apply rules:
- применять только для активного `workspaceRoot` и текущего `selectionId`;
- игнорировать снапшоты, если `sequence <= lastAppliedSequence`.

### 7.3 `command:error`

```ts
type CommandError = {
  type: "command:error";
  payload: {
    requestId: string;
    command: string;
    message: string;
    code?: string;
    details?: unknown;
  };
};
```

---

## 8) Snapshot push triggers (MVP)

Push full snapshot только на “значимые” изменения состояния:
- `turnState` (`idle`↔`running`)
- `continuityLockActive` / `continuityLockReason`
- `resumeMode` / `finalTurnCompleted`
- binding (`providerSessionId`)
- node status (`TODO|IN_PROGRESS|DONE|OUTDATED|ERROR|…`)
- artifact pointer changes
- session added/removed

Не пушить снапшот на каждый stream chunk (`lastHeartbeatAt` и т.п.).

---

## 9) Session Isolation (Project Manager)

Критичный инвариант: UI не должен показывать/применять события “не своего” workspace.

- Любая команда к Core должна быть scoped к workspace: либо через `workspaceRoot`/`sessionId` в payload, либо через `workspaceSlug` для `dialog:*` (плюс активный workspace scope в bridge).
- `workspace:select` должен быть atomic (unsubscribe old + subscribe new).
- Snapshot-first обязателен при каждом выборе workspace.
