# Development TODO Plan

## Execution Rules
- Required reading before each fix:
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_Thinking_Message_Classification_Fix.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Dialog_Autoscroll_And_PM_Help_Color_Patch.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/GitHub_Actions_CI_Workspace_Build_Order_Fix.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Thinking_Visibility_And_Config_Sync.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Settings_Save_Notification_Overlay_Fix.md`
- Keep each micro-task within `<= 3 files`.
- Every implementation line must be followed by a separate `Git Commit:` line.
- Update docs in real time when logic or architecture changes.
- Before release handoff, run targeted builds/tests for touched packages, then `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`.

## Phase 1 — Claude Thinking Message Classification (owner: Codex, updated: 2026-04-04)

### Stream: Planning Intake
1. [DONE] Record the provider-native classification bug where Claude `thinking -> text -> tool_use` is split into `Thinking -> Assistant`; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_Thinking_Message_Classification_Fix.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): define claude thinking classification scope`
2. [DONE] Git Commit: `docs(plan): define claude thinking classification scope` (hash: `f544ba79`)

### Stream: Claude Router Classification
3. [DONE] Reclassify same-message Claude pre-tool text as `thinking` when the provider-native message already emitted `thinking`; scope: `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`, `packages/Claude_Module/src/messaging/claude-thinking-dialog-emitter.ts`, `packages/Claude_Module/src/messaging/message-processor.translation.test.ts`; expected commit: `fix(claude): classify thinking continuations correctly`
4. [DONE] Git Commit: `fix(claude): classify thinking continuations correctly` (hash: `69c6e71f`)

### Stream: PM Help Color Release Tail
5. [DONE] Update Project Manager help/spravka text color to `rgba(100, 130, 155, 1)` while keeping the current size/weight contract; scope: `packages/ui/project-manager/styles.css`, `doc/TODO/todo-plan.md`; expected commit: `style(pm): retune help text color`
6. [DONE] Git Commit: `style(pm): retune help text color` (hash: `02dda079`)

### Stream: Release Docs And Packaging
7. [DONE] Sync release notes for the PM help-color patch release; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare pm help color patch notes`
8. [DONE] Git Commit: `docs(release): prepare pm help color patch notes` (hash: `fc36f68c`)
9. [DONE] Build and package the release after all active streams are green; scope: release scripts + versioned artifacts; expected commit: `build(release): assemble pm help color patch release`
10. [DONE] Git Commit: `build(release): assemble pm help color patch release` (hash: `8fe5a2a9`)
11. [DONE] Record the session report after packaging; scope: `doc/Sessions/Session035.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record pm help color patch release`
12. [DONE] Git Commit: `docs(session): record pm help color patch release` (hash: `b939b712`)

## Phase 2 — Dialog Autoscroll And PM Help Color Patch (owner: Codex, updated: 2026-04-04)

### Stream: Planning Intake
13. [DONE] Record the shared dialog auto-scroll regression for growing last bubbles and the PM help-color retune request; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Dialog_Autoscroll_And_PM_Help_Color_Patch.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): define dialog autoscroll patch scope`
14. [DONE] Git Commit: `docs(plan): define dialog autoscroll patch scope` (hash: `52cf2d21`)

### Stream: Shared Dialog Bottom Anchor
15. [DONE] Make shared dialog auto-scroll react to last-bubble growth instead of message-count-only changes; scope: `src/client/ui/src/session/dialog-panel.tsx`, `src/client/ui/src/session/dialog-panel-scroll-anchor.ts`, `src/client/ui/src/session/dialog-panel-scroll-anchor.test.ts`; expected commit: `fix(ui): keep dialog pinned on growing thinking messages`
16. [DONE] Git Commit: `fix(ui): keep dialog pinned on growing thinking messages` (hash: `21aeca2e`)

### Stream: PM Help Color Retune
17. [DONE] Update PM help/spravka color to `rgba(115, 130, 140, 1)` while preserving the accepted size/weight contract; scope: `packages/ui/project-manager/styles.css`, `doc/TODO/todo-plan.md`; expected commit: `style(pm): retune help text color again`
18. [DONE] Git Commit: `style(pm): retune help text color again` (hash: `6e9e5868`)

### Stream: Release Docs And Packaging
19. [DONE] Sync release notes for the dialog auto-scroll patch release; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare dialog autoscroll patch notes`
20. [DONE] Git Commit: `docs(release): prepare dialog autoscroll patch notes` (hash: `321634bb`)
21. [DONE] Build and package the release after all active streams are green; scope: release scripts + versioned artifacts; expected commit: `build(release): assemble dialog autoscroll patch release`
22. [DONE] Git Commit: `build(release): assemble dialog autoscroll patch release` (hash: `1c93ee3f`)
23. [DONE] Record the session report after packaging; scope: `doc/Sessions/Session036.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record dialog autoscroll patch release`
24. [DONE] Git Commit: `docs(session): record dialog autoscroll patch release` (hash: `9ee0bc45`)

## Phase 3 — GitHub Actions CI Workspace Build Order Fix (owner: Codex, updated: 2026-04-04)

### Stream: Planning Intake
25. [DONE] Record the clean-runner CI failure where `@codeai-hub/localization` cannot be resolved before workspace package builds; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/GitHub_Actions_CI_Workspace_Build_Order_Fix.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): define ci workspace build-order fix`
26. [DONE] Git Commit: `docs(plan): define ci workspace build-order fix` (hash: `475dd45d`)

### Stream: Root Compile Contract
27. [DONE] Build required workspace packages before browser/root compile so clean GitHub runners resolve localization types correctly; scope: `package.json`, `README.md`, `doc/TODO/todo-plan.md`; expected commit: `fix(ci): build workspace deps before compile`
28. [DONE] Git Commit: `fix(ci): build workspace deps before compile` (hash: `62abc8a4`)

