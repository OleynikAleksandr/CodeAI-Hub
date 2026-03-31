# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task must touch no more than 3 files.
- Each implementation task must be followed by a separate `Git Commit:` line.
- Documentation changes must be committed together with code changes that alter runtime behavior.
- Targeted builds are required before closing a stream/phase.
- Phase closes only after release build flow and a clean git tree.

## Phase 1 — Codex Provider-Home Foundation (owner: Codex, updated: 2026-03-31)
### Stream: Scope Bootstrap
1. [DONE] Create the approved planning doc and replace the placeholder TODO plan with this execution plan. Scope: `doc/SolidWorks-WorkFlow/Plans/Codex_ReasoningSummary_Settings_Architecture.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(plan): define codex reasoning summary settings scope`
2. [DONE] Git Commit: `docs(plan): define codex reasoning summary settings scope` (hash: `8e25454a`)
3. [DONE] Introduce provider-owned Codex config materializer and use it during auth bootstrap instead of linking `config.toml`. Scope: `packages/Codex_Module/src/auth/codex-provider-config-materializer.ts`, `packages/Codex_Module/src/auth/codex-provider-config-materializer.test.ts`, `packages/Codex_Module/src/auth/sdk-auth-manager.ts`. Target commit: `feat(codex): materialize provider config home`
4. [DONE] Git Commit: `feat(codex): materialize provider config home` (hash: `e4094b19`)
5. [DONE] Move SDK config sanitization to the shared Codex provider config materializer and sync module SSOT notes. Scope: `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`, `packages/Codex_Module/src/sdk/codex-sdk-manager.test.ts`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`. Target commit: `refactor(codex): reuse provider config materializer`
6. [DONE] Git Commit: `refactor(codex): reuse provider config materializer` (hash: `14d33e8e`)
7. [DONE] Add `gpt-5.4-mini` to the Codex settings baseline and core defaults snapshot. Scope: `src/types/codex-model-registry.ts`, `packages/core/src/config/provider-defaults-resolver.ts`, `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`. Target commit: `feat(settings): add codex gpt-5.4-mini`
8. [DONE] Git Commit: `feat(settings): add codex gpt-5.4-mini` (hash: `9038566f`)

## Phase 2 — Codex Reasoning Summary Setting (owner: Codex, updated: 2026-03-31)
### Stream: Settings Contract And UI
1. [DONE] Add persisted Codex settings contract for `reasoningSummaryEnabled` with legacy fallback from `thinkingDisplaySyncEnabled`. Scope: `src/extension-module/settings/codex-settings.ts`. Target commit: `feat(settings): persist codex reasoning summary toggle`
2. [DONE] Git Commit: `feat(settings): persist codex reasoning summary toggle` (hash: `fbb85765`)
3. [DONE] Wire webview settings raw/model/helper layers to the new Codex field. Scope: `src/client/ui/src/components/settings/settings-state-raw.ts`, `src/client/ui/src/components/settings/settings-state-model.ts`, `src/client/ui/src/components/settings/settings-state-helpers.ts`. Target commit: `refactor(settings): map codex reasoning summary state`
4. [DONE] Git Commit: `refactor(settings): map codex reasoning summary state` (hash: `414fc215`)
5. [DONE] Rename the Codex checkbox and bind it to the new setting. Scope: `src/client/ui/src/components/settings/codex-default-model/codex-default-model-card.tsx`, `src/client/ui/src/components/settings-view.tsx`. Target commit: `feat(ui): expose codex reasoning in dialog toggle`
6. [DONE] Git Commit: `feat(ui): expose codex reasoning in dialog toggle` (hash: `a103872a`)

### Stream: Immediate Provider Config Sync
7. [DONE] Update provider-home `config.toml` immediately when the Codex checkbox is toggled from the settings UI. Scope: `src/extension-module/settings/codex-provider-config-sync.ts`, `src/extension-module/message-handlers/settings-message-handler.ts`, `src/client/ui/src/components/settings/use-settings-state.ts`. Target commit: `feat(settings): sync codex provider config on toggle`
8. [DONE] Git Commit: `feat(settings): sync codex provider config on toggle` (hash: `f948073e`)

## Phase 3 — Codex Runtime Truth Cleanup (owner: Codex, updated: 2026-03-31)
### Stream: Remove Duplicate Local Gate
1. [DONE] Stop Core from resolving/passing Codex `thinkingDisplaySyncEnabled` as a second source of truth. Scope: `packages/core/src/config/provider-settings-snapshot.ts`, `packages/core/src/config/provider-turn-config-resolver.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`. Target commit: `refactor(core): remove codex display sync applied config`
2. [DONE] Git Commit: `refactor(core): remove codex display sync applied config` (hash: `bccacb49`)
3. [DONE] Remove the Codex runtime-only visible-bubble suppression path. Scope: `packages/Codex_Module/src/messaging/codex-applied-turn-config.ts`, `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`, `packages/Codex_Module/src/session/types.ts`. Target commit: `refactor(codex): rely on provider reasoning summary mode`
4. [DONE] Git Commit: `refactor(codex): rely on provider reasoning summary mode` (hash: `e8d16dc0`)

### Stream: Saved Settings -> Provider Config Mode
5. [DONE] Resolve Codex reasoning summary mode from the saved settings snapshot and thread it into auth/SDK provider-home materialization. Scope: `packages/Codex_Module/src/auth/codex-reasoning-summary-settings.ts`, `packages/Codex_Module/src/auth/sdk-auth-manager.ts`, `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`. Target commit: `feat(codex): drive provider config from saved settings`
6. [DONE] Git Commit: `feat(codex): drive provider config from saved settings` (hash: `5262804f`)
7. [DONE] Add provider-side tests for settings-driven `auto/none` materialization. Scope: `packages/Codex_Module/src/auth/codex-reasoning-summary-settings.test.ts`, `packages/Codex_Module/src/auth/codex-provider-config-materializer.test.ts`, `packages/Codex_Module/src/sdk/codex-sdk-manager.test.ts`. Target commit: `test(codex): cover reasoning summary settings flow`
8. [DONE] Git Commit: `test(codex): cover reasoning summary settings flow` (hash: `127018ca`)

## Phase 4 — SSOT Sync And Release (owner: Codex, updated: 2026-03-31)
### Stream: Documentation And Verification
1. [DONE] Sync final SSOT docs for the new Codex reasoning-summary setting contract. Scope: `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`. Target commit: `docs(codex): sync reasoning summary settings ssot`
2. [DONE] Git Commit: `docs(codex): sync reasoning summary settings ssot` (hash: `1166b142`)
3. [DONE] Run targeted verification for touched packages and clients. Scope: `@codeai-hub/codex-module`, `@codeai-hub/core`, `webview`.

### Stream: Release
4. [DONE] Update release-facing docs, run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version`. Scope: release scripts and generated version files. Target commit: `build(release): assemble codex reasoning summary settings release`
5. [DONE] Git Commit: `build(release): assemble codex reasoning summary settings release` (hash: `31b57e8f`)
6. [DONE] Archive this completed TODO plan and record the session report. Scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session008.md`. Target commit: `docs(session): record codex reasoning summary settings release`
7. [TODO] Git Commit: `docs(session): record codex reasoning summary settings release` (hash: TBD)
