# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "audit-automation-cleanup-part1-2026-06-15",
  "branch": "codex/audit-gates-cleanup",
  "baseHead": "8928ccf31",
  "lastRecordedCommit": "61a11b530",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/AuditAutomationCleanup_Part1_Planning.md",
  "currentTaskId": "phase1.stream5c.task10",
  "expectedCommitMessage": "docs: update provider model reference index",
  "debt": {
    "expectedCommitMessage": "docs: update provider model reference index",
    "preCommitHead": "61a11b530",
    "stage": "commit_pending",
    "taskId": "phase1.stream5c.task10"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/AuditAutomationCleanup_Part1_Planning.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the context source for this execution cycle.

## Execution Rules

- Required reading before each fix: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Keep each microtask to no more than 3 files, excluding `doc/TODO/todo-plan.md`.
- Every implementation task is followed by a separate `Git Commit: ...` item.
- Use `npm run plan:commit -- "<expected commit message>"`; do not bypass hooks.
- Release build is out of scope for this part unless the user explicitly asks for it.

## Phase 1 - Audit Automation Part 1 (owner: Codex, updated: 2026-06-15)

### Stream: Plan Setup

1. [DONE] `phase1.stream1.task1` Create the accepted audit automation part 1 planning source and active execution plan. (scope: `doc/SolidWorks-WorkFlow/Plans/AuditAutomationCleanup_Part1_Planning.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan audit automation cleanup`)
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: plan audit automation cleanup` (hash: 54caeab06)

### Stream: Automatic Gates

3. [DONE] `phase1.stream2.task1` Add low-noise automatic checks for audit gaps: runtime security audit, workspace duplication guard, and CI coverage for duplicate/link/security checks. (scope: `package.json, .github/workflows/ci.yml, .husky/pre-push`; expected commit: `chore: automate audit gap checks`)
4. [DONE] `phase1.stream2.commit1` Git Commit: `chore: automate audit gap checks` (hash: 8ca09ba4c)

### Stream: Runtime Security Patch

5. [DONE] `phase1.stream3.task1` Patch low-risk Core runtime dependency advisories without changing provider internals. (scope: `packages/core/package.json, package-lock.json`; expected commit: `fix: patch core runtime dependencies`)
6. [DONE] `phase1.stream3.commit1` Git Commit: `fix: patch core runtime dependencies` (hash: 137d50576)

### Stream: Manual Cleanup

7. [DONE] `phase1.stream4.task1` Remove stale tracked TODO zip archive residue. (scope: `.gitignore, doc/TODO/Archive.zip`; expected commit: `chore: remove stale todo archive zip`)
8. [DONE] `phase1.stream4.commit1` Git Commit: `chore: remove stale todo archive zip` (hash: 8b4a8c2fa)
9. [DONE] `phase1.stream4.task2` Remove two audit noise patterns from source without changing behavior. (scope: `packages/Claude_Module/src/installer/sdk-installer.ts, src/client/project-manager/api.ts`; expected commit: `chore: remove audit noise patterns`)
10. [DONE] `phase1.stream4.commit2` Git Commit: `chore: remove audit noise patterns` (hash: aef381ca5)
11. [DONE] `phase1.stream4.task3` Trim redundant Knip entry config hints. (scope: `knip.json`; expected commit: `chore: trim knip audit config`)
12. [DONE] `phase1.stream4.commit3` Git Commit: `chore: trim knip audit config` (hash: f21b25265)

### Stream: Tooling Verification

13. [DONE] `phase1.stream5.task1` Run targeted verification for the changed gates and touched packages. (scope: `package.json, packages/core/package.json, package-lock.json`; expected commit: `test: verify audit automation cleanup`)
14. [DONE] `phase1.stream5.commit1` Git Commit: `test: verify audit automation cleanup` (hash: 7ee184cf3)

### Stream: Gemini Dependency Correction

15. [DONE] `phase1.stream5a.task1` Align repository Gemini CLI/Core dev dependencies with the installed provider version 0.46.0. (scope: `package.json, packages/Gemini_Module/package.json, package-lock.json`; expected commit: `chore: update gemini cli dependencies`)
16. [DONE] `phase1.stream5a.commit1` Git Commit: `chore: update gemini cli dependencies` (hash: 9a2af9634)
17. [DONE] `phase1.stream5a.task2` Restore the Gemini compatibility layer for the 0.46.0 internal package layout. (scope: `packages/Gemini_Module/src/runtime/**, packages/Gemini_Module/src/session/**, packages/Gemini_Module/src/messaging/**`; expected commit: `fix: restore gemini cli 0.46 compatibility`)
18. [DONE] `phase1.stream5a.commit2` Git Commit: `fix: restore gemini cli 0.46 compatibility` (hash: 45d7718c2)

### Stream: Provider Model Version Update

19. [DONE] `phase1.stream5c.task1` Update Kimi provider model registry and Core default to Kimi K2.7 Code. (scope: `packages/Kimi_Module/src/types/kimi-model-capabilities.ts, src/types/kimi-model-registry.ts, packages/core/src/config/provider-turn-config-resolver.ts`; expected commit: `chore: update kimi model default to 2.7`)
20. [DONE] `phase1.stream5c.commit1` Git Commit: `chore: update kimi model default to 2.7` (hash: be2b8aaf2)
21. [DONE] `phase1.stream5c.task2` Update Kimi UI/provider defaults and tests. (scope: `packages/core/src/provider-registry, src/client/ui/src/session, src/client/project-manager`; expected commit: `chore: update kimi ui model default to 2.7`)
22. [DONE] `phase1.stream5c.commit2` Git Commit: `chore: update kimi ui model default to 2.7` (hash: b11db71cc)
23. [DONE] `phase1.stream5c.task3` Update Kimi capture defaults to Kimi K2.7 Code. (scope: `src/client/project-manager/components/capture-workbench/model-reasoning-selectors.tsx, src/client/project-manager/components/capture-workbench/selection-bar.tsx, src/client/project-manager/components/shared/stage-start-model-selection.ts`; expected commit: `chore: update kimi capture model default to 2.7`)
24. [DONE] `phase1.stream5c.commit3` Git Commit: `chore: update kimi capture model default to 2.7` (hash: 6ece0ba25)
25. [DONE] `phase1.stream5c.task4` Update GLM runtime and Core turn defaults to GLM 5.2. (scope: `packages/Claude_Module/src/glm-claude-code/glm-claude-code-runtime-profile.ts, packages/Claude_Module/src/glm-claude-code/glm-claude-code-model-capabilities.ts, packages/core/src/config/provider-turn-config-resolver.ts`; expected commit: `chore: update glm runtime default to 5.2`)
26. [DONE] `phase1.stream5c.commit4` Git Commit: `chore: update glm runtime default to 5.2` (hash: e41b063a0)
27. [DONE] `phase1.stream5c.task5` Update GLM provider descriptors and persisted settings defaults to GLM 5.2. (scope: `packages/core/src/provider-registry/provider-descriptor-factory.ts, packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts`; expected commit: `chore: update glm settings defaults to 5.2`)
28. [DONE] `phase1.stream5c.commit5` Git Commit: `chore: update glm settings defaults to 5.2` (hash: 524775907)
29. [DONE] `phase1.stream5c.task6` Update GLM settings and capture UI defaults to GLM 5.2. (scope: `src/client/ui/src/components/settings/kimi-settings-state.ts, src/client/ui/src/components/settings/native-request-capture-state.ts, src/client/project-manager/components/settings/project-manager-settings-host-message.ts`; expected commit: `chore: update glm settings ui model to 5.2`)
30. [DONE] `phase1.stream5c.commit6` Git Commit: `chore: update glm settings ui model to 5.2` (hash: 373c39a56)
31. [DONE] `phase1.stream5c.task7` Update GLM picker labels and settings copy to GLM 5.2. (scope: `src/client/project-manager/components/capture-workbench/model-reasoning-selectors.tsx, src/client/project-manager/components/capture-workbench/selection-bar.tsx, src/client/ui/src/components/settings/glm-claude-code-settings-card.tsx`; expected commit: `chore: update glm provider model labels to 5.2`)
32. [DONE] `phase1.stream5c.commit7` Git Commit: `chore: update glm provider model labels to 5.2` (hash: 1962a92ba)
33. [DONE] `phase1.stream5c.task8` Update provider start-card/session/provider labels for GLM 5.2. (scope: `src/client/project-manager/components/shared/stage-start-model-selection.ts, src/client/ui/src/session/model-info-builder.ts, src/types/provider.ts`; expected commit: `chore: update glm provider surfaces to 5.2`)
34. [DONE] `phase1.stream5c.commit8` Git Commit: `chore: update glm provider surfaces to 5.2` (hash: 69d5c7733)
35. [DONE] `phase1.stream5c.task9` Update active provider model SSOT docs. (scope: `doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/SolidWorks-WorkFlow/Modules/GLM_Claude_Code.md, doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`; expected commit: `docs: update provider model ssot`)
36. [DONE] `phase1.stream5c.commit9` Git Commit: `docs: update provider model ssot` (hash: 61a11b530)
37. [DONE] `phase1.stream5c.task10` Update model references in the system architecture and docs index. (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: update provider model reference index`)
38. [PENDING] `phase1.stream5c.commit10` Git Commit: `docs: update provider model reference index` (hash: TBD)
39. [TODO] `phase1.stream5c.task11` Run live smoke tests against Kimi K2.7 Code and GLM 5.2 and record only non-secret results. (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify latest provider model access`)
40. [TODO] `phase1.stream5c.commit11` Git Commit: `test: verify latest provider model access` (hash: TBD)

### Stream: Release Build

41. [TODO] `phase1.stream5b.task1` Prepare release documentation for version 1.2.520 before rebuilding artifacts. (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.520 release notes`)
42. [TODO] `phase1.stream5b.commit1` Git Commit: `docs: prepare 1.2.520 release notes` (hash: TBD)
43. [TODO] `phase1.stream5b.task2` Run the confirmed release build and keep generated release artifacts. (scope: `package.json, package-lock.json, packages/**/package.json, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.520`)
44. [TODO] `phase1.stream5b.commit2` Git Commit: `chore: build release 1.2.520` (hash: TBD)

### Stream: User Workflow Acceptance Testing

45. [TODO] `phase1.stream6.task1` Report results and wait for explicit user acceptance. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record audit cleanup acceptance`)
46. [TODO] `phase1.stream6.commit1` Git Commit: `docs: record audit cleanup acceptance` (hash: TBD)

### Stream: Scope Closeout

47. [TODO] `phase1.stream7.task1` Close the accepted scope and archive planning state after user acceptance. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close audit automation cleanup scope`)
48. [TODO] `phase1.stream7.commit1` Git Commit: `docs: close audit automation cleanup scope` (hash: TBD)
