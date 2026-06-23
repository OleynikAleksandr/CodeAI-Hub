# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-session-event-routing-2026-06-23",
  "branch": "main",
  "baseHead": "5152b95f3",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Kimi_Session_Event_Routing_Bugfix_Planning_RU.md",
  "currentTaskId": "kimi-session-routing.phase5.acceptance.task1",
  "expectedCommitMessage": "chore: record kimi session routing user acceptance",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Kimi_Session_Event_Routing_Bugfix_Planning_RU.md`
- **Read this context before implementation:**
  - `AGENTS.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`
  - `packages/Kimi_Module/src/provider/kimi-provider-adapter.test.ts`
  - `packages/Kimi_Module/src/messaging/kimi-event-normalizer.ts`
- Only this list is the context source for this execution cycle.

## Execution Rules
- **Required reading before every fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Keep each implementation task scoped to no more than 3 files or packages.
- Each implementation task is followed by a separate `Git Commit: ...` line.
- Run `npm run plan:validate` before every `npm run plan:commit -- "<Expected Commit>"`.
- Targeted verification: focused Kimi provider tests, `npm run build --workspace @codeai-hub/kimi-module`, and `npm run plan:validate`.
- **Ponytail Hard Mode:** route events in the provider adapter; no UI changes unless provider routing cannot fix it.
- **Release Build Confirmation Gate:** do not run `./scripts/build-all.sh` without separate explicit user confirmation.

## Phase 0 - Plan Intake (owner: Codex, updated: 2026-06-23)
### Stream: Adopt Kimi session event routing bugfix
1. [DONE] `kimi-session-routing.phase0.plan.task1` Create the planning source and active execution plan for Kimi session-scoped event routing repair (scope: `doc/SolidWorks-WorkFlow/Plans/Kimi_Session_Event_Routing_Bugfix_Planning_RU.md, doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: start kimi session event routing fix`).
2. [DONE] `kimi-session-routing.phase0.plan.commit1` Git Commit: `docs: start kimi session event routing fix` (hash: self)

## Phase 1 - Runtime Fix (owner: Codex, updated: 2026-06-23)
### Stream: Kimi ACP event routing
3. [DONE] `kimi-session-routing.phase1.runtime.task1` Route Kimi ACP events and provider requests to the listener matching the frame session id, with fallback broadcast only for sessionless frames (scope: `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts, packages/Kimi_Module/src/provider/kimi-provider-adapter.test.ts, packages/Kimi_Module/src/provider/kimi-session-event-router.ts`; expected commit: `fix(kimi): route acp events to target session`).
4. [DONE] `kimi-session-routing.phase1.runtime.commit1` Git Commit: `fix(kimi): route acp events to target session` (hash: self)

## Phase 2 - Documentation Sync (owner: Codex, updated: 2026-06-23)
### Stream: Kimi routing contract
5. [DONE] `kimi-session-routing.phase2.docs.task1` Document the Kimi session-scoped ACP routing invariant (scope: `doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/TODO/todo-plan.md`; expected commit: `docs: document kimi session event routing`).
6. [DONE] `kimi-session-routing.phase2.docs.commit1` Git Commit: `docs: document kimi session event routing` (hash: self)

## Phase 3 - Tooling Verification (owner: Codex, updated: 2026-06-23)
### Stream: Kimi focused checks
7. [DONE] `kimi-session-routing.phase3.verify.task1` Run focused Kimi tests/build and record evidence (scope: `doc/TODO/todo-plan.md`; expected commit: `test: verify kimi session event routing fix`). Result: `npm run build --workspace @codeai-hub/kimi-module` OK; `node --test packages/Kimi_Module/dist/provider/kimi-provider-adapter.test.js` OK (3/3); `npm test --workspace @codeai-hub/kimi-module` OK; `npm run plan:validate` OK.
8. [DONE] `kimi-session-routing.phase3.verify.commit1` Git Commit: `test: verify kimi session event routing fix` (hash: self)

## Phase 4 - Release Build (owner: Codex, updated: 2026-06-23)
### Stream: Release gate
9. [DONE] `kimi-session-routing.phase4.release.task1` After verification, ask the user whether to build a new release; do not run release scripts before explicit confirmation (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: request kimi session routing release decision`). Result: user explicitly confirmed the release build on 2026-06-23.
10. [DONE] `kimi-session-routing.phase4.release.commit1` Git Commit: `chore: request kimi session routing release decision` (hash: self)
11. [DONE] `kimi-session-routing.phase4.release-docs.task1` Prepare README and CHANGELOG for the next release version before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.592 kimi session routing release`). Result: README and CHANGELOG prepared for v1.2.592 before release scripts.
12. [DONE] `kimi-session-routing.phase4.release-docs.commit1` Git Commit: `docs: prepare 1.2.592 kimi session routing release` (hash: self)
13. [DONE] `kimi-session-routing.phase4.release-build.task1` Run `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then record release artifacts and build evidence (scope: `package.json, package-lock.json, packages/*/package.json, apps/**/package.json, assets/**/manifest.json, doc/tmp/releases/**, codeai-hub-*.vsix, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.592 kimi session routing release`). Result: `./scripts/build-all.sh` OK; `./scripts/build-release.sh --use-current-version --allow-dirty` OK; VSIX `codeai-hub-1.2.592.vsix` created at 5.5M; release tarballs copied to `doc/tmp/releases/*1.2.592*`.
14. [DONE] `kimi-session-routing.phase4.release-build.commit1` Git Commit: `chore: build 1.2.592 kimi session routing release` (hash: self)

## Phase 5 - User Workflow Acceptance Testing (owner: user, updated: 2026-06-23)
### Stream: User retest
15. [IN_PROGRESS] `kimi-session-routing.phase5.acceptance.task1` User verifies two simultaneous Kimi chats keep responses in the correct chat history (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record kimi session routing user acceptance`).
16. [TODO] `kimi-session-routing.phase5.acceptance.commit1` Git Commit: `chore: record kimi session routing user acceptance` (hash: TBD)

## Phase 6 - Scope Closeout (owner: Codex, updated: 2026-06-23)
### Stream: Archive + planning-doc disposition
17. [TODO] `kimi-session-routing.phase6.closeout.task1` After explicit user acceptance, archive this plan and decide planning-doc disposition (scope: `doc/TODO/Archive/**, doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close kimi session event routing scope`).
18. [TODO] `kimi-session-routing.phase6.closeout.commit1` Git Commit: `docs: close kimi session event routing scope` (hash: TBD)
