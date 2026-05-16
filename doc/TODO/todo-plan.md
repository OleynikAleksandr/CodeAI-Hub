# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-project-foundation-implementation-2026-05-16",
  "branch": "main",
  "baseHead": "da6d1ba50",
  "lastRecordedCommit": "2b928021e",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/ApplicationSkeleton_ProjectFoundation_Planning_RU.md",
  "currentTaskId": "app-skeleton-foundation.phase7.release-package.task3",
  "expectedCommitMessage": "docs: record skeleton foundation baseline release package",
  "debt": {
    "expectedCommitMessage": "docs: record skeleton foundation baseline release package",
    "preCommitHead": "2b928021e",
    "stage": "commit_pending",
    "taskId": "app-skeleton-foundation.phase7.release-package.task3"
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
68. [PENDING] Git Commit: `docs: record skeleton foundation baseline release package` (hash: TBD)
69. [TODO] `app-skeleton-foundation.phase7.acceptance.task4` User installs the next patched release and retests that Application Skeleton proposes concrete shell/frontend/framework baselines, preserves the Project Manager Development Tree mirror, and blocks materialization only through dialogue questions for real unresolved decisions. Scope: user workflow acceptance only; expected commit: none.

## Phase 8 — Scope Closeout (owner: Codex, updated: 2026-05-16)

### Stream: Closeout

70. [TODO] `app-skeleton-foundation.phase8.closeout.task1` After explicit user acceptance, archive this todo-plan, disposition the Application Skeleton planning document, update Docs Index and related SSOT links, and close the scope (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close application skeleton foundation implementation`).
71. [TODO] Git Commit: `docs: close application skeleton foundation implementation` (hash: TBD)
72. [TODO] `app-skeleton-foundation.phase8.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle. Scope: handoff only; expected commit: none.
