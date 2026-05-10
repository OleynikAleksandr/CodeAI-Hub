# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-runtime-contract-conformance-implementation",
  "branch": "main",
  "baseHead": "62eb9b697",
  "lastRecordedCommit": "8524963de",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Runtime_Contract_Conformance.md",
  "currentTaskId": "runtime-contract.phase10.stream10.task2",
  "expectedCommitMessage": "build: bump release manifests to 1.2.219",
  "debt": {
    "expectedCommitMessage": "build: bump release manifests to 1.2.219",
    "preCommitHead": "8524963de",
    "stage": "commit_pending",
    "taskId": "runtime-contract.phase10.stream10.task2"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Runtime_Contract_Conformance.md`
- **Deferred design layer:** `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Workspace_Lifecycle_From_Diagram_Modules.md`
  - `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Runtime_Contract_Conformance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream, в каждом Stream — микро-задачи.
- Каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Если по факту разработки конкретная подзадача Stream затрагивает больше 3 файлов, сначала разбей её на более мелкие и обнови этот plan отдельным planned commit.
- Managed documentation agents report only content readiness. Core owns staging, managed commit, plan advancement, continuation, rollover envelope, audit storage and downstream unlock.
- Mandatory repair scope покрывает только Gaps A-E + R из planning source. Type A/Type B финальная correction phase, UI B→A controls и corrective operations остаются deferred design layer и не реализуются в этом scope.
- Rollover / autocompact / session transition для managed stages должен сохранять inline initial managed workflow contract/context block, active stage todo-plan text, `Continuation Mode`, current microtask state and last user-visible assistant message. Это не standalone bootstrap prompt и не cold-start reset.
- **Release Build Confirmation Gate:** после завершения фиксов и проверок остановись и переспроси пользователя, собирать ли новый релиз. Не запускай `./scripts/build-all.sh` / `./scripts/build-release.sh --use-current-version` без отдельного явного подтверждения пользователя.
- Do not use `--no-verify`.

## Phase 0 — Planning Finalization (owner: Codex, updated: 2026-05-10)

### Stream: Accepted Planning Docs And Execution Plan

1. [DONE] `runtime-contract.phase0.task1` Finalize the two planning documents after review and cut this active implementation plan (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Runtime_Contract_Conformance.md, doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md, doc/TODO/todo-plan.md`; expected commit: `docs: finalize runtime conformance implementation plan`).
2. [DONE] Git Commit: `docs: finalize runtime conformance implementation plan` (hash: a3f3fb372)

## Phase 1 — Code Surface Audit (owner: next agent, updated: 2026-05-10)

### Stream: Map Concrete Runtime Owners

3. [DONE] `runtime-contract.phase1.stream0.task1` Audit actual code owners for Gaps A-E + R and update this plan if any provisional file scopes below need splitting or replacement (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: map runtime conformance code surfaces`).
4. [DONE] Git Commit: `docs: map runtime conformance code surfaces` (hash: f72e28d24)

**Audit notes (2026-05-10):** provisional scopes below are grounded in current code search:

- Gap B ownership leak surfaces: `managed-git-stage-gate.ts` holds the forbidden `Commit or clean` wording; `workflow-agent-acceptance-feedback.ts` composes provider-visible managed feedback.
- Gap A arbitration surfaces: provider terminal events route through `session-provider-event-router.ts`; managed post-turn acceptance/feedback runs through `managed-workflow-post-turn-service.ts`.
- Gap C/D managed acceptance/materialization surfaces: message dispatch and post-turn service are the likely command ingress; `workflow-state-managed-documentation-commit.ts`, `application-skeleton-progress.ts`, `quality-gates-progress.ts` and `managed-documentation-commit-transaction.ts` own stage commit/progress validation.
- Gap E/R surfaces: user-visible delivery likely passes through workflow event/websocket services; durable history is under `packages/core/src/unified-session/`; managed context and rollover envelope are under `session-request-handler-managed-context-bundle.ts` and `session-request-handler-documentation-continuation-envelope.ts`.
- The implementation tasks keep the exact ≤3 file scopes below; if Stream 2+ discovers a wider boundary, split the task before editing code.

## Phase 2 — Gap B Corrective Text Ownership (owner: next agent, updated: 2026-05-10)

### Stream: Provider-Visible Feedback Cleanup

5. [DONE] `runtime-contract.phase2.stream1.task1` Remove provider-directed Git imperatives from managed dirty-state and acceptance feedback text (scope: `packages/core/src/remote-bridge/handlers/managed-git-stage-gate.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts`; expected commit: `fix: remove managed feedback git imperatives`).
6. [DONE] Git Commit: `fix: remove managed feedback git imperatives` (hash: 9a7069bdb)
7. [DONE] `runtime-contract.phase2.stream1.task2` Add regression coverage for forbidden substrings and allowed neutral content-readiness wording across managed stages (scope: `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.ts, packages/core/src/remote-bridge/handlers/managed-git-stage-gate.test.ts`; expected commit: `test: cover managed feedback ownership wording`).
8. [DONE] Git Commit: `test: cover managed feedback ownership wording` (hash: 603b5abc3)

## Phase 3 — Gap A Post-Turn Arbitration Repeat (owner: next agent, updated: 2026-05-10)

### Stream: Terminal Event Dedup And Retry Guard

9. [DONE] `runtime-contract.phase3.stream2.task1` Add Core-normalized terminal-event identity and processed-event ledger so managed post-turn arbitration runs once per new terminal event and duplicate delivery is no-op (scope: `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/session-provider-event-router.test.ts`; expected commit: `fix: dedupe managed post-turn arbitration events`).
10. [DONE] Git Commit: `fix: dedupe managed post-turn arbitration events` (hash: a2a430269)
11. [DONE] `runtime-contract.phase3.stream2.task2` Add per-task retry guard and BLOCKED/pause handling for repeated failed managed arbitration attempts (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/workflow-state-service.ts, packages/core/src/remote-bridge/handlers/workflow-state-service-managed-state.test.ts`; expected commit: `fix: guard repeated managed arbitration attempts`).
12. [DONE] Git Commit: `fix: guard repeated managed arbitration attempts` (hash: 68b85e477)

## Phase 4 — Gaps C/D Acceptance And Materialization (owner: next agent, updated: 2026-05-10)

### Stream: Core-Owned Acceptance Commands

13. [DONE] `runtime-contract.phase4.stream3.task1` Route contract acceptance as Core-owned commands and block provider delivery for matched full-message acceptance phrases (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `fix: route managed contract acceptance commands`).
14. [DONE] Git Commit: `fix: route managed contract acceptance commands` (hash: a2c2d22ee)
15. [DONE] `runtime-contract.phase4.stream3.task2` Add command validation tests for accepted phrases, rejected non-matches and provider-message isolation (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts, packages/core/src/remote-bridge/handlers/incoming-message-validator.test.ts`; expected commit: `test: cover managed acceptance command routing`).
16. [DONE] Git Commit: `test: cover managed acceptance command routing` (hash: cda4b3a5e)

### Stream: Materialization And Integration Commit Handler

17. [DONE] `runtime-contract.phase4.stream4.task1` Open Core-owned materialization/integration phase after acceptance and wire managed commit + plan advance for Application Skeleton and Quality Gates (scope: `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.ts, packages/core/src/remote-bridge/handlers/application-skeleton-progress.ts, packages/core/src/remote-bridge/handlers/quality-gates-progress.ts`; expected commit: `fix: commit managed materialization phases`).
18. [DONE] Git Commit: `fix: commit managed materialization phases` (hash: 338789bf4)
19. [DONE] `runtime-contract.phase4.stream4.task2` Generalize managed commit boundary validation for draft/materialization/integration phases without duplicating Diagram Modules logic (scope: `packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.ts, packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.ts, packages/core/src/remote-bridge/handlers/managed-documentation-commit-transaction.test.ts`; expected commit: `fix: share managed commit boundary across phases`).
20. [DONE] Git Commit: `fix: share managed commit boundary across phases` (hash: 528fb9699)

## Phase 5 — Gap E User-Visible Delivery And Audit Storage (owner: next agent, updated: 2026-05-10)

### Stream: Managed Core Messages

21. [DONE] `runtime-contract.phase5.stream6.task1` Route Core-managed corrective/continuation/decision messages through the existing Core/PM event stream for user-visible chat delivery (scope: `packages/core/src/remote-bridge/handlers/workflow-events-service.ts, packages/core/src/remote-bridge/handlers/websocket-manager.ts, src/client/project-manager/services/workflow-events-client.ts`; expected commit: `fix: surface managed core messages in workflow UI`).
22. [DONE] Git Commit: `fix: surface managed core messages in workflow UI` (hash: d936e6ce9)
23. [DONE] `runtime-contract.phase5.stream6.task2` Persist managed Core messages to a replay-safe `.audit.jsonl` stream derived from the existing session path builder (scope: `packages/core/src/unified-session/storage.ts, packages/core/src/unified-session/storage.test.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `fix: persist managed core audit stream`).
24. [DONE] Git Commit: `fix: persist managed core audit stream` (hash: 4f0bdaad2)
25. [DONE] `runtime-contract.phase5.stream6.task3` Ensure provider replay, rollover prompt builders and transcript reconstruction ignore managed audit stream records (scope: `packages/core/src/remote-bridge/handlers/dialog-history-service.ts, packages/core/src/remote-bridge/handlers/session-request-handler-documentation-continuation-envelope.ts, packages/core/src/remote-bridge/handlers/session-request-handler.documentation-rollover.test.ts`; expected commit: `test: isolate managed audit stream from replay`).
26. [DONE] Git Commit: `test: isolate managed audit stream from replay` (hash: d90ff9df3)

## Phase 6 — Gap R Managed Rollover Envelope (owner: next agent, updated: 2026-05-10)

### Stream: Managed Session Transition Prompt Shape

27. [DONE] `runtime-contract.phase6.stream6.task1` Build managed rollover envelope as first resumed turn wrapper with initial managed workflow contract/context block, inline active stage todo-plan, Continuation Mode, current microtask state and no cold-start reset instructions (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-documentation-continuation-envelope.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.ts, packages/core/src/remote-bridge/handlers/session-request-handler.documentation-rollover.test.ts`; expected commit: `fix: preserve managed context in rollover envelope`).
28. [DONE] Git Commit: `fix: preserve managed context in rollover envelope` (hash: 0165fb07f)
29. [DONE] `runtime-contract.phase6.stream6.task2` Add forced-rollover regressions for Application Skeleton and Quality Gates midstream sessions (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.documentation-rollover.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.test.ts, src/client/project-manager/services/managed-workflow-initial-context.test.ts`; expected commit: `test: cover managed stage rollover envelope`).
30. [DONE] Git Commit: `test: cover managed stage rollover envelope` (hash: b89ae19e7)
31. [DONE] `runtime-contract.phase6.stream6.task3` Add non-managed rollover regression to prove Description and Virtual Simulation envelope behavior is unchanged (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.documentation-rollover.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler.documentation-continuation.test.ts, doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`; expected commit: `test: preserve non-managed rollover behavior`).
32. [DONE] Git Commit: `test: preserve non-managed rollover behavior` (hash: c783af307)

## Phase 7 — End-To-End Regression Coverage (owner: next agent, updated: 2026-05-10)

### Stream: Managed Step Happy Paths

33. [DONE] `runtime-contract.phase7.stream7.task1` Cover Application Skeleton contract acceptance -> materialization -> managed commit -> terminal handoff happy path (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.test.ts`; expected commit: `test: cover application skeleton managed materialization`).
34. [DONE] Git Commit: `test: cover application skeleton managed materialization` (hash: cdefcdd98)
35. [DONE] `runtime-contract.phase7.stream7.task2` Cover Quality Gates contract acceptance -> integration -> managed commit -> terminal handoff happy path (scope: `packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts, packages/core/src/templates/quality-gates-bundled-templates.test.ts`; expected commit: `test: cover quality gates managed integration`).
36. [DONE] Git Commit: `test: cover quality gates managed integration` (hash: 3154d9c50)
37. [DONE] `runtime-contract.phase7.stream7.task3` Re-run Diagram Modules happy-path regression around subturn continuation, feedback and post-turn acceptance after shared handler changes (scope: `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.ts, packages/core/src/remote-bridge/handlers/diagram-modules-continuation-dispatcher.ts, packages/core/src/remote-bridge/handlers/diagram-modules-progress.test.ts`; expected commit: `test: preserve diagram modules managed subturns`).
38. [DONE] Git Commit: `test: preserve diagram modules managed subturns` (hash: 375c47f10)

## Phase 8 — SSOT Sync And Targeted Verification (owner: next agent, updated: 2026-05-10)

### Stream: Documentation Sync

39. [DONE] `runtime-contract.phase8.stream8.task1` Sync accepted runtime conformance behavior into stable SSOT docs after code is implemented (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`; expected commit: `docs: sync runtime conformance ssot`).
40. [DONE] Git Commit: `docs: sync runtime conformance ssot` (hash: 4a05a18b4)

### Stream: Tooling Verification

41. [DONE] `runtime-contract.phase8.stream8.task2` Run targeted builds/tests for touched Core and Project Manager packages, record evidence in this plan, and fix any TypeScript regressions surfaced by the Core build (scope: `doc/TODO/todo-plan.md, packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.ts`; expected commit: `docs: record runtime conformance verification`).
42. [DONE] Git Commit: `docs: record runtime conformance verification` (hash: 9d5a63d97)

**Verification evidence (2026-05-10):**

- `npm run build --workspace @codeai-hub/core` → clean (`tsc` exit 0).
- `npm run typecheck:webview` → clean (`tsc -p tsconfig.webview.json --pretty false` exit 0).
- Targeted node:test runner (15 spec files под `packages/core/src/remote-bridge/handlers/` + `packages/core/src/unified-session/storage.test.ts`): **42/42 PASS** в 871ms; покрывает managed feedback ownership wording, dedup terminal-event identity, retry guard, acceptance command recognition, managed commit boundary refactor, audit stream append/isolation, managed rollover envelope (skeleton + non-managed), application skeleton materialization validator happy path, quality gates awaiting_acceptance regression и diagram modules subturn happy path.
- Все pre-commit гейты проходят на каждом из 17 commit'ов scope (architecture/lint/knip/jscpd/UI SSOT).

## Phase 9 — Release And Acceptance (owner: next agent, updated: 2026-05-10)

### Stream: Release Build Confirmation Gate

43. [DONE] `runtime-contract.phase9.stream9.task1` Ask the user for explicit release build confirmation after implementation and verification are complete (scope: chat/process observation only; no commit required). Result: User explicitly confirmed release build via chat instruction

### Stream: Release Build

44. [DONE] `runtime-contract.phase9.stream9.task2` After explicit confirmation only, prepare release notes/version files and run release build scripts per AGENTS Release Build Checklist (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `build: release managed runtime conformance repair`).
45. [DONE] Git Commit: `build: release managed runtime conformance repair` (hash: b52d84816)
46. [DONE] `runtime-contract.phase9.stream9.task2b` Commit version manifests, package-lock and README/CHANGELOG bumped by `build-all.sh` (build-all bumped release line to 1.2.218 because launcher tarball 1.2.217 already existed) so build-release.sh receives a clean tree (scope: `README.md, CHANGELOG.md, package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md`; expected commit: `build: bump release manifests to 1.2.218`).
47. [DONE] Git Commit: `build: bump release manifests to 1.2.218` (hash: d6d62e278)

### Stream: User Workflow Acceptance Testing

48. [BLOCKED] `runtime-contract.phase9.stream9.task3` User retests Diagram Modules, Application Skeleton, Quality Gates and at least one controlled managed rollover scenario on the new VSIX (scope: chat/process observation only; no commit required). Result on VSIX 1.2.218: Diagram Modules passed; Application Skeleton surfaced a Type B phase tracking regression — Core does not observe agent/user draft contract loop in real time, plan hash is recorded only after the agent has already moved into Phase 2 materialization, and the materialization commit is never issued. Acceptance is paused until Phase 10 diagnoses and resolves the regression.

### Stream: Scope Closeout

49. [TODO] `runtime-contract.phase9.stream9.task4` After explicit user acceptance, archive this todo plan, decide disposition for the planning documents, update Docs Index if needed, and leave active plan in terminal NONE (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed runtime conformance repair`).
50. [TODO] Git Commit: `docs: close managed runtime conformance repair` (hash: TBD)
51. [TODO] `runtime-contract.phase9.stream9.task5` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.

## Phase 10 — Type B Phase Tracking Regression Repair (owner: next agent, updated: 2026-05-10)

### Stream: Application Skeleton Phase B Regression Diagnosis

52. [DONE] `runtime-contract.phase10.stream0.task1` Diagnose why Core did not track Application Skeleton Phase B in real time on VSIX 1.2.218. Examine: managed context bundle source and `activeStage` resolution for the Application Skeleton step prompt; acceptance phrase routing for stage-specific phrases (Phase 4 / Stream 3 / task1 reach into Application Skeleton runtime); managed materialization commit handler activation in Application Skeleton runtime (Phase 4 / Stream 4 / task1 reach); plan state advance timing relative to draft/materialize turns. Record findings, root-cause hypothesis confirmation, and proposed follow-up streams inline in this plan; do not edit code or planning documents in this microtask. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: diagnose application skeleton phase b regression`).
53. [DONE] Git Commit: `docs: diagnose application skeleton phase b regression` (hash: c07b4f4b1)

**Diagnosis findings (2026-05-10).**

Three independent regressions stack to produce the symptom the user observed (Core silent during Phase B, late hash for task1, no commit for task2). All three are inside `packages/core/src/remote-bridge/handlers/`.

R1 — Stage advance never writes `activeStage` into `workspace.plan.md`.
- Bundle builder `session-request-handler-managed-context-bundle.ts:46-84` (`buildManagedWorkflowContextBundle`) reads `workspace.plan.md` via `parseWorkspacePlanState` (lines 239-252) and emits the stale value verbatim (line 132). `DEFAULT_STAGE_PLAN_PATHS` (lines 14-18) does map `application_skeleton`/`diagram_modules`/`quality_gates` to their stage todo-plans, but those are read only after `activeStage` is already known.
- Initialisation: `managed-todo-tree.ts:81-103` (`ensureManagedTodoTree`) seeds `activeStage` once via `updateWorkspacePlanState` (line 118).
- Gap: there is no caller that updates `workspace.plan.md` when the workflow advances `Diagram Modules → Application Skeleton → Quality Gates`. As a result the bundle for Application Skeleton in this test contained `activeStage: null`, `Execution scope status: unknown`, `Current task: none`, `Last recorded commit: none`, even though `doc/TODO/stages/application-skeleton/todo-plan.md` on disk was rich (`ACTIVE`, `currentTaskId: application-skeleton.stream1.task2`, `expectedCommitMessage: feat: materialize application skeleton`, `lastRecordedCommit: 24975b7`).
- Diagram Modules tested fine because that stage was the first/initialised value — bundle-time readers happened to see a non-null `activeStage` for it.

R2 — Acceptance phrase matcher is exact-match against three canonical strings only.
- `recognizeManagedContractAcceptancePhrase` in `managed-workflow-post-turn-service.ts:48-64` uses `localeCompare(... === 0)` against the canonical list at lines 42-46: `Подтверждаю контракт`, `Принимаю контракт`, `Утверждаю контракт`. No substring/intent check.
- The user's actual message — `"Контракт принимаю, можешь двигаться к фазе 2."` — does not equal any of the three canonical strings. Matcher returns `null`, so the dispatch in `session-request-handler-message-dispatch.ts:174-182` falls through to `appendVisibleUserMessage` and `providerSend.dispatch` (lines 186-227). The message reaches the provider unintercepted; Core never opens a managed acceptance flow.
- Per-stage gating exists (`MANAGED_CONTRACT_ACCEPTANCE_STAGES = {application_skeleton, quality_gates}` at lines 66-69 inside `handleContractAcceptance` 187-217), but it only protects against false-positive acceptance for the wrong stage; it does nothing for false-negatives like this one. There is no per-stage code path difference between Diagram Modules and Application Skeleton at the matcher level.
- Diagram Modules acceptance "works" via a different mechanism (subturn continuation dispatcher; see R3) and does not depend on this matcher at all.

R3 — Application Skeleton has no materialization continuation dispatcher and no materialization-completion listener.
- Diagram Modules has `diagram-modules-continuation-dispatcher.ts:104-142` (`sendDiagramModulesContinuationIfReady`) — fires post-acceptance, sends the next continuation prompt, and the cycle ends with the managed commit gate seeing the right stage state.
- Application Skeleton has no parallel function. `workflow-agent-acceptance-feedback.ts:412-448` (`sendApplicationSkeletonFeedback`) only emits error-repair feedback; it never dispatches a materialization continuation.
- Commit gate `workflow-state-managed-documentation-commit.ts:46-52` (`hasCommittableApplicationSkeletonStage`) requires `applicationSkeletonProgress?.materialized === true` plus dirty Application Skeleton files. Core never sets `materialized` itself; the agent writes `"materialized": true` into `application-skeleton-map.json`, but no handler observes that file change to update Core's in-memory `applicationSkeletonProgress` and trigger the commit. Tests in `workflow-state-managed-documentation-commit.test.ts` pre-stage the flag to true, which is why they pass while runtime does not.
- Net effect on this run: agent finished materialisation and reported readiness; Core's commit gate stayed false; `managed-documentation-commit-transaction.ts:103-161` never invoked `npm run plan:commit -- "feat: materialize application skeleton"`. task2 stayed `IN_PROGRESS` indefinitely.

Plan timing reconciliation (why hash for task1 appeared "late").
- task1 (`docs: draft application skeleton contract`, hash `24975b7`) did get committed — most plausibly via the post-turn content-readiness path that reacted to the agent's draft-readiness messages (lines 6 and 9 of the session JSONL). plan-orchestrator's post-commit hook then advanced `currentTaskId` to `application-skeleton.stream1.task2` automatically.
- That advance happened decoupled from the user's "Контракт принимаю..." message (R2 dropped that on the floor) and decoupled from the agent's actual "Phase 2" turn (R3 prevented any materialisation-side handling). From the user's vantage point Core "woke up" once: it stamped the draft hash and rolled the pointer to task2, then went silent again — exactly matching the symptom report.

Type B candidate microtask lifecycle (deferred design, section 2).
- Not implemented in any form in current runtime. There is no Core-side surface that observes per-turn user messages during Phase B, no candidate-promote-or-drop logic, no audit kind for dropped candidates. R1+R2+R3 above are necessary preconditions for Phase B to function at all; full Type B candidate lifecycle remains a separate, larger surface that this scope should not try to cover end-to-end.

Confirmation against the original hypotheses.
- Hypothesis (a) "Phase 4 fix wired to one code-path only" — partially confirmed for R3 (commit gate exists, but the trigger that should set `materialized: true` does not exist for Application Skeleton runtime).
- Hypothesis (b) "Bundle builder doesn't get `activeStage`" — confirmed as R1, but the cause is upstream (no writer on stage advance), not in the bundle builder itself.
- Hypothesis (c) "Acceptance phrase list too narrow" — confirmed as R2.
- Additional finding not in original hypotheses: Application Skeleton lacks the continuation dispatcher pattern that makes Diagram Modules work; this is a structural gap, not just a list-of-phrases gap.

Proposed follow-up streams (to nail down before nibbling at code).
- Stream 1: Planning-document corrections. Update `Managed_Workflow_Runtime_Contract_Conformance.md` to mark Gap A/C/D fixes as having stage-advance and materialization-completion gaps; update `Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md` to record that R1/R2/R3 are blockers for any Type B implementation. No new planning files.
- Stream 2: Stage-advance writer for `workspace.plan.md`. Wire the workflow-advance code path that transitions stages to invoke `updateWorkspacePlanState(... newStage ...)` so the bundle builder reflects reality. ≤3 files including a regression test.
- Stream 3: Robust acceptance phrase recognition. Replace exact-match with a normalisation-plus-pattern recogniser scoped to acceptance-eligible Type B states; add the user's actual phrasing and the design-layer step-specific phrases as test fixtures. ≤3 files.
- Stream 4: Application Skeleton materialization continuation dispatcher. Parallel to `sendDiagramModulesContinuationIfReady` — fires after acceptance is recognised, sends the materialisation continuation prompt. ≤3 files.
- Stream 5: Application Skeleton materialization-completion observer. Re-read `application-skeleton-map.json` after the agent's post-turn report, refresh `applicationSkeletonProgress.materialized`, and let the existing commit gate fire. Cover with a runtime-shaped regression that does not pre-stage the flag. ≤3 files.
- Stream 6: End-to-end regression covering the full Application Skeleton happy path (start → draft → user-acceptance → materialise → commit task2 → plan advance) plus a forced-rollover variant inside Phase B. ≤3 files.
- Stream 7: SSOT sync touching only `WorkflowSteps_Overview.md`/`SystemArchitecture.md` for the new behaviours actually shipped. Quality Gates is intentionally out of scope — its symmetric fix is a follow-up cycle, not part of Phase 10.
- Stream 8: Release Build Confirmation Gate, Release Build, User Workflow Acceptance Testing, Scope Closeout (mirror of Phase 9 Stream 9 pattern).

This covers the minimum to make Application Skeleton happy path work end-to-end without trying to implement full Type B candidate lifecycle. Quality Gates symmetric fix remains out of scope; full Type B candidate microtask runtime remains deferred.

### Stream: Phase 10 Streams Layout

54. [DONE] `runtime-contract.phase10.stream0.task2` Cut Phase 10 follow-up streams from the diagnosis findings under task1 (R1/R2/R3 fixes plus planning-doc corrections, SSOT sync, regression coverage, release and acceptance) into concrete ≤3-file microtasks inside this plan. Scope is plan-only; do not edit code or planning documents in this microtask. (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: cut phase 10 follow-up streams`).
55. [DONE] Git Commit: `docs: cut phase 10 follow-up streams` (hash: 739d8409c)

### Stream: Planning Document Corrections

56. [DONE] `runtime-contract.phase10.stream1.task1` Note R1/R2/R3 known gaps in `Managed_Workflow_Runtime_Contract_Conformance.md` so future agents do not assume Phase 4 fixes are complete; cross-link to Phase 10 in this active plan (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Runtime_Contract_Conformance.md, doc/TODO/todo-plan.md`; expected commit: `docs: note runtime conformance gaps in mandatory repair planning`).
57. [DONE] Git Commit: `docs: note runtime conformance gaps in mandatory repair planning` (hash: 8ebee86d3)
58. [DONE] `runtime-contract.phase10.stream1.task2` Note R1/R2/R3 as preconditions for any future Type B candidate microtask lifecycle in `Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md`; record that Phase 10 ships R1/R2/R3 fixes only and full Type B candidate runtime stays deferred (scope: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md, doc/TODO/todo-plan.md`; expected commit: `docs: note phase types blockers in deferred design`).
59. [DONE] Git Commit: `docs: note phase types blockers in deferred design` (hash: 8f6bfe0d8)

### Stream: Stage Advance Writer For workspace.plan.md

60. [DONE] `runtime-contract.phase10.stream2.task1` Add stage-advance writer in the embedded plan-orchestrator shim's `recordWorkspaceCommit` so terminal-commit messages for each managed stage roll `activeStage` and `activePlanPath` forward in `workspace.plan.md`; extract the embedded shim source into a sibling file so installer stays under the 500-line architecture limit (scope: `packages/core/src/managed-workspace/managed-todo-tree.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-installer.ts, packages/core/src/managed-workspace/managed-plan-orchestrator-shim-source.ts`; expected commit: `fix: write activestage on managed stage advance`). Test moved to task2 to keep ≤3 files; actual code path lives under `managed-workspace/`, not `remote-bridge/handlers/` as originally hypothesised.
61. [DONE] Git Commit: `fix: write activestage on managed stage advance` (hash: 4ba87c639)
62. [DONE] `runtime-contract.phase10.stream2.task2` Add stage-advance regression in the shim test suite: assert mappings (`STAGE_TERMINAL_COMMITS`, `NEXT_STAGE_AFTER`, `STAGE_PLANS`) and verify that a non-terminal commit (Application Skeleton draft) keeps `activeStage` unchanged. Full terminal-commit happy path (advance + auto-create next stage plan) is deferred to Stream 4 because it requires materialisation continuation dispatcher and next-plan auto-creation that live outside R1 scope (scope: `packages/core/src/managed-workspace/managed-plan-orchestrator-installer.test.ts`; expected commit: `test: cover managed stage advance writer`).
63. [DONE] Git Commit: `test: cover managed stage advance writer` (hash: 9fcef00a5)

### Stream: Robust Acceptance Phrase Recognition

64. [DONE] `runtime-contract.phase10.stream3.task1` Replace exact-match in `recognizeManagedContractAcceptancePhrase` with a normalised contains-keyword recogniser that requires the canonical verb plus the canonical noun (`принимаю/подтверждаю/утверждаю` and `контракт`) inside one user message; gate recognition on acceptance-eligible Type B state via the existing `MANAGED_CONTRACT_ACCEPTANCE_STAGES` set; keep false-positive risk explicit by rejecting messages with conflicting verbs (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`; expected commit: `fix: broaden managed acceptance phrase recognition`).
65. [DONE] Git Commit: `fix: broaden managed acceptance phrase recognition` (hash: abd65da3a)
66. [DONE] `runtime-contract.phase10.stream3.task2` Regression coverage for the broadened matcher; also includes a regex hotfix that drops JS-incompatible word boundaries (`\b` does not work for Cyrillic in V8) so positive matches actually fire (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.test.ts`; expected commit: `test: cover acceptance phrase variants`).
67. [DONE] Git Commit: `test: cover acceptance phrase variants` (hash: bab0e0f79)

### Stream: Application Skeleton Materialization Continuation Dispatcher

68. [DONE] `runtime-contract.phase10.stream4.task1` Add new `application-skeleton-continuation-dispatcher.ts` (parallel to Diagram Modules dispatcher) that emits a materialisation continuation prompt to the agent once Core has registered an Application Skeleton acceptance command on a session in awaiting-acceptance state; track recently-accepted sessions inside the post-turn service to gate the dispatch (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.ts, packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `fix: dispatch application skeleton materialization continuation`). New dispatcher file replaces the originally-listed feedback/progress edits.
69. [DONE] Git Commit: `fix: dispatch application skeleton materialization continuation` (hash: 50dbf80ba)
70. [DONE] `runtime-contract.phase10.stream4.task2` Regression coverage for the new dispatcher: fires once per acceptance, no-op if no recently-accepted signal, no-op when already materialised (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-continuation-dispatcher.test.ts`; expected commit: `test: cover application skeleton continuation dispatcher`). New single-file test.
71. [DONE] Git Commit: `test: cover application skeleton continuation dispatcher` (hash: bef937396)

### Stream: Application Skeleton Materialization Completion Observer

72. [DONE] `runtime-contract.phase10.stream5.task1` Existing post-turn arbitration already re-reads `application-skeleton-map.json` each turn (`readApplicationSkeletonProgressSnapshot`) and `hasCommittableApplicationSkeletonStage` fires once `materialized: true` is observed. Add explicit completion-observation log and drop the recently-accepted session marker so the Stream 4 dispatcher does not refire after materialisation completes (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-post-turn-service.ts`; expected commit: `fix: observe application skeleton materialization completion`).
73. [DONE] Git Commit: `fix: observe application skeleton materialization completion` (hash: 58de08eda)
74. [DONE] `runtime-contract.phase10.stream5.task2` Add completion observer regression in a new dedicated file: agent flipping `materialized: false → true` between turns produces `progress.materialized: true` and `substep: "materialized"` (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-completion-observer.test.ts`; expected commit: `test: cover application skeleton completion observer`). New single-file test; existing `application-skeleton-progress.test.ts` was nearing the 500-line limit.
75. [DONE] Git Commit: `test: cover application skeleton completion observer` (hash: 062d50570)

### Stream: End-To-End Regression Coverage

76. [DONE] `runtime-contract.phase10.stream6.task1` Chained happy-path test exercising R2/R3 in sequence: recogniser detects user phrasing → dispatcher fires materialisation prompt for awaiting-acceptance session → flipping `materialized: true` produces snapshot with `substep: "materialized"` (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-end-to-end.test.ts`; expected commit: `test: cover application skeleton end-to-end happy path`).
77. [DONE] Git Commit: `test: cover application skeleton end-to-end happy path` (hash: 02d6f8ebd)
78. [DONE] `runtime-contract.phase10.stream6.task2` Forced-rollover Phase B regression: assert that R2 recogniser still fires for an Application Skeleton acceptance phrase received as the resumed user message after a rollover transition, and the dispatcher gate stays correct without re-firing if the materialised flag flipped between source and target (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-phase-b-rollover.test.ts`; expected commit: `test: cover application skeleton phase b rollover`). New single-file test relying on the existing recogniser/dispatcher units (full envelope rebuild already covered by Phase 6 regressions).
79. [DONE] Git Commit: `test: cover application skeleton phase b rollover` (hash: ead1484e5)

### Stream: SSOT Sync

80. [DONE] `runtime-contract.phase10.stream7.task1` Sync the Phase B / B→A acceptance / materialisation continuation behaviours actually shipped into stable SSOT (Application Skeleton sections only; Quality Gates is intentionally deferred) (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md`; expected commit: `docs: sync application skeleton phase b ssot`).
81. [DONE] Git Commit: `docs: sync application skeleton phase b ssot` (hash: 494e00c65)

### Stream: Tooling Verification

82. [DONE] `runtime-contract.phase10.stream8.task1` Run targeted builds and tests for touched Core packages and fix two TypeScript regressions surfaced by the Core build (`materializationState: "not_started"` is not a valid `ApplicationSkeletonSubstep` — replaced with `"artifact"` in two new test fixtures) (scope: `doc/TODO/todo-plan.md, packages/core/src/remote-bridge/handlers/application-skeleton-end-to-end.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-phase-b-rollover.test.ts`; expected commit: `docs: record phase 10 verification`).
83. [DONE] Git Commit: `docs: record phase 10 verification` (hash: 6b00fd09e)

**Phase 10 verification evidence (2026-05-10).**

- `npm run build --workspace @codeai-hub/core` → clean (`tsc` exit 0) after the two `materializationState` fixture corrections noted above.
- Targeted node:test runner over Phase 10 spec files (`managed-workflow-post-turn-service.test.ts`, `application-skeleton-continuation-dispatcher.test.ts`, `application-skeleton-completion-observer.test.ts`, `application-skeleton-end-to-end.test.ts`, `application-skeleton-phase-b-rollover.test.ts`, `managed-plan-orchestrator-installer.test.ts`): **26/26 PASS** in ≈4.43s.
- Pre-commit gates passed on every Phase 10 commit through Stream 7.

### Stream: Release Build Confirmation Gate

84. [DONE] `runtime-contract.phase10.stream9.task1` Ask the user for explicit release build confirmation after implementation and verification are complete (scope: chat/process observation only; no commit required). Result: User confirmed release build via chat instruction earlier in this session

### Stream: Release Build

85. [DONE] `runtime-contract.phase10.stream10.task1` After explicit confirmation only, prepare release notes/version files for the next version bump and run release build scripts per Release Build Checklist (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `build: release application skeleton phase b repair`).
86. [DONE] Git Commit: `build: release application skeleton phase b repair` (hash: 8524963de)
87. [DONE] `runtime-contract.phase10.stream10.task2` Commit version manifests and lockfile bumped by `build-all.sh`, plus add `native/apple-*-helper/.build/` to `.gitignore` since those native-helper build artifacts are regenerated on every run (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, doc/TODO/todo-plan.md, .gitignore`; expected commit: `build: bump release manifests to 1.2.219`).
88. [PENDING] Git Commit: `build: bump release manifests to 1.2.219` (hash: TBD)

### Stream: User Workflow Acceptance Testing

89. [TODO] `runtime-contract.phase10.stream11.task1` User retests Application Skeleton (full draft → acceptance → materialisation → commit advance), reverifies Diagram Modules and at least one controlled managed rollover scenario inside Phase B on the new VSIX (scope: chat/process observation only; no commit required).

### Stream: Scope Closeout

90. [TODO] `runtime-contract.phase10.stream12.task1` After explicit user acceptance, archive this todo plan, decide disposition for the planning documents touched in Stream 1 and the deferred design layer, update Docs Index if needed, and leave active plan in terminal NONE (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close application skeleton phase b repair`).
91. [TODO] Git Commit: `docs: close application skeleton phase b repair` (hash: TBD)
92. [TODO] `runtime-contract.phase10.stream12.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
