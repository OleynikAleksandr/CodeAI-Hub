# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "claude-thinking-default-and-pm-startup-audit-2026-06-01",
  "branch": "main",
  "baseHead": "b5c00288f",
  "lastRecordedCommit": "b5c00288f",
  "planningSource": "user request 2026-06-01: enable Claude thinking by default and analyze first Project Manager startup latency",
  "currentTaskId": "claude-thinking-default",
  "expectedCommitMessage": "fix: enable claude thinking by default",
  "debt": {
    "expectedCommitMessage": "fix: enable claude thinking by default",
    "preCommitHead": "b5c00288f",
    "stage": "commit_pending",
    "taskId": "claude-thinking-default"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** user request 2026-06-01
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules
- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task is paired with a separate `Git Commit: ...` item.
- Keep micro-task file scope at three files/packages or less.
- Do not migrate existing workspace settings for this scope; only change defaults for missing/new settings.
- Do not run release build without explicit user confirmation.
- Scope closeout requires explicit user acceptance.

## Phase 1 - Claude Thinking Default + Startup Analysis (owner: Codex, updated: 2026-06-01)
### Stream: Claude Thinking Default
1. [DONE] `claude-thinking-default` Enable Claude thinking mode by default for new/missing settings only, without migrating explicit existing workspace values — scope: `src/client/ui/src/components/settings/claude-thinking-state.ts, packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts`; expected commit: `fix: enable claude thinking by default`
2. [PENDING] Git Commit: `fix: enable claude thinking by default` (hash: TBD)

### Stream: Tooling Verification
3. [TODO] `claude-thinking-default-verify` Run targeted settings default tests and type-safe checks if needed — scope: `settings tests, core settings tests`

### Stream: User Workflow Acceptance Testing
4. [TODO] `user-acceptance` Report implementation result and Project Manager startup analysis; wait for explicit user acceptance — scope: user acceptance gate

### Stream: Scope Closeout
5. [TODO] `scope-closeout` Close out todo-plan only after explicit user acceptance — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/`
