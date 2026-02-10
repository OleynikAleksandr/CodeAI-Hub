# Session UI — Layout Stability (Fixed Heights + Info Consolidation)

**Status:** Active (Phase 120 implemented; Phase 122 planned adjustments)
**Updated:** 2026-02-10
**Owner:** Oleksandr + Codex

---

## 0) Scope

Цель Phase 120 — убрать любые “прыжки” интерфейса диалога вверх/вниз при изменении состояния (locked/unlocked, появление/исчезновение строк статуса) и улучшить читаемость статусной строки.

Правки затрагивают общий Session UI (shared), который используется в:
- Project Manager (CEF UI)
- VS Code webview (частично, в местах где используется shared SessionView)

В рамках Phase 120 делаем только UI/верстку/стили, **без изменения** runtime протокола, wire сообщений и lock/unlock логики.

---

## 1) Problem

Наблюдаемые UX-проблемы:

1) Нижняя инфо-панель (Models/Tokens + continuity-строка) меняет высоту в зависимости от наличия строк.
- Итог: при появлении/исчезновении 2-й строки контента диалог смещается.

2) Панель ввода пользователя изменяет высоту при:
- blocked/locked состоянии (исчезает подсказка);
- разной “слоистости” контейнеров вокруг textarea.
- Итог: диалог “подпрыгивает” при блокировке/разблокировке.

3) Отдельная плашка `Session ID: <uuid>` над диалогом создаёт шум и съедает вертикальное пространство.

---

## 2) Target UX (Acceptance) — Phase 120 (implemented)

### 2.1 Status panel: Models + Tokens в одну строку

**Требование:** первая строка статус панели должна быть **одной строкой** и содержать Models + Tokens в едином формате.

Формат:
- `Models: <modelName>  |  Tokens: <used> / <limit> (<percent>%)`

Пример:
- `Models: Opus  |  Tokens: 0 / 200,000 (100%)`

Правила отображения:
- `<modelName>`: primary/активная модель (пример: `Opus`).
- `<used> / <limit>`: числа с разделителем тысяч и запятой (`200,000`).
- `<percent>`: процент оставшегося окна (как показано в UI), целое значение.

**Важно:** первая строка всегда рендерится в предсказуемом лэйауте (без переносов и без скачка высоты).

### 2.2 Вторая строка статус панели: continuity/rollover

**Требование:** вторая строка остаётся выделенной под continuity/rollover информацию.

- Вторая строка может быть пустой, но место под неё резервируется.
- Контент второй строки (copy) не меняем в этой фазе, только гарантируем, что место под него стабильно.

### 2.3 Status panel: фиксированная высота

**Требование:** высота статус панели не должна меняться:
- вне зависимости от наличия/отсутствия контента во второй строке.

Целевое поведение:
- высота = “как сейчас” (визуально та же, но стабильная),
- при пустой 2-й строке не происходит коллапса.

---

## 3) Input panel (textarea) — меньше слоёв, фиксированная высота

### 3.1 Упростить слои контейнеров

**Требование:** визуально сейчас около 3 слоёв вокруг textarea:
- нижняя большая плашка,
- внутри неё ещё одна (чуть темнее/меньше),
- внутри неё textarea.

Нужно:
- увеличить зону ввода (textarea area) до размера “второй снизу” плашки,
- промежуточную плашку удалить,
- сохранить корректные отступы, фон, скругления, и не сломать drag&drop / clipboard / resize поведение.

### 3.2 Фикс высоты input panel (anti layout-shift)

**Требование:** высота всей панели ввода должна быть фиксированной и не меняться при locked/unlocked.

Опорное состояние для высоты:
- unlocked и показывается строка подсказки:
  - `Press Enter to send, Shift+Enter for a new line`

Поведение при locked/unavailable input:
- подсказка может исчезать визуально,
- но место под неё сохраняется (например: `visibility: hidden` вместо `display: none`, либо отдельный “slot” фиксированной высоты).

### 3.3 Убрать оранжевую окантовку при вводе/фокусе

**Требование:** временно отключить смену цвета окантовки textarea на оранжевый при focus/typing.

Целевое поведение:
- border/outline остаётся одного и того же цвета в idle и focused состоянии.
- В Phase 120 не делаем новый дизайн focus-стейтов, только убираем “оранжевое выделение”.

