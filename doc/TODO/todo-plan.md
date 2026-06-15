# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "audit-automation-cleanup-part1-2026-06-15",
  "branch": "codex/audit-gates-cleanup",
  "baseHead": "8928ccf31",
  "lastRecordedCommit": "c281819d5",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/AuditAutomationCleanup_Part1_Planning.md",
  "currentTaskId": "phase1.stream6e.task2",
  "expectedCommitMessage": "test: verify stale user gate cursor fix",
  "debt": {
    "expectedCommitMessage": "test: verify stale user gate cursor fix",
    "preCommitHead": "c281819d5",
    "stage": "commit_pending",
    "taskId": "phase1.stream6e.task2"
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
38. [DONE] `phase1.stream5c.commit10` Git Commit: `docs: update provider model reference index` (hash: 228488403)
39. [DONE] `phase1.stream5c.task11` Run live smoke tests against Kimi K2.7 Code and GLM 5.2 and record only non-secret results. (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify latest provider model access`)
    - Evidence 2026-06-15T13:43:38Z: GLM Claude-compatible live smoke via `https://api.z.ai/api/anthropic/v1/messages` returned HTTP 200, requested model `glm-5.2`, response model `glm-5.2`, sentinel `MODEL_SMOKE_GLM_52_OK`, latency 3036 ms.
    - Evidence 2026-06-15T13:44:24Z: direct raw Kimi coding endpoint returned HTTP 403 because Kimi For Coding is restricted to coding agents, so the verified application path is Kimi CLI/Wire.
    - Evidence 2026-06-15T13:44:30Z: Kimi CLI live smoke used a temporary config alias mapping `kimi-k2.7-code` to provider `kimi-for-coding`, ran `kimi --model kimi-k2.7-code`, returned sentinel `MODEL_SMOKE_KIMI_27_OK`, exit code 0, and provider-home logs contained `kimi-k2.7-code` 3 times. No API keys or response payloads were recorded.
40. [DONE] `phase1.stream5c.commit11` Git Commit: `test: verify latest provider model access` (hash: cd7389d79)

### Stream: Release Build

41. [DONE] `phase1.stream5b.task1` Prepare release documentation for version 1.2.520 before rebuilding artifacts. (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.520 release notes`)
42. [DONE] `phase1.stream5b.commit1` Git Commit: `docs: prepare 1.2.520 release notes` (hash: 7b7971c44)
43. [DONE] `phase1.stream5b.task2` Run the confirmed release build and keep generated release artifacts. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.520`)
44. [DONE] `phase1.stream5b.commit2` Git Commit: `chore: build release 1.2.520` (hash: 7c355f0e1)

### Stream: Acceptance Bugfix - GLM Legacy Aliases

45. [DONE] `phase1.stream6a.task1` Normalize legacy GLM persisted settings aliases in the UI settings mapper. (scope: `src/client/ui/src/components/settings/kimi-settings-state.ts, src/client/ui/src/components/settings/settings-state-helpers.persistence.test.ts`; expected commit: `fix: normalize legacy glm settings aliases`)
46. [DONE] `phase1.stream6a.commit1` Git Commit: `fix: normalize legacy glm settings aliases` (hash: b580dc4a8)
47. [DONE] `phase1.stream6a.task2` Normalize legacy GLM persisted settings aliases in Core turn settings. (scope: `packages/core/src/config/provider-settings-snapshot.ts, packages/core/src/config/provider-settings-snapshot.test.ts`; expected commit: `fix: normalize legacy glm core aliases`)
48. [DONE] `phase1.stream6a.commit2` Git Commit: `fix: normalize legacy glm core aliases` (hash: 544f6268a)
49. [DONE] `phase1.stream6a.task3` Normalize legacy GLM aliases before runtime environment export. (scope: `packages/Claude_Module/src/glm-claude-code/glm-claude-code-runtime-profile.ts, packages/Claude_Module/src/glm-claude-code/glm-claude-code-runtime-profile.test.ts`; expected commit: `fix: normalize legacy glm runtime aliases`)
50. [DONE] `phase1.stream6a.commit3` Git Commit: `fix: normalize legacy glm runtime aliases` (hash: 719cd7db4)
51. [DONE] `phase1.stream6a.task4` Run targeted verification for the GLM alias migration fix. (scope: `src/client/ui/src/components/settings/**, packages/core/src/config/**, packages/Claude_Module/src/glm-claude-code/**`; expected commit: `test: verify legacy glm alias normalization`)
    - Evidence 2026-06-15: `npx tsx src/client/ui/src/components/settings/settings-state-helpers.persistence.test.ts` passed, including legacy GLM alias mapping to `glm-5.2`.
    - Evidence 2026-06-15: `npm run typecheck:webview`, `npm run build --workspace=@codeai-hub/claude-module`, `npm run build --workspace=@codeai-hub/core`, `node --test packages/Claude_Module/dist/glm-claude-code/glm-claude-code-runtime-profile.test.js`, and `node --test packages/core/dist/config/provider-settings-snapshot.test.js` passed.
    - Evidence 2026-06-15: the real workspace settings snapshot that still contains `glm-5.1`, `glm-5-turbo`, and `glm-4.5-air` now maps to `glm-5.2` for UI default/opus/sonnet/haiku and Core default model.
52. [DONE] `phase1.stream6a.commit4` Git Commit: `test: verify legacy glm alias normalization` (hash: 8c03600ca)

### Stream: Release Rebuild 1.2.521

53. [DONE] `phase1.stream6b.task1` Prepare release documentation for version 1.2.521 before rebuilding artifacts. (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.521 release notes`)
54. [DONE] `phase1.stream6b.commit1` Git Commit: `docs: prepare 1.2.521 release notes` (hash: 675857ae0)
55. [DONE] `phase1.stream6b.task2` Run the confirmed release rebuild and keep generated release artifacts. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.521`)
56. [DONE] `phase1.stream6b.commit2` Git Commit: `chore: build release 1.2.521` (hash: d693a868a)

### Stream: Acceptance Bugfix - Workflow Workspace Context

57. [DONE] `phase1.stream6c.task1` Add Core-owned workspace context to provider prompt dispatch so every agent sees the canonical workspace name/root before artifact instructions. (scope: `packages/core/src/remote-bridge/handlers`; expected commit: `fix: add workspace context to provider prompts`)
58. [DONE] `phase1.stream6c.commit1` Git Commit: `fix: add workspace context to provider prompts` (hash: 83eae591a)
59. [DONE] `phase1.stream6c.task2` Run targeted verification for workspace context prompt dispatch. (scope: `packages/core/src/remote-bridge/handlers/**, packages/core`; expected commit: `test: verify workspace context prompts`)
    - Evidence 2026-06-15: `npx tsx --test --test-name-pattern "workspace context|outbound sends|rebinds stop-invalidated|unlock continuity locks|contextless" packages/core/src/remote-bridge/handlers/session-request-handler.create-resume.test.ts packages/core/src/remote-bridge/handlers/session-request-handler.test.ts packages/core/src/remote-bridge/handlers/session-request-handler.stop.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-codex-model-switch.test.ts` passed.
    - Evidence 2026-06-15: `npm run build --workspace=@codeai-hub/core` passed.
    - Evidence 2026-06-15: `npm run plan:commit -- "fix: add workspace context to provider prompts"` passed `.husky/pre-commit` architecture, lint, Knip, and format gates before creating commit `83eae591a`.
60. [DONE] `phase1.stream6c.commit2` Git Commit: `test: verify workspace context prompts` (hash: 64d37c85f)

### Stream: Release Rebuild 1.2.522

61. [DONE] `phase1.stream6d.task1` Prepare release documentation for version 1.2.522 before rebuilding artifacts. (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.522 release notes`)
62. [DONE] `phase1.stream6d.commit1` Git Commit: `docs: prepare 1.2.522 release notes` (hash: c17026316)
63. [DONE] `phase1.stream6d.task2` Run the confirmed release rebuild and keep generated release artifacts. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.522`)
    - Evidence 2026-06-15: `./scripts/build-all.sh` completed for unified version `1.2.522`, producing provider, Core, launcher and UI tarballs.
    - Evidence 2026-06-15: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including architecture check, type-check, compile, SDK exclusions, local artefact validation, markdown links, duplication advisory, VSIX runtime surface verification and package-size check.
    - Evidence 2026-06-15: VSIX `codeai-hub-1.2.522.vsix` created at 5.3M with SHA-256 `36b22e85acd252711a6a1c1142ad982857e65680059924d8ab4b04a2decc2003`; `doc/tmp/releases/` contains all 1.2.522 provider/Core/launcher/UI tarballs.
64. [DONE] `phase1.stream6d.commit2` Git Commit: `chore: build release 1.2.522` (hash: da5b18404)

### Stream: Acceptance Bugfix - Stale User Gate Cursor

65. [DONE] `phase1.stream6e.task1` Ignore stale preliminary review gates after a downstream review is already open. (scope: `packages/core/src/remote-bridge/handlers/workflow-user-input-attention-stages.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-stale-user-gate.test.ts`; expected commit: `fix: ignore completed preliminary review gates`)
66. [DONE] `phase1.stream6e.commit1` Git Commit: `fix: ignore completed preliminary review gates` (hash: c281819d5)
67. [DONE] `phase1.stream6e.task2` Run targeted verification for stale queued user-gate cursor handling. (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service-stale-user-gate.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-user-input-attention.test.ts, packages/core`; expected commit: `test: verify stale user gate cursor fix`)
    - Evidence 2026-06-15: `npx tsx --test packages/core/src/remote-bridge/handlers/workflow-state-service-stale-user-gate.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-user-input-attention.test.ts packages/core/src/remote-bridge/handlers/workflow-state-service-user-action-attention.test.ts` passed 12/12 tests.
    - Evidence 2026-06-15: `npm run build --workspace=@codeai-hub/core` passed.
68. [PENDING] `phase1.stream6e.commit2` Git Commit: `test: verify stale user gate cursor fix` (hash: TBD)

### Stream: Release Rebuild 1.2.523

69. [TODO] `phase1.stream6f.task1` Prepare release documentation for version 1.2.523 before rebuilding artifacts. (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare 1.2.523 release notes`)
70. [TODO] `phase1.stream6f.commit1` Git Commit: `docs: prepare 1.2.523 release notes` (hash: TBD)
71. [TODO] `phase1.stream6f.task2` Run the confirmed release rebuild and keep generated release artifacts. (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, doc/tmp/releases/**`; expected commit: `chore: build release 1.2.523`)
72. [TODO] `phase1.stream6f.commit2` Git Commit: `chore: build release 1.2.523` (hash: TBD)

### Stream: User Workflow Acceptance Testing

73. [TODO] `phase1.stream6.task1` Report results and wait for explicit user acceptance. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record audit cleanup acceptance`)
74. [TODO] `phase1.stream6.commit1` Git Commit: `docs: record audit cleanup acceptance` (hash: TBD)

### Stream: Scope Closeout

75. [TODO] `phase1.stream7.task1` Close the accepted scope and archive planning state after user acceptance. (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close audit automation cleanup scope`)
76. [TODO] `phase1.stream7.commit1` Git Commit: `docs: close audit automation cleanup scope` (hash: TBD)
