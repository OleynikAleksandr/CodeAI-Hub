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
2. [TODO] Git Commit: `docs(plan): define claude gemini thinking display scope` (hash: TBD)

## Phase 2 — Shared Settings Contract (owner: UI, updated: 2026-04-01)
### Stream: Extension Settings Snapshot
3. [TODO] Extend extension-side Claude/Gemini settings contracts so both providers own persisted `thinkingDisplaySyncEnabled`, while Claude keeps `thinking.enabled/maxTokens` as a separate upstream-thinking control. Scope: `src/extension-module/settings/claude-settings.ts`, `src/extension-module/settings/gemini-settings.ts`, `src/extension-module/settings/types.ts`. Target commit: `feat(settings): add claude gemini thinking display setting`
4. [TODO] Git Commit: `feat(settings): add claude gemini thinking display setting` (hash: TBD)
5. [TODO] Persist/load the new thinking-display state through extension storage and keep the core-loaded default settings payload aligned. Scope: `src/extension-module/settings/settings-storage.ts`, `src/extension-module/message-handlers/settings-message-handler.ts`, `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`. Target commit: `refactor(settings): persist thinking display snapshots`
6. [TODO] Git Commit: `refactor(settings): persist thinking display snapshots` (hash: TBD)

### Stream: Webview Settings Model And UX
7. [TODO] Map Claude/Gemini thinking display through the webview raw/model/helper settings layers. Scope: `src/client/ui/src/components/settings/settings-state-raw.ts`, `src/client/ui/src/components/settings/settings-state-model.ts`, `src/client/ui/src/components/settings/settings-state-helpers.ts`. Target commit: `refactor(settings): map claude gemini thinking display state`
8. [TODO] Git Commit: `refactor(settings): map claude gemini thinking display state` (hash: TBD)
9. [TODO] Add the Claude `Thinking in dialog` toggle to the Claude settings card and align the Gemini toggle wording to the same short product copy. Scope: `src/client/ui/src/components/settings/thinking-settings.tsx`, `src/client/ui/src/components/settings/gemini-default-model/gemini-default-model-card.tsx`, `src/client/ui/src/components/settings/settings-view.tsx`. Target commit: `feat(ui): expose thinking in dialog toggles`
10. [TODO] Git Commit: `feat(ui): expose thinking in dialog toggles` (hash: TBD)

## Phase 3 — Runtime Contract And Claude Bubble Path (owner: Providers, updated: 2026-04-01)
### Stream: Core Applied-Turn Config
11. [TODO] Resolve Claude/Gemini thinking display from persisted settings snapshots and attach it through the existing applied turn config. Scope: `packages/core/src/config/provider-settings-snapshot.ts`, `packages/core/src/config/provider-turn-config-resolver.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`. Target commit: `refactor(core): resolve thinking display for claude gemini`
12. [TODO] Git Commit: `refactor(core): resolve thinking display for claude gemini` (hash: TBD)

### Stream: Claude Provider Display Contract
13. [TODO] Add Claude applied-turn-config/runtime plumbing for display-only thinking gating without changing upstream thinking-mode selection. Scope: `packages/Claude_Module/src/provider/claude-applied-turn-config.ts`, `packages/Claude_Module/src/session/types.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`. Target commit: `feat(claude): apply thinking display config`
14. [TODO] Git Commit: `feat(claude): apply thinking display config` (hash: TBD)
15. [TODO] Emit Claude visible thinking as `assistant + tag:"thinking"` when enabled, and keep it hidden when disabled. Scope: `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`, `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/messaging/message-processor.test.ts`. Target commit: `refactor(claude): emit assistant thinking bubbles`
16. [TODO] Git Commit: `refactor(claude): emit assistant thinking bubbles` (hash: TBD)

### Stream: Session UI Compatibility
17. [TODO] Update session/continuity helper filters so tagged assistant thinking is treated the same as legacy `role:"thinking"` where suppression and dedupe rules depend on it. Scope: `src/client/ui/src/session/session-view-helpers.tsx`, `src/client/ui/src/session/virtual-conversation-message-utils.ts`, `src/client/ui/src/session/virtual-conversation.tsx`. Target commit: `refactor(ui): treat tagged assistant thinking as thinking display`
18. [TODO] Git Commit: `refactor(ui): treat tagged assistant thinking as thinking display` (hash: TBD)

## Phase 4 — SSOT And Release (owner: UI, updated: 2026-04-01)
### Stream: Documentation And Verification
19. [TODO] Sync final SSOT docs for Claude/Gemini thinking display behavior and the new Claude visible-bubble contract. Scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Target commit: `docs(architecture): sync thinking display ssot`
20. [TODO] Git Commit: `docs(architecture): sync thinking display ssot` (hash: TBD)
21. [TODO] Run targeted verification for touched packages and clients. Scope: `@codeai-hub/claude-module`, `@codeai-hub/core`, `webview`.

### Stream: Release
22. [TODO] Update release-facing docs for the next release from a clean pre-build tree. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare claude gemini thinking display notes`
23. [TODO] Git Commit: `docs(release): prepare claude gemini thinking display notes` (hash: TBD)
24. [TODO] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version` from the clean tree. Scope: release-generated version files and manifests. Target commit: `build(release): assemble claude gemini thinking display release`
25. [TODO] Git Commit: `build(release): assemble claude gemini thinking display release` (hash: TBD)
26. [TODO] Archive this completed TODO plan and record the session report. Scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session011.md`. Target commit: `docs(session): record claude gemini thinking display release`
27. [TODO] Git Commit: `docs(session): record claude gemini thinking display release` (hash: TBD)