---

## 4) Session ID — Phase 120 (implemented)

### 4.1 Удалить верхнюю плашку Session ID

**Требование:** убрать UI элемент с текстом:
- `Session ID: ff644c95-9ade-467a-9c11-fdb4a832a5d3`

### 4.2 Показать ID в табе сессии

**Требование:** ID должен отображаться в табе рядом с названием агента/провайдера.

Формат:
- `... — ID: ff644c95-...`

Где:
- `ff644c95` — первые 8 символов UUID,
- затем `-...`.

Пример:
- `Description Claude — ID: ff644c95-...`

Дополнительно:
- увеличить ширину таба, чтобы строка была читаемой (без агрессивного усечения).

---

## 5) Non-goals (явно не делаем в Phase 120)

- Не меняем логику lock/unlock, resumeMode, turnState и continuity pipeline.
- Не меняем протокол и вычисление token usage.
- Не делаем редизайн/рефакторинг остальных частей диалога.

---

## 6) Implementation Notes (Non-normative)

### 6.1 Ожидаемые точки изменения

- Status panel:
  - `src/client/ui/src/session/status-panel.tsx`
  - при необходимости helpers/formatters:
    - `src/client/ui/src/session/model-info-builder.ts`
    - `src/client/ui/src/session/token-usage-cache.ts`

- Input panel:
  - `src/client/ui/src/session/input-panel.tsx`
  - `src/client/ui/src/session/input-textarea.tsx`
  - стили:
    - `src/client/ui/src/styles/session.css`

- Session ID и табы:
  - `src/client/ui/src/session/info-panel.tsx` (плашка)
  - `src/client/ui/src/session/session-tabs.tsx` (лейбл таба)

### 6.2 Рекомендованный anti-shift подход

- Для панелей с условными строками использовать постоянные слоты:
  - фиксированный `min-height` для строки,
  - скрывать контент через `visibility: hidden`.
- Для status panel использовать 2 строки как структуру, даже если 2-я пустая.

---

## 7) Related Docs

- `doc/SolidWorks-Flow/Stacks/Project_Manager.md`
- `doc/SolidWorks-Flow/WorkspaceRuntime/WorkspaceRuntime.md`
- `doc/SolidWorks-Flow/System/SystemArchitecture.md`

---

## 8) Phase 122 — Planned UI Adjustments (future refactor)

Цель Phase 122 — внести корректировки в Session UI поверх Phase 120, без изменения runtime/lock логики.

### 8.1 Session ID: вернуть отдельную плашку между Tabs и Dialog

**Требование:** вернуть компактную плашку **между табами сессии и панелью диалога** и показывать в ней Session ID.

Формат (строго):
- `ID: 21280164-...`

Правила:
- показываем **первые 8 символов** UUID,
- затем `-...`.

Типографика:
- шрифт/размер/цвет должны совпадать с текстом подсказки ввода:
  - `Press Enter to send, Shift+Enter for a new line`

### 8.2 Tabs: убрать Session ID из таба, оставить только имя агента

**Требование:** в табе оставить только лейбл агента (например: `Reviewer Claude`) без `ID: ...`.

Дополнительно:
- уменьшить ширину (min-width) таба до компактного значения, чтобы не съедать место в UI.

### 8.3 Status panel: одна строка, right-aligned continuity

**Требование:** статус-панель сделать **однострочной** и уменьшить её высоту до высоты одной строки.

Лэйаут:
- слева: `Models: Opus | Tokens: 28,500 / 200,000 (86%)`
- справа (по правому краю той же плашки): `#1 70% | #2 86%`

Типографика:
- выровнять шрифт (размер/вес) статус-панели до уровня текста input-hint (см. 8.1).

### 8.4 Non-goals (Phase 122)

- Не менять протокол и вычисление token usage.
- Не менять логику lock/unlock, continuity pipeline.

### 8.5 Expected touchpoints

- `src/client/ui/src/session/session-view.tsx` (вставка плашки ID)
- `src/client/ui/src/session/session-tabs.tsx` (компактные табы без ID)
- `src/client/ui/src/session/status-panel.tsx` (однострочный layout)
- `media/session-view.css` (layout + typography tokens)
