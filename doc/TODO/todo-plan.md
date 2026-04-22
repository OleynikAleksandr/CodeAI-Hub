# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Cycle:** 1.2.53 — Project Manager Settings Ownership + Extension Runtime De-Scope

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ProjectManager_Settings_And_RuntimeOwnership_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/ProjectManager_Settings_And_RuntimeOwnership_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `src/extension.ts`
  - `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`
  - `src/extension-module/message-handlers/settings-message-handler.ts`
  - `src/client/project-manager/api.ts`
  - `src/client/project-manager/components/layout/status-bar.tsx`
  - `src/client/project-manager/app.tsx`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из `Phase` и `Stream`; каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту конкретная подзадача требует больше 3 файлов, она обязана быть разбита на более мелкие пункты прямо в этом `todo-plan.md` до продолжения работы.
- **Gates (автоматически через Husky hooks):**
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Таргетные сборки затронутых пакетов/клиентов обязательны перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run build:project-manager`, `npm run typecheck:webview`.
- **Commit:** после зелёных гейтов и синхронизации документации.
- **Real-time Документация:** любые изменения архитектуры/логики синхронно отражаются в `doc/` до соответствующего коммита.
- Phase завершается на чистом дереве; релизный rebuild выполняется отдельным последним Stream по инструкции release checklist.
- `doc/TODO/todo-plan.md` обновляется в реальном времени после каждой подзадачи и каждого коммита.

## Phase 1 — Core-Owned Settings Backend (owner: Codex, updated: 2026-04-22)

### Stream A: Core settings write transport
1. [DONE] Добавить в remote bridge полный write-transport для `Settings`: `settings:save`, `settings:reset`, `settings:saved`, `settings:save-error`, `settings:localization-sync-status`; routing должен вести PM intents в core-owned handler, а не в extension-only webview path. scope: `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/remote-bridge-message-router.ts`, `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`; ожидаемый commit message: `feat(core): add settings write transport`
2. [DONE] Git Commit: `feat(core): add settings write transport` (hash: `74bdce8c7`)
3. [DONE] Перенести persistence/reset/localization save flow из extension-side handler в Core с сохранением selective sync, broadcaster parity и blocking semantics для PM/new session sends. scope: `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`, `packages/core/src/remote-bridge/handlers/settings-persistence-service.ts`, `packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts`; ожидаемый commit message: `feat(core): own settings persistence and localization sync`
4. [DONE] Git Commit: `feat(core): own settings persistence and localization sync` (hash: `0fbbf4550`)

### Stream B: Provider update + glossary intents
1. [DONE] Добавить в remote bridge transport contract для `settings:versions` и `settings:update-provider`, чтобы handler и PM transport могли работать не через extension-only webview path. scope: `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/remote-bridge-message-router.ts`, `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`; ожидаемый commit message: `feat(core): add provider update transport`
2. [DONE] Git Commit: `feat(core): add provider update transport` (hash: `85597587e`)
3. [DONE] Перенести provider versions snapshot/update orchestration в core-owned settings service и начать broadcasting `settings:versions` из Core. scope: `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`, `packages/core/src/remote-bridge/handlers/settings-provider-version-service.ts`; ожидаемый commit message: `feat(core): expose provider update actions through settings`
4. [DONE] Git Commit: `feat(core): expose provider update actions through settings` (hash: `ad071d720`)
5. [DONE] Добавить core-owned intent/result seam для `open-user-glossary-file`, чтобы PM settings window больше не зависел от extension-only message handler. scope: `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/remote-bridge-message-router.ts`, `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`; ожидаемый commit message: `feat(core): add glossary open intent for settings`
6. [DONE] Git Commit: `feat(core): add glossary open intent for settings` (hash: `d2bc20d04`)

## Phase 2 — Project Manager Settings Window (owner: Codex, updated: 2026-04-22)

### Stream C: PM settings transport and state
1. [DONE] Расширить PM websocket contracts/API для `settings:save`, `settings:reset`, `settings:update-provider`, `settings:versions`, `settings:save-error`, `settings:localization-sync-status`; PM должен стать полноценным клиентом core-owned settings flow. scope: `src/client/project-manager/core-stream-message-types.ts`, `src/client/project-manager/api.ts`, `src/client/project-manager/components/settings/use-project-manager-settings.ts`; ожидаемый commit message: `feat(pm): wire settings write transport`
2. [DONE] Git Commit: `feat(pm): wire settings write transport` (hash: `d33e94984`)
3. [DONE] Добавить PM-specific settings state hook и подключить текущий shared `SettingsView` к PM runtime через detached PM route, сохранив текущий UI без redesign и без legacy VS Code-only glossary path. scope: `src/client/project-manager/components/settings/use-project-manager-settings-state.ts`, `src/client/ui/src/components/settings-view.tsx`, `src/client/project-manager/app.tsx`; ожидаемый commit message: `feat(pm): reuse shared settings view in project manager`
4. [DONE] Git Commit: `feat(pm): reuse shared settings view in project manager` (hash: `171bc25ae`)

### Stream D: Dedicated settings window + footer entrypoint
1. [DONE] Добавить dedicated PM settings window opener seam в main layout поверх уже существующего detached PM settings route, чтобы окно `SettingsView` открывалось и фокусировалось как независимый PM-owned surface без влияния на state текущих Sessions/Artifacts. scope: `src/client/project-manager/components/layout/use-detached-settings-window.ts`, `src/client/project-manager/components/layout/main-layout.tsx`; ожидаемый commit message: `feat(pm): add dedicated settings window`
2. [DONE] Git Commit: `feat(pm): add dedicated settings window` (hash: `f0815290a`)
3. [DONE] Разместить кнопку `Open Settings` в footer зоне, где сейчас живёт `Workflow Tree MVP`: надпись остаётся слева, кнопка появляется справа, действие открывает dedicated settings window через уже существующий PM opener seam. scope: `src/client/project-manager/components/layout/status-bar.tsx`; ожидаемый commit message: `feat(pm): add footer settings entrypoint`
4. [DONE] Git Commit: `feat(pm): add footer settings entrypoint` (hash: `93b6254ee`)

## Phase 3 — Extension De-Scope + SSOT Sync (owner: Codex, updated: 2026-04-22)

### Stream E: Remove runtime authority from VS Code extension
1. [DONE] Убрать у extension activation право стартовать/attach-ить `Core Runtime`; extension оставить только как distribution/install/bootstrap-components shell, а runtime bootstrap authority — только у Project Manager. reachability cleanup для осиротевших extension-only runtime хвостов и root manifest выполнить в том же шаге. scope: `src/extension.ts`, `src/extension-module/core/core-keep-alive.ts`, `src/extension-module/settings/provider-auto-update-service.ts`, root manifests; ожидаемый commit message: `chore(extension): remove core startup from vscode activation`
2. [TODO] Git Commit: `chore(extension): remove core startup from vscode activation` (hash: TBD)
3. [DONE] Обезвредить legacy settings webview surface по согласованному compat path: оставить compat notice в VS Code и убрать живой product UI из extension-side settings surface. scope: `package.json`, `src/client/ui/src/app-host/settings-only-host.tsx`, `media/react-chat.js`; ожидаемый commit message: `chore(extension): retire settings webview surface`
4. [TODO] Git Commit: `chore(extension): retire settings webview surface` (hash: TBD)

### Stream F: SSOT synchronization
1. [TODO] Синхронно обновить канонические SSOT-документы под новые ownership boundaries: PM-only Settings UI, Core-owned settings backend, PM bootstrap authority для runtime start, extension distribution-only role. scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`; ожидаемый commit message: `docs: sync settings and runtime ownership contract`
2. [TODO] Git Commit: `docs: sync settings and runtime ownership contract` (hash: TBD)

## Phase 4 — Release 1.2.53 (owner: Codex, updated: 2026-04-22)

### Stream G: Release metadata 1.2.53
1. [TODO] Перед release rebuild обновить `README.md` (`Current Release — v1.2.53`) и `CHANGELOG.md` (`## [1.2.53]`) под PM Settings ownership + extension runtime de-scope. scope: 2 файла; ожидаемый commit message: `docs: prepare 1.2.53 release metadata`
2. [TODO] Git Commit: `docs: prepare 1.2.53 release metadata` (hash: TBD)

### Stream H: Release rebuild 1.2.53
1. [TODO] На чистом дереве выполнить `./scripts/build-all.sh --version 1.2.53`, проверить release-generated version/manifests artefacts и закоммитить результат. scope: release-generated repo files; ожидаемый commit message: `chore: release 1.2.53`
2. [TODO] Git Commit: `chore: release 1.2.53` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить `Step 7: Verifying SDK exclusions`, pruning dev dependencies и итоговый VSIX `codeai-hub-1.2.53.vsix`.
