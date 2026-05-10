# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workflow-runtime-contract-conformance-implementation",
  "branch": "main",
  "baseHead": "62eb9b697",
  "lastRecordedCommit": "d90ff9df3",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Runtime_Contract_Conformance.md",
  "currentTaskId": "runtime-contract.phase6.stream6.task1",
  "expectedCommitMessage": "fix: preserve managed context in rollover envelope",
  "debt": {
    "expectedCommitMessage": "fix: preserve managed context in rollover envelope",
    "preCommitHead": "d90ff9df3",
    "stage": "commit_pending",
    "taskId": "runtime-contract.phase6.stream6.task1"
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
28. [PENDING] Git Commit: `fix: preserve managed context in rollover envelope` (hash: TBD)
29. [TODO] `runtime-contract.phase6.stream6.task2` Add forced-rollover regressions for Application Skeleton and Quality Gates midstream sessions (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.documentation-rollover.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.test.ts, src/client/project-manager/services/managed-workflow-initial-context.test.ts`; expected commit: `test: cover managed stage rollover envelope`).
30. [TODO] Git Commit: `test: cover managed stage rollover envelope` (hash: TBD)
31. [TODO] `runtime-contract.phase6.stream6.task3` Add non-managed rollover regression to prove Description and Virtual Simulation envelope behavior is unchanged (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.documentation-rollover.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler.documentation-continuation.test.ts, doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`; expected commit: `test: preserve non-managed rollover behavior`).
32. [TODO] Git Commit: `test: preserve non-managed rollover behavior` (hash: TBD)

## Phase 7 — End-To-End Regression Coverage (owner: next agent, updated: 2026-05-10)

### Stream: Managed Step Happy Paths

33. [TODO] `runtime-contract.phase7.stream7.task1` Cover Application Skeleton contract acceptance -> materialization -> managed commit -> terminal handoff happy path (scope: `packages/core/src/remote-bridge/handlers/application-skeleton-progress.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts, packages/core/src/remote-bridge/handlers/application-skeleton-materialization-validator.test.ts`; expected commit: `test: cover application skeleton managed materialization`).
34. [TODO] Git Commit: `test: cover application skeleton managed materialization` (hash: TBD)
35. [TODO] `runtime-contract.phase7.stream7.task2` Cover Quality Gates contract acceptance -> integration -> managed commit -> terminal handoff happy path (scope: `packages/core/src/remote-bridge/handlers/quality-gates-progress.test.ts, packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts, packages/core/src/templates/quality-gates-bundled-templates.test.ts`; expected commit: `test: cover quality gates managed integration`).
36. [TODO] Git Commit: `test: cover quality gates managed integration` (hash: TBD)
37. [TODO] `runtime-contract.phase7.stream7.task3` Re-run Diagram Modules happy-path regression around subturn continuation, feedback and post-turn acceptance after shared handler changes (scope: `packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.ts, packages/core/src/remote-bridge/handlers/diagram-modules-continuation-dispatcher.ts, packages/core/src/remote-bridge/handlers/diagram-modules-progress.test.ts`; expected commit: `test: preserve diagram modules managed subturns`).
38. [TODO] Git Commit: `test: preserve diagram modules managed subturns` (hash: TBD)

## Phase 8 — SSOT Sync And Targeted Verification (owner: next agent, updated: 2026-05-10)

### Stream: Documentation Sync

39. [TODO] `runtime-contract.phase8.stream8.task1` Sync accepted runtime conformance behavior into stable SSOT docs after code is implemented (scope: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`; expected commit: `docs: sync runtime conformance ssot`).
40. [TODO] Git Commit: `docs: sync runtime conformance ssot` (hash: TBD)

### Stream: Tooling Verification

41. [TODO] `runtime-contract.phase8.stream8.task2` Run targeted builds/tests for touched Core and Project Manager packages, record evidence in this plan (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record runtime conformance verification`).
42. [TODO] Git Commit: `docs: record runtime conformance verification` (hash: TBD)

## Phase 9 — Release And Acceptance (owner: next agent, updated: 2026-05-10)

### Stream: Release Build Confirmation Gate

43. [TODO] `runtime-contract.phase9.stream9.task1` Ask the user for explicit release build confirmation after implementation and verification are complete (scope: chat/process observation only; no commit required).

### Stream: Release Build

44. [TODO] `runtime-contract.phase9.stream9.task2` After explicit confirmation only, prepare release notes/version files and run release build scripts per AGENTS Release Build Checklist (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `build: release managed runtime conformance repair`).
45. [TODO] Git Commit: `build: release managed runtime conformance repair` (hash: TBD)

### Stream: User Workflow Acceptance Testing

46. [TODO] `runtime-contract.phase9.stream9.task3` User retests Diagram Modules, Application Skeleton, Quality Gates and at least one controlled managed rollover scenario on the new VSIX (scope: chat/process observation only; no commit required).

### Stream: Scope Closeout

47. [TODO] `runtime-contract.phase9.stream9.task4` After explicit user acceptance, archive this todo plan, decide disposition for the planning documents, update Docs Index if needed, and leave active plan in terminal NONE (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close managed runtime conformance repair`).
48. [TODO] Git Commit: `docs: close managed runtime conformance repair` (hash: TBD)
49. [TODO] `runtime-contract.phase9.stream9.task5` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
