# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-project-foundation-implementation-2026-05-16",
  "branch": "main",
  "baseHead": "da6d1ba50",
  "lastRecordedCommit": "70c0b9b0e",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_ProjectFoundation_Planning_RU.md",
  "currentTaskId": "app-skeleton-foundation.phase7.release-docs.task6",
  "expectedCommitMessage": "docs: prepare skeleton review ownership release",
  "debt": {
    "expectedCommitMessage": "docs: prepare skeleton review ownership release",
    "preCommitHead": "70c0b9b0e",
    "stage": "commit_pending",
    "taskId": "app-skeleton-foundation.phase7.release-docs.task6"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_ProjectFoundation_Planning_RU.md`
- **Deferred companion source:** `doc/SolidWorks-WorkFlow/Plans/QualityGates_WorkingBaseline_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules

- Required reading before code or architecture changes: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Scope: implement the Application Skeleton project-foundation upgrade only. Do not implement the Quality Gates research/integration upgrade in this cycle.
- Each implementation microtask must touch no more than 3 files or package-level scopes. If discovery shows a task needs more files, split it before editing.
- Every code/architecture change must update the relevant SSOT documentation in the same commit when the change alters runtime behavior or workflow contracts.
- Do not bypass hooks. Use `npm run plan:commit -- "<expected commit message>"` for commit-backed tasks.
- Targeted verification must run before release: at minimum Application Skeleton managed workflow tests plus `npm run build --workspace @codeai-hub/core`; add narrower tests as the changed files require.
- **Release Build Confirmation Gate:** after implementation and targeted verification, stop and ask the user for explicit confirmation before release notes, version bump, `./scripts/build-all.sh`, or `./scripts/build-release.sh --use-current-version`.
- Release phase remains open until the user installs the produced VSIX/tarballs and explicitly accepts the workflow retest.

## Phase 0 — Implementation Scope Registration (owner: Codex, updated: 2026-05-16)

### Stream: Active Plan Creation

1. [DONE] `app-skeleton-foundation.phase0.plan.task1` Create the active implementation todo-plan for Application Skeleton project foundation upgrade, including microtasks, verification, release build, user retest, and closeout gates (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: open application skeleton foundation implementation`).
2. [DONE] Git Commit: `docs: open application skeleton foundation implementation` (hash: 2f0e0c497)

## Phase 1 — Agent Prompt And Contract Boundary (owner: Codex, updated: 2026-05-16)

### Stream: Provider-Facing Application Skeleton Instructions

3. [DONE] `app-skeleton-foundation.phase1.prompt.task1` Update the Application Skeleton agent prompt, contract reference, bundled-template registry, and bundled-template regression test so the first prompt requires an installable project foundation, explicit unresolved-question handling, no materialization under ambiguity, and no Quality Gates tool ownership (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md, packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md, packages/core/src/templates/**`; expected commit: `feat: require installable application skeleton foundation prompt`).
4. [DONE] Git Commit: `feat: require installable application skeleton foundation prompt` (hash: 43faf568a)
5. [DONE] `app-skeleton-foundation.phase1.surface.task1` Sync Core/user-facing Application Skeleton review language with the new foundation outcome and ambiguity gate (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder.ts, src/client/project-manager/components/application-skeleton/application-skeleton-help.tsx, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`; expected commit: `feat: surface application skeleton foundation review gate`).
6. [DONE] Git Commit: `feat: surface application skeleton foundation review gate` (hash: 9256a6390)

## Phase 2 — Core Artifact Contract Parser (owner: Codex, updated: 2026-05-16)

### Stream: Draft Foundation Completeness

7. [DONE] `app-skeleton-foundation.phase2.draft-validator.task1` Add Core-owned draft contract validation for project foundation decisions: accepted stack completeness, package manager/repo shape, unresolved-question list, and implementation-wave entrypoint intent (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-foundation-contract.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts`; expected commit: `feat: validate application skeleton foundation draft`).
8. [DONE] Git Commit: `feat: validate application skeleton foundation draft` (hash: b3a02274e)

### Stream: Materialized Foundation Completeness

9. [DONE] `app-skeleton-foundation.phase2.materialized-validator.task1` Extend materialization validation so `materialized: true` requires deterministic install metadata, package/workspace metadata, TypeScript config when TypeScript is selected, build/typecheck/smoke scripts where applicable, and real minimal source/facade entrypoints for the selected implementation wave (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts, packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.test.ts, doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`; expected commit: `feat: validate materialized application skeleton foundation`).
10. [DONE] Git Commit: `feat: validate materialized application skeleton foundation` (hash: 835fa20e8)

## Phase 3 — Managed Materialization Boundary (owner: Codex, updated: 2026-05-16)

### Stream: Commit Scope And Stage Plan

11. [DONE] `app-skeleton-foundation.phase3.stage-plan.task1` Expand Application Skeleton materialization stage-plan scope and managed-path collection to include accepted project foundation files such as package manifests, lockfiles, tsconfig/build configs, minimal source entrypoints, and Product Part package roots without granting Quality Gates ownership (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-model.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller.test.ts`; expected commit: `feat: track application skeleton foundation materialization paths`).
12. [DONE] Git Commit: `feat: track application skeleton foundation materialization paths` (hash: d210cf389)

### Stream: Downstream Readiness Gates

13. [DONE] `app-skeleton-foundation.phase3.downstream-gate.task1` Block Quality Gates and Development Tree readiness on Core-validated Application Skeleton foundation completeness rather than only `materialized: true`/path existence (scope: `packages/core/src/development-tree/development-tree-bootstrap-gate.ts, packages/core/src/development-tree/development-tree-bootstrap-gate.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-progress.ts`; expected commit: `feat: gate downstream stages on skeleton foundation readiness`).
14. [DONE] Git Commit: `feat: gate downstream stages on skeleton foundation readiness` (hash: 1f215e032)

## Phase 4 — Regression Coverage And Documentation Sync (owner: Codex, updated: 2026-05-16)

### Stream: Managed Workflow Regression Tests

15. [DONE] `app-skeleton-foundation.phase4.regression.task1` Add focused regression coverage for rejected incomplete foundations, ambiguity/open-question blockers, and accepted installable foundation materialization flow (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-workflow-session.managed-workspace.test.ts`; expected commit: `test: cover application skeleton foundation lifecycle`).
16. [DONE] Git Commit: `test: cover application skeleton foundation lifecycle` (hash: 7300d75d6)

### Stream: SSOT Sync

17. [DONE] `app-skeleton-foundation.phase4.docs.task1` Synchronize System/cluster SSOT with the implemented Application Skeleton foundation contract, parser authority, user-question gate, downstream unlock rule, and Quality Gates responsibility boundary (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`; expected commit: `docs: sync application skeleton foundation contract`).
18. [DONE] Git Commit: `docs: sync application skeleton foundation contract` (hash: 0f8040b2c)

## Phase 5 — Tooling Verification (owner: Codex, updated: 2026-05-16)

### Stream: Targeted Verification

19. [DONE] `app-skeleton-foundation.phase5.verify.task1` Run targeted Application Skeleton managed workflow tests and `npm run build --workspace @codeai-hub/core`; record results and repair verification-only fixture drift if the new foundation contract exposes stale tests (scope: `doc/TODO/todo-plan.md, packages/core/src/remote-bridge/handlers/application-skeleton-completion-observer.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-phase-state.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts`; expected commit: `docs: record application skeleton foundation verification`).
   - Verification result (2026-05-16): `npx tsx --test` across Application Skeleton managed workflow/progress/materialization/session/downstream suites passed `41/41`; initial run exposed stale progress/completion fixtures, which were updated to include the required installable foundation evidence.
   - Build result (2026-05-16): `npm run build --workspace @codeai-hub/core` passed after the Application Skeleton phase-state test fixture included `foundationReady`.
20. [DONE] Git Commit: `docs: record application skeleton foundation verification` (hash: 09f8ca9c0)

## Phase 6 — Release Build (owner: Codex, updated: 2026-05-16)

### Stream: Release Confirmation

21. [DONE] `app-skeleton-foundation.phase6.confirm.task1` Stop after green targeted verification and ask the user for explicit release build confirmation. Do not update README/CHANGELOG for a future version and do not run release scripts until the user confirms. Scope: release confirmation gate only; expected commit: none. Result: User explicitly requested release build in this turn: Реализуй планы, собери новый релиз и после этого отчитайся передо мной.

### Stream: Release Notes Preparation

22. [DONE] `app-skeleton-foundation.phase6.docs.task1` After explicit release confirmation, update README and CHANGELOG for the next release version before build automation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare application skeleton foundation release`).
   - Release docs prepared for future version `1.2.276` before running `./scripts/build-all.sh`.
23. [DONE] Git Commit: `docs: prepare application skeleton foundation release` (hash: bc1931e32)

### Stream: Unified Artifact Build

24. [DONE] `app-skeleton-foundation.phase6.build.task1` Run `./scripts/build-all.sh` from a clean tree, verify package/runtime artifact outputs, and commit generated version/manifest/release artifact metadata (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build application skeleton foundation release artifacts`).
   - Build result (2026-05-16): `./scripts/build-all.sh` completed version `1.2.276` and produced provider/core/UI/CEF tarballs in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
