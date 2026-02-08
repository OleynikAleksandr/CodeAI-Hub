# Session UX — Virtual Conversation (Seamless Continuity) Architecture

**Status:** Draft (needs approval)
**Updated:** 2026-02-04
**Owner:** Oleksandr + Codex

---

## 1) Problem

Сейчас “continuation / rollover” технически работает, но UX остаётся сегментированным:
- пользователь видит отдельные provider-сессии (segments) как отдельные сущности;
- сообщения предыдущих сегментов пропадают из текущего контекста UI (если сегменты скрываются ради чистоты вкладок);
- ожидание/блокировки ввода базируются на эвристиках и rollout-уведомлениях, а не на единой модели turn lifecycle;
- в UI присутствуют “шумовые” элементы (например `Continuation #N`, тексты про “1–6 минут”).

Цель Phase 97: **реально одна сквозная лента сообщений**, поверх нескольких физических provider-сессий, так чтобы сегментация оставалась “под капотом”.

---

## 2) Goals

1. **One feed:** пользователь видит одну непрерывную ленту сообщений для выбранного “виртуального диалога”, даже если он фактически состоит из нескольких provider-сегментов.
2. **Minimal segmentation noise:** по умолчанию UI не подсвечивает “Continuation #N”, не показывает детали механики rollover.
3. **Send to active segment:** ввод/отправка всегда адресованы “активному” (последнему) физическому сегменту.
4. **Debug visibility (dev-only baseline):** пока фича в разработке, сохраняем **реальный индикатор токенов из реальных сессий** так, чтобы было понятно “что происходит на самом деле”.

---

## 3) Non-goals

- Делать Core источником правды для “виртуальной ленты” (агрегация — ответственность UI слоя).
- Склеивать / дедуплицировать сообщения по смыслу (только корректный порядок/мердж).
- Переезжать на новую систему хранения истории.

---

## 4) Terms

- **Physical session / provider segment:** один реальный provider thread/sessionId, отражённый в Core как `Session` (и сериализуемый в UI как `SessionRecord`).
- **Continuation chain:** цепочка физических сессий, связанных через `continuationParentId`.
- **Virtual conversation:** логическая “беседа пользователя с агентом”, которая может включать несколько физических сессий (continuation chain).
- **Active segment:** последний (актуальный) физический сегмент в виртуальной беседе — туда отправляется новый user prompt.

---

## 5) Data Model (UI-side)

### 5.1 Virtual conversation identity

В UI вводим вычисляемое понятие:
- `virtualConversationRootId` — id “корневого” сегмента, получаемого обходом `continuationParentId` до `null`.

Это вычисляется на стороне UI из набора `SessionRecord` (Core уже отдаёт `continuationParentId` и `continuationIndex`).

### 5.2 Active segment selection

Для текущего выбранного `activeSessionId`:
- строим `continuationChain` (root → … → active);
- считаем **active segment** = `activeSessionId` (последний сегмент в цепочке, уже выбранный пользователем/логикой PM).

---

## 6) UI Behavior

### 6.1 Tabs / Navigation

- В “virtual conversation mode” UI показывает вкладки на уровне **виртуальных бесед**, а не физических сегментов.
- Базовый MVP для Phase 97: в PM-ветке, где сейчас применяются `forcedHiddenSessionIds` для reviewer-сессий, **оставляем видимой только одну вкладку** (active segment), но ленту сообщений строим из **всей continuation chain**.

То есть: “скрытие сегментов” остаётся оптимизацией навигации, но **не должно скрывать историю из ленты**.

### 6.2 Message feed (Dialog)

- `DialogPanel` получает список сообщений, агрегированный как:
  1) берём все сегменты continuation chain (root → … → active);
  2) для каждого сегмента берём `snapshots[segmentId].messages` (если snapshot загружен);
  3) объединяем в один массив, сортируя по `createdAt` (стабильно, с детерминированным tie-breaker).

- По умолчанию **не вставляем** визуальные разделители “Segment boundary” — лента должна быть непрерывной.

### 6.3 Token indicator (debug baseline)

- В UI оставляем “реальные токены” из физических сегментов.
- Минимальный UX:
  - основной блок `Tokens` продолжает показывать токены **active segment**;
  - дополнительно (debug) показываем компактный список токенов по всем сегментам цепочки (например: `#1 12k/200k`, `#2 …`).

Важно: это **временный** dev-инструмент для наблюдаемости до завершения всех V2 индикаторов/turn_state.

### 6.4 Continuation numbering

- По умолчанию `Continuation #N` не показываем как обязательный UI-текст.
- Допускается показывать continuation-данные в tooltip/деталях/копировании (debug).

---

## 7) Event Model (turn lifecycle → turn_state)

Для корректного input lock и “Agent is working…” без эвристик нужен единый контракт:

- Providers эмитят `turn_started` и `turn_completed` на каждый user-turn.
- Core нормализует в `session:stream` событие:
  - `data.kind = "turn_state"`
  - `data.state = "running" | "idle"`
  - `data.providerId?`

UI:
- блокирует ввод при `connectionState !== "idle"` и при активном continuity/terminal lock;
- unlock не привязан напрямую к `turn_state=idle` и допускается только по contract gates:
  - `turn_completed` + Core `no rollover` (resume-in-place),
  - либо после первого bootstrap assistant answer в target session (resume-via-rollover);
- для one-shot/no-resume (например description collector) input остаётся terminal/read-only после финального ответа.

(Это описывает foundation-часть Phase 97; реализация идёт отдельными микрозадачами.)

---

## 8) Implementation Notes (Phase 97 MVP)

### 8.1 Required UI wiring

Чтобы собрать одну ленту, `SessionView` должен иметь доступ:
- к **полной** коллекции `SessionRecord` (включая скрытые forcedHidden);
- к `snapshots` всех сегментов.

Поэтому потребуется либо:
- передавать в `SessionView` отдельный `allSessions`, а `sessions` оставить “видимыми” для tabs, либо
- перестроить контракт: `visibleSessions` + `sessionIndexById`.

### 8.2 Deterministic ordering

При мердже сообщений:
- сортировка по `createdAt` обязательна;
- при равных `createdAt` — tie-breaker по порядку сегмента в chain и по `message.id` (чтобы не было дрожания UI).

---

## 9) Acceptance Criteria

1. При rollover создаётся новый сегмент, но UI показывает **одну** ленту, где видны сообщения и из старого, и из нового сегмента.
2. Видимых вкладок не становится больше (сегменты не “засоряют” navigation).
3. В UI присутствует индикатор токенов **реальных** сегментов (хотя бы для active + debug-list по chain).
