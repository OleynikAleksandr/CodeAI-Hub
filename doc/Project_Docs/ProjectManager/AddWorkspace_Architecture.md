# Project Manager — Add Workspace + Worktree Init (MVP Architecture)

**Status:** Approved (MVP)
**Updated:** 2026-01-23
**Owner:** Oleksandr + Codex

---

## 1) Проблема
Project Manager должен уметь работать с несколькими workspace.
Сейчас UI содержит пункт **Add workspace**, но:
- в CEF-режиме folder picker доступен только на macOS (Windows/Linux остаются без нативного диалога; VS Code bridge может быть недоступен);
- добавление workspace не инициализирует “workflow worktree” (`.codeai-hub/<workspaceSlug>/...`);
- `workspaceSlug` сейчас вычисляется из `workspaceName`, что не гарантирует уникальность (коллизии при одинаковых названиях → смешение состояния/событий).

## 2) Цели (MVP)
1. **Add workspace**: добавить выбранную папку в список workspace в Project Manager.
2. **Worktree init**: при добавлении workspace создать рабочую структуру `.codeai-hub/<workspaceSlug>/` внутри папки, если её нет.
3. **Multi-workspace switch**: пользователь переключает workspace и видит актуальное дерево именно выбранного workspace.
4. **Уникальный и стабильный `workspaceSlug`**: один раз генерируется и хранится в registry; не зависит от текущего отображаемого имени.

## 3) Non-goals (вне MVP)
- Полноценный `Fork workspace` (git clone / git worktree).
- Нативный folder picker в CEF Launcher на Windows/Linux (для них остаётся UI-модалка с вводом пути).
- Авто-детект “корня репозитория” по вложенной папке.

## 4) Текущее состояние (as-is)
- Core хранит список workspace в `~/.codeai-hub/state/projects.json` (ProjectRegistry).
- UI получает список через WebSocket (`projects:list` / `projects:update`).
- Workflow дерево (`WorkspaceTree`) использует `workspaceName -> toWorkflowWorkspaceSlug(workspaceName)` + `workspacePath`.
- `.codeai-hub/<workspaceSlug>` создаётся только при `POST /api/v1/orchestrator/workspace-session`.

## 5) Решение (MVP)

### 5.1 Данные workspace (Core source-of-truth)
Расширить `WorkspaceProject`:
- добавить поле `slug: string`.

Правила:
- `slug` генерируется при добавлении workspace и сохраняется в registry.
- `slug` должен быть **уникальным** среди workspace в registry.
- при чтении старых записей без `slug` выполняется **миграция**: вычислить `slug` и сохранить обновлённый файл.

Генерация slug:
- базовый slug = slugify(`name`) (сейчас аналогично `toWorkflowWorkspaceSlug`).
- если slug уже занят → добавлять суффикс `-2`, `-3`, ... (детерминированно).

### 5.2 Add workspace (UI)
Два режима выбора папки:
- **VS Code bridge доступен**: использовать существующий `projects:pickFolder`.
- **CEF macOS**: нативный Finder picker в Launcher с возвратом абсолютного пути через `projects:folderPicked`.
- **CEF fallback (Windows/Linux)**: модалка “Add workspace” с:
  - input для абсолютного пути;
  - (опционально) input для отображаемого имени;
  - базовой валидацией (не пусто, absolute path).

После выбора:
1) отправить `projects:add` (path + optional name) → получить обновлённый список.
2) определить добавленный workspace (по `path`) и сделать его активным в UI.
3) выполнить **worktree init**: `POST /api/v1/orchestrator/workspace-session` с:
   - `workspacePath`
   - `initiativeSlug = workspace.slug`
   - `stage = "description"` (опционально)

### 5.3 Worktree init (Core)
Использовать уже существующее поведение `workspace-session`:
- создаёт `.codeai-hub/<initiativeSlug>` (best effort);
- запускает `WorkflowRuntime.connectWorkspace()` через `onWorkspaceSessionCreated`, чтобы watcher и события (`workflow.artifact.written`) заработали сразу.

Опционально (если нужно UI-дерево “не пустое” сразу):
- добавить “best effort init” базового `description-step.json` через `DescriptionStepStore.upsert(workspaceRoot, slug, {})`.

### 5.4 Переключение workspace и корректное дерево
- `WorkspaceTree` и все сервисы, где требуется `workspaceSlug`, используют **workspace.slug**, а не производное от имени.
- Polling `workflow-state` остаётся на выбранном workspace (как сейчас), но ключом становится slug.
- При смене workspace UI сбрасывает выбранный артефакт/просмотрщик, чтобы не показывать артефакт из другого workspace.

### 5.5 Clean workspace start
- UI проверяет `workflow-state` выбранного workspace.
- Если workspace пустой (нет артефактов/continuity и все стадии `idle`), UI автоматически переключается на этап **Description** и открывает анкету описания.
- Авто-открытие выполняется один раз на каждую активацию workspace (после переключения/возврата).

## 6) Контракты/изменения API
- WebSocket сообщения остаются прежними (`projects:add`, `projects:list`, ...), но payload `projects:update` теперь содержит `slug`.
- HTTP endpoint остаётся прежним: `POST /api/v1/orchestrator/workspace-session`.

## 7) Риски и меры
- **Коллизии slug в existing installs**: решается миграцией + детерминированным суффиксом.
- **CEF без folder picker на Windows/Linux**: решается модалкой с вводом пути.
- **Безопасность**: `workspace-session` уже требует абсолютный путь; UI должен дополнительно валидировать.

## 8) Verification (manual)
1) Запустить Project Manager.
2) Add workspace → выбрать/ввести путь к папке.
3) Ожидаемое:
   - workspace появляется в списке и автоматически становится активным;
   - внутри папки появляется `.codeai-hub/<workspaceSlug>/`;
   - переключение между 2 workspace меняет дерево и артефакты без смешения.
4) Добавить 2 workspace с одинаковыми именами папок → убедиться, что `slug` различается и дерево не смешивается.