25. [DONE] Git Commit: `chore: build application skeleton foundation release artifacts` (hash: 2d1d67508)

### Stream: VSIX Packaging

26. [DONE] `app-skeleton-foundation.phase6.package.task1` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/dev dependency prune/package creation markers, and record the produced VSIX/tarballs for user handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record application skeleton foundation release package`).
   - Package result (2026-05-16): `./scripts/build-release.sh --use-current-version` completed for version `1.2.276`; verified `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and VSIX runtime package surface.
   - User handoff artifact: `codeai-hub-1.2.276.vsix` in the repository root; runtime tarballs are available in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
27. [DONE] Git Commit: `docs: record application skeleton foundation release package` (hash: aefa4440c)

## Phase 7 — User Workflow Acceptance Testing (owner: Oleksandr, updated: 2026-05-16)

### Stream: User Retest

28. [BLOCKED] `app-skeleton-foundation.phase7.acceptance.task1` User installs the produced release and retests the Application Skeleton workflow: draft foundation proposal, unresolved-question behavior, accepted materialization, Core validation failure for incomplete foundation, and Quality Gates unlock only after valid foundation. Scope: user workflow acceptance only; expected commit: none.
   - Acceptance defect found in release `1.2.276`: Application Skeleton draft artifacts with unresolved `openQuestions` are repeatedly rejected as repairable artifact failures (`open_questions_block_materialization`) instead of opening a user question/review gate.

