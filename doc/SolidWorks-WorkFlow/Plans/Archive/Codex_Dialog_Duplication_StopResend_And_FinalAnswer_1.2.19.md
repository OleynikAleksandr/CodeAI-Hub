# Codex Dialog Duplication After Stop/Resend And Final Answer — Planning Doc

## 1. Problem

В одной и той же Codex dialog session подтверждены два разных user-visible duplication bug class:

1. после `Stop` и немедленного повторного `send` дополнительное пользовательское сообщение временно отображается дважды;
2. финальный ответ Codex отображается дважды и остаётся продублированным даже после переключения workspace и повторной hydration.

Это не один баг, а два разных слоя поломки:
- transient UI duplicate на стороне Project Manager dialog snapshots;
- persisted provider/runtime duplicate на стороне Codex rollout finalization.

Оба дефекта должны войти в будущий execution cycle, но лечиться как отдельные Stream.

## 2. Confirmed Evidence

### 2.1. User duplicate after `Stop` is transient and not persisted

Подтверждённый сценарий:
- пользователь отправил ответ;
- сразу вспомнил пропущенную деталь;
- нажал `Stop`;
- дописал второе сообщение и отправил его;
- в dialog panel второе пользовательское сообщение на время стало видно дважды.

Подтверждённые артефакты:
- screenshot:
  `/Users/oleksandroliinyk/Desktop/Screenshot 2026-04-18 at 12.00.48.png`
  показывает duplicated user bubble.
- Unified session JSONL:
  `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/codexCli/codex-cce9d786-f8f6-430d-b276-39e341cda0e3-description.jsonl`
  содержит:
  - line `19`: одно пользовательское сообщение в `2026-04-18T09:59:24.563Z`;
  - line `20`: одно следующее пользовательское сообщение в `2026-04-18T10:00:29.627Z`;
  - второго persisted экземпляра того же follow-up message нет.

Operational clue:
- после переключения на другой workspace и возврата duplicate user bubble исчезает.

Вывод:
- source-of-truth history корректна;
- дубль живёт только в live UI snapshot state и пропадает после пересборки из canonical history.

### 2.2. Assistant duplicate is persisted in Codex session truth

Подтверждённые артефакты:
- screenshot:
  `/Users/oleksandroliinyk/Desktop/Screenshot 2026-04-18 at 12.10.34.png`
  показывает два одинаковых assistant bubble.
- Unified session JSONL содержит два одинаковых финальных assistant message:
  - line `51`
  - line `52`
- Native Codex rollout JSONL:
  `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/04/18/rollout-2026-04-18T11-43-20-019d9ff9-2b0b-7651-8d8c-22945eb1e235.jsonl`
  содержит:
  - `event_msg` with `payload.type = "agent_message"` and `phase = "final_answer"` at line `99`;
  - immediately after that `event_msg` with `payload.type = "task_complete"` and the same `last_agent_message` at line `102`.

Дополнительная улика:
- SDK diagnostics log
  `/Users/oleksandroliinyk/.codeai-hub/logs/codex/sdk-codex-019d9ff9-2b0b-7651-8d8c-22945eb1e235.jsonl`
  показывает только один terminal `item.completed` для `agent_message` на втором полноценном turn-е, то есть duplicate не объясняется двумя независимыми SDK final answer item.

Вывод:
- persisted duplication создаём мы в Codex rollout sync / finalization path.

### 2.3. Stop/resend boundary is real and time-adjacent

SDK diagnostics фиксирует stop/resend boundary:
- `user_input_meta` первого follow-up at `09:59:24`;
- затем turn обрывается без normal `turn.completed`, после чего идёт `session_end`;
- новый diagnostics session стартует;
- следующее пользовательское сообщение приходит в `10:00:29`.

Это подтверждает, что user-duplicate возник на границе `Stop` + fast resend, а не как обычный duplicate send без interruption.

## 3. Root Cause

### 3.1. Project Manager optimistic user message is not reconciled with canonical tail history

Client-side send path:
- `use-project-manager-dialog-session-controller.ts` вызывает `appendOptimisticUserMessage(...)` сразу после `api.dialogs.sendDialogMessage(...)`.
- optimistic message получает:
  - synthetic id `optimistic-${Date.now()}`;
  - synthetic `createdAt = Date.now()`.

После `dialog:send:ack status="sent"` Project Manager запрашивает `dialog:history`.

Tail history path:
- `use-project-manager-dialog-core-events.ts` в tail-mode (`requestedCursor > 0`) добавляет canonical history messages через `appendDedupedSessionMessageToSnapshots(...)`, а не full replace.
- `session-message-dedupe.ts` умеет dedupe:
  - либо по `message.id`,
  - либо по `(createdAt + role + content)`.

Проблема:
- optimistic user bubble и canonical history record имеют разный `id`;
- у них также разный `createdAt`;
- content одинаковый, но этого alone сейчас недостаточно для reconciliation.

Итог:
- optimistic user message остаётся в snapshot;
- canonical user message добавляется вторым экземпляром;
- при полной пересборке из history duplicate исчезает, потому что optimistic message не существует в persisted truth.

### 3.2. Codex rollout final answer has no single-owner terminal emission contract

Native Codex rollout пишет два terminal signals с одинаковым смыслом:
- `agent_message phase="final_answer"`;
- `task_complete last_agent_message=...`.

