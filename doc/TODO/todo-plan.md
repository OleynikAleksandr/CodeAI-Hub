# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "provider-system-prompts-tools-2026-06-22",
  "branch": "main",
  "baseHead": "6a4528ef5",
  "lastRecordedCommit": "self",
  "planningSource": "doc/BugRegistry.md",
  "currentTaskId": "provider-tools.phase1.closeout.task1",
  "expectedCommitMessage": "docs: close provider prompt tooling scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/BugRegistry.md`
- **Read this context before implementation:**
  - `AGENTS.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/BugRegistry.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Standalone_Workspace_Chats_Planning.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Modules/GLM_Native.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules
- **Required reading before every fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Keep each implementation task scoped to no more than 3 files or packages.
- Each implementation task is followed by a separate `Git Commit: ...` line.
- Run `npm run plan:validate` before every `npm run plan:commit -- "<Expected Commit>"`.
- No release build is allowed until the user explicitly confirms the Release Build Confirmation Gate.

## Phase 1 - Provider System Prompts And Tools (owner: Codex, updated: 2026-06-22)
### Stream: Plan Intake
1. [DONE] `provider-tools.phase1.plan.task1` Create the active investigation plan and record the standalone chat deletion regression in the bug registry (scope: `doc/TODO/todo-plan.md, doc/BugRegistry.md`; expected commit: `docs: start provider prompt tooling investigation`).
2. [DONE] `provider-tools.phase1.plan.commit1` Git Commit: `docs: start provider prompt tooling investigation` (hash: self)

### Stream: GLM Prompt And Tool Source Decision
3. [DONE] `provider-tools.phase1.glm-decision.task1` Decide the source of truth for GLM standalone chat system prompt and tool surface before implementation (scope: `doc/TODO/todo-plan.md`; expected commit: none).

### Stream: Capture Workbench Provider Registry
4. [DONE] `provider-tools.phase1.capture-ui.task1` Align Capture Workbench provider/model/reasoning selectors with existing provider registries so current Codex/Kimi/OpenCode model choices appear in the detached workbench (scope: `src/client/project-manager/components/capture-workbench/model-reasoning-selectors.tsx, src/client/project-manager/components/capture-workbench/selection-bar.tsx, src/client/project-manager/components/capture-workbench/selection-bar.test.tsx, doc/TODO/todo-plan.md`; expected commit: `fix: align capture workbench model registry`).
5. [DONE] `provider-tools.phase1.capture-ui.commit1` Git Commit: `fix: align capture workbench model registry` (hash: self)
6. [DONE] `provider-tools.phase1.capture-backend-decision.task1` Decide the smallest backend path for full native prompt/tool capture across Kimi, OpenCode/GLM, and direct GLM without copying Claude/Codex internals (scope: `doc/TODO/todo-plan.md`; expected commit: none).

### Stream: Capture Workbench Vanilla Baseline
7. [DONE] `provider-tools.phase1.vanilla-plan.task1` Add the Vanilla baseline implementation stream after confirming the disabled Re-capture Vanilla button is an intentional Phase 1 placeholder, not an SDK runtime failure (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add vanilla capture workbench stream`).
8. [DONE] `provider-tools.phase1.vanilla-plan.commit1` Git Commit: `docs: add vanilla capture workbench stream` (hash: self)
9. [DONE] `provider-tools.phase1.vanilla-transport.task1` Add Workbench Vanilla run transport with `mode: "vanilla"` while keeping Managed behavior unchanged (scope: `src/client/project-manager/core-stream-message-types.ts, src/client/project-manager/services/capture-workbench-runner*.ts, doc/TODO/todo-plan.md`; expected commit: `feat: add vanilla capture transport`).
10. [DONE] `provider-tools.phase1.vanilla-transport.commit1` Git Commit: `feat: add vanilla capture transport` (hash: self)
11. [DONE] `provider-tools.phase1.vanilla-ui.task1` Enable the Re-capture Vanilla button and rotate Vanilla slot artifacts in the Workbench UI (scope: `src/client/project-manager/components/capture-workbench/snapshot-cards-row.tsx, src/client/project-manager/components/capture-workbench/snapshot-cards-row.test.tsx, doc/TODO/todo-plan.md`; expected commit: `feat: enable vanilla capture workbench action`).
12. [DONE] `provider-tools.phase1.vanilla-ui.commit1` Git Commit: `feat: enable vanilla capture workbench action` (hash: self)
13. [DONE] `provider-tools.phase1.vanilla-core.task1` Thread capture mode through Core native request capture and writer so Vanilla artifacts are recorded as `mode: "vanilla"` (scope: `packages/core/src/provider-network-capture/native-request-capture-facade*.ts, packages/core/src/provider-registry/provider-module-loader.types.ts, doc/TODO/todo-plan.md`; expected commit: `feat: thread vanilla native capture mode`).
14. [DONE] `provider-tools.phase1.vanilla-core.commit1` Git Commit: `feat: thread vanilla native capture mode` (hash: self)
15. [DONE] `provider-tools.phase1.vanilla-claude.task1` Implement Claude Vanilla capture inputs by omitting CodeAI-managed `systemPrompt`, managed tool allowlist, setting sources and permission overrides while keeping required SDK infrastructure only (scope: `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts, packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.test.ts, doc/TODO/todo-plan.md`; expected commit: `feat: capture vanilla claude native requests`).
16. [DONE] `provider-tools.phase1.vanilla-claude.commit1` Git Commit: `feat: capture vanilla claude native requests` (hash: self)
17. [DONE] `provider-tools.phase1.vanilla-codex.task1` Implement Codex Vanilla capture inputs by starting the native app-server request without CodeAI-managed base instructions, workflow process profile overrides, or extended history (scope: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service*.ts, packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process-profile.ts, doc/TODO/todo-plan.md`; expected commit: `feat: capture vanilla codex native requests`).
18. [DONE] `provider-tools.phase1.vanilla-codex.commit1` Git Commit: `feat: capture vanilla codex native requests` (hash: self)
19. [DONE] `provider-tools.phase1.vanilla-diff.task1` Enable Managed vs Vanilla diff mode once both slot sides exist, leaving Vanilla-current-vs-previous as a later convenience if it needs extra UI state (scope: `src/client/project-manager/components/capture-workbench/diff-renderer.tsx, src/client/project-manager/components/capture-workbench/diff-renderer.test.tsx, src/client/project-manager/components/capture-workbench/detached-capture-workbench.tsx, doc/TODO/todo-plan.md`; expected commit: `feat: compare managed and vanilla captures`).
20. [DONE] `provider-tools.phase1.vanilla-diff.commit1` Git Commit: `feat: compare managed and vanilla captures` (hash: self)

### Stream: Standalone Chat Deletion Regression
21. [DONE] `provider-tools.phase1.chat-delete.task1` Fix workflow step deletion so standalone workspace chat sessions and histories survive any workflow tree cleanup/delete operation (scope: `packages/core/src/remote-bridge/handlers/workflow-*clear*.ts, packages/core/src/unified-session/**, doc/TODO/todo-plan.md`; expected commit: `fix: preserve standalone chats during workflow deletion`).
22. [DONE] `provider-tools.phase1.chat-delete.commit1` Git Commit: `fix: preserve standalone chats during workflow deletion` (hash: self)

### Stream: Kimi Prompt And Tool Source Decision
23. [DONE] `provider-tools.phase1.kimi-decision.task1` Decide the source of truth for Kimi standalone chat system prompt and tool surface before implementation (scope: `doc/TODO/todo-plan.md`; expected commit: none). Result: Kimi decision: keep Kimi standalone prompt/tool SSOT in packages/Kimi_Module managed profile; native capture remains unavailable until the Kimi provider exposes a request-capture transport, so no code change in this scope.

### Stream: Tooling Verification
24. [DONE] `provider-tools.phase1.verify.task1` Run focused verification for changed provider/session behavior before user retest (scope: `src/client/project-manager, packages/core, packages/Claude_Module, packages/Codex_AppServer_Module, packages/GLM_Module, packages/Kimi_Module`; expected commit: `test: verify provider prompt tooling fixes`).
25. [DONE] `provider-tools.phase1.verify.commit1` Git Commit: `test: verify provider prompt tooling fixes` (hash: self)

### Stream: Release Build
26. [DONE] `provider-tools.phase1.release-docs.task1` Prepare README and CHANGELOG for the user-confirmed 1.2.580 test release before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.580 test release`).
27. [DONE] `provider-tools.phase1.release-docs.commit1` Git Commit: `docs: prepare 1.2.580 test release` (hash: self)
28. [DONE] `provider-tools.phase1.release-build.task1` Run the release build scripts and commit version bumps, manifests, release artifacts, VSIX evidence, and plan state (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, *.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.580 test release`).
29. [DONE] `provider-tools.phase1.release-build.commit1` Git Commit: `chore: build 1.2.580 test release` (hash: self)

### Stream: User Workflow Acceptance Testing
30. [DONE] `provider-tools.phase1.vanilla-router.task1` Fix the bridge path so Re-capture Vanilla reaches Core as `captureMode: "vanilla"` instead of defaulting back to managed (scope: `packages/core/src/remote-bridge/remote-bridge-message-router.ts, packages/core/src/remote-bridge/types.ts, packages/core/src/remote-bridge/remote-bridge-message-router.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: preserve vanilla capture mode through bridge`).
31. [DONE] `provider-tools.phase1.vanilla-router.commit1` Git Commit: `fix: preserve vanilla capture mode through bridge` (hash: self)
32. [DONE] `provider-tools.phase1.capture-clear.task1` Add a Capture Workbench action that clears the current workbench index and deletes the referenced capture documents so only fresh artifacts remain after the next capture (scope: `src/client/project-manager/components/capture-workbench/**, packages/core/src/remote-bridge/handlers/workbench-state-persistence-handler*.ts, doc/TODO/todo-plan.md`; expected commit: `feat: clear capture workbench artifacts`).
33. [DONE] `provider-tools.phase1.capture-clear.commit1` Git Commit: `feat: clear capture workbench artifacts` (hash: self)
### Stream: Follow-up Release Build
34. [DONE] `provider-tools.phase1.release-docs-581.task1` Prepare README and CHANGELOG for the user-confirmed 1.2.581 test release before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.581 test release`).
35. [DONE] `provider-tools.phase1.release-docs-581.commit1` Git Commit: `docs: prepare 1.2.581 test release` (hash: self)
36. [DONE] `provider-tools.phase1.release-build-581.task1` Run the release build scripts and commit version bumps, manifests, release artifacts, VSIX evidence, and plan state (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, *.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.581 test release`).
37. [DONE] `provider-tools.phase1.release-build-581.commit1` Git Commit: `chore: build 1.2.581 test release` (hash: self)
38. [DONE] `provider-tools.phase1.acceptance-gate-581.task1` Restore the post-release user acceptance gate so the scope stays active after delivering 1.2.581 (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: restore 1.2.581 acceptance gate`).
39. [DONE] `provider-tools.phase1.acceptance-gate-581.commit1` Git Commit: `docs: restore 1.2.581 acceptance gate` (hash: self)

### Stream: GLM Provider Prompt And Tooling Profiles
40. [DONE] `provider-tools.phase1.glm-profile-docs.task1` Create native Codex-derived and custom GLM seed documents for system instructions and tool surfaces (scope: `doc/SolidWorks-WorkFlow/ProviderPromptsAndTools/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: seed glm provider prompt tooling profiles`).
41. [DONE] `provider-tools.phase1.glm-profile-docs.commit1` Git Commit: `docs: seed glm provider prompt tooling profiles` (hash: self)

### Stream: User Workflow Acceptance Testing For 1.2.581
42. [DONE] `provider-tools.phase1.glm-profile-localize.task1` Localize the GLM prompt/tooling seed documents' explanatory text to Russian for discussion while preserving exact captured native blocks (scope: `doc/SolidWorks-WorkFlow/ProviderPromptsAndTools/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: localize glm provider profile docs`).
43. [DONE] `provider-tools.phase1.glm-profile-localize.commit1` Git Commit: `docs: localize glm provider profile docs` (hash: self)

### Stream: Codex Native Baseline For GLM And Kimi
44. [DONE] `provider-tools.phase1.glm-codex-native.task1` Apply the captured Codex-native system instructions and full Codex-native tool definition list to the GLM provider system context for test release comparison while preserving the existing executable GLM workflow tool loop (scope: `packages/GLM_Module/src/provider/**, doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/TODO/todo-plan.md`; expected commit: `feat: apply codex native baseline to glm profile`).
45. [DONE] `provider-tools.phase1.glm-codex-native.commit1` Git Commit: `feat: apply codex native baseline to glm profile` (hash: self)
46. [DONE] `provider-tools.phase1.kimi-codex-native.task1` Apply the captured Codex-native system instructions and full Codex-native tool definition list to the Kimi managed agent system context for test release comparison while preserving the existing Kimi ACP executable tool profile (scope: `packages/Kimi_Module/src/provider/**, doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/TODO/todo-plan.md`; expected commit: `feat: apply codex native baseline to kimi profile`).
47. [DONE] `provider-tools.phase1.kimi-codex-native.commit1` Git Commit: `feat: apply codex native baseline to kimi profile` (hash: self)

### Stream: Follow-up Release Build For 1.2.582
48. [DONE] `provider-tools.phase1.release-docs-582.task1` Prepare README and CHANGELOG for the user-confirmed 1.2.582 test release before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.582 test release`).
49. [DONE] `provider-tools.phase1.release-docs-582.commit1` Git Commit: `docs: prepare 1.2.582 test release` (hash: self)
50. [DONE] `provider-tools.phase1.release-build-582.task1` Run the release build scripts and commit version bumps, manifests, release artifacts, VSIX evidence, and plan state (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, *.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.582 test release`).
51. [DONE] `provider-tools.phase1.release-build-582.commit1` Git Commit: `chore: build 1.2.582 test release` (hash: self)
52. [DONE] `provider-tools.phase1.acceptance.task1` User retested 1.2.582 and found that GLM received Codex tool descriptions in the system prompt but not the executable GLM `tools` array (scope: `doc/TODO/todo-plan.md`; expected commit: none).

### Stream: GLM Executable Tool Surface Follow-up
53. [DONE] `provider-tools.phase1.glm-executable-tools.task1` Expose GLM-compatible executable development tools instead of only describing Codex tools in the system prompt (scope: `packages/GLM_Module/src/provider/glm-native-agent-runtime.ts, packages/GLM_Module/src/provider/glm-native-provider-adapter.test.ts, packages/GLM_Module/src/provider/glm-native-provider-adapter.tools.test.ts, doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/TODO/todo-plan.md`; expected commit: `feat: expose executable glm development tools`).
54. [DONE] `provider-tools.phase1.glm-executable-tools.commit1` Git Commit: `feat: expose executable glm development tools` (hash: self)

### Stream: Release Build 1.2.583
55. [DONE] `provider-tools.phase1.glm-tools-acceptance-gate.task1` Restore the post-fix acceptance gate so GLM/Kimi standalone chat retesting continues before scope closeout (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: restore glm tools acceptance gate`).
56. [DONE] `provider-tools.phase1.glm-tools-acceptance-gate.commit1` Git Commit: `docs: restore glm tools acceptance gate` (hash: self)
57. [DONE] `provider-tools.phase1.release-docs-583.task1` Prepare README and CHANGELOG for the user-confirmed 1.2.583 test release before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.583 test release`).
58. [DONE] `provider-tools.phase1.release-docs-583.commit1` Git Commit: `docs: prepare 1.2.583 test release` (hash: self)
59. [DONE] `provider-tools.phase1.release-build-583.task1` Run the release build scripts and commit version bumps, manifests, release artifacts, VSIX evidence, and plan state (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, *.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.583 test release`).
60. [DONE] `provider-tools.phase1.release-build-583.commit1` Git Commit: `chore: build 1.2.583 test release` (hash: self)

### Stream: User Workflow Acceptance Testing After GLM Tools Follow-up
61. [DONE] `provider-tools.phase1.acceptance-after-glm-tools.task1` User retested GLM/Kimi standalone chats after the 1.2.583 GLM executable tool surface release and reported GLM `fetch failed (EPIPE: write EPIPE)` during a tool-heavy standalone turn (scope: `doc/TODO/todo-plan.md`; expected commit: none).

### Stream: GLM EPIPE Retry Follow-up
62. [DONE] `provider-tools.phase1.glm-epipe-retry.task1` Treat GLM `EPIPE` write failures as retryable and keep GLM request retries short, non-increasing, and non-nested (scope: `packages/GLM_Module/src/provider/glm-native-adapter-utils.ts, packages/GLM_Module/src/provider/glm-native-provider-adapter.ts, packages/GLM_Module/src/provider/glm-native-provider-adapter.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: retry glm epipe failures`).
63. [DONE] `provider-tools.phase1.glm-epipe-retry.commit1` Git Commit: `fix: retry glm epipe failures` (hash: self)
64. [DONE] `provider-tools.phase1.glm-epipe-docs.task1` Document the GLM EPIPE retry handling and remaining web_search executor gap from the 1.2.583 retest (scope: `doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/TODO/todo-plan.md`; expected commit: `docs: document glm epipe retry handling`).
65. [DONE] `provider-tools.phase1.glm-epipe-docs.commit1` Git Commit: `docs: document glm epipe retry handling` (hash: self)
### Stream: Release Build 1.2.584
66. [DONE] `provider-tools.phase1.release-docs-584.task1` Prepare README and CHANGELOG for the user-confirmed 1.2.584 EPIPE retry test release before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.584 test release`).
67. [DONE] `provider-tools.phase1.release-docs-584.commit1` Git Commit: `docs: prepare 1.2.584 test release` (hash: self)
68. [DONE] `provider-tools.phase1.release-build-584.task1` Run the release build scripts and commit version bumps, manifests, release artifacts, VSIX evidence, and plan state (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, *.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.584 test release`).
69. [DONE] `provider-tools.phase1.release-build-584.commit1` Git Commit: `chore: build 1.2.584 test release` (hash: self)

### Stream: User Workflow Acceptance Testing After GLM EPIPE Follow-up
70. [DONE] `provider-tools.phase1.acceptance-after-glm-epipe.task1` User retests GLM standalone chats after the 1.2.584 EPIPE retry release and decides whether the remaining unwired tools should be pruned or bridged (scope: `doc/TODO/todo-plan.md`; expected commit: none). Result: bridge the missing functionality as GLM-owned executable tools instead of keeping copied Codex-native declarations without local executors.

### Stream: Main Branch Recovery
71. [DONE] `provider-tools.phase1.main-merge.task1` Merge the restored 1.2.584 provider tooling line back into `main` after the local release commits were left without a branch ref (scope: `**`; expected commit: `merge: restore 1.2.584 provider tooling line`).
72. [DONE] `provider-tools.phase1.main-merge.commit1` Git Commit: `merge: restore 1.2.584 provider tooling line` (hash: self)

### Stream: GLM-Owned Executable Tool Runtime
73. [DONE] `provider-tools.phase1.glm-owned-tools.task1` Replace copied Codex-native GLM tool declarations with provider-owned executable tools and wire the smallest useful shell/search/web/file executors for standalone GLM work (scope: `packages/GLM_Module/src/provider/**, doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/TODO/todo-plan.md`; expected commit: `fix: implement native glm tool executors`).
74. [DONE] `provider-tools.phase1.glm-owned-tools.commit1` Git Commit: `fix: implement native glm tool executors` (hash: self)

### Stream: Release Build 1.2.585
75. [DONE] `provider-tools.phase1.release-docs-585.task1` Prepare README and CHANGELOG for the user-confirmed 1.2.585 GLM native tool runtime test release before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.585 test release`).
76. [DONE] `provider-tools.phase1.release-docs-585.commit1` Git Commit: `docs: prepare 1.2.585 test release` (hash: self)
77. [DONE] `provider-tools.phase1.release-build-585.task1` Run the release build scripts and commit version bumps, manifests, release artifacts, VSIX evidence, and plan state (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, *.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.585 test release`).
78. [DONE] `provider-tools.phase1.release-build-585.commit1` Git Commit: `chore: build 1.2.585 test release` (hash: self)

### Stream: GLM Language Contract Follow-up
79. [DONE] `provider-tools.phase1.glm-language-contract.task1` Pass chat/reasoning and artifact prose language into GLM native system instructions so user-facing messages, thinking summaries, and generated artifacts follow Settings General language choices (scope: `packages/core/src/remote-bridge/**, packages/GLM_Module/src/provider/**, doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/TODO/todo-plan.md`; expected commit: `fix: enforce glm language contract`).
80. [DONE] `provider-tools.phase1.glm-language-contract.commit1` Git Commit: `fix: enforce glm language contract` (hash: self)

### Stream: GLM Tool Runtime Reliability Follow-up
81. [DONE] `provider-tools.phase1.glm-file-search-tools.task1` Repair GLM `grep_files` and `glob_files` so they return real workspace matches/files or explicit executor errors instead of silent empty results (scope: `packages/GLM_Module/src/provider/**, doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/TODO/todo-plan.md`; expected commit: `fix: repair glm file search tools`).
82. [DONE] `provider-tools.phase1.glm-file-search-tools.commit1` Git Commit: `fix: repair glm file search tools` (hash: self)
83. [DONE] `provider-tools.phase1.glm-apply-patch-tool.task1` Repair GLM `apply_patch` so it applies patches through an in-process executor or returns explicit unsupported status instead of spawning a missing `apply_patch` binary (scope: `packages/GLM_Module/src/provider/**, doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/TODO/todo-plan.md`; expected commit: `fix: repair glm apply patch tool`).
84. [DONE] `provider-tools.phase1.glm-apply-patch-tool.commit1` Git Commit: `fix: repair glm apply patch tool` (hash: self)
85. [DONE] `provider-tools.phase1.glm-web-fetch.task1` Harden GLM `web_fetch` for JS-rendered or sparse pages by adding the smallest available rendered-content fallback or returning a clear limitation when only navigation shell HTML is available (scope: `packages/GLM_Module/src/provider/**, doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/TODO/todo-plan.md`; expected commit: `fix: harden glm web fetch results`).
86. [DONE] `provider-tools.phase1.glm-web-fetch.commit1` Git Commit: `fix: harden glm web fetch results` (hash: self)
87. [DONE] `provider-tools.phase1.provider-code-navigation.task1` Scope provider-owned code navigation tools for LSP-style references/definitions and semantic code search as shared capabilities after GLM file search is reliable, avoiding a GLM-only one-off implementation (scope: `doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/TODO/todo-plan.md`; expected commit: `docs: scope provider code navigation tools`).
88. [DONE] `provider-tools.phase1.provider-code-navigation.commit1` Git Commit: `docs: scope provider code navigation tools` (hash: self)

### Stream: Scope Closeout
89. [IN_PROGRESS] `provider-tools.phase1.closeout.task1` Close the provider prompt/tooling scope after explicit user acceptance and archive the active plan (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close provider prompt tooling scope`).
90. [TODO] `provider-tools.phase1.closeout.commit1` Git Commit: `docs: close provider prompt tooling scope` (hash: TBD)
