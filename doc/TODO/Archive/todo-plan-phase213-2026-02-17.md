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
- В collector (Description) и terminal_no_resume сессиях кнопка не показывается.
- Убрать `ForceUnlockButton` из `session-view.tsx`.

---

### Stream 1: Fix — кнопка не должна появляться в one-shot (Description) сессии

1. [DONE] Диагностировать: почему `terminalNoResume` не срабатывает для Description сессии.
   Root cause: `terminalNoResume` выставляется только ПОСЛЕ turn. Fix: не передавать `onForceUnlock`/`onRelock` когда `sessionKind === "collector"`.
   Удалить `ForceUnlockButton` компонент и его JSX из `session-view.tsx`.
   Scope: `src/client/ui/src/session/session-view.tsx` + `input-panel.tsx` + `session-view.css` (3 файла).

2. [DONE] Git Commit: `fix(ui): move lock toggle to InputPanel footer, fix collector session` (hash: 27cfc688)

---

### Stream 2: Редизайн — кнопка 🔒/🔓 внутри InputPanel footer (справа)

1. [DONE] Добавлены `onForceUnlock?: () => void` и `onRelock?: () => void` в `InputPanelProps`.
   `resolvePlaceholder()` вынесена в pure helper; при `forceUnlocked=true` — стандартный placeholder.
   Footer: `visibility: hidden` только на hint-тексте, кнопка всегда видна.
   `showLockToggle = !terminalNoResume && (inputLocked || forceUnlocked) && (onForceUnlock != null || onRelock != null)`.
   Scope: `src/client/ui/src/session/input-panel.tsx` (1 файл).

2. [DONE] Git Commit: `fix(ui): move lock toggle to InputPanel footer, fix collector session` (hash: 27cfc688)

---

### Stream 3: Подключение callbacks в SessionView + CSS

1. [DONE] В `session-view.tsx`: `handleRelock = () => setForceUnlocked(false)`.
   `onForceUnlock={isCollectorSession ? undefined : handleForceUnlock}` — collector сессии без кнопки.
   В `media/session-view.css`: удалены стили `.session-app__force-unlock`; footer → `justify-content: space-between`; добавлен `.session-input__lock-toggle`.
   Scope: `src/client/ui/src/session/session-view.tsx` + `media/session-view.css` (2 файла).

2. [DONE] Git Commit: `fix(ui): move lock toggle to InputPanel footer, fix collector session` (hash: 27cfc688)

---

### Stream 4: Таргетная сборка + Release

1. [DONE] `npm run build:webview` + `npm run typecheck:webview` — зелёные.
   Scope: webview build.

2. [DONE] Git Commit: `chore(build): verify webview after force-unlock ux fixes` (hash: 9daf6408)

3. [DONE] `./scripts/build-all.sh` — v1.1.628. Tarballs в `~/.codeai-hub/releases/`.
   Session078.md создан.

4. [DONE] Git Commit: `feat(release): v1.1.628 - force unlock ux fixes` (hash: 0c575c29)
   Git Commit: `docs(release): record v1.1.628 build` (hash: 6d743bb5)

**Phase 213 COMPLETED — 2026-02-17**

