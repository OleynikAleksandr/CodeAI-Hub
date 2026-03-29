# Session Turn Stop And Core Independence Architecture

**Status:** Accepted for implementation  
**Date:** 2026-03-29  
**Baseline:** `1.1.833`

---

## 1. Проблема

Текущий контракт `Session UI -> Stop` исторически трактует остановку как shutdown всего Core runtime. Это было допустимо как временный workaround, пока `Stop` использовался как грубый "reset everything".

После накопления provider/runtime сценариев это стало архитектурной ошибкой:

- проблема одного dialog turn не должна убивать independent Core;
- stuck session не должна требовать restart всего runtime;
- Gemini может зависать mid-turn без `finished`/`error`, и такой stall не должен эскалироваться в остановку Core;
- пользователь ожидает от `Stop` именно остановку текущей работы агента, а не остановку инфраструктуры.

---

## 2. Подтверждённое текущее поведение

На baseline `1.1.833` подтверждены два факта:

1. `Stop` всё ещё привязан к global Core shutdown path:
   - UI path вызывает supervisor stop / `POST /api/v1/shutdown`;
   - SSOT `SessionUI_Behavior.md` прямо описывает `■` как остановку Core.

2. Gemini может повиснуть внутри turn без нормального завершения:
   - в SDK log второй тестовый turn дошёл до `model_info`;
   - `finished` и `error` не пришли;
   - unified session history остановилась на user message;
   - stuck state остался в UI.

Итог: текущий продукт смешивает две разные операции:

- `stop current turn / unlock current session`;
- `shutdown whole core runtime`.

Эти операции должны быть разведены.

---

## 3. Решение, принятое для этого scope

### 3.1. Новый продуктовый смысл кнопки Stop

`Stop` в Session UI означает:

- остановить текущий turn, если он ещё идёт;
- либо аварийно снять stuck-state, если turn фактически закончился, но input не разблокировался;
- не останавливать Core runtime;
- не останавливать другие dialog sessions/workspaces.

### 3.2. Logical session важнее provider session

Logical session в Core должна жить дольше, чем конкретная provider session.

Если текущий provider transcript после stop потенциально испорчен, в MVP допустимо:

- не очищать старый transcript;
- не чинить старый raw JSONL;
- на следующий send создать fresh provider session;
- перебиндить её к той же logical session;
- продолжить работу пользователя в том же dialog context на уровне Core/PM/UI.

### 3.3. Global Core shutdown остаётся только отдельным runtime-control действием

Core shutdown допускается только для явных глобальных действий:

- restart/reinstall runtime;
- explicit app-level shutdown;
- release/runtime maintenance path.

Session input `Stop` не должен ходить в этот контур.

---

## 4. Термины и инварианты

### 4.1. Термины

- `Logical session` — сессия Core/PM/UI, которая живёт в unified session storage и видна пользователю.
- `Provider session` — конкретная live session/thread внутри Claude/Codex/Gemini runtime.
- `Turn` — один outbound send + provider stream до terminal outcome (`completed`, `cancelled`, `failed`, `stalled-recovered`).
- `Stopped binding` — состояние logical session, в котором прежняя provider session больше не считается пригодной для следующего send.

### 4.2. Инварианты

- Один provider failure/stall не должен останавливать Core runtime.
- `Stop` действует только на active logical session.
- После `Stop` logical session остаётся доступной для следующего send.
- Если текущая provider session признана непригодной, следующий send обязан rebinding-ить fresh provider session до dispatch.
- MVP не обязан очищать уже записанный partial transcript.

---

## 5. Целевой UX-контракт

### 5.1. Stop во время активного turn

Когда provider реально ещё работает:

- UI отправляет session-scoped stop command;
- Core отменяет/закрывает текущую provider session;
- session переходит в recoverable `idle/unlocked`;
- Core runtime продолжает жить;
- следующий send либо идёт в тот же binding, либо создаёт fresh binding, если старый stop-tainted.

### 5.2. Stop после фактического завершения turn, но при stuck input

Когда агент уже закончил по смыслу, но UI/Core застряли в `working`:

- UI отправляет тот же session-scoped stop command;
- Core снимает stuck-state и переводит session в `idle/unlocked`;
- provider binding может быть сохранён или признан stale;
- Core runtime не останавливается.