### Stream: Acceptance Defect Repair

29. [DONE] `app-skeleton-foundation.phase7.repair.task1` Route Application Skeleton draft `openQuestions` to the user review gate instead of draft repair while keeping structural foundation validation strict (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-foundation-contract.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts`; expected commit: `fix: route skeleton open questions to review gate`).
30. [DONE] Git Commit: `fix: route skeleton open questions to review gate` (hash: 6fe28563b)
31. [DONE] `app-skeleton-foundation.phase7.repair.task2` Block Application Skeleton review acceptance/materialization while `openQuestions` remain unresolved and surface a user-facing correction request (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder.ts`; expected commit: `fix: block skeleton acceptance with open questions`).
32. [DONE] Git Commit: `fix: block skeleton acceptance with open questions` (hash: 186b7439c)
33. [DONE] `app-skeleton-foundation.phase7.repair.task3` Run targeted Application Skeleton review/validator tests and core build after the repair, then restore user acceptance testing for the next release candidate (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record skeleton open questions repair verification`).
   - Verification result (2026-05-16): targeted Application Skeleton validator/review/stage-plan/materialization/progress/completion/downstream suite passed `32/32`.
   - Build result (2026-05-16): `npm run build --workspace @codeai-hub/core` passed.
34. [DONE] Git Commit: `docs: record skeleton open questions repair verification` (hash: db842d4fa)

### Stream: Patched Release Gate

35. [DONE] `app-skeleton-foundation.phase7.release-confirm.task1` Stop after green repair verification and ask the user for explicit confirmation before preparing or building a patched release. Scope: release confirmation gate only; expected commit: none. Result: User explicitly confirmed release build in this turn: "Собери новый релиз."
36. [DONE] `app-skeleton-foundation.phase7.release-docs.task1` After explicit release confirmation, update README and CHANGELOG for the next release version before build automation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare skeleton open questions repair release`).
37. [DONE] Git Commit: `docs: prepare skeleton open questions repair release` (hash: e120ca774)
38. [DONE] `app-skeleton-foundation.phase7.release-build.task1` Run `./scripts/build-all.sh` from a clean tree, verify package/runtime artifact outputs, and commit generated version/manifest/release artifact metadata for the patched Application Skeleton release (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build skeleton open questions repair release artifacts`).
   - Build result (2026-05-16): `./scripts/build-all.sh --allow-dirty` completed version `1.2.277`; the only pre-existing dirty file was active plan state advanced by the previous no-commit gate. Provider/core/UI/CEF tarballs were produced in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
39. [DONE] Git Commit: `chore: build skeleton open questions repair release artifacts` (hash: 07f2454e7)
40. [DONE] `app-skeleton-foundation.phase7.release-package.task1` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/dev dependency prune/package creation markers, and record the produced patched VSIX/tarballs for user handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record skeleton open questions repair release package`).
   - Package result (2026-05-16): `./scripts/build-release.sh --use-current-version --allow-dirty` completed for version `1.2.277`; verified `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and VSIX runtime package surface. The only pre-existing dirty file was active plan state advanced by the previous no-commit gate.
   - User handoff artifact: `codeai-hub-1.2.277.vsix` in the repository root; runtime tarballs are available in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
41. [DONE] Git Commit: `docs: record skeleton open questions repair release package` (hash: 88846a964)
42. [BLOCKED] `app-skeleton-foundation.phase7.acceptance.task2` User installs the patched release and retests the Application Skeleton unresolved-question review gate and accepted materialization flow. Scope: user workflow acceptance only; expected commit: none.
   - Acceptance defect found in release `1.2.277`: Application Skeleton questions can be hidden in `application-skeleton-map.json` without appearing in the user-visible Markdown review artifact; prompt wording is still contradictory about inferred defaults vs blocking questions; Core review message does not surface the open questions before user acceptance.

### Stream: Review Question Contract Repair

43. [DONE] `app-skeleton-foundation.phase7.review-contract.task1` Make the Application Skeleton prompt/contract and Core review message explicit: the user reads Markdown as the decision artifact, questions and clarification happen only in dialogue, JSON is only a machine signal for Core, and unresolved decisions must be asked as confirmation questions before materialization (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md, packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder.ts`; expected commit: `fix: clarify skeleton review question contract`).
44. [DONE] Git Commit: `fix: clarify skeleton review question contract` (hash: cf77e60a7)
45. [DONE] `app-skeleton-foundation.phase7.review-contract.task2` Enforce the review-question contract in Core validation and regression tests: non-empty `openQuestions` must be surfaced by Core in the dialogue/review message and draft framework placeholders must not be used as fake accepted stack decisions (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-foundation-contract.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts`; expected commit: `fix: validate visible skeleton review questions`).
46. [DONE] Git Commit: `fix: validate visible skeleton review questions` (hash: 24e220ba7)
47. [DONE] `app-skeleton-foundation.phase7.review-contract.task3` Update bundled-template regression coverage and generated bundle, then run targeted Application Skeleton validator/review tests plus core build; record results before next release decision (scope: `packages/core/src/templates/application-skeleton-bundled-templates.test.ts, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `docs: record skeleton review question contract verification`).
   - Verification result (2026-05-16): `npx tsx --test packages/core/src/templates/application-skeleton-bundled-templates.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts` passed 18/18 tests.
   - Build result (2026-05-16): `npm run build --workspace @codeai-hub/core` passed.
