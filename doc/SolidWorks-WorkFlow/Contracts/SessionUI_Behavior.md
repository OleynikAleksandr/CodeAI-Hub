# Session UI (Project Manager) — Behavior Contract (Happy Path)

**Scope:** каноническое поведение UI сессий в Project Manager при нормальной работе провайдера.

**Applies to:**
- PM bundle: `src/client/project-manager/`
- Shared Session UI: `src/client/ui/src/`

**Цель документа:** чтобы любой будущий фикс в PM/Session UI проверялся на регрессии по этому списку законов, а не только по “текущему багу”.

**Вне скоупа (будет отдельным документом):**
- `resume_failed` / `resume_timeout` / `continuity_failed` и recovery UX;
- гарантии доставки сообщений, ретраи, idempotency/ack;
- сетевые аварии, 401/auth recovery, rate limits.

---

## 1) Термины (SSOT)

- **dialogId** — логический диалог (история/переписка в UI). Диалог “бесконечный”.
- **sessionId** — runtime‑сегмент Core (live статус/lock/usage). Может меняться при continuity/rollover.
- **providerSessionId** — нативный id провайдера (resume thread).

См. также: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md` и `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`.

---

## 2) Источники правды (приоритеты)

### 2.1 Input lock — snapshot‑first
**Закон:** итоговая блокировка ввода пользователя определяется **только snapshot‑сигналами** (из `workspace:snapshot`), а не из текстовых/диалоговых сообщений.

Стрим‑события (`session:stream`) допускаются как “live‑ускорители” UI, но не должны ломать snapshot‑инварианты.

**Важно (гонка гидрации):** `workspace:snapshot` может прийти **раньше**, чем UI успеет создать локальный `SessionSnapshot` по `dialog:list:result` или обработать `session:created` (rollover). UI обязан сохранять последний `workspace:snapshot` и **пере‑применять** его после создания/переключения `sessionId`, иначе возможен “stuck lock” до следующего snapshot/перезагрузки.

### 2.2 История диалога vs live статус
- **DialogPanel (история)** живёт по `dialogId` (в том числе при смене `sessionId`).
- **InputPanel / StatusPanel / SessionIdBar (статусы/лимиты/токены/ID)** должны следовать **активному live `sessionId`**.

---

## 3) Типы сессий (контракт)

### 3.1 One‑shot / no‑resume (Description/collector)
- Пользователь не может продолжать диалог после финального ответа.
- UI должен быть read‑only (блокировка ввода “от начала и до конца”).
- Ручной “замочек” (force unlock) не показывается.

### 3.2 Resume‑сессии (“бесконечные”, напр. Reviewer)
- После каждого завершённого turn, когда агент ждёт пользователя, ввод **обязан** стать доступным.
- Continuity/rollover — внутренняя инфраструктура; пользователь видит один диалог.

---

## 4) Законы блокировки/разблокировки ввода

### 4.1 Глобальный инвариант (что считается “можно вводить”)
В нормальном режиме (без ручного замочка) ввод доступен тогда и только тогда, когда одновременно:
- текущая сессия **не** terminal/read‑only;
- нет active continuity lock;
- `turnState === "idle"` (в UI это соответствует `connectionState === "idle"`);
- нет очереди отправки (queued message).

UI‑копирайт обязан соответствовать состоянию:
- `running` → “Agent is working…”
- `blocked`/continuity lock → “Agent is resuming…”

### 4.2 Workflow‑сессии со стартовым core‑submit
**Закон:** если сессия открывается как workflow‑узел (есть `stage` и `sessionKind`), то она должна быть **заблокирована сразу при открытии**, потому что ядро отправляет стартовый “шаблон/инструкции” как первое user‑сообщение.

Практический смысл: не должно существовать “unlock gap” до первого snapshot/сообщений.

### 4.3 One‑shot / no‑resume
**Закон:** для `no_resume` ввод не разблокируется никогда (read‑only режим).

### 4.4 Resume‑сессии (основной закон)
**Закон:** каждый раз, когда агент завершил turn и ожидает пользователя, UI обязан перейти в “можно вводить” (см. 4.1).

Критично: “агент прислал текст” ≠ “turn завершён”. Разблокировка привязана к финальным статус‑сигналам.

---

## 5) Continuity / rollover — happy path

### 5.1 Общая идея
Continuity делит долгий диалог на runtime‑сегменты (`sessionId`), но диалог в UI остаётся единым.

### 5.2 UX‑закон для rollover
Пока идёт rollover/resume bootstrap:
- ввод заблокирован;
- пользователь видит copy “resuming…”.

Когда новая сессия создана и bootstrap завершён (агент “прочитал отчёт и готов продолжать”):
- в истории появляется разделитель “Новая сессия” (маркер смены `sessionId`);
- активный `sessionId` переключается на новый сегмент;
- **ввод обязан разблокироваться**.

---

## 6) Ручной замочек (force lock/unlock) — текущий контракт

**Зачем:** аварийный escape hatch для resume‑сессий, когда UI оказался заблокированным и пользователь не может даже подготовить/повторить сообщение.

**Границы ответственности (важно):**
- замочек **не гарантирует доставку** сообщения;
- замочек даёт возможность набрать текст и инициировать отправку, но фактическая доставка зависит от того, вернётся ли сессия в нормальный “idle”.

**Где доступен:**
- только в resume‑сессиях;
- не показывается в `collector` (one‑shot) и в terminal/read‑only.

---

## 7) Регрессионный чеклист (happy path)

Минимальный набор сценариев, который обязан оставаться рабочим после любого фикса Session UI:

1) **Workflow open → immediate lock**
   - Открыть workflow‑сессию (stage+sessionKind заданы).
   - Ввод заблокирован сразу, без “unlock gap”.

2) **Reviewer turn complete → unlock**
   - Дождаться ответа Reviewer.
   - После завершения turn ввод становится доступным.

3) **One‑shot Description → always read‑only**
   - После отправки анкеты и финального ответа Description ввод остаётся read‑only.
   - Замочек не появляется.

4) **Rollover happy path → unlock after bootstrap**
   - Дойти до rollover.
   - Во время rollover ввод заблокирован и copy “resuming…”.
   - После появления “Новая сессия” и завершения bootstrap ввод разблокирован.

5) **Статусные панели не “подвисают” на старом сегменте**
   - После rollover SessionIdBar/StatusPanel отображают данные активного сегмента (актуальный `sessionId`/`providerSessionId`).
