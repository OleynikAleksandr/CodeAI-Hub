# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionDialog_BubbleVisualTone_Architecture.md`
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
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: любое изменение архитектуры/логики требует синхронного обновления документации **до** коммита.

## Phase 1 — Session dialog visual tuning (owner: Codex, updated: 2026-04-20)
### Stream: Bubble tone and stroke
1. [DONE] Подстроить общий visual contract Session dialog bubble-плашек: уменьшить stroke всех message cards до `1px`, ослабить thinking bubble background/border до ~40% alpha и thinking header/body/toggle text до ~60% alpha; sync SSOT `UI_Bundles`. Scope: `media/session-view.css`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/TODO/todo-plan.md`. Expected commit message: `fix: tune session dialog bubble visual tone`
2. [TODO] Git Commit: `fix: tune session dialog bubble visual tone` (hash: TBD)