48. [DONE] Git Commit: `docs: record skeleton review question contract verification` (hash: 2efb07d0a)
49. [DONE] `app-skeleton-foundation.phase7.release-confirm.task2` Stop after green verification and ask the user for explicit confirmation before preparing or building the next patched release. Scope: release confirmation gate only; expected commit: none. Result: User explicitly confirmed release build in this turn: "Да, собери новый релиз."
50. [DONE] `app-skeleton-foundation.phase7.release-docs.task2` After explicit release confirmation, update README and CHANGELOG for the next release version before build automation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare skeleton review question contract release`).
   - Release docs target (2026-05-16): prepared README/CHANGELOG for version `1.2.278`.
51. [DONE] Git Commit: `docs: prepare skeleton review question contract release` (hash: 831b44824)
52. [DONE] `app-skeleton-foundation.phase7.release-build.task2` Run `./scripts/build-all.sh` from a clean tree, verify package/runtime artifact outputs, and commit generated version/manifest/release artifact metadata for the patched Application Skeleton release (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build skeleton review question contract release artifacts`).
   - Build result (2026-05-16): `./scripts/build-all.sh --allow-dirty` completed version `1.2.278`; the only pre-existing dirty file was active plan state advanced by the previous no-commit gate. Provider/core/UI/CEF tarballs were produced in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
53. [DONE] Git Commit: `chore: build skeleton review question contract release artifacts` (hash: dde338096)
54. [DONE] `app-skeleton-foundation.phase7.release-package.task2` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/dev dependency prune/package creation markers, and record the produced patched VSIX/tarballs for user handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record skeleton review question contract release package`).
   - Package result (2026-05-16): `./scripts/build-release.sh --use-current-version --allow-dirty` completed for version `1.2.278`; verified `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and VSIX runtime package surface. The only pre-existing dirty file was active plan state advanced by the previous no-commit gate.
   - User handoff artifact: `codeai-hub-1.2.278.vsix` in the repository root; runtime tarballs are available in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
