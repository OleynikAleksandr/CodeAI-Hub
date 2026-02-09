# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- Каждая подзадача затрагивает не более 3 файлов. Перед коммитом прогоняем `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем выполняем таргетную сборку (`npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`). После зелёных гейтов — коммит и обновление плана (дата, статус, хеш).
- Если по факту разработки оказывается, что конкретная задача стрима затрагивает больше 3 файлов — такую задачу дробим и переписываем список задач в стриме.
- Stream (стрим) завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов.
- Phase (фаза) завершается на чистом дереве: запускаем `./scripts/build-all.sh`.
- Любое изменение архитектуры/логики требует синхронного обновления документации и ссылки на соответствующий коммит.
- `doc/TODO/todo-plan.md` необходимо постоянно в реальном времени обновлять.

---

## Фаза 4 — Project Manager Module (owner: Codex, updated: 2025-11-24)

### Stream: Project Manager UI Bundle
1. [DONE] Scaffold `packages/ui/project-manager` with basic HTML/CSS (same bg as web-client) — scope: `packages/ui/project-manager/**`
2. [DONE] Update `scripts/build-ui-bundle.sh` to build `project-manager` bundle — scope: `scripts/build-ui-bundle.sh`
3. [DONE] Update `assets/ui/manifest.json` schema and `UIBundleId` type — scope: `assets/ui/manifest.json`, `src/extension-module/ui/ui-types.ts`

### Stream: Project Manager Launcher Integration
1. [DONE] Update `LauncherInstaller` to deploy PM config (`config/project-manager.json`) — scope: `src/extension-module/cef/launcher-installer.ts`
2. [DONE] Implement shortcut creation for `CodeAI Hub Project Manager.app` — scope: `src/extension-module/web-client/shortcut-manager.ts`
3. [IN_PROGRESS] Verify standalone launch and core connection — scope: `manual verification` (Ready for user testing)

### Stream: Project Manager UI Upgrade
1. [DONE] Scaffold `src/client/project-manager` (React App) — scope: `src/client/project-manager/**`
2. [DONE] Create `scripts/build-project-manager.js` and update `package.json` — scope: `scripts/**`, `package.json`
3. [DONE] Update `scripts/build-ui-bundle.sh` to package the React app — scope: `scripts/build-ui-bundle.sh`

### Stream: Multi-Instance Support
1. [DONE] Update `launcher.ts` to support `userDataDir` argument — scope: `src/extension-module/cef/launcher.ts`
2. [DONE] Update `launcher-setup.ts` to pass unique data dirs — scope: `src/extension-module/cef/launcher-setup.ts`
3. [DONE] Update architecture docs with multi-instance/tab notes — scope: `doc/SolidWorks-Flow/Stacks/Launcher_CEF_Module.md`

### Stream: Window State Persistence (Binary Copy)
1. [DONE] Refactor `shortcut-manager.ts` to implement Binary Copy strategy — scope: `src/extension-module/web-client/shortcut-manager.ts`
2. [DONE] Update architecture docs to document Binary Copy — scope: `doc/SolidWorks-Flow/Stacks/Launcher_CEF_Module.md`
