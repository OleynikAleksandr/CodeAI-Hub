# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `doc/SolidWorks-WorkFlow/Plans/Localization_Language_Picker_And_Browser_Runtime_Hydration_Architecture.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/Sessions/Session020.md`.
- Этот `TODO Plan` реализует один localization follow-up scope: searchable language picker -> host materialization -> browser bundle hydration -> PM/webview consumption -> release build.
- Каждая подзадача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново.
- Каждая implementation-подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Для localization package stream-ов таргетная проверка по умолчанию: `npm run build --workspace @codeai-hub/localization`.
- Для core/bridge stream-ов таргетная проверка по умолчанию: `npm run build --workspace @codeai-hub/core`.
- Для webview/browser stream-ов таргетная проверка по умолчанию: `npm run build:webview` + `npm run typecheck:webview`.
- Для Project Manager stream-ов таргетная проверка по умолчанию: `npm run build:project-manager`.
- Любые изменения логики и архитектуры синхронно отражать в `doc/` до коммита.
- Финальный release stream разрешён только с чистого дерева и актуальными release-facing документами.

## Phase 0 — Scope Bootstrap (owner: Docs, updated: 2026-04-02)
### Stream: Planning Intake
1. [DONE] Approve the language-picker/browser-hydration planning document and replace the placeholder TODO with this execution plan. Scope: `doc/SolidWorks-WorkFlow/Plans/Localization_Language_Picker_And_Browser_Runtime_Hydration_Architecture.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(plan): define localization hydration scope`
2. [DONE] Git Commit: `docs(plan): define localization hydration scope` (hash: `e7862110`)

## Phase 1 — Runtime Contract And Host Materialization (owner: Localization/Host, updated: 2026-04-02)
### Stream: Localization Runtime Contract
3. [DONE] Add browser-runtime snapshot types and facade helpers for engine catalogs plus resolved active bundles. Scope: `packages/localization/src/localization-contract.ts`, `packages/localization/src/localization-facade.ts`, `packages/localization/src/index.ts`. Target commit: `feat(localization): add runtime snapshot contract`
4. [DONE] Git Commit: `feat(localization): add runtime snapshot contract` (hash: `579011f6`)
5. [DONE] Add an extension-side localization runtime service that materializes and resolves active bundles for settings webview load/save. Scope: `src/extension-module/settings/localization-runtime-service.ts`, `src/extension-module/message-handlers/settings-message-handler.ts`, `src/extension-module/settings/types.ts`. Target commit: `feat(settings): materialize localization runtime payload`
6. [DONE] Git Commit: `feat(settings): materialize localization runtime payload` (hash: `759675a4`)
7. [DONE] Add remote-bridge settings payload support for Project Manager localization runtime hydration, including the explicit `@codeai-hub/localization` core package dependency for release packaging. Scope: `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`, `packages/core/src/remote-bridge/types.ts`, `src/client/project-manager/core-stream-message-types.ts`, `packages/core/package.json`. Target commit: `feat(pm): bridge localization runtime payload`
8. [DONE] Git Commit: `feat(pm): bridge localization runtime payload` (hash: `17055ca7`)

