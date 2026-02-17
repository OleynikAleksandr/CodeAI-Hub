# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  1) `doc/SolidWorks-WorkFlow/README.md`
  2) `doc/SolidWorks-WorkFlow/Docs_Index.md`
  3) `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `doc/TODO/todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: Любое изменение архитектуры/логики требует синхронного обновления документации из `doc/` ДО коммита.

---

## Phase 213 — Session UI: Force Unlock Button UX Fixes (owner: Oleksandr+Claude, updated: 2026-02-17)

**Контекст:** Phase 212 реализовала кнопку 🔓 (v1.1.627). После тестирования выявлены дефекты.

**Проблемы:**
1. Кнопка появляется в one-shot (Description) сессии — не должна.
2. Placeholder `Agent is working… Please wait.` не меняется при forceUnlocked=true.
3. Кнопка исчезает после разблокировки — нельзя вернуть блокировку вручную.
4. Расположение кнопки неудобно (над плашкой ввода).

**Goal:**
- Кнопка переезжает ВНУТРЬ `InputPanel` — в footer, прижата вправо.
- Footer всегда видим (не скрывается при блокировке).
- Два состояния кнопки: 🔒 (ввод заблокирован) → клик разблокирует; 🔓 (forceUnlocked) → клик возвращает блокировку.
- При forceUnlocked=true placeholder показывает стандартный текст.
- В one-shot (terminal_no_resume) кнопка не показывается.
- Убрать `ForceUnlockButton` из `session-view.tsx`.

---

### Stream 1: Fix — кнопка не должна появляться в one-shot (Description) сессии

1. [TODO] Диагностировать: почему `terminalNoResume` не срабатывает для Description сессии.
   Исправить условие видимости кнопки в `session-view.tsx` (showForceUnlock).
   Также удалить `ForceUnlockButton` компонент и его JSX из `session-view.tsx` — кнопка переедет в InputPanel (Stream 2).
   Scope: `src/client/ui/src/session/session-view.tsx` (1 файл).

2. [TODO] Git Commit: `fix(ui): remove force-unlock button from session-view` (hash: TBD)

---

### Stream 2: Редизайн — кнопка 🔒/🔓 внутри InputPanel footer (справа)

1. [TODO] Добавить в `InputPanelProps`: `onForceUnlock: () => void` и `onRelock: () => void`.
   В footer InputPanel: слева надпись `Press Enter to send...`, справа — кнопка 🔒 (когда inputLocked && !terminalNoResume) или 🔓 (когда forceUnlocked).
   Footer всегда видим (убрать `visibility: hidden`; только надпись слева скрывается при блокировке).
   При forceUnlocked=true — placeholder стандартный (`Type your request or drag files with Shift held...`).
   Scope: `src/client/ui/src/session/input-panel.tsx` (1 файл).

2. [TODO] Git Commit: `feat(ui): move lock toggle into InputPanel footer` (hash: TBD)

---

### Stream 3: Подключение callbacks в SessionView + CSS

1. [TODO] В `session-view.tsx`: передать `onForceUnlock={handleForceUnlock}` и `onRelock={() => setForceUnlocked(false)}` в InputPanel.
   В `media/session-view.css`: удалить стили `.session-app__force-unlock`; при необходимости добавить стили для кнопки внутри footer InputPanel.
   Scope: `src/client/ui/src/session/session-view.tsx` + `media/session-view.css` (2 файла).

2. [TODO] Git Commit: `feat(ui): wire force-unlock callbacks and update css` (hash: TBD)

---

### Stream 4: Таргетная сборка + Release

1. [TODO] `npm run build:webview` + `npm run typecheck:webview`.
   Устранить ошибки сборки.

2. [TODO] Git Commit: `chore(build): verify webview after force-unlock ux fixes` (hash: TBD)

3. [TODO] `./scripts/build-all.sh` — полный релизный build (v1.1.628).
   Переложить tarballs в `doc/tmp/releases/`.
   Обновить `doc/Sessions/Session077.md` или создать `Session078.md`.

4. [TODO] Git Commit: `feat(release): v1.1.628 - force unlock ux fixes` (hash: TBD)

