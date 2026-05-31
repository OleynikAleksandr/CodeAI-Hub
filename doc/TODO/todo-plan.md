# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "input-unlock-settle-2026-05-30",
  "branch": "main",
  "baseHead": "84b5446e2",
  "lastRecordedCommit": "2b1a15c6b",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md",
  "currentTaskId": "release-docs-419",
  "expectedCommitMessage": "docs: prepare 1.2.419 release notes",
  "debt": {
    "expectedCommitMessage": "docs: prepare 1.2.419 release notes",
    "preCommitHead": "2b1a15c6b",
    "stage": "commit_pending",
    "taskId": "release-docs-419"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules
- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task is paired with a separate `Git Commit: ...` item.
- Keep micro-task file scope at three files/packages or less.
- Plan grows incrementally; release streams are added before the closeout anchor.
- Do not run release build without explicit user confirmation.
- Scope closeout requires explicit user acceptance.

## Phase 1 — Input Unlock Settle + Release 1.2.409 (owner: Claude, updated: 2026-05-30)
### Stream: Input Unlock Timing Fix
1. [DONE] `input-unlock-settle` Defer the input unlock by a short settle window after a turn goes idle without a managed review gate, so the input does not free up before the agent's last streamed text finishes rendering; a managed review gate (activeManagedReviewMessageId) unlocks immediately, and a new running turn re-locks immediately — scope: `src/client/ui/src/session/input-panel.tsx, src/client/ui/src/session/session-view.tsx`; expected commit: `fix: defer input unlock until the agent stream settles`
2. [DONE] Git Commit: `fix: defer input unlock until the agent stream settles` (hash: 490414afb)

### Stream: Tooling Verification
3. [DONE] `input-unlock-settle-verify` Build webview and run webview typecheck for the input unlock settle fix — scope: `webview build` Result: webview typecheck and build:webview passed for the input unlock settle fix

### Stream: Release Build
4. [DONE] `release-docs-409` Update README and CHANGELOG to 1.2.409 before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.409 release notes`
5. [DONE] Git Commit: `docs: prepare 1.2.409 release notes` (hash: be9fd2adc)
6. [DONE] `release-build-409` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.409 release`
7. [DONE] Git Commit: `chore: build 1.2.409 release` (hash: 5b0e62f29)
8. [DONE] `release-vsix-409` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.409 vsix`
9. [DONE] Git Commit: `chore: package 1.2.409 vsix` (hash: 5651e5528)

### Stream: User Visual Acceptance Testing
10. [DONE] `release-acceptance-409` Hand off `codeai-hub-1.2.409.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate Result: Retest of 1.2.409 found managed-phase regression: input unlocks between agent turns during managed core-gated work (e.g. Diagram Modules); needs Core-owned managed_core_gated lock

### Stream: Managed Phase Input Lock (from 1.2.409 retest)
11. [DONE] `managed-core-gated-lock` Lock the user input for the whole managed core-gated phase: Core sets a session continuityLock (reason "managed_core_gated") when a managed-workflow turn returns "continued" (agent keeps working with the orchestrator), and clears it on "settled"/"not_managed" (review gate opens / done). Snapshot broadcast + client session-stream then render connectionState blocked; the input frees only at waiting_for_user. Single Core-owned source (managed turn runStatus), UI only reflects. Lock logic extracted to managed-core-gated-lock-controller.ts and recordStreamHeartbeat extracted to session-stream-heartbeat.ts to keep event-router within the 500-line architecture budget — scope: `packages/core/src/workspace-runtime/workspace-runtime-types.ts, packages/core/src/remote-bridge/handlers/session-provider-event-router.ts, packages/core/src/remote-bridge/handlers/managed-core-gated-lock-controller.ts, packages/core/src/remote-bridge/handlers/session-stream-heartbeat.ts`; expected commit: `fix: lock input while managed workflow stays in core-gated phase`
12. [DONE] Git Commit: `fix: lock input while managed workflow stays in core-gated phase` (hash: 9033a816a)

### Stream: Tooling Verification
13. [DONE] `managed-lock-verify` Build core and webview and run webview typecheck for the managed core-gated lock — scope: `core + webview build` Result: core build, webview typecheck and build:webview passed for the managed core-gated input lock

### Stream: Release Build
14. [DONE] `release-docs-410` Update README and CHANGELOG to 1.2.410 before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.410 release notes`
15. [DONE] Git Commit: `docs: prepare 1.2.410 release notes` (hash: 11a5677c9)
16. [DONE] `release-build-410` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.410 release`
17. [DONE] Git Commit: `chore: build 1.2.410 release` (hash: 2c962c999)
18. [DONE] `release-vsix-410` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.410 vsix`
19. [DONE] Git Commit: `chore: package 1.2.410 vsix` (hash: 0fa496429)

### Stream: User Visual Acceptance Testing
20. [DONE] `release-acceptance-410` Hand off `codeai-hub-1.2.410.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate Result: Retest of 1.2.410: managed lock keyed to turn result released mid core-gated work because dispatch_next continuations return settled; refining to key off continuation message

### Stream: Managed Lock Refinement (from 1.2.410 retest)
21. [DONE] `managed-lock-continuation` Fix: the managed core-gated lock was keyed to the turn result, but dispatch_next continuations return "settled" with no internal prompt, which wrongly released the lock mid core-gated work. Now Core keeps the lock while a managed turn is "continued" OR "settled" right after a continuation message ("managed-workflow-continuation"), releasing it only at the review gate / blocked outcomes — scope: `packages/core/src/remote-bridge/handlers/managed-core-gated-lock-controller.ts, packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`; expected commit: `fix: keep managed lock through continuation turns`
22. [DONE] Git Commit: `fix: keep managed lock through continuation turns` (hash: 40ca52dda)

### Stream: Tooling Verification
23. [DONE] `managed-lock-continuation-verify` Build core and webview and run webview typecheck — scope: `core + webview build` Result: core build, webview typecheck and build:webview passed for the continuation-keyed managed lock

### Stream: Release Build
24. [DONE] `release-docs-411` Update README and CHANGELOG to 1.2.411 before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.411 release notes`
25. [DONE] Git Commit: `docs: prepare 1.2.411 release notes` (hash: 5d26c8159)
26. [DONE] `release-build-411` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.411 release`
27. [DONE] Git Commit: `chore: build 1.2.411 release` (hash: 887de0cc9)
28. [DONE] `release-vsix-411` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.411 vsix`
29. [DONE] Git Commit: `chore: package 1.2.411 vsix` (hash: 7e83b4c3b)

### Stream: User Visual Acceptance Testing
30. [DONE] `release-acceptance-411` Hand off `codeai-hub-1.2.411.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate Result: Retest of 1.2.411 found managed technical input still unlocks during Core-agent managed exchange in Diagram Modules; add follow-up managed core-gated input lock fix.

### Stream: Managed Core-Gated Input Lock Follow-up (from 1.2.411 retest)
32. [DONE] `managed-lock-terminal-boundary` Lock managed technical sessions as soon as a provider turn reaches Core-managed terminal arbitration, before validation/commit/continuation work can expose an idle input state — scope: `packages/core/src/remote-bridge/handlers/managed-core-gated-lock-controller.ts, packages/core/src/remote-bridge/handlers/session-provider-event-router.ts, packages/core/src/remote-bridge/handlers/managed-core-gated-lock-controller.test.ts`; expected commit: `fix: lock managed input during core arbitration`
33. [DONE] Git Commit: `fix: lock managed input during core arbitration` (hash: 83d75bf75)
34. [DONE] `managed-lock-async-continuations` Dispatch managed internal continuations without awaiting the next provider turn inside the previous turn's arbitration, so all managed technical stages keep one Core-owned lock lifecycle until review/blocked settlement — scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/managed-internal-continuation-dispatch.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts`; expected commit: `fix: keep managed lock across internal continuations`
35. [DONE] Git Commit: `fix: keep managed lock across internal continuations` (hash: e4e0b7929)

### Stream: Tooling Verification
36. [DONE] `managed-lock-follow-up-verify` Build core and webview and run webview typecheck for the managed input lock follow-up — scope: `core + webview build` Result: core build, webview typecheck, and build:webview passed for the managed input lock follow-up

### Stream: Release Build Confirmation
37. [DONE] `release-confirmation-412` Wait for explicit user confirmation before preparing release notes or running release build for the managed input lock follow-up — scope: user confirmation gate Result: User explicitly confirmed building release 1.2.412 for the managed input lock follow-up.

### Stream: Release Build
38. [DONE] `release-docs-412` Update README and CHANGELOG to 1.2.412 before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.412 release notes`
39. [DONE] Git Commit: `docs: prepare 1.2.412 release notes` (hash: 0e2f0a832)
40. [DONE] `release-build-412` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.412 release`
41. [DONE] Git Commit: `chore: build 1.2.412 release` (hash: 4328fe640)
42. [DONE] `release-vsix-412` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.412 vsix`
43. [DONE] Git Commit: `chore: package 1.2.412 vsix` (hash: 7c650284e)

### Stream: User Visual Acceptance Testing
44. [DONE] `release-acceptance-412` Hand off `codeai-hub-1.2.412.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate Result: Retest of 1.2.412 failed: input still unlocks during Diagram Modules Core-orchestrator/provider exchange; continue with Core-owned stage-level managed lock investigation

### Stream: Managed Stage-Level Core Lock (from 1.2.412 retest)
45. [DONE] `managed-stage-core-lock` Fix the real Core-owned lock lifecycle for managed technical stages so user input stays blocked through Core-orchestrator/provider exchange and releases only at explicit user gate / blocked / complete boundaries; do not use Project Manager triggers as source of truth — scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/managed-core-gated-lock-controller.ts, packages/core/src/remote-bridge/handlers/managed-core-gated-lock-controller.test.ts`; expected commit: `fix: keep managed input locked until user gate`
46. [DONE] Git Commit: `fix: keep managed input locked until user gate` (hash: 2c71efa50)

### Stream: Tooling Verification
47. [DONE] `managed-stage-core-lock-verify` Build core and webview and run webview typecheck for the stage-level managed Core lock — scope: `core + webview build` Result: core build, webview typecheck, and build:webview passed for the stage-level managed Core lock

### Stream: Release Build Confirmation
48. [DONE] `release-confirmation-413` Wait for explicit user confirmation before preparing release notes or running release build for the stage-level managed Core lock — scope: user confirmation gate Result: User explicitly confirmed building release 1.2.413 for the stage-level managed Core lock

### Stream: Release Build
49. [DONE] `release-docs-413` Update README and CHANGELOG to 1.2.413 before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.413 release notes`
50. [DONE] Git Commit: `docs: prepare 1.2.413 release notes` (hash: d12b07abb)
51. [DONE] `release-build-413` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.413 release`
52. [DONE] Git Commit: `chore: build 1.2.413 release` (hash: 9c9596025)
53. [DONE] `release-vsix-413` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.413 vsix`
54. [DONE] Git Commit: `chore: package 1.2.413 vsix` (hash: be9008fb3)

### Stream: User Visual Acceptance Testing
55. [DONE] `release-acceptance-413` Hand off `codeai-hub-1.2.413.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate Result: Retest of 1.2.413 failed: user input still unlocks during Core-agent managed conversation between Core accepted/next-substage system message and next provider turn; continue with Core managed-conversation gate lock.

### Stream: Managed Conversation Gate Lock (from 1.2.413 retest)
56. [DONE] `managed-conversation-gate-triggers` Lock user input from explicit Core managed-conversation boundaries: managed technical stages remain blocked from Core/provider arbitration through Core-authored continuation dispatch, and release only when Core opens a user review gate, blocked boundary, or complete user handoff; do not use Project Manager triggers — scope: `packages/core/src/remote-bridge/handlers/managed-core-gated-lock-controller.ts, packages/core/src/remote-bridge/handlers/session-provider-event-router.ts, packages/core/src/remote-bridge/handlers/session-provider-event-router.test.ts`; expected commit: `fix: lock input from core managed conversation state`
57. [DONE] Git Commit: `fix: lock input from core managed conversation state` (hash: 40ea3aa63)

### Stream: Tooling Verification
58. [DONE] `managed-conversation-gate-verify` Build core and webview and run targeted lock/event-router tests for the Core managed-conversation lock — scope: `core + webview build` Result: Verification passed: npm run build --workspace @codeai-hub/core; targeted node tests for managed lock/event router/managed workflow turn; npm run typecheck:webview; npm run build:webview.

### Stream: Release Build Confirmation
59. [DONE] `release-confirmation-414` Wait for explicit user confirmation before preparing release notes or running release build for the managed conversation gate lock — scope: user confirmation gate Result: User explicitly confirmed building release 1.2.414 for the Core managed-conversation input lock.

### Stream: Release Build
60. [DONE] `release-docs-414` Update README and CHANGELOG to 1.2.414 before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.414 release notes`
61. [DONE] Git Commit: `docs: prepare 1.2.414 release notes` (hash: 6afc14909)
62. [DONE] `release-build-414` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.414 release`
63. [DONE] Git Commit: `chore: build 1.2.414 release` (hash: ddf5989b4)
64. [DONE] `release-vsix-414` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.414 vsix`
65. [DONE] Git Commit: `chore: package 1.2.414 vsix` (hash: fcd4f65dc)

### Stream: User Visual Acceptance Testing
66. [DONE] `release-acceptance-414` Hand off `codeai-hub-1.2.414.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate Result: Retest of 1.2.414 failed: input remains unlocked during Core-agent managed workflow exchange; switch fix strategy to a Core-owned managed input gate independent of provider turn lifecycle.

### Stream: Core-Owned Managed Input Gate (from 1.2.414 retest)
67. [DONE] `managed-input-gate-realtime-event` Add a Core-owned managed input gate realtime stream that reasserts lock/unlock independently of provider turn lifecycle and is consumed by visible session projections without using Project Manager as the source of truth — scope: `packages/core/src/remote-bridge/handlers/managed-core-gated-lock-controller.ts, src/client/project-manager/components/sessions/turn-state-stream.ts, doc/TODO/todo-plan.md`; expected commit: `fix: gate managed input from core state`
68. [DONE] Git Commit: `fix: gate managed input from core state` (hash: 1275f9dca)
69. [DONE] `managed-input-gate-regression-tests` Add regressions proving the managed input gate stays locked through Core continuation and reaches dialog/runtime projections even when provider turn lifecycle or dialog history replay would otherwise look idle — scope: `packages/core/src/remote-bridge/handlers/session-provider-event-router.test.ts, packages/core/src/remote-bridge/handlers/managed-core-gated-lock-controller.test.ts, src/client/project-manager/components/sessions/turn-state-stream.test.ts`; expected commit: `test: cover managed input gate projection`
70. [DONE] Git Commit: `test: cover managed input gate projection` (hash: c0900991c)
71. [DONE] `managed-input-gate-verify` Build core and webview and run targeted managed input gate tests — scope: `core + webview build` Result: Verification passed: npm run build --workspace @codeai-hub/core; node tests for managed-core-gated-lock-controller and session-provider-event-router; node --import tsx turn-state-stream.test.ts; npm run typecheck:webview; npm run build:webview.
72. [DONE] `release-confirmation-415` Wait for explicit user confirmation before preparing release notes or running release build for the managed input gate fix — scope: user confirmation gate Result: User explicitly confirmed building release 1.2.415 for the Core-owned managed input gate fix.

### Stream: Release Build
73. [DONE] `release-docs-415` Update README and CHANGELOG to 1.2.415 before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.415 release notes`
74. [DONE] Git Commit: `docs: prepare 1.2.415 release notes` (hash: 9a83d3560)
75. [DONE] `release-build-415` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.415 release`
76. [DONE] Git Commit: `chore: build 1.2.415 release` (hash: e443bd0b8)
77. [DONE] `release-vsix-415` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.415 vsix`
78. [DONE] Git Commit: `chore: package 1.2.415 vsix` (hash: 8f1c8b0d6)

### Stream: User Visual Acceptance Testing
79. [DONE] `release-acceptance-415` Hand off `codeai-hub-1.2.415.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate Result: Retest of 1.2.415 failed: managed continuation prompts that start the next agent turn are displayed/emitted as System messages instead of provider-visible User turns, so the normal input lifecycle never re-locks between Core accepting one artifact and dispatching the next managed turn.

### Stream: Managed Continuation Provider Turn Role Fix (from 1.2.415 retest)
80. [DONE] `managed-continuation-user-role` Fix Core-authored managed continuation prompts that start the next agent turn so they are provider-visible `user` messages, while UI-only review/user handoff notices remain `system` messages — scope: `packages/core/src/remote-bridge/handlers/managed-internal-continuation-dispatch.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/quality-gates-review-decision-flow.ts`; expected commit: `fix: send managed continuations as user turns`
81. [DONE] Git Commit: `fix: send managed continuations as user turns` (hash: ebf72e2c6)
82. [DONE] `managed-continuation-user-role-tests` Add regressions proving managed continuation dispatch records/sends the next agent prompt as a user-authored turn and does not change system-only user review/handoff messages — scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts, packages/core/src/remote-bridge/handlers/quality-gates-review-decision-flow.test.ts, packages/core/src/remote-bridge/handlers/managed-internal-continuation-dispatch.test.ts`; expected commit: `test: cover managed continuation user turns`
83. [DONE] Git Commit: `test: cover managed continuation user turns` (hash: dde797a87)
84. [DONE] `managed-continuation-user-role-verify` Build core and webview and run targeted managed continuation role tests — scope: `core + webview build` Result: Verification passed: npm run build --workspace @codeai-hub/core; node --test managed-internal-continuation-dispatch, session-request-handler-managed-workflow-turn, and quality-gates-review-decision-flow dist tests; npm run typecheck:webview; npm run build:webview.

### Stream: Release Build Confirmation
85. [DONE] `release-confirmation-416` Wait for explicit user confirmation before preparing release notes or running release build for the managed continuation role fix — scope: user confirmation gate Result: User explicitly confirmed building release 1.2.416 for the managed continuation user-turn role fix.

### Stream: Release Build
86. [DONE] `release-docs-416` Update README and CHANGELOG to 1.2.416 before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.416 release notes`
87. [DONE] Git Commit: `docs: prepare 1.2.416 release notes` (hash: f5b97d84a)
88. [DONE] `release-build-416` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.416 release`
89. [DONE] Git Commit: `chore: build 1.2.416 release` (hash: d4c8b7fd4)
90. [DONE] `release-vsix-416` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.416 vsix`
91. [DONE] Git Commit: `chore: package 1.2.416 vsix` (hash: a2375d655)

### Stream: User Visual Acceptance Testing
92. [DONE] `release-acceptance-416` Hand off `codeai-hub-1.2.416.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate Result: Retest of 1.2.416 failed: continuation messages are now user-role in JSONL, but the Project Manager dialog input still unlocks because the Core managed gate is only transient in the visible projection and gets overwritten by later idle/unlocked state; visible continuation user message also contains the full provider prompt instead of a short Core summary.

### Stream: Managed Dialog Gate Projection + Continuation Display (from 1.2.416 retest)
93. [DONE] `managed-dialog-gate-projection` Harden the Project Manager dialog projection so a Core-owned `managed_input_gate` lock cannot be overwritten by stale idle/unlocked workspace snapshots; release only on explicit Core managed gate unlock/review handoff — scope: `src/client/project-manager/components/sessions/session-stream.ts, src/client/project-manager/components/sessions/session-stream.test.ts, src/client/project-manager/components/sessions/turn-state-stream.test.ts`; expected commit: `fix: keep managed dialog input gate locked`
94. [DONE] Git Commit: `fix: keep managed dialog input gate locked` (hash: e16796de1)
95. [DONE] `managed-continuation-visible-summary` Shorten live Diagram Modules Product Part continuation prompts themselves, not only their dialog projection: within the same provider session Core sends a compact delta `user` turn with the next target/part constraints and does not resend embedded templates/field references until a real recovery/rollover/new-session path requires them — scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.ts, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/TODO/todo-plan.md`; expected commit: `fix: shorten visible managed continuation turns`
96. [DONE] Git Commit: `fix: shorten visible managed continuation turns` (hash: a43249a7e)
97. [DONE] `managed-continuation-summary-tests` Add regressions proving Diagram Modules live continuation user turns stay compact, include the next target/part constraints, and do not resend embedded template/field-reference contract bulk inside the same provider session — scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-prompt-builder.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover managed continuation display prompts`
98. [DONE] Git Commit: `test: cover managed continuation display prompts` (hash: 4d236b53c)
99. [DONE] `managed-dialog-gate-verify` Build core/webview and run targeted dialog gate/continuation tests for the 1.2.416 retest fix — scope: `core + webview build` Result: Verification passed: npm run build --workspace @codeai-hub/core; node --import tsx targeted managed gate/continuation tests; npm run typecheck:webview; npm run build:webview.
100. [DONE] `release-confirmation-417` Wait for explicit user confirmation before preparing release notes or running release build for the managed dialog gate projection fix — scope: user confirmation gate Result: User explicitly confirmed building the next release after the managed input gate and compact continuation prompt fixes.

### Stream: Release Build
101. [DONE] `release-docs-417` Update README and CHANGELOG to 1.2.417 before packaging — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.417 release notes`
102. [DONE] Git Commit: `docs: prepare 1.2.417 release notes` (hash: 47c4eaa4e)
103. [DONE] `release-build-417` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.417 release`
104. [DONE] Git Commit: `chore: build 1.2.417 release` (hash: 4e7e92385)
105. [DONE] `release-vsix-417` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.417 vsix`
106. [DONE] Git Commit: `chore: package 1.2.417 vsix` (hash: 586fd0e3c)

### Stream: User Visual Acceptance Testing
107. [DONE] `release-acceptance-417` Hand off `codeai-hub-1.2.417.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate Result: Retest of 1.2.417 failed: Core continuation messages are now visible as `user` turns, but they do not carry the managed continuation lifecycle tag, so the dialog history projection remains idle/unlocked when the separate realtime gate is missed or overwritten; manual user sends still lock because they use the normal local send/runtime path.

### Stream: Managed Continuation Lifecycle Gate (from 1.2.417 retest)
108. [DONE] `managed-continuation-lifecycle-tag` Tag Core-authored visible managed continuation `user` messages and let the dialog projection keep input locked from that lifecycle marker until Core releases the managed review/user gate — scope: `packages/core/src/remote-bridge/handlers/managed-internal-continuation-dispatch.ts, packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts, src/client/project-manager/components/sessions/session-message-dedupe.ts`; expected commit: `fix: lock input from managed continuation lifecycle`
109. [DONE] Git Commit: `fix: lock input from managed continuation lifecycle` (hash: 410ce33c4)
110. [DONE] `managed-continuation-lifecycle-tests` Add regressions for tagged Core visible `user` continuation messages and dialog-history lock projection on the real managed continuation path — scope: `packages/core/src/remote-bridge/handlers/managed-internal-continuation-dispatch.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.test.ts, src/client/project-manager/components/sessions/session-message-dedupe.test.ts`; expected commit: `test: cover managed continuation lifecycle lock`
111. [DONE] Git Commit: `test: cover managed continuation lifecycle lock` (hash: 091c264a7)
112. [DONE] `managed-continuation-lifecycle-verify` Build core/webview and run targeted managed continuation lifecycle lock tests — scope: `core + webview build` Result: Verification passed: `npm run build --workspace @codeai-hub/core`; `node --import tsx --test` for managed continuation dispatch, managed workflow turn, and session message dedupe lock tests; `npm run typecheck:webview`; `npm run build:webview`.
113. [DONE] `release-confirmation-418` Wait for explicit user confirmation before preparing release notes or running release build for the managed continuation lifecycle lock fix — scope: user confirmation gate Result: User explicitly confirmed building release 1.2.418 for the managed continuation lifecycle lock fix.

### Stream: Release Build
114. [DONE] `release-docs-418` Update README and CHANGELOG to 1.2.418 before packaging — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.418 release notes`
115. [DONE] Git Commit: `docs: prepare 1.2.418 release notes` (hash: 79ed0839c)
116. [DONE] `release-build-418` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.418 release`
117. [DONE] Git Commit: `chore: build 1.2.418 release` (hash: 5b340ecdb)
118. [DONE] `release-vsix-418` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.418 vsix` Result: `./scripts/build-release.sh --use-current-version --allow-dirty` passed with only machine-managed plan state dirty; verified SDK exclusions, removed dev dependencies before packaging, and created `codeai-hub-1.2.418.vsix` (4.5M).
119. [DONE] Git Commit: `chore: package 1.2.418 vsix` (hash: 4da36260d)

### Stream: User Visual Acceptance Testing
120. [DONE] `release-acceptance-418` Hand off `codeai-hub-1.2.418.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate Result: Retest of 1.2.418 failed: managed Diagram Modules input still unlocks during Core-agent exchange; next scope adds explicit managed lifecycle/input-gate diagnostics before further behavioral fixes.

### Stream: Managed Lifecycle Diagnostic Logging (from 1.2.418 retest)
121. [DONE] `managed-lifecycle-core-trace` Add workspace-local managed workflow diagnostics for Diagram Modules persisted messages, Core input gate transitions, and provider dispatch metadata — scope: `packages/core/src/remote-bridge/handlers/managed-workflow-diagnostic-trace.ts, packages/core/src/session-manager/index.ts, packages/core/src/remote-bridge/handlers/managed-core-gated-lock-controller.ts`; expected commit: `feat: trace managed workflow lifecycle`
122. [DONE] Git Commit: `feat: trace managed workflow lifecycle` (hash: a88e835fe)
123. [DONE] `managed-lifecycle-pm-trace` Add Project Manager-side diagnostics for managed continuation tag locks, release tags, workspace snapshot lock decisions, and applied connection state — scope: `src/client/project-manager/components/sessions/managed-input-diagnostics.ts, src/client/project-manager/components/sessions/session-message-dedupe.ts, src/client/project-manager/components/sessions/session-stream.ts`; expected commit: `feat: trace project manager input gate state`
124. [DONE] Git Commit: `feat: trace project manager input gate state` (hash: 337da8a8e)
125. [DONE] `managed-lifecycle-pm-diagnostics-test-guard` Guard Project Manager input diagnostics so node tests and non-browser module imports never initialize the VS Code bridge — scope: `src/client/project-manager/components/sessions/managed-input-diagnostics.ts`; expected commit: `fix: guard pm input diagnostics outside browser`
126. [DONE] Git Commit: `fix: guard pm input diagnostics outside browser` (hash: 2b1a15c6b)
127. [DONE] `managed-lifecycle-verify` Build core/webview and run targeted managed lifecycle diagnostic tests — scope: `core + webview build` Result: Verification passed: npm run build --workspace @codeai-hub/core; npm run typecheck:webview; npm run build:webview; targeted node --import tsx --test for managed-core-gated-lock-controller, session-message-dedupe, and session-stream all passed.
128. [DONE] `release-confirmation-419` Wait for explicit user confirmation before preparing release notes or running release build for the managed lifecycle diagnostics — scope: user confirmation gate Result: User explicitly confirmed building release 1.2.419 for the managed lifecycle/input-gate diagnostics.

### Stream: Release Build
129. [DONE] `release-docs-419` Update README and CHANGELOG to 1.2.419 before packaging — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.419 release notes`
130. [PENDING] Git Commit: `docs: prepare 1.2.419 release notes` (hash: TBD)
131. [TODO] `release-build-419` Run build-all.sh to bump versions and collect provider/core/UI/launcher tarball artifacts — scope: `package.json, package-lock.json, packages/**, assets/**, doc/tmp/releases/**`; expected commit: `chore: build 1.2.419 release`
132. [TODO] Git Commit: `chore: build 1.2.419 release` (hash: TBD)
133. [TODO] `release-vsix-419` Run build-release.sh --use-current-version to package the VSIX and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.419 vsix`
134. [TODO] Git Commit: `chore: package 1.2.419 vsix` (hash: TBD)

### Stream: User Workflow Acceptance Testing
135. [TODO] `release-acceptance-419` Hand off `codeai-hub-1.2.419.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate

### Stream: Scope Closeout
136. [TODO] `scope-closeout` Reserved post-closeout handoff anchor — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/, planning-doc disposition`