## Phase 2 — Shared Browser Runtime Hydration (owner: UI/PM, updated: 2026-04-02)
### Stream: Shared Browser Runtime
9. [DONE] Replace bundled-source-only lookup with a shared browser runtime contract that consumes hydrated bundles and language catalogs. Scope: `src/client/ui/src/app-host/use-localization.ts`, `src/client/ui/src/app-host/localization-runtime-contract.ts`, `src/client/ui/src/components/settings/use-settings-state-support.ts`. Target commit: `refactor(ui): hydrate browser localization runtime`
10. [TODO] Git Commit: `refactor(ui): hydrate browser localization runtime` (hash: TBD)
11. [TODO] Capture localization runtime snapshots in settings webview state and provide them through the settings host. Scope: `src/client/ui/src/components/settings/use-settings-state.ts`, `src/client/ui/src/app-host/settings-only-host.tsx`, `src/client/ui/src/components/settings-view.tsx`. Target commit: `refactor(ui): wire settings localization runtime`
12. [TODO] Git Commit: `refactor(ui): wire settings localization runtime` (hash: TBD)
13. [TODO] Add one Project Manager localization provider at the app/root boundary and stop per-component settings reloads for localized surfaces. Scope: `src/client/project-manager/app.tsx`, `src/client/project-manager/api.ts`, `src/client/project-manager/components/settings/use-project-manager-settings.ts`. Target commit: `refactor(pm): provide shared localization runtime`
14. [TODO] Git Commit: `refactor(pm): provide shared localization runtime` (hash: TBD)
15. [TODO] Switch currently localized Project Manager help surfaces to consume the shared provider instead of local settings resolution. Scope: `src/client/project-manager/components/description/description-step-help.tsx`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`, `src/client/project-manager/components/virtual-simulation/virtual-simulation-help.tsx`. Target commit: `refactor(pm): use shared localization provider for help surfaces`
16. [TODO] Git Commit: `refactor(pm): use shared localization provider for help surfaces` (hash: TBD)
17. [TODO] Switch Project Manager navigation surfaces to the shared provider and keep workflow labels/title badges hydrated from resolved bundles. Scope: `src/client/project-manager/components/layout/sidebar.tsx`, `src/client/project-manager/components/layout/toolbar.tsx`, `src/client/project-manager/components/layout/workspace-tree.tsx`. Target commit: `refactor(pm): use shared localization provider for navigation`
18. [TODO] Git Commit: `refactor(pm): use shared localization provider for navigation` (hash: TBD)

## Phase 3 — Searchable Picker UX (owner: UI, updated: 2026-04-02)
### Stream: Localization Settings Controls
19. [TODO] Add a reusable searchable localization language combobox with keyboard filtering and normalized persisted values. Scope: `src/client/ui/src/components/settings/localization-language-combobox.tsx`, `src/client/ui/src/components/settings/localization-language-filter.ts`, `src/client/ui/src/components/settings/localization-settings-card.tsx`. Target commit: `feat(ui): add localization language combobox`
20. [TODO] Git Commit: `feat(ui): add localization language combobox` (hash: TBD)
21. [TODO] Replace raw `source` and free-form engine semantics in the settings card with catalog-driven selectors and visible English source labeling. Scope: `src/client/ui/src/components/settings/localization-settings-card.tsx`, `src/client/ui/src/components/settings/use-settings-state.ts`, `src/client/ui/src/app-host/use-localization.ts`. Target commit: `refactor(ui): clarify localization selector semantics`
22. [TODO] Git Commit: `refactor(ui): clarify localization selector semantics` (hash: TBD)

## Phase 4 — SSOT, Verification, And Release (owner: Docs/Release, updated: 2026-04-02)
### Stream: Documentation And Verification
23. [TODO] Sync live localization SSOT with the picker/hydration runtime boundary and browser-provider contract. Scope: `doc/SolidWorks-WorkFlow/Modules/Localization.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(localization): sync picker hydration ssot`
24. [TODO] Git Commit: `docs(localization): sync picker hydration ssot` (hash: TBD)
25. [TODO] Run targeted verification for touched packages and clients. Scope: `@codeai-hub/localization`, `@codeai-hub/core`, `webview`, `project-manager`.

### Stream: Release
26. [TODO] Update release-facing docs for the localization picker/hydration rollout from a clean pre-build tree. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare localization hydration release notes`
27. [TODO] Git Commit: `docs(release): prepare localization hydration release notes` (hash: TBD)
28. [TODO] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version` from the clean tree. Scope: release-generated version files and manifests. Target commit: `build(release): assemble localization hydration release`
29. [TODO] Git Commit: `build(release): assemble localization hydration release` (hash: TBD)
30. [TODO] Archive this completed TODO plan and record the session report. Scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/SessionXXX.md`. Target commit: `docs(session): record localization hydration release`
31. [TODO] Git Commit: `docs(session): record localization hydration release` (hash: TBD)
