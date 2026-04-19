# Project Manager Multi-Workspace Performance And Event-Driven Usage Refresh — Planning Doc

## 1. Problem

При активном использовании Project Manager c несколькими одновременно открытыми workspace / dialog session система может создавать настолько тяжёлый фоновый churn, что начинает деградировать общая отзывчивость macOS, вплоть до лагов Finder.

Подтверждённый пользовательский симптом:
- одновременно использовались три workspace в PM;
- даже на Mac Studio с большим объёмом памяти система начала ощутимо тормозить;
- после остановки Core часть фоновой активности исчезла и Finder сразу «ожил».

На текущий момент проблема выглядит не как доказанная утечка provider one-turn процессов, а как накопление фоновой клиентской и core-side активности поверх уже завершённых turn / session:
- repeated dialog bootstrap/history/list cycles;
- repeated usage limits refresh against already completed runtime sessions;
- workflow polling across several PM clients;
- дополнительный translation workload во время активных thinking-heavy turn.

Это нарушает ожидаемый product contract:
- one-turn provider activity не должна превращаться в длительный постоянный background churn после завершения turn;
- открытая PM session не должна постоянно reread'ить history / usage / workflow state без жёсткого event trigger;
- multi-workspace usage не должна линейно размножать expensive polling loops на каждый открытый client/view.

## 2. Confirmed Evidence

### 2.1. Core had multiple simultaneous PM clients

Core log:
- `/Users/oleksandroliinyk/.codeai-hub/logs/core/core.log`

Подтверждено:
- `activeClients: 1`
- затем `activeClients: 2`
- затем `activeClients: 3`

Это означает, что несколько PM/UI clients реально держали background loops одновременно.

### 2.2. The same completed sessions were repeatedly re-bootstrapped and refreshed

По тому же core log зафиксированы повторные события:
- `pm.dialog.bootstrap.resolved`
- `pm.refreshUsageLimits.requested`

для уже известных session/dialog pair спустя минуты после завершения turn.

Подсчёт по зафиксированному логу:
- `pm.refreshUsageLimits.requested`: `24`
- `pm.dialog.bootstrap.resolved`: `13`

При этом повторяются одни и те же runtime session id:
- `15c2c78b-f135-44fe-870a-a6f537108383`
- `cce9d786-f8f6-430d-b276-39e341cda0e3`
- `7a05493f-c76f-4305-8602-d1dbd702b058`

Вывод:
- проблема не ограничивается live turn;
- completed sessions продолжают обслуживаться как будто требуют bootstrap / usage refresh заново.

### 2.3. PM dialog UI currently owns mount-driven usage refresh

Current path:
- `src/client/ui/src/session/session-id-bar.tsx`
- `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`
- `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`

`SessionIdBar` при `binding.status === "ready"` вызывает `onRefreshUsageLimits(...)`.

Это делает usage refresh зависимым от UI mount/rebind/render lifecycle вместо жёсткого session lifecycle event.

### 2.4. Dialog controller still reissues expensive history/list calls

Current path:
- `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`
- `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`

Подтверждено:
- `dialog:list:result` может повторно запускать bootstrap + history read;
- `dialog:send:ack` запускает history refresh + dialog list refresh;
- `dialog:message` запускает history refresh + dialog list refresh;
- `core:state` запускает full history replay + dialog list refresh;
- пока `session` ещё не связана, controller держит секундный retry loop до `30` попыток.

### 2.5. Core-side handlers for those requests are not cheap

Current path:
- `packages/core/src/remote-bridge/handlers/dialog-history-service.ts`
- `packages/core/src/remote-bridge/handlers/dialog-list-service.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts`

Подтверждено:
- `dialog:history` перечитывает unified session JSONL + translation overlays;
- `dialog:list` читает continuity index / chain files / session-history presence;
- `session:refreshUsageLimits` уходит в provider adapter.

Для Codex это особенно дорого, потому что usage refresh path перечитывает rollout JSONL с диска:
- `packages/Codex_Module/src/provider/codex-provider-adapter.ts`
- `packages/Codex_Module/src/sdk/codex-usage-limits-reader.ts`

### 2.6. Workflow polling multiplies per open PM client

Current path:
- `src/client/project-manager/services/workflow-state-store.ts`
- `src/client/project-manager/services/workflow-events-client.ts`
- `src/client/project-manager/components/layout/use-artifact-availability.ts`
- `src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx`

Подтверждено:
- workflow state polling: `3s -> 10s`
- workflow events polling: `2s` or `10s`
- artifact availability polling: `10s`
- diagram modules progress polling: `3s`

Даже если каждый цикл по отдельности умеренный, вместе с несколькими open clients и dialog bootstrap/read loops они создают cumulative idle churn.

### 2.7. Translation pipeline is an additional active-turn amplifier

В том же core log зафиксированы repeated:
- `Thinking dialog message entered translation pipeline`
- `Session translation dispatch started`
- `Session translation completed`

