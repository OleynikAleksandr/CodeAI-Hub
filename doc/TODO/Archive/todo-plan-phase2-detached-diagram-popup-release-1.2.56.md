# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/PM_DetachedDiagram_Popup_Lifecycle_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Archive/PM_DetachedDiagram_Popup_Lifecycle_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
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
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run build:project-manager`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: любое изменение архитектуры/логики требует синхронного обновления и `todo-plan.md`, и связанной документации из `doc/` до коммита.
- Phase завершается на чистом дереве: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, фиксация результатов в legacy session-report archive (removed).
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять после каждой подзадачи и каждого коммита.

## Phase 1 — Detached Diagram Popup Fix (owner: Codex, updated: 2026-04-23)
### Stream: Launcher popup ownership
1. [DONE] Разделить close semantics для main PM окна и detached popup окна, чтобы закрытие detached `Diagram Modules` window не завершало всё приложение. Фактический scope сузился до `packages/cef-launcher/src/launcher_app.cc`: popup lifecycle разделён на уровне `LauncherWindowDelegate`, без расширения launcher bridge/API seam. commit: `fix(launcher): keep detached diagram popup local`
2. [DONE] Git Commit: `fix(launcher): keep detached diagram popup local` (hash: `aa13048ff`)
3. [DONE] Изолировать popup geometry от main PM autosave slot и добавить popup-sized width hint из PM detach action, чтобы detached diagram окно не открывалось на весь горизонтальный размер standalone PM. Фактический scope: `packages/cef-launcher/src/platform/mac/launcher_handler_mac.mm`, `src/client/project-manager/components/layout/detach-diagram-button.tsx`; popup больше не читает/пишет main window autosave state, а PM detach action отправляет explicit popup-sized open hint. Таргетная проверка: `npm run build:project-manager`. commit: `fix(pm): tune detached diagram popup geometry`
4. [DONE] Git Commit: `fix(pm): tune detached diagram popup geometry` (hash: `eb78180f8`)

### Stream: Bug registry + SSOT sync
1. [DONE] Зарегистрировать bug и синхронизировать канонический контракт detached diagram popup ownership/geometry в SSOT. scope: `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`, `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`; commit: `docs: sync detached diagram popup contract`
2. [DONE] Git Commit: `docs: sync detached diagram popup contract` (hash: `36bc1a026`)

## Phase 2 — Release 1.2.56 (owner: Codex, updated: 2026-04-23)
### Stream: Release build for detached diagram popup fix
1. [DONE] Подготовить release-facing metadata для версии `1.2.56` перед сборкой релиза. scope: `README.md`, `CHANGELOG.md`; commit: `docs: prepare 1.2.56 release metadata`
2. [DONE] Git Commit: `docs: prepare 1.2.56 release metadata` (hash: `625dd3509`)
3. [DONE] Выпустить релиз `1.2.56` для пользовательского retest detached diagram popup fix через `./scripts/build-all.sh --version 1.2.56` и `./scripts/build-release.sh --use-current-version`, затем зафиксировать release outputs и обновить статусы плана. Фактический результат: собраны tarballs в `doc/tmp/releases/` и VSIX `codeai-hub-1.2.56.vsix`, `build-release` успешно прошёл `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging` и финальный `✅ Package created`. commit: `chore: release 1.2.56`
4. [DONE] Git Commit: `chore: release 1.2.56` (hash: `a983dca1b`)