### Stream: CI Verification
29. [DONE] Reproduce the clean-runner compile path locally after deleting generated workspace `dist` folders; scope: local verification only; expected commit: `fix(ci): build workspace deps before compile`
30. [DONE] Git Commit: `fix(ci): build workspace deps before compile` (hash: `62abc8a4`)

### Stream: Release Docs And Packaging
31. [DONE] Sync release notes for the CI workspace build-order patch release; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare ci workspace build-order patch notes`
32. [DONE] Git Commit: `docs(release): prepare ci workspace build-order patch notes` (hash: `a14b61e2`)
33. [DONE] Build and package the release after release notes are green; scope: release scripts + versioned artifacts; expected commit: `build(release): assemble ci workspace build-order patch release`
34. [DONE] Git Commit: `build(release): assemble ci workspace build-order patch release` (hash: `afc964fc`)

### Stream: Session Report
35. [DONE] Record the CI-fix and release session report after packaging; scope: `doc/Sessions/Session037.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record ci workspace build-order fix`
36. [DONE] Git Commit: `docs(session): record ci workspace build-order fix` (hash: `842a159a`)

## Phase 4 — Codex Thinking Visibility And Config Sync (owner: Codex, updated: 2026-04-04)

### Stream: Planning Intake
37. [DONE] Record the linked Codex defects where `Reasoning in dialog` produces no visible `Thinking` for `gpt-5.3-codex` and provider-owned `config.toml` still advertises `gpt-5.4`; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Thinking_Visibility_And_Config_Sync.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): define codex thinking visibility scope`
38. [DONE] Git Commit: `docs(plan): define codex thinking visibility scope` (hash: `b73035ca`)

### Stream: Codex Provider Config Sync
39. [DONE] Sync provider-owned Codex `config.toml` model with shared settings while preserving reasoning-summary ownership; scope: `packages/Codex_Module/src/auth/codex-provider-config-materializer.ts`, `src/extension-module/settings/codex-provider-config-sync.ts`, `packages/Codex_Module/src/auth/codex-provider-config-materializer.test.ts`; expected commit: `fix(codex): sync provider config model with settings`
40. [DONE] Git Commit: `fix(codex): sync provider config model with settings` (hash: `8a7b1544`)

### Stream: Codex Thinking Classification
41. [DONE] Carry Codex thinking display sync into runtime turn config and classify intermediate `agent_message` progress as visible `Thinking` by provider-native event order; scope: `packages/core/src/config/provider-settings-snapshot.ts`, `packages/core/src/config/provider-turn-config-resolver.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`; expected commit: `fix(core): expose codex thinking display sync`
42. [DONE] Git Commit: `fix(core): expose codex thinking display sync` (hash: `714ab240`)
43. [DONE] Add Codex provider-local runtime turn config so the applied `thinkingDisplaySyncEnabled` flag reaches the session before event routing; scope: `packages/Codex_Module/src/session/types.ts`, `packages/Codex_Module/src/messaging/codex-applied-turn-config.ts`, `packages/Codex_Module/src/messaging/message-processor.test.ts`; expected commit: `fix(codex): store runtime thinking visibility config`
44. [DONE] Git Commit: `fix(codex): store runtime thinking visibility config` (hash: `514de521`)
45. [DONE] Buffer completed Codex `agent_message` items and emit only intermediate progress as `Thinking` while preserving the final assistant reply; scope: `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`, `packages/Codex_Module/src/messaging/message-processor.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(codex): restore visible thinking from agent messages`
46. [DONE] Git Commit: `fix(codex): restore visible thinking from agent messages` (hash: `6e948df5`)

### Stream: Codex Native Reasoning Regression Guard
47. [DONE] Add an explicit regression test that preserves native `gpt-5.4` `reasoning` visibility while keeping the `gpt-5.3-codex` `agent_message` fallback additive; scope: `packages/Codex_Module/src/messaging/message-processor.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `test(codex): guard native reasoning visibility`
48. [DONE] Git Commit: `test(codex): guard native reasoning visibility` (hash: `f3610521`)

### Stream: Release Docs And Packaging
49. [DONE] Sync release notes for the Codex thinking/config patch release; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare codex thinking visibility patch notes`
50. [DONE] Git Commit: `docs(release): prepare codex thinking visibility patch notes` (hash: `fe2e20bb`)
51. [DONE] Build and package the release after the Codex streams are green; scope: release scripts + versioned artifacts; expected commit: `build(release): assemble codex thinking visibility patch release`
52. [DONE] Git Commit: `build(release): assemble codex thinking visibility patch release` (hash: `d30bd2db`)
53. [DONE] Record the session report after packaging; scope: `doc/Sessions/Session038.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record codex thinking visibility patch`
54. [DONE] Git Commit: `docs(session): record codex thinking visibility patch` (hash: `0519e889`)

## Phase 5 — Settings Save Notification Overlay Fix (owner: Codex, updated: 2026-04-04)

### Stream: Planning Intake
55. [DONE] Record the stale Settings save overlay notification and approve the removal-first fix path; scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Settings_Save_Notification_Overlay_Fix.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): define settings save overlay fix`
56. [DONE] Git Commit: `fix(settings): remove save overlay notification` (hash: `9a7b3749`)

### Stream: Settings Save UX
57. [DONE] Remove the legacy global `Settings saved (stub implementation).` notification while preserving the existing WebView `settings:saved` flow; scope: `src/extension-module/message-handlers/settings-message-handler.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(settings): remove save overlay notification`
58. [DONE] Git Commit: `fix(settings): remove save overlay notification` (hash: `9a7b3749`)
