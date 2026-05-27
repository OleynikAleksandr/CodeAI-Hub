# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "provider-workspace-home-readiness-repair-2026-05-27",
  "branch": "main",
  "baseHead": "82b4a5113",
  "lastRecordedCommit": "141cba600",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Provider_WorkspaceHome_Readiness_Repair_Planning_RU.md",
  "currentTaskId": "provider-readiness.phase3.kimi.task1",
  "expectedCommitMessage": "fix: resolve kimi workspace provider home",
  "debt": {
    "expectedCommitMessage": "fix: resolve kimi workspace provider home",
    "preCommitHead": "141cba600",
    "stage": "commit_pending",
    "taskId": "provider-readiness.phase3.kimi.task1"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Provider_WorkspaceHome_Readiness_Repair_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/Modules/GLM_Claude_Code.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the recovery/context source for this execution cycle.

## Execution Rules
- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Each implementation microtask must touch no more than 3 files/packages.
- Every implementation microtask is followed by its own `Git Commit: ...` item.
- Do not bypass Husky hooks; use `npm run plan:commit -- "<expected commit message>"`.
- Run targeted tests/builds for touched packages before closing the relevant stream.
- Do not start release notes, version bumps, `build-all.sh`, or `build-release.sh` without explicit user confirmation.
- Scope Closeout runs only after explicit user acceptance.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-05-27)
### Stream: Planning Package
1. [DONE] `provider-readiness.phase0.plan.task1` Create the provider readiness planning source, register it in Docs Index, and replace the NONE stub with this active execution todo plan (scope: `doc/SolidWorks-WorkFlow/Plans/Provider_WorkspaceHome_Readiness_Repair_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan provider workspace readiness repair`).
2. [DONE] Git Commit: `docs: plan provider workspace readiness repair` (hash: 34e6fadc2)

## Phase 1 — Reproduce And Guard Failures (owner: Codex, updated: 2026-05-27)
### Stream: Provider Readiness Regression Coverage
3. [DONE] `provider-readiness.phase1.tests.task1` Add focused regression tests for the known readiness failures: Gemini workspace-home auth is missing while UI says available, Kimi must not resolve provider home from `/`, and GLM must not ignore workspace settings/config precedence (scope: `packages/Gemini_Module/src/**, packages/Kimi_Module/src/**, packages/Claude_Module/src/glm-claude-code/**`; expected commit: `test: cover provider workspace readiness failures`).
4. [DONE] Git Commit: `test: cover provider workspace readiness failures` (hash: df77fd1be)

## Phase 2 — Gemini Workspace Auth Readiness (owner: Codex, updated: 2026-05-27)
### Stream: Gemini Provider Home Bootstrap
5. [DONE] `provider-readiness.phase2.gemini.task1` Implement Gemini workspace provider-home auth bootstrap from existing user Gemini auth/settings, keep storage resolution scoped to the active workspace, and fail readiness clearly when auth is unavailable (scope: `packages/Gemini_Module/src/runtime/cli-bridge-provider-home.ts, packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts, packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`; expected commit: `fix: bootstrap gemini workspace provider home`).
6. [DONE] Git Commit: `fix: bootstrap gemini workspace provider home` (hash: 141cba600)

## Phase 3 — Kimi Workspace Path And Config (owner: Codex, updated: 2026-05-27)
### Stream: Kimi Runtime Home
7. [DONE] `provider-readiness.phase3.kimi.task1` Pass the active workspace path into Kimi adapter construction, resolve `KIMI_SHARE_DIR` inside the workspace capsule, and preserve the existing `~/.kimi/config.toml` credential source unless an explicit config path is provided (scope: `packages/core/src/provider-registry/provider-descriptor-factory.ts, packages/Kimi_Module/src/provider/kimi-managed-agent-profile.ts, packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`; expected commit: `fix: resolve kimi workspace provider home`).
8. [PENDING] Git Commit: `fix: resolve kimi workspace provider home` (hash: TBD)

## Phase 4 — GLM-Claude-Code Settings/Auth Resolution (owner: Codex, updated: 2026-05-27)
### Stream: GLM API Key Source
9. [TODO] `provider-readiness.phase4.glm.task1` Thread workspace `providers.glmClaudeCode` settings into the GLM runtime profile without persisting secrets to tracked files, preserve env/config precedence, and make empty settings values non-overriding (scope: `packages/core/src/provider-registry/provider-descriptor-factory.ts, packages/Claude_Module/src/glm-claude-code/glm-claude-code-runtime-profile.ts, packages/Claude_Module/src/glm-claude-code/glm-claude-code-sdk-auth-manager.ts`; expected commit: `fix: resolve glm workspace auth settings`).
10. [TODO] Git Commit: `fix: resolve glm workspace auth settings` (hash: TBD)

## Phase 5 — Provider Picker Truthfulness (owner: Codex, updated: 2026-05-27)
### Stream: Availability Projection
11. [TODO] `provider-readiness.phase5.status.task1` Make provider picker availability reflect Core readiness after provider preflight/recovery, so Gemini cannot be selectable as available when auth/session bootstrap is known to fail, while Kimi/GLM show actionable messages (scope: `packages/core/src/provider-registry/**, src/client/project-manager/services/provider-snapshot.ts, src/client/project-manager/components/description/description-provider-picker.tsx`; expected commit: `fix: show truthful provider readiness`).
12. [TODO] Git Commit: `fix: show truthful provider readiness` (hash: TBD)

## Phase 6 — Tooling Verification (owner: Codex, updated: 2026-05-27)
### Stream: Targeted Verification
13. [TODO] `provider-readiness.phase6.verify.task1` Run targeted provider/core/UI checks for Gemini, Kimi, GLM, and provider picker readiness; record exact commands/results in this plan (scope: `packages/Gemini_Module, packages/Kimi_Module, packages/Claude_Module, packages/core, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `test: verify provider readiness repair`).
14. [TODO] Git Commit: `test: verify provider readiness repair` (hash: TBD)

## Phase 7 — User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-27)
### Stream: Manual Provider Retest
15. [TODO] `provider-readiness.phase7.user-acceptance.task1` User restarts Core, opens the Description provider picker, verifies provider statuses, and retests Gemini first-turn startup plus Kimi/GLM readiness after credentials are available (scope: user workflow observation; expected commit: none).

## Phase 8 — Scope Closeout (owner: Codex, updated: 2026-05-27)
### Stream: Closeout After Acceptance
16. [TODO] `provider-readiness.phase8.closeout.task1` After explicit user acceptance only, sync stable outcomes into provider/module SSOT docs as needed, update Docs Index, archive the planning source and active todo plan, and leave terminal NONE state (scope: `doc/SolidWorks-WorkFlow/Modules/Gemini.md, doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/SolidWorks-WorkFlow/Modules/GLM_Claude_Code.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/Provider_WorkspaceHome_Readiness_Repair_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/Archive/, doc/TODO/todo-plan.md, doc/TODO/Archive/`; expected commit: `docs: close provider readiness repair scope`).
17. [TODO] Git Commit: `docs: close provider readiness repair scope` (hash: TBD)
18. [TODO] `provider-readiness.phase8.post-closeout.anchor` Reserved post-closeout handoff anchor; no implementation work belongs here (scope: `doc/TODO/todo-plan.md`; expected commit: none).
