# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "localization-gemini-flash-lite-release-1.2.606-2026-06-25",
  "branch": "main",
  "baseHead": "973c18596",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Translation_Model_Benchmark_RU.md",
  "currentTaskId": "release-1.2.607.phase1.stream3.task1",
  "expectedCommitMessage": "docs: prepare 1.2.607 release notes",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Translation_Model_Benchmark_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- Only this list is the context source for this execution cycle.

## Execution Rules

- Release build confirmation gate: satisfied by the user request on 2026-06-25.
- Before `build-all.sh`, update `README.md` Current Release and `CHANGELOG.md` for future version `1.2.606`.
- Stable Gemini rebuild confirmation gate: satisfied by the user request on 2026-06-25; next release target is `1.2.607`.
- Use `npm run plan:commit -- "<expected commit message>"` for tracked commits.
- Do not close this release scope until the user explicitly accepts the installed release.

## Phase 0 - Release 1.2.606 (owner: Codex, updated: 2026-06-25)

### Stream: Release Metadata

1. [DONE] `release-1.2.606.phase0.stream1.task1` Prepare README and CHANGELOG for release 1.2.606 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.606 release notes`).
2. [DONE] Git Commit: `docs: prepare 1.2.606 release notes` (hash: self)

### Stream: Release Build

3. [DONE] `release-1.2.606.phase0.stream2.task1` Run release build scripts and commit generated version state (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, packages/core/src/templates/bundled-templates.ts, .vscodeignore, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.606 release`).
   - Evidence 2026-06-25: `./scripts/build-all.sh` completed for `1.2.606`; `./scripts/build-release.sh --use-current-version --allow-dirty` created `codeai-hub-1.2.606.vsix` and refreshed `doc/tmp/releases/*1.2.606*`.
4. [DONE] Git Commit: `chore: build 1.2.606 release` (hash: self)

### Stream: User Workflow Acceptance Testing

5. [BLOCKED] `release-1.2.606.phase0.stream3.task1` User installs release 1.2.606 and confirms the localization engine retest result (scope: `user workflow`). Result: superseded before user acceptance because the preview Vertex/OpenRouter-compatible model slug is being replaced with stable `google/gemini-2.5-flash-lite`.

### Stream: Scope Closeout

6. [TODO] `release-1.2.606.phase0.stream4.task1` Close the release scope after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close 1.2.606 release scope`).
7. [TODO] Git Commit: `docs: close 1.2.606 release scope` (hash: TBD)

## Phase 1 - Stable Gemini Release 1.2.607 (owner: Codex, updated: 2026-06-25)

### Stream: Stable Model Runtime

8. [DONE] `release-1.2.607.phase1.stream1.task1` Replace the Gemini localization runtime/catalog engine id with stable `google/gemini-2.5-flash-lite` (scope: `packages/core/src/translation/core-translation-facade-factory.ts, packages/localization/src/language-catalog.ts, doc/TODO/todo-plan.md`; expected commit: `fix: switch Gemini localization runtime to stable model`).
9. [DONE] Git Commit: `fix: switch Gemini localization runtime to stable model` (hash: self)

### Stream: Stable Model UI

10. [DONE] `release-1.2.607.phase1.stream2.task1` Replace the Localization settings selector id/label with stable `google/gemini-2.5-flash-lite` (scope: `src/client/ui/src/components/settings/use-settings-state-support.ts, src/client/ui/src/components/settings/localization-engine-availability.ts, doc/TODO/todo-plan.md`; expected commit: `fix: expose stable Gemini localization engine`).
11. [DONE] Git Commit: `fix: expose stable Gemini localization engine` (hash: self)

### Stream: Release Metadata

12. [IN_PROGRESS] `release-1.2.607.phase1.stream3.task1` Prepare README and CHANGELOG for release 1.2.607 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.607 release notes`).
13. [TODO] Git Commit: `docs: prepare 1.2.607 release notes` (hash: TBD)

### Stream: Release Build

14. [TODO] `release-1.2.607.phase1.stream4.task1` Run release build scripts and commit generated version state (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, packages/core/src/templates/bundled-templates.ts, .vscodeignore, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.607 release`).
15. [TODO] Git Commit: `chore: build 1.2.607 release` (hash: TBD)

### Stream: User Workflow Acceptance Testing

16. [TODO] `release-1.2.607.phase1.stream5.task1` User installs release 1.2.607 and confirms the stable Gemini localization engine retest result (scope: `user workflow`).

### Stream: Scope Closeout

17. [TODO] `release-1.2.607.phase1.stream6.task1` Close the release scope after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close 1.2.607 release scope`).
18. [TODO] Git Commit: `docs: close 1.2.607 release scope` (hash: TBD)
