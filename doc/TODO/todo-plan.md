# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-token-usage-status-2026-06-23",
  "branch": "main",
  "baseHead": "a96e90197",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Kimi_Token_Usage_Status_Planning_RU.md",
  "currentTaskId": "kimi-token-status.phase6.closeout.task1",
  "expectedCommitMessage": "docs: close kimi token usage status scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Kimi_Token_Usage_Status_Planning_RU.md`
- **Read this context before implementation:**
  - `AGENTS.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
  - `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`
  - `packages/Kimi_Module/src/messaging/kimi-event-normalizer.ts`
  - `src/client/project-manager/components/sessions/token-usage-stream.ts`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Execution Rules
- **Required reading before every fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Keep each implementation task scoped to no more than 3 files or packages.
- Each implementation task is followed by a separate `Git Commit: ...` line.
- Run `npm run plan:validate` before every `npm run plan:commit -- "<Expected Commit>"`.
- Targeted verification: `npm run build --workspace @codeai-hub/kimi-module`, focused Kimi module tests, and `npm run plan:validate`.
- **Ponytail Hard Mode:** smallest working diff, no new UI unless runtime data path cannot be fixed.
- **Release Build Confirmation Gate:** do not run `./scripts/build-all.sh` without separate explicit user confirmation.

## Phase 0 - Plan Intake (owner: Codex, updated: 2026-06-23)
### Stream: Adopt Kimi token usage status fix
1. [DONE] `kimi-token-status.phase0.plan.task1` Create the planning source and active execution plan for Kimi status-panel token usage repair (scope: `doc/SolidWorks-WorkFlow/Plans/Kimi_Token_Usage_Status_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: start kimi token usage status fix`).
2. [DONE] `kimi-token-status.phase0.plan.commit1` Git Commit: `docs: start kimi token usage status fix` (hash: self)

## Phase 1 - Runtime Fix (owner: Codex, updated: 2026-06-23)
### Stream: Kimi native token usage bridge
3. [DONE] `kimi-token-status.phase1.runtime.task1` Read Kimi native wire usage after a turn and dispatch it through the existing `stream_event.data.tokenUsage` path (scope: `packages/Kimi_Module/src/provider/kimi-native-token-usage-reader.ts, packages/Kimi_Module/src/provider/kimi-native-token-usage-reader.test.ts, packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`; expected commit: `fix(kimi): surface native token usage in status panel`).
4. [DONE] `kimi-token-status.phase1.runtime.commit1` Git Commit: `fix(kimi): surface native token usage in status panel` (hash: self)

## Phase 2 - Documentation Sync (owner: Codex, updated: 2026-06-23)
### Stream: Kimi status-panel contract
5. [DONE] `kimi-token-status.phase2.docs.task1` Document the Kimi fallback source for status-panel token usage without changing usage-limits semantics (scope: `doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md, doc/TODO/todo-plan.md`; expected commit: `docs: document kimi token usage status fallback`).
6. [DONE] `kimi-token-status.phase2.docs.commit1` Git Commit: `docs: document kimi token usage status fallback` (hash: self)

## Phase 3 - Tooling Verification (owner: Codex, updated: 2026-06-23)
### Stream: Kimi focused checks
7. [DONE] `kimi-token-status.phase3.verify.task1` Run targeted Kimi module build/tests and record evidence (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify kimi token usage status fix`). Result: `npm run build --workspace @codeai-hub/kimi-module` OK; `node --test packages/Kimi_Module/dist/provider/kimi-native-token-usage-reader.test.js` OK (2/2); `npm test --workspace @codeai-hub/kimi-module` OK; `npm run plan:validate` OK.
8. [DONE] `kimi-token-status.phase3.verify.commit1` Git Commit: `test: verify kimi token usage status fix` (hash: self)

## Phase 4 - Release Build (owner: Codex, updated: 2026-06-23)
### Stream: Release v1.2.591
9. [DONE] `kimi-token-status.phase4.release-docs.task1` Prepare README and CHANGELOG for the user-confirmed 1.2.591 release before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.591 kimi token usage release`).
10. [DONE] `kimi-token-status.phase4.release-docs.commit1` Git Commit: `docs: prepare 1.2.591 kimi token usage release` (hash: self)
11. [DONE] `kimi-token-status.phase4.release-build.task1` Run `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`; commit version bumps, manifests, release artifacts, VSIX evidence, and plan state (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, *.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.591 kimi token usage release`). Result: `./scripts/build-all.sh` OK; `./scripts/build-release.sh --use-current-version --allow-dirty` OK; package created `codeai-hub-1.2.591.vsix` (5.5M); tarballs created under `doc/tmp/releases/` for providers, core, launcher, and UI.
12. [DONE] `kimi-token-status.phase4.release-build.commit1` Git Commit: `chore: build 1.2.591 kimi token usage release` (hash: self)

## Phase 5 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-23)
### Stream: User retest
13. [DONE] `kimi-token-status.phase5.acceptance.task1` User verifies release 1.2.591: Kimi sessions show non-zero token usage in the lower status panel after a turn (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record kimi token usage user acceptance`). Result: user accepted release 1.2.591; Kimi lower status-panel token usage works after a turn. User also confirmed Kimi `ReadMediaFile` is now available in this runtime.
14. [DONE] `kimi-token-status.phase5.acceptance.commit1` Git Commit: `chore: record kimi token usage user acceptance` (hash: self)

## Phase 6 - Scope Closeout (owner: Codex, updated: 2026-06-23)
### Stream: Archive + planning-doc disposition
15. [IN_PROGRESS] `kimi-token-status.phase6.closeout.task1` After explicit user acceptance, archive this plan and decide planning-doc disposition (scope: `doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close kimi token usage status scope`).
16. [TODO] `kimi-token-status.phase6.closeout.commit1` Git Commit: `docs: close kimi token usage status scope` (hash: TBD)
