# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зелёных гейтов — Git Commit с релевантным описанием и апдейт `todo-plan.md`.
- **doc/TODO/todo-plan.md** обновлять после каждой подзадачи.

## Phase 1 — Thinking Display Scope Bootstrap (owner: UI, updated: 2026-04-01)
### Stream: Scope Bootstrap
1. [DONE] Create the approved planning doc and replace the placeholder TODO plan with this execution plan. Scope: `doc/SolidWorks-WorkFlow/Plans/Claude_Gemini_Thinking_Display_Architecture.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(plan): define claude gemini thinking display scope`
2. [DONE] Git Commit: `docs(plan): define claude gemini thinking display scope` (hash: `6ad99a57`)

## Phase 2 — Shared Settings Contract (owner: UI, updated: 2026-04-01)
### Stream: Extension Settings Snapshot
3. [TODO] Extend extension-side Claude/Gemini settings contracts so both providers own persisted `thinkingDisplaySyncEnabled`, while Claude keeps `thinking.enabled/maxTokens` as a separate upstream-thinking control. Scope: `src/extension-module/settings/claude-settings.ts`, `src/extension-module/settings/gemini-settings.ts`, `src/extension-module/settings/types.ts`. Target commit: `feat(settings): add claude gemini thinking display setting`
4. [DONE] Git Commit: `feat(settings): add claude gemini thinking display setting` (hash: `2bd2ba79`)
5. [DONE] Persist/load the new thinking-display state through extension storage and keep the core-loaded default settings payload aligned. Scope: `src/extension-module/settings/settings-storage.ts`, `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`. Target commit: `refactor(settings): persist thinking display snapshots`
6. [DONE] Git Commit: `refactor(settings): persist thinking display snapshots` (hash: `db041d4c`)

### Stream: Webview Settings Model And UX
7. [TODO] Map Claude/Gemini thinking display through the webview raw/model/helper settings layers. Scope: `src/client/ui/src/components/settings/settings-state-raw.ts`, `src/client/ui/src/components/settings/settings-state-model.ts`, `src/client/ui/src/components/settings/settings-state-helpers.ts`. Target commit: `refactor(settings): map claude gemini thinking display state`
8. [DONE] Git Commit: `refactor(settings): map claude gemini thinking display state` (hash: `112dddc2`)
9. [TODO] Wire the Claude thinking display toggle handler through the settings hook support layer and state hook so the view-model can mutate provider display sync uniformly. Scope: `src/client/ui/src/components/settings/use-settings-state-support.ts`, `src/client/ui/src/components/settings/use-settings-state.ts`. Target commit: `refactor(settings): add claude thinking display handler`
10. [DONE] Git Commit: `refactor(settings): add claude thinking display handler` (hash: `222fd0a4`)
11. [DONE] Add the Claude `Thinking in dialog` toggle to the Claude settings card and align the Gemini toggle wording to the same short product copy. Scope: `src/client/ui/src/components/settings/thinking-settings.tsx`, `src/client/ui/src/components/settings/gemini-default-model/gemini-default-model-card.tsx`, `src/client/ui/src/components/settings/settings-view.tsx`. Target commit: `feat(ui): expose thinking in dialog toggles`
12. [DONE] Git Commit: `feat(ui): expose thinking in dialog toggles` (hash: `b8792e19`)

## Phase 3 — Runtime Contract And Claude Bubble Path (owner: Providers, updated: 2026-04-01)
### Stream: Core Applied-Turn Config
13. [DONE] Resolve Claude/Gemini thinking display from persisted settings snapshots and attach it through the existing applied turn config. Scope: `packages/core/src/config/provider-settings-snapshot.ts`, `packages/core/src/config/provider-turn-config-resolver.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`. Target commit: `refactor(core): resolve thinking display for claude gemini`
14. [DONE] Git Commit: `refactor(core): resolve thinking display for claude gemini` (hash: `23367419`)

### Stream: Claude Provider Display Contract
15. [DONE] Add Claude applied-turn-config/runtime plumbing for display-only thinking gating without changing upstream thinking-mode selection. Scope: `packages/Claude_Module/src/provider/claude-applied-turn-config.ts`, `packages/Claude_Module/src/session/types.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`. Target commit: `feat(claude): apply thinking display config`
16. [DONE] Git Commit: `feat(claude): apply thinking display config` (hash: `e3a424df`)
17. [DONE] Emit Claude visible thinking as `assistant + tag:"thinking"` when enabled, and keep it hidden when disabled. Scope: `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`, `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/messaging/message-processor.test.ts`. Target commit: `refactor(claude): emit assistant thinking bubbles`
18. [DONE] Git Commit: `refactor(claude): emit assistant thinking bubbles` (hash: `219aa7f2`)

### Stream: Session UI Compatibility
19. [DONE] Update session/continuity helper filters so tagged assistant thinking is treated the same as legacy `role:"thinking"` where suppression and dedupe rules depend on it. Scope: `src/client/ui/src/session/session-view-helpers.tsx`, `src/client/ui/src/session/virtual-conversation-message-utils.ts`, `src/client/ui/src/session/virtual-conversation.tsx`. Target commit: `refactor(ui): treat tagged assistant thinking as thinking display`
20. [DONE] Git Commit: `refactor(ui): treat tagged assistant thinking as thinking display` (hash: `2097804b`)

## Phase 4 — SSOT And Release (owner: UI, updated: 2026-04-01)
### Stream: Documentation And Verification
21. [DONE] Sync final SSOT docs for Claude/Gemini thinking display behavior and the new Claude visible-bubble contract. Scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Target commit: `docs(architecture): sync claude gemini thinking display ssot`
22. [DONE] Git Commit: `docs(architecture): sync claude gemini thinking display ssot` (hash: `47da73aa`)
23. [DONE] Run targeted verification for touched packages and clients. Scope: `@codeai-hub/claude-module`, `@codeai-hub/core`, `webview`.

### Stream: Release
24. [DONE] Update release-facing docs for the next release from a clean pre-build tree. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare thinking display snapshot backfill notes`
25. [DONE] Git Commit: `docs(release): prepare thinking display snapshot backfill notes` (hash: `1cce9de5`)
26. [DONE] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version` from the clean tree. Scope: release-generated version files and manifests. Target commit: `build(release): assemble claude gemini thinking display release`
27. [DONE] Git Commit: `build(release): assemble claude gemini thinking display release` (hash: `dac75e58`)
28. [DONE] Archive this completed TODO plan and record the session report. Scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session012.md`. Target commit: `docs(session): record claude gemini thinking display release`
29. [DONE] Git Commit: `docs(session): record claude gemini thinking display release` (hash: `489b0060`)