55. [DONE] Git Commit: `docs: record skeleton review question contract release package` (hash: 3f6a0a077)
56. [BLOCKED] `app-skeleton-foundation.phase7.acceptance.task3` User installs the next patched release and retests that Application Skeleton questions are asked in dialogue, Markdown records proposed/agreed decisions rather than questionnaire prompts, all artifact prose is localized, and materialization remains blocked while questions remain. Scope: user workflow acceptance only; expected commit: none.
   - Acceptance defect found in release `1.2.278`: Application Skeleton can still produce `stack.frameworks: []` and Markdown text like "Frameworks: не зафиксированы" while the upstream Development Tree clearly contains Project Manager, frontend/shell, launcher and VS Code extension surfaces. The prompt does not state strongly enough that the primary outcome is a code-ready workspace foundation, and Core only checks for any `openQuestions`, not a framework-specific unresolved decision.

### Stream: Code-Ready Foundation Baseline Repair

57. [DONE] `app-skeleton-foundation.phase7.foundation-baseline.task1` Strengthen Application Skeleton prompt/contract around the primary outcome: prepare a code-ready installable workspace foundation, propose concrete framework/runtime baselines for visible shell/frontend/launcher surfaces, and keep the materialized filesystem as a mirror of the Project Manager Development Tree Product Part / Cluster / Module structure (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md, packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md`; expected commit: `fix: require concrete application skeleton foundation baseline`).
58. [DONE] Git Commit: `fix: require concrete application skeleton foundation baseline` (hash: 68bdd9b8e)
59. [DONE] `app-skeleton-foundation.phase7.foundation-baseline.task2` Tighten Core draft validation so empty framework lists require a framework/shell-specific dialogue question and Markdown cannot present unresolved framework placeholders as a valid stack decision (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-foundation-contract.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/*framework-baseline*.test.ts`; expected commit: `fix: validate skeleton framework baseline decisions`).
60. [DONE] Git Commit: `fix: validate skeleton framework baseline decisions` (hash: 104a4460d)
61. [DONE] `app-skeleton-foundation.phase7.foundation-baseline.task3` Sync bundled Application Skeleton templates, run targeted validator/template/review tests plus core build, and record verification before the next release build (scope: `packages/core/src/templates/application-skeleton-bundled-templates.test.ts, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `docs: verify skeleton foundation baseline repair`).
   - Verification result (2026-05-16): regenerated bundled templates with `node scripts/generate-bundled-templates.js`; targeted Application Skeleton bundled-template, validator, framework-baseline, and managed review tests passed `20/20`.
   - Build result (2026-05-16): `npm run build --workspace @codeai-hub/core` passed.
62. [DONE] Git Commit: `docs: verify skeleton foundation baseline repair` (hash: 537fc1bb7)
63. [DONE] `app-skeleton-foundation.phase7.release-docs.task3` After explicit release request in this turn, update README and CHANGELOG for the next release version before build automation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare skeleton foundation baseline release`).
   - Release docs target (2026-05-16): prepared README/CHANGELOG for version `1.2.279`.
64. [DONE] Git Commit: `docs: prepare skeleton foundation baseline release` (hash: 38869987d)
65. [DONE] `app-skeleton-foundation.phase7.release-build.task3` Run `./scripts/build-all.sh`, verify package/runtime artifact outputs, and commit generated version/manifest/release artifact metadata for the patched Application Skeleton release (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build skeleton foundation baseline release artifacts`).
   - Build result (2026-05-16): `./scripts/build-all.sh --allow-dirty` completed version `1.2.279`; the only pre-existing dirty file was active plan state advanced by the previous commit. Provider/core/UI/CEF tarballs were produced in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
66. [DONE] Git Commit: `chore: build skeleton foundation baseline release artifacts` (hash: 2b928021e)
67. [DONE] `app-skeleton-foundation.phase7.release-package.task3` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/dev dependency prune/package creation markers, and record the produced patched VSIX/tarballs for user handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record skeleton foundation baseline release package`).
   - Package result (2026-05-16): `./scripts/build-release.sh --use-current-version --allow-dirty` completed for version `1.2.279`; verified `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and VSIX runtime package surface. The only pre-existing dirty file was active plan state advanced by the previous commit.
   - User handoff artifact: `codeai-hub-1.2.279.vsix` in the repository root; runtime tarballs are available in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
68. [DONE] Git Commit: `docs: record skeleton foundation baseline release package` (hash: efa8d6509)
69. [BLOCKED] `app-skeleton-foundation.phase7.acceptance.task4` User installs the next patched release and retests that Application Skeleton proposes concrete shell/frontend/framework baselines, preserves the Project Manager Development Tree mirror, and blocks materialization only through dialogue questions for real unresolved decisions. Scope: user workflow acceptance only; expected commit: none.
   - Acceptance defect found in release `1.2.279`: Application Skeleton materialized package metadata and lockfile but did not install the local development environment (`node_modules`) and did not prove readiness by running declared `build`, `typecheck`, and `test:smoke` scripts. Core accepted the materialization because it only validated file/path/script presence, not executable environment readiness.

### Stream: Environment Readiness Audit Repair

70. [DONE] `app-skeleton-foundation.phase7.env-readiness.task1` Strengthen Application Skeleton prompt/contract so post-acceptance materialization must run the accepted clean install command, create local install outputs such as `node_modules` without committing or listing them in `materializedPaths`, run declared build/typecheck/smoke scripts, and report failure instead of readiness if any command fails (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md, packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md`; expected commit: `fix: require skeleton environment readiness audit`).
71. [DONE] Git Commit: `fix: require skeleton environment readiness audit` (hash: 7fe770e24)
72. [DONE] `app-skeleton-foundation.phase7.env-readiness.task2` Tighten Core materialization validation so accepted Application Skeleton foundations are not ready until the package-manager install command and declared required scripts have actually succeeded in the workspace, while progress polling stays read-only (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts, packages/core/src/remote-bridge/handlers/application-skeleton-environment-readiness-audit.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.ts`; expected commit: `fix: validate skeleton install and script execution`).
73. [DONE] Git Commit: `fix: validate skeleton install and script execution` (hash: b2429a3ea)
74. [DONE] `app-skeleton-foundation.phase7.env-readiness.task3` Add focused regression coverage for the Application Skeleton environment readiness audit rejecting missing installs and failed scripts, and accepting a real local install plus passing scripts (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-environment-readiness-audit.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover skeleton environment readiness audit`).
   - Verification result (2026-05-16): `npx tsx --test packages/core/src/remote-bridge/handlers/application-skeleton-environment-readiness-audit.test.ts` passed `3/3`, covering missing install output, failed required script, and clean install plus passing scripts.