`codex-rollout-event-parser.ts` нормализует оба как разные parsed events:
- `kind = "final_answer"`;
- `kind = "task_complete"`.

`codex-rollout-live-sync.ts` делает следующее:
- всегда эмитит `final_answer`;
- затем эмитит `task_complete`, если `hasFinalTurn(session, turnId)` ещё false.

Проблема:
- current dedupe relies on `turnId`;
- parser читает `turnId` только из `payload.turn_id`;
- production `final_answer` event в наблюдаемой сессии не несёт `turn_id`.

Следствие:
- `final_answer` emits assistant message, но не mark'ит final turn;
- следующий `task_complete` проходит как fallback и эмитит тот же assistant message повторно;
- duplicate попадает в unified session и дальше стабильно виден на всех hydration/replay.

### 3.3. Existing replay tests guard the happy path, but not the observed production asymmetry

Текущие rollout tests моделируют сценарий, где `final_answer` и `task_complete` относятся к одному `turn_id`, поэтому duplicate корректно подавляется.

Observed production case отличается:
- `final_answer` semantic duplicate присутствует;
- `task_complete` semantic duplicate присутствует;
- `final_answer` lacks `turn_id`.

Этот асимметричный terminal pair пока не покрыт regression guards.

## 4. Solution

### 4.1. PM/UI: introduce optimistic-to-canonical user message reconciliation

После `dialog:send:ack` и subsequent tail history merge система должна не append'ить canonical user copy поверх optimistic one, а reconcile их.

Допустимые реализации:
- ввести stable client submission key и переносить его до canonical history message;
- либо хранить pending optimistic user messages per dialog и заменять их при первом canonical echo;
- либо вводить bounded reconciliation heuristic для `role = user` по `content + time window + pending send state`.

Требование:
- stop/resend path не должен оставлять видимые optimistic duplicates;
- workspace switch/reload не должен быть единственным способом самоисцеления UI.

### 4.2. Codex provider: enforce single terminal assistant emission across rollout events

Нужен explicit contract:
- semantic final assistant answer может быть emitted только один раз на turn;
- `task_complete.last_agent_message` служит fallback only, а не второй authoritative source, если equivalent final assistant уже emitted.

Практически:
- dedupe должен работать даже когда `final_answer` не несёт `turn_id`;
- single-owner decision должен основываться на normalized assistant payload identity, а не только на `turnId`.

Возможные реализации:
- считать `final_answer` authoritative whenever present, а `task_complete` использовать только когда final answer отсутствует;
- либо ввести fingerprint terminal assistant payload (`content` + bounded terminal window) и suppress duplicate `task_complete`.

### 4.3. Keep commentary/thinking semantics intact

Фикс не должен:
- ломать legitimate repeated commentary;
- гасить thinking segments;
- suppress different final messages, если `task_complete` реально несёт другой текст;
- удалять normal assistant replays на cold-start, когда в persisted truth message only one.

## 5. Target Files / Structure

### PM/UI duplication path
- `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`
- `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`
- `src/client/project-manager/components/sessions/session-message-dedupe.ts`

### Codex rollout finalization path
- `packages/Codex_Module/src/rollout/codex-rollout-event-parser.ts`
- `packages/Codex_Module/src/rollout/codex-rollout-live-sync.ts`
- `packages/Codex_Module/src/messaging/message-processor.replay.test.ts`
- `packages/Codex_Module/src/rollout/codex-rollout-event-parser.test.ts`

Если execution cycle потребует больше 3 файлов на микро-задачу, Streams нужно будет заранее разделить на:
- PM/UI optimistic reconciliation;
- Codex rollout final terminal dedupe;
- docs/tests sync.

## 6. Required Guards

Нужны regression tests минимум на следующие случаи:

### PM/UI
- `send -> stop -> resend` не создаёт два видимых user bubble для одного canonical message;
- tail `dialog:history:result` корректно заменяет/схлопывает optimistic user bubble;
- full history rebuild after workspace switch сохраняет один экземпляр user message.

### Codex rollout
- `event_msg(agent_message phase=final_answer)` without `turn_id` + same-content `task_complete` => один assistant message;
- replay/cold-start reconstruction из rollout JSONL с таким pair => один assistant message;
- case с legit single `task_complete` without `final_answer` по-прежнему materializes final assistant;
- case с different `task_complete.last_agent_message` не должен быть случайно suppressed.

## 7. Contracts To Sync If Implemented

- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`

`SystemArchitecture.md` обновлять только если итоговый fix сформулирует новый cross-layer invariant про optimistic reconciliation или terminal finalization ownership.

## 8. Scope Boundaries

### In scope
- Codex-specific duplicate final assistant emission from rollout finalization;
- Project Manager dialog duplicate user bubble after `Stop` + fast resend;
- hydration / replay stability for the observed session pattern.

### Out of scope
- глобальная межпровайдерная дедупликация всех message classes;
- redesign session UI bubble model;
- изменение native Codex rollout format;
- изменение SDK event schema;
- cleanup старых исторических session files.

## 9. Execution Readiness

Перед созданием нового `doc/TODO/todo-plan.md` execution cycle должен:
- явно нарезать PM/UI и Codex provider fixes на отдельные Stream;
- зафиксировать, что user-duplicate bug неперсистентный, а assistant-duplicate bug персистентный;
- после user approval решить, идёт ли этот Codex scope отдельным bugfix cycle или вместе с уже созданным Claude follow-up cycle.
