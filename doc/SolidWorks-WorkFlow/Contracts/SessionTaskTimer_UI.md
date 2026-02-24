# Session UI — Task Execution Timers (total + turn) — Behavior Contract

**Scope:** Session UI (webview) — таймеры ожидания/выполнения задач агентом.

**Applies to:**
- Session UI: `src/client/ui/src/session/`
- Styles: `media/session-view.css`

**Goal:**
- Во время выполнения задачи агентом показать “живой” индикатор прогресса (таймер текущего turn).
- Всегда показывать накопленное время ожидания по данному workflow‑агенту (total), чтобы пользователь видел суммарные затраты времени.
- Накопление total не сбрасывается при continuity/rollover (смена `sessionId`).
- Накопление total не теряется при смене workspace/перезагрузке Project Manager (SSOT находится в Core).

---

## 1) Что считаем временем (вариант A)

Мы считаем **время ожидания**: от момента, когда UI переходит в режим ожидания (пользователь/ядро отправили задачу и агент занят), до момента, когда агент закончил turn и UI снова готов принять ввод.

Практическая формулировка в терминах UI:
- **Start**: когда сессия переходит в состояние “агент занят” (input UX показывает ожидание).
- **Stop**: когда сессия вернулась в состояние “агент свободен” (input UX позволяет отправлять).

В счётчик включается и “resuming/continuity” ожидание, если оно блокирует нормальную работу пользователя.

---

## 2) Два таймера и где они показываются (placement)

### 2.1 Total (накопительный)
- **Что показывает:** накопленное суммарное время ожидания по данному workflow‑агенту.
- **Где:** справа в футере под полем ввода, напротив подсказки:
  - `Press Enter to send, Shift+Enter for a new line`
- **Видимость:** total **не исчезает никогда**, включая моменты, когда ввод заблокирован.
- **Цвет:** всегда серый (как hint), без переключения в wait‑цвет.
- **Динамика:** во время lock total не тикает визуально; прибавление времени происходит **скачком** после завершения turn (когда ввод снова разблокирован).
- **Формат вывода:** `total:  00h 00m 00s`.

### 2.2 Turn (текущий turn)
- **Что показывает:** время ожидания **текущего** turn.
- **Где:** прямо на поле ввода (overlay справа), рядом с lock/wait UX.
- **Сброс:** turn‑таймер **обнуляется при каждом начале нового turn**.
- **Оформление:** текст без фоновой плашки/подложки.

---

## 3) Накопление (per workflow-agent)

Total накапливается не “по sessionId”, а по workflow‑узлу (`nodeId`) в рамках workspace.

**Key (concept):**
- `workspaceRoot`
- `nodeId`

**Инвариант:** при continuity/rollover новый `sessionId` должен продолжать тот же total.

---

## 4) SSOT и доставка в UI

SSOT таймера находится в Core: UI **не хранит** и **не считает** total самостоятельно, а только отображает данные из Core.

Доставка:
- Core добавляет `taskTimer` в `SessionSnapshot` внутри `workspace:snapshot`.
- UI читает `taskTimer.totalSeconds` и `taskTimer.runningSinceMs` из snapshot и отображает:
  - total = `totalSeconds` (статично во время lock),
  - turn = `now - runningSinceMs` (живая цифра overlay).

Persist (текущее):
- В текущей реализации таймер хранится в памяти Core и может сброситься при перезапуске Core.

---

## 5) Формат отображения

- Формат: текстом, без анимаций.
- Английские сокращения: `00h 00m 00s`.
- Миллисекунды не считаем и не отображаем.

---

## 6) Edge cases

- Stop (user-interrupted running turn): when Stop ends a busy segment, the elapsed `now - runningSinceMs` must be committed into `totalSeconds` (if the session is accumulative), and the next Play/Send must not reset `totalSeconds`.
- `terminal_no_resume`: таймеры не должны “накручиваться” в read-only сессии, но total может отображаться.
- `resumeMode="no_resume"` (one-shot): total не накапливается, но turn-таймер должен показываться во время выполнения turn.
- Если подсказка `Press Enter...` скрывается во время ожидания (lock), total всё равно остаётся видимым.