75. [DONE] Git Commit: `test: cover skeleton environment readiness audit` (hash: 76bd62a3e)
76. [DONE] `app-skeleton-foundation.phase7.env-readiness.task4` Sync bundled Application Skeleton templates, run targeted materialization/template tests plus core build, and record verification before the next release build (scope: `packages/core/src/templates/application-skeleton-bundled-templates.test.ts, packages/core/src/templates/bundled-templates.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts, doc/TODO/todo-plan.md`; expected commit: `docs: verify skeleton environment readiness repair`).
   - Verification result (2026-05-16): `node scripts/generate-bundled-templates.js`, targeted `npx tsx --test` for environment audit, bundled-template, managed validator, and materialization validator tests (20/20), and `npm run build --workspace @codeai-hub/core` all passed.
77. [DONE] Git Commit: `docs: verify skeleton environment readiness repair` (hash: a373e82e4)
78. [DONE] `app-skeleton-foundation.phase7.release-docs.task4` After explicit release request in this turn, update README and CHANGELOG for the next release version before build automation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare skeleton environment readiness release`).
   - Release docs result (2026-05-16): README and CHANGELOG prepared for v1.2.280 with Application Skeleton local install, `node_modules`, and required-script readiness audit notes.
79. [DONE] Git Commit: `docs: prepare skeleton environment readiness release` (hash: 1d560fbd7)
80. [DONE] `app-skeleton-foundation.phase7.release-build.task4` Run `./scripts/build-all.sh`, verify package/runtime artifact outputs, and commit generated version/manifest/release artifact metadata for the patched Application Skeleton release (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build skeleton environment readiness release artifacts`).
   - Build result (2026-05-16): `./scripts/build-all.sh --allow-dirty` completed version `1.2.280`; the only pre-existing dirty file was active plan state advanced by the previous commit. Provider/core/UI/CEF tarballs were produced in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
81. [DONE] Git Commit: `chore: build skeleton environment readiness release artifacts` (hash: 45e0e014b)
82. [DONE] `app-skeleton-foundation.phase7.release-package.task4` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/dev dependency prune/package creation markers, and record the produced patched VSIX/tarballs for user handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record skeleton environment readiness release package`).
   - Package result (2026-05-16): `./scripts/build-release.sh --use-current-version --allow-dirty` completed for version `1.2.280`; verified `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and VSIX runtime package surface. The only pre-existing dirty file was active plan state advanced by the previous commit.
   - User handoff artifact: `codeai-hub-1.2.280.vsix` in the repository root; runtime tarballs are available in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
