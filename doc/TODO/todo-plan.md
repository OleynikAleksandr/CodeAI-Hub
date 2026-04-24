# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Native_Request_Capture_AppPath_Tuning_1.2.65.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Native_Request_Capture_AppPath_Tuning_1.2.65.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Provider_Native_Request_Capture_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Native_Request_Capture_WebSocket_And_Trace_Hotfix_1.2.64.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream, в каждом Stream некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный следующий пункт `Git Commit: ...`.
- Если фактический scope подзадачи затрагивает больше 3 файлов, подзадача разбивается и список задач переписывается.
- **Gates:** git commit запускает `.husky/pre-commit`; git push запускает `.husky/pre-push`. Не обходить hooks.
- Таргетные проверки для этого scope: `npm run build:webview`, `npm run typecheck:webview`, `npm run build --workspace @codeai-hub/core`, `npm run build --workspace @codeai-hub/claude-module`, `npm run build --workspace @codeai-hub/codex-app-server-module`.
- Release stream завершается full build: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`.
- `todo-plan.md` обновляется после каждой подзадачи и после каждого коммита.

## Phase 1 — Native Request Capture App-Path Tuning (owner: Codex, updated: 2026-04-24)

### Stream: Planning

1. [DONE] Создать planning-документ и активный `todo-plan.md` — scope: `doc/SolidWorks-WorkFlow/Plans/Native_Request_Capture_AppPath_Tuning_1.2.65.md`, `doc/TODO/todo-plan.md`; commit: `docs: plan native capture app-path tuning`.
2. [DONE] Git Commit: `docs: plan native capture app-path tuning` (hash: `260826690`)

### Stream: Settings UI Model Selection

3. [DONE] Добавить provider/model capture UI — scope: `src/client/ui/src/components/settings/native-request-capture-card.tsx`, `src/client/ui/src/components/settings/general-settings.tsx`, `src/client/ui/src/components/settings-view.tsx`; commit: `feat: select native capture model in settings`.
4. [DONE] Git Commit: `feat: select native capture model in settings` (hash: `226e5265a`)
5. [DONE] Протянуть modelId через browser settings state — scope: `src/client/ui/src/components/settings/native-request-capture-state.ts`, `src/client/ui/src/components/settings/use-settings-state-support.ts`, `src/client/ui/src/components/settings/use-settings-state.ts`; commit: `feat: send native capture model from webview`.
6. [DONE] Git Commit: `feat: send native capture model from webview` (hash: `88b869294`)
7. [DONE] Протянуть modelId через Project Manager transport — scope: `src/client/project-manager/components/settings/use-project-manager-settings-state.ts`, `src/client/project-manager/api.ts`, `src/client/project-manager/core-stream-message-types.ts`; commit: `feat: send native capture model from project manager`.
8. [DONE] Git Commit: `feat: send native capture model from project manager` (hash: `9301fbb8f`)

### Stream: Core App-Path Resolver

9. [DONE] Добавить modelId в Core bridge payload и capture command — scope: `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/remote-bridge-message-router.ts`, `packages/core/src/provider-network-capture/native-request-capture-facade.ts`; commit: `feat: resolve native capture turn config`.
10. [DONE] Git Commit: `feat: resolve native capture turn config` (hash: `7f336b601`)
11. [DONE] Передать selected model/applied config в provider adapters — scope: `packages/core/src/remote-bridge/index.ts`, `packages/core/src/provider-network-capture/native-request-capture-facade.ts`, `packages/core/src/provider-registry/provider-module-loader.types.ts`; commit: `feat: pass native capture app config`.
12. [DONE] Git Commit: `feat: pass native capture app config` (hash: `7b45ef52b`)

### Stream: Provider Diagnostic Parity

13. [DONE] Настроить Claude diagnostic query на selected model/applied thinking — scope: `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts`, `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.test.ts`; commit: `feat: mirror claude turn config in native capture`.
14. [DONE] Git Commit: `feat: mirror claude turn config in native capture` (hash: `f3fc8d574`)
15. [DONE] Настроить Codex diagnostic turn на selected model/applied effort/summary — scope: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`, `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.test.ts`; commit: `feat: mirror codex turn config in native capture`.
16. [IN_PROGRESS] Git Commit: `feat: mirror codex turn config in native capture` (hash: TBD)

### Stream: Capture Artifact Readability

17. [TODO] Улучшить writer для app config, multi-request Markdown и Codex instructions extraction — scope: `packages/core/src/provider-network-capture/native-request-capture-writer.ts`, `packages/core/src/provider-network-capture/native-request-capture-writer.test.ts`; commit: `feat: improve native capture artifact extraction`.
18. [TODO] Git Commit: `feat: improve native capture artifact extraction` (hash: TBD)

### Stream: Verification And Release

19. [TODO] Выполнить targeted verification — scope: affected packages; commands: `npm run build:webview`, `npm run typecheck:webview`, `npm run build --workspace @codeai-hub/core`, `npm run build --workspace @codeai-hub/claude-module`, `npm run build --workspace @codeai-hub/codex-app-server-module`; commit: `chore: verify native capture app-path tuning`.
20. [TODO] Git Commit: `chore: verify native capture app-path tuning` (hash: TBD)
21. [TODO] Синхронизировать SSOT по capture app-path contract — scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`; commit: `docs: document native capture app-path contract`.
22. [TODO] Git Commit: `docs: document native capture app-path contract` (hash: TBD)
23. [TODO] Подготовить release notes для будущей версии `1.2.65` — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit: `docs: prepare native capture app-path release`.
24. [TODO] Git Commit: `docs: prepare native capture app-path release` (hash: TBD)
25. [TODO] Собрать release `1.2.65` — scope: scripts/packages generated by `./scripts/build-all.sh`; command: `./scripts/build-all.sh`; commit: `chore: build native capture app-path release`.
26. [TODO] Git Commit: `chore: build native capture app-path release` (hash: TBD)
27. [TODO] Собрать финальный VSIX текущей версии — scope: release artifact; command: `./scripts/build-release.sh --use-current-version`; commit: `chore: package native capture app-path release`.
28. [TODO] Git Commit: `chore: package native capture app-path release` (hash: TBD)
29. [TODO] Closeout: архивировать planning/todo и создать session report — scope: `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/TODO/Archive/`, `doc/Sessions/Session006.md`; commit: `docs: close native capture app-path session`.
30. [TODO] Git Commit: `docs: close native capture app-path session` (hash: TBD)
