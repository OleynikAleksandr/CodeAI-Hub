# PM Status Bar — Context Cleanup + Open Settings Prominence

**Scope target:** Project Manager footer (`pm-status-bar`).
**Related SSOT:** `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`.
**Release target:** `1.2.57`.

## 1. Problem

- Левая часть футера дублирует workspace identity, которая уже видна в верхней части левого сайдбара (selector workspace). Плашка `CONTEXT` + имя workspace не несёт новой информации и отвлекает внимание.
- Кнопка `Open Settings` шарит generic CSS-класс `pm-status-zoom` с zoom-reset кнопкой диаграммы. Визуально она выглядит "серой и пассивной", теряется на фоне `WORKFLOW TREE MVP` и не воспринимается как главный action footer'а.
- Отсутствуют различимые фазы `default / hover / active` — текущий `:hover` правит только text color + слегка фон, `:active` вообще не объявлен.

## 2. Solution boundary

### 2.1 Left side cleanup
- В `StatusBar` удалить весь `pm-status-bar__left` блок (`pm-status-pill` с `CONTEXT` и `pm-status-text` с workspaceLabel).
- Удалить prop `workspaceName` у `StatusBar` и его проброс из родителя, если больше нигде не используется.
- Удалить неиспользуемые локализационные ключи (`pm.status_bar.context_label`, `pm.status_bar.no_workspace_label`) из approved dictionary `ui_labels.json` и связанных вспомогательных файлов. Других ссылок быть не должно.
- `pm-status-bar` остаётся `justify-content: space-between`, но левая часть становится пустой. Чтобы правая группа уехала в правый край, сохраняем flex контейнер и оставляем левый `<div />` только если это необходимо для spacing; при отсутствии — переключаем на `justify-content: flex-end`.

### 2.2 Open Settings button visual contract
- Ввести новый CSS-класс `pm-status-open-settings` (в `packages/ui/project-manager/styles.css`), отдельный от `pm-status-zoom`.
- Типографика выравнивается с `pm-status-hint` (который стилизует `WORKFLOW TREE MVP`):
  - `font-size: 12px` (наследуется от `pm-status-bar`), но явно объявлен для защиты от drift.
  - `text-transform: uppercase`
  - `letter-spacing: 0.08em`
  - `font-weight: 600` — на тон выше hint (обычный `400`), чтобы читалось как action, а не как inline подпись.
- Размер: `padding: 8px 14px` (выше чем у `pm-status-zoom`, который держал `2px 8px`), `border-radius: 8px`.
- Цветовая гамма использует PM accent (тот же токен, что `--pm-accent-strong` у CONTEXT pill, который теперь удаляется — цвет переезжает на главный action):
  - `default`: `color: var(--pm-accent-strong)`, `background: rgba(66, 201, 162, 0.12)`, `border: 1px solid rgba(66, 201, 162, 0.45)`.
  - `hover`: `background: rgba(66, 201, 162, 0.22)`, `border-color: var(--pm-accent-strong)`, `color: var(--pm-text-primary)`.
  - `active` (pressed): `background: rgba(66, 201, 162, 0.32)`, `transform: translateY(1px)`, `box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35)`.
  - `focus-visible`: видимый outline через `--pm-accent-strong`, для keyboard nav.
- Transitions: `transition: background-color 120ms ease, border-color 120ms ease, transform 80ms ease`.

### 2.3 What stays out of scope
- Логика `pm:settings:open` CustomEvent не меняется; контракт открытия in-shell settings остаётся прежним (invariant §33).
- Локализация `pm.status_bar.open_settings_label` остаётся строкой `Open Settings`; uppercase применяется только через CSS.
- `pm.status_bar.workflow_hint_label` не трогаем — это маркер release channel, не user action.

## 3. Files touched

1. `src/client/project-manager/components/layout/status-bar.tsx`
   - Удалить левый блок, prop `workspaceName`, неиспользуемые локализационные ключи `contextLabel`/`workspaceLabel`.
   - Переключить Open Settings на `className="pm-status-open-settings"`.
2. Родитель, пробрасывающий `workspaceName` (ожидается `app.tsx` / `main-layout.tsx`).
   - Убрать прокидку prop.
3. `packages/ui/project-manager/styles.css`
   - Удалить блоки `.pm-status-pill`, `.pm-status-text`, (`.pm-status-divider` оставить, если где-то используется).
   - Добавить `.pm-status-open-settings` + `:hover`, `:active`, `:focus-visible`.
4. `src/localization/source/ui_labels.json` (и any approved helpers)
   - Удалить `pm.status_bar.context_label`, `pm.status_bar.no_workspace_label`.

Пакет изменений укладывается в 3 stream × ≤3 файла.

## 4. Definition of Done

- Футер PM на пустом workspace и на выбранном workspace больше не показывает plaka `CONTEXT` и имя workspace.
- `Open Settings` визуально выровнен с `WORKFLOW TREE MVP` по шрифту / регистру / размеру, но выделен цветом как primary action. Три визуальные фазы подтверждены.
- Click по кнопке продолжает диспатчить `pm:settings:open` и переводить правую панель PM в in-shell settings (регрессионно проверяется после `build-release.sh`).
- `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview` зелёные.
- `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` завершаются с `✅ Package created` для `codeai-hub-1.2.57.vsix`.
- Session report 096 закрывает cycle.