За наблюдаемый интервал:
- `39` queued/dispatched thinking translation jobs

Это не primary root cause idle degradation, но это важный multiplier при одновременной работе нескольких reasoning-heavy sessions.

### 2.8. Token usage and usage limits already have partial event-driven infrastructure

Важно не смешивать два разных telemetry path:

1. `tokenUsage` / context window:
- уже поступает через session stream events;
- provider-side post-turn completion paths умеют эмитить token usage;
- client хранит last known token usage в localStorage cache;
- core умеет replay token usage snapshots and continuity snapshots on bind/reconnect.

2. `usageLimits`:
- уже могут приходить как part of post-turn provider payload / replay event;
- core websocket layer already replays last known usage-limits stream event.

Следовательно, главный архитектурный пробел не в отсутствии event path как такового, а в том, что UI поверх этого всё ещё запускает mount-driven refresh и фоновые rereads.

## 3. Root Cause

### 3.1. Ownership of refresh is inverted

Сейчас refresh usage data инициируется UI mount lifecycle (`SessionIdBar`) вместо session lifecycle / provider lifecycle.

Это фундаментально неправильная ownership model:
- UI не знает, когда usage реально устарели;
- UI mount/rebind может происходить чаще, чем меняются provider limits;
- одинаковая session может refresh'иться снова и снова при reopen/rebootstrap/reconnect.

### 3.2. PM dialog restoration path is too eager

Dialog controller aggressively reissues:
- list;
- history;
- bootstrap;
- restore;

без строгого distinction между:
- initial open;
- live active turn;
- completed idle dialog;
- reconnect after client restart;
- repeated workspace switch.

### 3.3. Multi-client PM usage multiplies background work instead of sharing it cleanly

Хотя `workflowStateStore` уже singleton внутри одного browser runtime, overall system-level load всё равно масштабируется по числу одновременных PM clients / windows / workspaces, потому что:
- каждый client держит собственные websocket + polling loops;
- каждый client может trigger'ить dialog bootstrap/history/list flows;
- refresh ownership привязана к mounted session UI.

### 3.4. There is no strict trigger matrix for usage telemetry

На сегодня отсутствует единый contract:
- когда именно надо refresh/hydrate `usageLimits`;
- когда именно надо update/hydrate `tokenUsage`;
- какой слой владеет этим refresh;
- когда background refresh explicitly forbidden.

Из-за этого продукт постепенно дрейфует к "best effort polling" вместо "hard event-driven lifecycle".

## 4. Solution

### 4.1. Move usage telemetry ownership away from UI mount lifecycle

`SessionIdBar` и Session UI в целом не должны самостоятельно решать, когда refresh usage data.

Целевой контракт:
- UI только отображает уже имеющийся snapshot;
- trigger ownership находится в core/provider session lifecycle;
- session open / reconnect / turn completion являются единственными допустимыми automatic triggers.

### 4.2. Accept the user proposal with one important refinement

Предложение пользователя в целом правильное:
- limits refresh должен выполняться на открытии session;
- limits refresh должен выполняться после terminal provider answer;
- context window должен обновляться после terminal provider answer.

Но технически правильный trigger — это не raw "последнее сообщение агента", а normalized terminal lifecycle event:
- `turn_completed`

Причина:
- final visible assistant bubble может materialize раньше, чем provider/module дочитает trailing token/usage snapshot;
- именно `turn_completed` already represents the safe boundary after post-turn usage sync;
- это даёт одинаковый contract для Claude / Codex / Gemini.

### 4.3. Required trigger matrix

#### Usage limits

Автоматические trigger only:
- `session_opened` / `dialog_opened` / `binding_ready`:
  - сначала replay cached last-known `usageLimits` event, если он уже есть;
  - если cached snapshot отсутствует или признан stale, допускается один bootstrap refresh;
  - bootstrap refresh выполняется ровно один раз на lifecycle открытия, а не на каждый mount/rerender.
- `turn_completed`:
  - provider/core обязаны доставить актуальные `usageLimits` в stream payload либо немедленно запустить internal post-turn refresh без участия UI.
- `provider_session_rebound` / restore to another provider session id:
  - трактуется как новый open/bind lifecycle и допускает один bootstrap refresh.

Запрещено:
- refresh on every Session UI mount;
- refresh on every `dialog:list:result`;
- refresh on every `dialog:message`;
- background polling for limits while session is simply open but idle.

#### Token usage / context window

Автоматические trigger only:
- `session_opened` / reconnect:
  - hydrate from last known token usage cache and/or continuity replay;
  - provider refresh at open is not required by default.
- `turn_completed`:
  - provider/core обязаны доставить terminal `tokenUsage` snapshot as part of turn-completion flow or an equivalent guaranteed stream event.
- continuity / replay restore:
  - existing last-known token snapshot may be replayed to rebuild UI after reconnect.

