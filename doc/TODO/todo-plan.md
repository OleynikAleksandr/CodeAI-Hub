# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionDialog_TaggedThinkingVisualTone_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`
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
- **Real-time Документация**: любое изменение архитектуры/логики требует синхронного обновления документации **до** коммита.

## Phase 1 — Tagged thinking visual tone fix (owner: Codex, updated: 2026-04-20)
### Stream: Thinking renderer alignment
1. [DONE] Добавить dedicated class hook для `assistant + tag="thinking"` и привязать к нему тот же muted thinking visual contract, что и для общей thinking-плашки. Scope: `src/client/ui/src/session/dialog-panel-message-utils.ts`, `media/session-view.css`, `doc/TODO/todo-plan.md`. Expected commit message: `fix: align tagged thinking card styling`
2. [TODO] Git Commit: `fix: align tagged thinking card styling` (hash: TBD)
3. [DONE] Добавить regression test для class resolution tagged-thinking path и синхронизировать UI SSOT contract. Scope: `src/client/ui/src/session/dialog-panel-message-utils.test.ts`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/TODO/todo-plan.md`. Expected commit message: `test: cover tagged thinking styling contract`
4. [TODO] Git Commit: `test: cover tagged thinking styling contract` (hash: TBD)
