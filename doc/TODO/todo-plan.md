# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `doc/SolidWorks-WorkFlow/Plans/Persistent_Localization_Bootstrap_Architecture.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`.
- Каждая implementation-подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Каждая подзадача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново.
- Любое изменение логики или архитектуры требует синхронного обновления связанных SSOT-доков в том же commit.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Этот `TODO Plan` закрывает refactor persistent localization bootstrap: нужно убрать cold-start English flash в Settings WebView и Project Manager, переведя startup hydration на persisted user-space localization snapshots.

## Phase 0 — Planning Intake (owner: Docs, updated: 2026-04-04)
### Stream: Persistent Bootstrap Scope
1. [DONE] Record the persistent localization bootstrap refactor in a dedicated planning doc and refresh docs navigation so the next execution stream starts from one approved design reference. Scope: `doc/SolidWorks-WorkFlow/Plans/Persistent_Localization_Bootstrap_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(plan): define persistent localization bootstrap scope`
2. [DONE] Git Commit: `docs(plan): define persistent localization bootstrap scope` (hash: `d7c921d8`)

## Phase 1 — Localization Snapshot Persistence (owner: Localization, updated: 2026-04-04)
### Stream: User-Space Browser Bootstrap Snapshot
3. [DONE] Add the canonical browser-bootstrap path, persistent store, and direct test entry for startup-ready localization payloads without relying on browser-memory cache. Scope: `packages/localization/src/localization-paths.ts`, `packages/localization/src/localization-runtime-bootstrap-store.ts`, `packages/localization/src/localization-runtime-bootstrap-store.test.ts`. Target commit: `feat(localization): add browser bootstrap snapshot store`
4. [DONE] Git Commit: `feat(localization): add browser bootstrap snapshot store` (hash: `7a1acf30`)
5. [DONE] Extend the localization facade so runtime payload resolution can load, refresh, and persist the assembled browser bootstrap snapshot deterministically. Scope: `packages/localization/src/localization-facade.ts`, `packages/localization/src/index.ts`, `packages/localization/src/localization-runtime-bootstrap-store.test.ts`. Target commit: `feat(localization): persist runtime bootstrap snapshots`
6. [DONE] Git Commit: `feat(localization): persist runtime bootstrap snapshots` (hash: `b41911fc`)

## Phase 2 — Host And Core Delivery (owner: Extension/Core, updated: 2026-04-04)
### Stream: Settings Webview Bootstrap Injection
7. [DONE] Inject the persisted localization bootstrap payload into VS Code webview HTML before JS boot so settings surfaces no longer wait for async `settings:load` to localize first paint. Scope: `src/core/webview-module/webview-html-generator.ts`, `src/extension-module/home-view-provider.ts`, `src/extension-module/settings/localization-runtime-service.ts`. Target commit: `feat(localization-bootstrap): inject webview startup payload`
8. [DONE] Git Commit: `feat(localization-bootstrap): inject webview startup payload` (hash: `29b42703`)

### Stream: Project Manager Bootstrap Endpoint
9. [DONE] Expose one read-only core HTTP endpoint backed by the persisted localization bootstrap snapshot so Project Manager can preload localized startup data before React mount. Scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/localization-bootstrap-http-handler.ts`, `packages/core/src/remote-bridge/index.ts`. Target commit: `feat(localization-bootstrap): expose pm bootstrap endpoint`
10. [DONE] Git Commit: `feat(localization-bootstrap): expose pm bootstrap endpoint` (hash: `158b6cf4`)

## Phase 3 — Browser Startup Hydration (owner: UI/PM, updated: 2026-04-04)
### Stream: Settings Webview First Paint
11. [DONE] Seed the settings-only webview from the injected bootstrap payload and treat later `settings:loaded` messages as background revalidation rather than first-paint localization. Scope: `src/client/ui/src/app-host/localization-runtime-contract.ts`, `src/client/ui/src/index.tsx`, `src/client/ui/src/components/settings/use-settings-state.ts`. Target commit: `fix(localization-bootstrap): hydrate settings webview from startup payload`
12. [DONE] Git Commit: `fix(localization-bootstrap): hydrate settings webview from startup payload` (hash: `a5e9ca06`)

### Stream: Project Manager First Paint
13. [DONE] Load the PM localization bootstrap payload before `root.render(...)` and initialize PM settings/runtime state from it so Help/UI no longer flash English on cold start. Scope: `src/client/project-manager/index.tsx`, `src/client/project-manager/services/localization-bootstrap.ts`, `src/client/project-manager/components/settings/use-project-manager-settings.ts`. Target commit: `fix(localization-bootstrap): hydrate project manager before mount`
14. [DONE] Git Commit: `fix(localization-bootstrap): hydrate project manager before mount` (hash: `87021691`)

## Phase 4 — SSOT Sync And Verification (owner: Docs/QA, updated: 2026-04-04)
### Stream: Architecture Sync
15. [DONE] Sync the live SSOT so Localization, UI bundles, and system architecture describe persistent startup snapshots, injected webview bootstrap, and PM pre-mount hydration. Scope: `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Target commit: `docs(architecture): sync persistent localization bootstrap ssot`
16. [DONE] Git Commit: `docs(architecture): sync persistent localization bootstrap ssot` (hash: `783e9f4e`)

### Stream: Verification And Release Handoff
17. [DONE] Refresh the shipped Settings webview bundle so the packaged extension includes startup bootstrap hydration on first paint. Scope: `media/react-chat.js`. Target commit: `build(webview): refresh localization bootstrap bundle`
18. [DONE] Git Commit: `build(webview): refresh localization bootstrap bundle` (hash: `ac939b58`)
19. [DONE] Run targeted verification for localization/core/webview/project-manager and record the validated bootstrap behavior in the active session report before the next packaged release. Scope: `@codeai-hub/localization`, `@codeai-hub/core`, webview/project-manager builds, `doc/Sessions/Session033.md`. Target commit: `docs(session): record persistent localization bootstrap verification`
20. [DONE] Git Commit: `docs(session): record persistent localization bootstrap verification` (hash: `ad63ff0b`)
21. [DONE] Prepare release-facing docs for the persistent localization bootstrap patch so `README.md` and `CHANGELOG.md` already point at the next packaged version before any version bump/build scripts run. Scope: `README.md`, `CHANGELOG.md`. Target commit: `docs(release): prepare persistent localization bootstrap release notes`
22. [DONE] Git Commit: `docs(release): prepare persistent localization bootstrap release notes` (hash: `c04034d3`)
23. [DONE] Run `./scripts/build-all.sh` and commit the version/manifests surface on a clean tree before VSIX packaging. Scope: release-generated version files/manifests. Target commit: `build(release): assemble persistent localization bootstrap release`
24. [TODO] Git Commit: `build(release): assemble persistent localization bootstrap release` (hash: TBD)
25. [TODO] Run `./scripts/build-release.sh --use-current-version`, archive the completed bootstrap planning/todo docs, record the packaged VSIX outcome in `Session033.md`, and finish the session closeout with the released version. Scope: `doc/Sessions/Session033.md`, `doc/TODO/Archive`, `doc/SolidWorks-WorkFlow/Plans/Archive`, packaged release verification outputs. Target commit: `docs(session): record persistent localization bootstrap packaged release`
26. [TODO] Git Commit: `docs(session): record persistent localization bootstrap packaged release` (hash: TBD)
