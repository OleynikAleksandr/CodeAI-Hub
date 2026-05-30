# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "input-unlock-settle-2026-05-30",
  "branch": "main",
  "baseHead": "84b5446e2",
  "lastRecordedCommit": "4328fe640",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Questionnaire_AutoScroll_Planning.md",
  "currentTaskId": "release-vsix-412",
  "expectedCommitMessage": "chore: package 1.2.412 vsix",
  "debt": {
    "expectedCommitMessage": "chore: package 1.2.412 vsix",
    "preCommitHead": "4328fe640",
    "stage": "commit_pending",
    "taskId": "release-vsix-412"
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
43. [PENDING] Git Commit: `chore: package 1.2.412 vsix` (hash: TBD)

### Stream: User Visual Acceptance Testing
44. [TODO] `release-acceptance-412` Hand off `codeai-hub-1.2.412.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate

### Stream: Scope Closeout
31. [TODO] `scope-closeout` Reserved post-closeout handoff anchor — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/, planning-doc disposition`