83. [DONE] Git Commit: `docs: record skeleton environment readiness release package` (hash: 70cff76dc)
84. [BLOCKED] `app-skeleton-foundation.phase7.acceptance.task5` User installs the next patched release and retests that Application Skeleton materialization creates local install outputs, proves declared scripts pass, preserves the Project Manager Development Tree mirror, and only then unlocks downstream work. Scope: user workflow acceptance only; expected commit: none.
   - Acceptance defect found in release `1.2.280`: Application Skeleton creates local `node_modules` but leaves it unignored/untracked, build output `product-parts/*/dist/**` is captured by managed commits, and the machine-readable `productParts` map can be flattened into top-level Product Part / Cluster / Module entries instead of preserving the nested Product Part -> Cluster -> Module tree.

### Stream: Git Hygiene And Nested Map Repair

85. [DONE] `app-skeleton-foundation.phase7.git-hygiene.task1` Strengthen Application Skeleton prompt/contract so materialization must create/maintain `.gitignore` for install/build outputs, keep generated outputs such as `node_modules` and `dist` local and untracked, and encode `productParts` as a nested Product Part -> clusters -> modules / standaloneModules tree (scope: `packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md, packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md, doc/TODO/todo-plan.md`; expected commit: `fix: require clean skeleton git hygiene and nested map`).
86. [DONE] Git Commit: `fix: require clean skeleton git hygiene and nested map` (hash: 5d8dbe088)
87. [DONE] `app-skeleton-foundation.phase7.git-hygiene.task2` Add Core validation for nested Application Skeleton Product Part tree shape in both draft and materialized artifacts (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-tree-shape-validator.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.ts, packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts`; expected commit: `fix: validate skeleton nested product tree`).
88. [DONE] Git Commit: `fix: validate skeleton nested product tree` (hash: cb554c1da)
89. [DONE] `app-skeleton-foundation.phase7.git-hygiene.task3` Add Core validation for Application Skeleton output hygiene: `.gitignore` must ignore install/build outputs and `materializedPaths` must not contain generated output paths (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-output-hygiene.ts, packages/core/src/remote-bridge/handlers/application-skeleton-environment-readiness-audit.ts, packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts`; expected commit: `fix: validate skeleton output hygiene`).
90. [DONE] Git Commit: `fix: validate skeleton output hygiene` (hash: 567bf2ac6)
91. [DONE] `app-skeleton-foundation.phase7.git-hygiene.task4` Exclude generated install/build outputs from managed Git commits even when a materialized directory path is staged (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-managed-git-boundary.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: exclude generated outputs from managed commits`).
92. [DONE] Git Commit: `fix: exclude generated outputs from managed commits` (hash: d1dc52652)
93. [DONE] `app-skeleton-foundation.phase7.git-hygiene.task5` Add regression coverage for nested tree validation and output hygiene validation (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-environment-readiness-audit.test.ts`; expected commit: `test: cover skeleton git hygiene validation`).
94. [DONE] Git Commit: `test: cover skeleton git hygiene validation` (hash: dd149afa0)
95. [DONE] `app-skeleton-foundation.phase7.git-hygiene.task6` Sync bundled Application Skeleton templates and run targeted Application Skeleton tests plus core build before release (scope: `packages/core/src/templates/application-skeleton-bundled-templates.test.ts, packages/core/src/templates/bundled-templates.ts, doc/TODO/todo-plan.md`; expected commit: `docs: verify skeleton git hygiene repair`).
96. [DONE] Git Commit: `docs: verify skeleton git hygiene repair` (hash: b7d5bb2c9)
97. [DONE] `app-skeleton-foundation.phase7.release-docs.task5` After explicit release request in this turn, update README and CHANGELOG for the next release version before build automation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare skeleton git hygiene release`).
98. [DONE] Git Commit: `docs: prepare skeleton git hygiene release` (hash: 93702c5f7)
99. [DONE] `app-skeleton-foundation.phase7.release-build.task5` Run `./scripts/build-all.sh`, verify package/runtime artifact outputs, and commit generated version/manifest/release artifact metadata for the patched Application Skeleton release (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build skeleton git hygiene release artifacts`).
100. [DONE] Git Commit: `chore: build skeleton git hygiene release artifacts` (hash: cff4b7713)
101. [DONE] `app-skeleton-foundation.phase7.release-package.task5` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/dev dependency prune/package creation markers, and record the produced patched VSIX/tarballs for user handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record skeleton git hygiene release package`).
   - Package result (2026-05-16): `./scripts/build-release.sh --use-current-version --allow-dirty` completed for version `1.2.281`; verified `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and VSIX runtime package surface. The only pre-existing dirty file was active plan state advanced by the previous commit.
   - User handoff artifact: `codeai-hub-1.2.281.vsix` in the repository root; runtime tarballs are available in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