### 5.3. Следующее сообщение пользователя

После `Stop` пользователь может отправить:

- то же сообщение;
- новое сообщение.

Core должен:

- продолжить ту же logical session;
- при необходимости пересоздать provider session;
- не требовать restart Core/launcher.

---

## 6. Архитектурный контур решения

### 6.1. UI / bridge

Нужен новый session-scoped command, условно `session:stop`.

Он должен:

- передавать только `sessionId`;
- не вызывать supervisor stop;
- не вызывать `/api/v1/shutdown`;
- использоваться единственным UI path для `Stop` в Session input.

### 6.2. Core session actions

Core должен получить отдельный `handleStop(sessionId)` path:

- найти active logical session;
- снять live binding с этой session;
- закрыть/abort-нуть текущую provider session через provider adapter;
- перевести logical session в recoverable state;
- пробросить в UI события, которые разблокируют input.

### 6.3. Rebind on next send

`dispatchUserMessage(...)` должен уметь работать не только с existing binding, но и с stopped/missing binding:

- если binding пригоден, использовать его;
- если binding stop-invalidated, создать новую provider session того же provider;
- обновить binding и continuity references там, где это допустимо;
- только после этого отправить новое сообщение.

### 6.4. Gemini stalled-turn recovery

Gemini-specific слой должен перестать бесконечно ждать stream, который дал `model_info`, но не дал terminal outcome.

Для этого нужен recoverable stalled-turn path:

- timeout/watchdog на отсутствие meaningful progress;
- перевод turn в controlled stop/failure;
- возврат session в unlock/retryable state;
- без остановки Core runtime.

---

## 7. MVP-границы

В этот scope сознательно не входят:

- очистка уже записанного partial provider transcript;
- surgical cleanup старых JSONL/SDK logs;
- сложная реконструкция "правильного" resume поверх испорченного transcript;
- попытка гарантированно продолжить именно тот же provider thread после forced stop.

MVP-правило:

- если provider transcript испорчен, создаём fresh provider session и ребиндим logical session;
- исторический мусор остаётся как есть.

---

## 8. Файловые и модульные seams

Ожидаемые ключевые зоны изменений:

- UI:
  - `src/client/ui/src/session/input-panel.tsx`
  - `src/client/ui/src/session/input-play-stop-button.tsx`
  - `src/client/ui/src/core-bridge/core-bridge.ts`

- Bridge/Core contracts:
  - `packages/core/src/remote-bridge/session-stream-contracts.ts`
  - `packages/core/src/remote-bridge/remote-bridge-message-router.ts`

- Core session handling:
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`
  - `packages/core/src/remote-bridge/handlers/session-provider-binding-service.ts`
  - `packages/core/src/session-manager/index.ts`

- Gemini runtime:
  - `packages/Gemini_Module/src/session/gemini-turn-runner.ts`
  - `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`
  - `packages/Gemini_Module/src/session/gemini-session-manager.ts`

---

## 9. Acceptance criteria

Scope считается закрытым, когда выполнены все пункты:

1. Нажатие `Stop` в Session UI не останавливает Core runtime.
2. `core.log` не получает `Shutdown request received via API` от session-stop path.
3. Mid-turn `Stop` разблокирует input без restart Core.
4. Post-turn stuck `Stop` тоже разблокирует input без restart Core.
5. Следующее сообщение пользователя создаёт fresh provider session только если старый binding признан непригодным.
6. Gemini silent stall приводит к recoverable session state, а не к вечному `working`.
7. После закрытия связанного блока фаз собран новый релиз по Release Build Checklist.

---

## 10. Execution framing

На уровне `doc/TODO/todo-plan.md` этот scope должен быть разрезан на четыре связанные части:

1. `Phase 82` — Stop contract / UI / bridge.
2. `Phase 83` — Core session stop + rebind.
3. `Phase 84` — Gemini stalled-turn recovery.
4. `Phase 85` — финальная release build phase после закрытия связанных фаз.

Первый implementation gate перед кодом:

- синхронизировать SSOT-контракт `SessionUI_Behavior.md` с этим решением;
- только после этого добавлять transport command `session:stop` и Core/UI stop-path.
