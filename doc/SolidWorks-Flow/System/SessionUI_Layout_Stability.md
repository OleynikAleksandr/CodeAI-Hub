# Session UI — Layout Stability (ID bar, Status line, Input lock)

**Status:** Active (validated for 1.1.622)
**Updated:** 2026-02-17
**Owner:** Oleksandr + Codex

---

## 0) Scope

Этот документ фиксирует **текущий контракт Session UI** (shared), который используется в:
- Project Manager (CEF UI)
- VS Code webview (в тех местах, где используется shared `SessionView`)

Фокус: стабильная вёрстка (без layout-shift), предсказуемые статусы, и корректные места отображения ключевой информации (ID/Models/Tokens/usage).

---

## 1) Канон UI (как должно выглядеть)

### 1.1 Tabs (SessionTabs)
- В табах отображается **роль агента + провайдер(ы)** (например `Reviewer Codex`).
- `ID` в табы **не** вставляется (чтобы табы оставались компактными и читабельными).

### 1.2 ID bar + лимиты (SessionIdBar)
- Отдельная плашка фиксированной высоты **32px**.
- Слева: `ID: <short>-...` из `providerSessionId` (если есть).
  - Если binding ещё не готов: `ID: pending...`.
  - Если binding недоступен: `ID: unavailable`.
- Справа: `session` и `weekly` usage-limits (процент + reset label), с полосками заполнения.
- UI использует last-known provider cache, чтобы лимиты отображались **сразу** (даже до первого ответа агента), а затем обновлялись по live-событиям.

### 1.3 Status panel (Models + Tokens)
- Когда Core не готов: показываем строку `Core Supervisor` + `Starting core…/Core unavailable` и резервируем вторую строку под detail.
- Когда core ready и есть `status`:
  - Одна строка: `Models: <modelsSummary>  |  Tokens: <used> (<remaining%>%)`.
  - Если есть token debug summary, он показывается справа в той же строке.
- Никаких “вторых строк”, которые то появляются, то исчезают — чтобы не сдвигать диалог.

### 1.4 Input panel (anti layout-shift)
- Поле ввода не должно «подпрыгивать» при `locked/unlocked`.
- Если подсказка (`Press Enter…`) скрывается, место под неё сохраняется (фиксированный слот).
- Для one-shot/no-resume сессий input остаётся read-only до конца (контракт lock/unlock — в `doc/SolidWorks-Flow/WorkspaceRuntime/WorkspaceRuntime.md`).

### 1.5 Empty state / Creating session
- Плашка `Create your first session…` отображается только когда `sessions.length === 0`.
- Когда workflow создаёт сессию (например после `Send` анкеты) и UI ещё не гидратился, вместо этой плашки показывается спиннер `Creating session…`.

---

## 2) Source of truth (реализация)

### 2.1 Компоненты
- Tabs: `src/client/ui/src/session/session-tabs.tsx`
- ID bar: `src/client/ui/src/session/session-id-bar.tsx`
- Status line: `src/client/ui/src/session/status-panel.tsx`
- Input: `src/client/ui/src/session/input-panel.tsx`
- Empty state: `src/client/ui/src/session/empty-state.tsx`
- Root session view: `src/client/ui/src/session/session-view.tsx`

### 2.2 Стили
- Канонический файл: `media/session-view.css`

---

## 3) Definition of Done (smoke)

1. Вкладка сессии читаема и не переполнена `ID`.
2. ID bar всегда 32px и не меняет высоту при обновлении процентов.
3. Status panel не меняет высоту при наличии/отсутствии debug summary.
4. Input panel не меняет высоту при locked/unlocked (нет jump диалога).
5. После `Send` анкеты в workflow `description` слева вместо `Create your first session…` сразу появляется спиннер `Creating session…` и исчезает после загрузки UI.
