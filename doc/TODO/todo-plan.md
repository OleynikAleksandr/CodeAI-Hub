# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "claude-reasoning-summary-language-2026-05-29",
  "branch": "main",
  "baseHead": "e733a3298",
  "lastRecordedCommit": "e733a3298",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Claude_ReasoningSummary_Language_Planning.md",
  "currentTaskId": "phase1-claude-reasoning-language",
  "expectedCommitMessage": "fix: keep Claude reasoning summaries in target language",
  "debt": {
    "expectedCommitMessage": "fix: keep Claude reasoning summaries in target language",
    "preCommitHead": "e733a3298",
    "stage": "commit_pending",
    "taskId": "phase1-claude-reasoning-language"
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
2. [PENDING] Git Commit: `fix: keep Claude reasoning summaries in target language` (hash: TBD)
3. [TODO] `phase1-claude-doc-sync` Sync Claude module SSOT for prompt-owned reasoning summary language and translation skip guard — scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`; expected commit: `docs: document Claude reasoning summary language guard`
4. [TODO] Git Commit: `docs: document Claude reasoning summary language guard` (hash: TBD)

### Stream: Tooling Verification
5. [TODO] `phase1-tooling-verification` Run targeted Claude module tests for prompt options and reasoning translation guard — scope: `packages/Claude_Module`; expected commit: `no commit`

### Stream: User Workflow Acceptance Testing
6. [TODO] `phase1-user-acceptance` Present verification results and wait for explicit user acceptance — scope: user acceptance gate; expected commit: `no commit`

### Stream: Scope Closeout
7. [TODO] `phase1-scope-closeout` Reserved post-closeout handoff anchor — scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/`, planning-doc disposition; expected commit: `no commit`