102. [DONE] Git Commit: `docs: record skeleton git hygiene release package` (hash: d37c682b9)
103. [BLOCKED] `app-skeleton-foundation.phase7.acceptance.task6` User installs the next patched release and retests that Application Skeleton materialization creates ignored local install outputs, does not commit build outputs, preserves a nested Product Part tree in JSON, and leaves downstream work unlocked only after clean validation. Scope: user workflow acceptance only; expected commit: none.
   - Acceptance defect found in release `1.2.281`: Core duplicates Application Skeleton `openQuestions` to the user during review and appears as the dialogue owner; when materialization succeeds, managed Git staging still includes ignored `node_modules` in the pathspec and blocks commit boundary.

### Stream: Review Ownership And Commit Boundary Repair

107. [DONE] `app-skeleton-foundation.phase7.review-ownership.task1` Keep Application Skeleton review dialogue agent-owned while Core continues validation, managed microtask advancement, and commits behind the scenes (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-prompt-builder.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-review-decisions.ts, doc/TODO/todo-plan.md`; expected commit: `fix: keep skeleton review dialogue agent-owned`).
108. [DONE] Git Commit: `fix: keep skeleton review dialogue agent-owned` (hash: fa6d5895c)
109. [DONE] `app-skeleton-foundation.phase7.review-ownership.task2` Add review routing regressions proving Core does not duplicate Application Skeleton questions and routes user answers back to the agent until `openQuestions` are cleared (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover agent-owned skeleton review dialogue`).
110. [DONE] Git Commit: `test: cover agent-owned skeleton review dialogue` (hash: cba0c458f)
111. [DONE] `app-skeleton-foundation.phase7.review-ownership.task3` Repair managed Git pathspec filtering so ignored generated outputs are not passed as positive `git add` paths and do not block Application Skeleton materialization commits (scope: `packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-managed-git-boundary.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: filter ignored outputs before managed git add`).
112. [DONE] Git Commit: `fix: filter ignored outputs before managed git add` (hash: e03471516)
113. [DONE] `app-skeleton-foundation.phase7.review-ownership.task4` Run targeted review/Git-boundary tests plus core build and stop for release confirmation (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts, packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: verify skeleton review ownership repair`).
   - Verification result (2026-05-16): `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.test.ts packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator.test.ts packages/core/src/managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-controller.test.ts` passed 19/19 tests.
   - Build result (2026-05-16): `npm run build --workspace @codeai-hub/core` passed.
114. [DONE] Git Commit: `test: verify skeleton review ownership repair` (hash: 70c0b9b0e)
115. [DONE] `app-skeleton-foundation.phase7.release-confirmation.task6` Ask the user for explicit confirmation before building the next patched release. Scope: release confirmation only; expected commit: none. Result: User explicitly confirmed release build in this turn: "Собери новый релиз."
116. [DONE] `app-skeleton-foundation.phase7.release-docs.task6` After explicit release confirmation, update README and CHANGELOG for the next release version before build automation (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare skeleton review ownership release`).
   - Release docs target (2026-05-16): prepared README/CHANGELOG for version `1.2.282`.
117. [PENDING] Git Commit: `docs: prepare skeleton review ownership release` (hash: TBD)
118. [TODO] `app-skeleton-foundation.phase7.release-build.task6` Run `./scripts/build-all.sh`, verify package/runtime artifact outputs, and commit generated version/manifest/release artifact metadata for the patched Application Skeleton release (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: build skeleton review ownership release artifacts`).
119. [TODO] Git Commit: `chore: build skeleton review ownership release artifacts` (hash: TBD)
120. [TODO] `app-skeleton-foundation.phase7.release-package.task6` Run `./scripts/build-release.sh --use-current-version`, verify SDK exclusions/dev dependency prune/package creation markers, and record the produced patched VSIX/tarballs for user handoff (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record skeleton review ownership release package`).
121. [TODO] Git Commit: `docs: record skeleton review ownership release package` (hash: TBD)
122. [TODO] `app-skeleton-foundation.phase7.acceptance.task7` User installs the produced release and retests that Application Skeleton review dialogue remains agent-owned and materialized `node_modules` does not dirty/block managed Git commits. Scope: user workflow acceptance only; expected commit: none.

## Phase 8 — Scope Closeout (owner: Codex, updated: 2026-05-16)

### Stream: Closeout

123. [TODO] `app-skeleton-foundation.phase8.closeout.task1` After explicit user acceptance, archive this todo-plan, disposition the Application Skeleton planning document, update Docs Index and related SSOT links, and close the scope (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close application skeleton foundation implementation`).
124. [TODO] Git Commit: `docs: close application skeleton foundation implementation` (hash: TBD)
125. [TODO] `app-skeleton-foundation.phase8.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle. Scope: handoff only; expected commit: none.
