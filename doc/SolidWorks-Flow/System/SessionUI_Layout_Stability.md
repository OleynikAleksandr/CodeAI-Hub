# Session UI — Layout Stability (Fixed Heights + Info Consolidation)

**Status:** Draft (approved by user intent)
**Updated:** 2026-02-09
**Owner:** Oleksandr + Codex

---

## 0) Scope

Небольшие UI-правки, цель которых — убрать “прыжки” интерфейса диалога при изменении состояния:
- нижняя инфо-панель с моделями/токенами/continuity;
- панель ввода пользователя;
- отображение Session ID (перенос из отдельной плашки в таб сессии).

Затрагивается общий Session UI (shared), используемый в Project Manager и (частично) в webview.

---

## 1) Problem

Сейчас при:
- появлении/исчезновении второй строки в инфо-панели;
- появлении/исчезновении нижней подсказки ввода;
- смене состояния (locked/unlocked),

высота нижних панелей меняется, и вся область диалога “скачет” вверх/вниз.

---

## 2) Target UX (Acceptance)

### 2.1 Нижняя инфо-панель (Models/Tokens)

- Первая строка: единый формат в одну строку:
  - `Models: <primaryModel>  |  Tokens: <used> / <limit> (<percent>%)`
- Вторая строка **резервируется** под continuity/rollover информацию.
- Высота инфо-панели **фиксированная** (как сейчас), вне зависимости от того, заполнена ли 2-я строка.

### 2.2 Панель ввода пользователя

- Упростить визуальные “слои”:
  - увеличить зону ввода до “второй снизу” плашки;
  - промежуточный слой удалить, не ломая отступы/фон/скругления.
- Высота всей панели ввода **фиксированная** в состоянии unlocked, когда показывается подсказка:
  - `Press Enter to send, Shift+Enter for a new line`
- При блокировании ввода подсказка может быть скрыта, но высота панели **не меняется** (подсказка скрывается без коллапса, например через `visibility: hidden` и/или сохранение места).
- Оранжевую обводку textarea при вводе/фокусе временно убрать: фокус/ввод не меняют цвет окантовки.

### 2.3 Session ID

- Убрать отдельную верхнюю плашку `Session ID: <uuid>`.
- Показать ID в табе сессии рядом с именем/провайдером:
  - формат: первые 8 символов + `-...` (например `ff644c95-...`).
- При необходимости увеличить ширину таба, чтобы строка читалась.

---

## 3) Implementation Notes (Non-normative)

### 3.1 Затрагиваемые компоненты (ожидаемо)

- `src/client/ui/src/session/status-panel.tsx` — нижняя инфо-панель (Models/Tokens + 2-я строка).
- `src/client/ui/src/session/input-panel.tsx` / `src/client/ui/src/session/input-textarea.tsx` — визуальная структура и фиксированная высота.
- `src/client/ui/src/session/info-panel.tsx` — текущая плашка `Session ID: ...` (удалить/перенести).
- `src/client/ui/src/session/session-tabs.tsx` — отображение ID в табе + ширина.

### 3.2 Инварианты

- Не менять runtime протокол и lock/unlock логику: только визуальная стабильность.
- Не вводить новые зависимости.

---

## 4) Related Docs

- `doc/SolidWorks-Flow/Stacks/Project_Manager.md`
- `doc/SolidWorks-Flow/System/SystemArchitecture.md`
- `doc/SolidWorks-Flow/WorkspaceRuntime/WorkspaceRuntime.md`
