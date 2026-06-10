# Development Tree Orchestrator Stop-Gate Simplification

**Status:** Active planning source for the next implementation scope, 2026-06-10.
**Relationship to active architecture docs:** this document does not replace `DevelopmentTree_BranchWorkflow_Architecture.md` or `DevelopmentTree_ProductPartSubagentOrchestration.md`. It narrows the next implementation cycle to blocker audit and simplification.

## 1. Problem

Recent Development Tree testing exposed a repeated workflow failure pattern: Core correctly detects non-ideal intermediate state, but then turns it into a user-facing stop even when the problem is technical and recoverable.

The visible symptoms are:

- managed steps stop on dirty Git instead of committing workflow-owned changes;
- Core emits "cannot continue" messages for stage-plan or commit-boundary problems that the user cannot reasonably fix from chat;
- Project Manager sometimes keeps the input locked with an "agent is working" state after Core has already reached a user/action gate;
- validators reject usable agent-readable artifacts because of formal shape issues that do not yet affect generated code or the next agent's ability to continue.

This makes the script orchestrator behave like an over-strict gatekeeper. The goal is not to remove Core authority. The goal is to keep only blockers that protect final product correctness, Git safety, or irreversible user intent.

## 2. New Principle

Core stop-gates are allowed only when continuing would materially risk one of these outcomes:

1. loss of user-authored work or an ambiguous overwrite;
2. a Git operation that cannot be safely completed or rolled back;
3. starting the next agent with missing machine-readable inputs that Core actually needs;
4. merging code or artifacts that fail required quality gates;
5. irreversible workflow/refactoring intent that requires explicit user choice.

Everything else should be handled by Core as automation:

- workflow-owned dirty Git is committed automatically at the step boundary;
- harmless residual docs are committed or classified without asking the user;
- non-critical artifact shape issues become warnings or repair prompts, not hard stops;
- agent-readable prose that is imperfect but usable is accepted;
- managed plan/commit bookkeeping is repaired by Core or by a targeted internal repair prompt;
- UI locks are released whenever the provider turn is no longer running.

## 3. Initial Blocker Audit

### Dirty Git Boundaries

Current risk:

- `packages/core/src/workflow/boundary/workflow-step-commit-facade.ts` commits accepted runtime capsule paths and neutral documents, then throws if any dirty paths remain.
- Managed stage controllers for Diagram Modules, Application Skeleton, and Quality Gates can convert commit-boundary failures into user-visible "Core cannot continue" messages.
- Quality Gates testing showed this exact stop with `scripts/quality-gates/ci-restore.mjs` and `scripts/quality-gates/dependency-direction.mjs`.

Decision:

- Dirty Git created by the active managed step is not a user gate.
- Core must attempt a deterministic commit for step-owned changes before asking the user anything.
- The user should only be asked when dirty files are outside the active workflow ownership boundary and would be overwritten, deleted, or merged ambiguously.

### Artifact Validators

Current risk:

- Core validators sometimes require exact JSON/prose shape even when the next consumer is another agent and not Core code.
- Cluster contract validation already showed repeated repair loops around missing formal fields.

Decision:

- Hard validation is reserved for fields Core reads to compute the next workflow action.
- Agent-readable artifact quality should be warnings or revision prompts unless it prevents the next step.
- When a lower-level agent receives insufficient contract seed information, the correct blocker is a semantic question/revision request, not a schema-format rejection.

### Managed Plan And Commit State

Current risk:

- Stage-plan debt and expected-commit mismatches can stop the user-facing workflow even though the user cannot resolve them directly.

Decision:

- Core must repair managed plan state when the safe transition can be inferred from Git and the plan state.
- If inference is unsafe, the user-facing message must be actionable and the input must not remain locked as if an agent is still running.

### Project Manager Locks

Current risk:

- A Core/system gate can leave Project Manager in a provider-working visual state.

Decision:

- `Agent is working` is valid only during an active provider/native turn.
- Core validation, waiting for user acceptance, repair prompt readiness, and blocked bookkeeping states must release the input and render the actual available action.

## 4. Implementation Direction

The next implementation cycle should proceed in this order:

1. audit all current hard blockers in managed workflow controllers, boundary commit code, Development Tree sub-agent flow, and Project Manager lock handling;
2. classify each blocker as `keep`, `auto-fix`, `warning`, or `repair-prompt`;
3. implement dirty Git auto-commit for workflow-owned changes first, because it caused the current Quality Gates stop;
4. downgrade non-critical artifact/schema validators after identifying which fields Core actually reads;
5. fix UI lock semantics so every Core gate leaves the panel in a truthful state;
6. add regression tests around Quality Gates restart, Product Part/Cluster sub-agent flow, projected worktree sessions, and clear/undo rebootstrap.

## 5. Non-Goals

- Do not remove Git-first workflow truth.
- Do not replace Core with a conversational top-level agent.
- Do not accept generated production code that fails quality gates.
- Do not weaken irreversible refactoring or deletion confirmations.
- Do not remove node-level Clear/Undo semantics.

## 6. Required References

- `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