Запрещено:
- отдельный polling/refresh loop для context window;
- UI-initiated token usage refresh on mount.

### 4.4. Tighten PM dialog restoration rules

Dialog list/history/bootstrap reads должны быть разделены по фазам:
- initial open;
- active live turn;
- explicit reconnect / core restart recovery;
- manual user action.

Completed idle dialogs не должны регулярно re-bootstrap'иться только потому, что PM panel остаётся mounted.

### 4.5. Make background polling visibility-aware

Workflow and artifact polling должно иметь более жёсткий режим:
- active visible workspace: normal cadence;
- background but still selected client: slower cadence;
- hidden/inactive workspace panels: paused or near-zero cadence.

Это отдельный, но связанный performance guard.

### 4.6. Keep provider/process leak investigation explicit but separate

На текущем evidence нет прямого доказательства leaked provider processes.

Поэтому этот scope не должен prematurely утверждать process leak как root cause.

Правильная формулировка:
- confirmed root cause: PM/core-side background churn from repeated refresh/bootstrap/polling;
- possible secondary investigation: verify whether any provider subprocesses survive beyond expected lifecycle under heavy multi-workspace usage.

## 5. Target Files / Structure

### Usage trigger ownership
- `src/client/ui/src/session/session-id-bar.tsx`
- `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`
- `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`

### Dialog/session lifecycle
- `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`
- `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`

### Workflow/background polling
- `src/client/project-manager/components/layout/main-area.tsx`
- `src/client/project-manager/services/workflow-state-store.ts`
- `src/client/project-manager/services/workflow-events-client.ts`
- `src/client/project-manager/components/layout/use-artifact-availability.ts`
- `src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx`

### Core replay/bootstrap ownership
- `packages/core/src/remote-bridge/handlers/websocket-manager.ts`
- `packages/core/src/remote-bridge/handlers/session-provider-binding-service.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts`

### Provider post-turn guarantees
- `packages/Claude_Module/src/messaging/claude-message-finish-handler.ts`
- `packages/Codex_Module/src/messaging/codex-message-finish-handler.ts`
- `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`

Если execution cycle окажется слишком широким, он должен быть разделён минимум на три Stream:
- event-driven usage trigger ownership;
- PM dialog/bootstrap/polling suppression;
- verification/diagnostics/docs sync.

## 6. Required Guards

Нужны regression / integration guards минимум на следующие случаи:

### Usage telemetry
- opening a completed session replays cached `usageLimits` / `tokenUsage` without recurring refresh spam;
- `turn_completed` updates both context window and usage limits once per turn;
- Session UI remount does not trigger another automatic limits refresh;
- provider session rebind triggers at most one bootstrap refresh.

### PM dialog lifecycle
- idle completed dialog does not repeatedly request `dialog:list` / `dialog:history` on its own;
- reconnect/core restart still rehydrates correctly once;
- switching between workspaces does not multiply refresh loops for hidden dialogs.

### Polling budget
- inactive/hidden workspace stops or strongly slows workflow/artifact polling;
- visible active workspace retains correct live updates.

### Replay
- websocket reconnect replays last known `tokenUsage` and `usageLimits` snapshots without forcing provider read;
- continuity bootstrap still restores token usage correctly after reopen.

## 7. Contracts To Sync If Implemented

- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

Новый SSOT должен зафиксировать:
- event-driven ownership of usage telemetry;
- prohibition of mount-driven automatic usage refresh;
- visibility-aware PM polling policy.

## 8. Scope Boundaries

### In scope
- PM/core performance degradation caused by repeated refresh/bootstrap/polling activity;
- event-driven trigger matrix for `usageLimits` and `tokenUsage`;
- suppression of idle refresh churn for completed sessions;
- multi-workspace PM polling budget and visibility-aware throttling;
- replay/bootstrap contract for open-session hydration.

### Out of scope
- proof of OS-level memory leak without dedicated profiler run;
- changing provider SDK/native event schemas;
- removing continuity/session replay as a product capability;
- redesign of Session UI visual layout;
- release-time packaging or launcher performance unrelated to PM/core runtime loops.

## 9. Execution Readiness

Перед созданием нового `doc/TODO/todo-plan.md` следующий execution cycle должен:
- согласовать с пользователем, идёт ли этот performance scope отдельным bugfix cycle;
- завести отдельную Bug Registry entry для PM/core performance degradation under multi-workspace load;
- при нарезке на Stream явно разделить:
  - usage trigger ownership;
  - dialog/bootstrap/polling suppression;
  - diagnostics/replay verification.

Отдельно нужно сохранить в scope design decision:
- proposal accepted: limits refresh on session open + terminal turn completion;
- refinement accepted: trigger must be `turn_completed`, not raw final assistant message;
- context window at open should hydrate from replay/cache, not from a new provider refresh by default.
