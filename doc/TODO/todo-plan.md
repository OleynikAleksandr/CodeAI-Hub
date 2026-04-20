# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionDialog_ThinkingCompositeAndShadow_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Plans/SessionDialog_ThinkingCompositeAndShadow_Architecture.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run build:project-manager`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**:
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.

## Phase 1 — Thinking composite and shadow correction (owner: Codex, updated: 2026-04-20)
### Stream: Shared assistant-tagged bubble chrome
1. [IN_PROGRESS] Разделить visual contract legacy `role="thinking"` strip и assistant-tagged provider `Thinking` bubble, вернуть shadow на assistant-tagged path и подстроить её fill/stroke под реальный session backdrop для всех провайдеров; scope: `media/session-view.css`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/TODO/todo-plan.md`; expected commit message: `fix: retune assistant thinking bubble chrome`
2. [TODO] Git Commit: `fix: retune assistant thinking bubble chrome` (hash: TBD)
3. [TODO] Расширить regression coverage shared provider-facing `Thinking` path так, чтобы assistant-tagged hook проверялся для Claude, Codex и Gemini без provider-specific layout drift; scope: `src/client/ui/src/session/dialog-panel-message-utils.test.ts`, `doc/TODO/todo-plan.md`; expected commit message: `test: cover shared assistant thinking bubble path`
4. [TODO] Git Commit: `test: cover shared assistant thinking bubble path` (hash: TBD)

### Stream: Scope Closeout
1. [TODO] Заархивировать planning-doc thinking composite/shadow scope и синхронизировать `Docs_Index`; scope: `doc/SolidWorks-WorkFlow/Plans/SessionDialog_ThinkingCompositeAndShadow_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: archive thinking composite and shadow plan`
2. [TODO] Git Commit: `docs: archive thinking composite and shadow plan` (hash: TBD)
3. [TODO] После `npm run build:webview` и `npm run build:project-manager` зафиксировать archived `todo-plan` snapshot и вернуть active `doc/TODO/todo-plan.md` в placeholder-state; scope: `doc/TODO/Archive/todo-plan-session-dialog-thinking-composite-and-shadow.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: close thinking composite and shadow scope`
4. [TODO] Git Commit: `docs: close thinking composite and shadow scope` (hash: TBD)
