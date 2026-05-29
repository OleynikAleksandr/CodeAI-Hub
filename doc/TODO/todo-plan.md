# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "claude-reasoning-summary-language-2026-05-29",
  "branch": "main",
  "baseHead": "e733a3298",
  "lastRecordedCommit": "8d16d1542",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Claude_ReasoningSummary_Language_Planning.md",
  "currentTaskId": "phase1-release-vsix",
  "expectedCommitMessage": "chore: package 1.2.406 vsix",
  "debt": {
    "expectedCommitMessage": "chore: package 1.2.406 vsix",
    "preCommitHead": "8d16d1542",
    "stage": "commit_pending",
    "taskId": "phase1-release-vsix"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Claude_ReasoningSummary_Language_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules
- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task is paired with a separate `Git Commit: ...` item.
- Keep micro-task file scope at three files/packages or less.
- Do not run release build without explicit user confirmation.
- Scope closeout requires explicit user acceptance.

## Phase 1 — Claude Reasoning Summary Language (owner: Codex, updated: 2026-05-29)
### Stream: Runtime Prompt And Translation Guard
1. [DONE] `phase1-claude-reasoning-language` Add Claude visible reasoning-summary language instruction and skip provider-local reasoning translation when source text already matches Russian target language — scope: `packages/Claude_Module/src/sdk/claude-workflow-system-prompt.ts, packages/Claude_Module/src/messaging/claude-thought-translation-adapter.ts, packages/Claude_Module/src/messaging/claude-thought-translation-adapter.test.ts, doc/SolidWorks-WorkFlow/Plans/Claude_ReasoningSummary_Language_Planning.md`; expected commit: `fix: keep Claude reasoning summaries in target language`
2. [DONE] Git Commit: `fix: keep Claude reasoning summaries in target language` (hash: 877597411)
3. [DONE] `phase1-claude-doc-sync` Sync Claude module SSOT for prompt-owned reasoning summary language and translation skip guard — scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`; expected commit: `docs: document Claude reasoning summary language guard`
4. [DONE] Git Commit: `docs: document Claude reasoning summary language guard` (hash: 48cfd17a3)

### Stream: Tooling Verification
5. [DONE] `phase1-tooling-verification` Run targeted Claude module tests for prompt options and reasoning translation guard — scope: `packages/Claude_Module` Result: Claude module build passed; targeted adapter test passed 4/4; workspace Claude test script passed 20/20.

### Stream: User Workflow Acceptance Testing
6. [DONE] `phase1-user-acceptance` Present verification results and wait for explicit user acceptance — scope: user acceptance gate Result: User accepted Claude reasoning summary language fix and explicitly requested a new release build.

### Stream: Release Build
7. [DONE] `phase1-release-docs` Update release-facing README and CHANGELOG to the next version before packaging — scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.406 release notes`
8. [DONE] Git Commit: `docs: prepare 1.2.406 release notes` (hash: 494bffb26)
9. [DONE] `phase1-release-build` Run release scripts and collect provider/core/UI/launcher tarball artifacts after confirmed user approval — scope: `package.json, package-lock.json, packages/*/package.json, assets/core/manifest.json, assets/launcher/manifest.json, assets/providers/*/manifest.json, assets/ui/manifest.json, doc/tmp/releases/**`; expected commit: `chore: build 1.2.406 release`
10. [DONE] Git Commit: `chore: build 1.2.406 release` (hash: 8d16d1542)
11. [DONE] `phase1-release-vsix` Run final VSIX packaging with the current version and verify release-package output — scope: `.vscodeignore, packages/core/src/templates/bundled-templates.ts, codeai-hub-*.vsix`; expected commit: `chore: package 1.2.406 vsix`
12. [PENDING] Git Commit: `chore: package 1.2.406 vsix` (hash: TBD)

### Stream: User Visual Acceptance Testing
13. [TODO] `phase1-release-acceptance` Hand off `codeai-hub-1.2.406.vsix` and wait for explicit user retest acceptance — scope: user acceptance gate

### Stream: Scope Closeout
14. [TODO] `phase1-scope-closeout` Reserved post-closeout handoff anchor — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/, planning-doc disposition`
