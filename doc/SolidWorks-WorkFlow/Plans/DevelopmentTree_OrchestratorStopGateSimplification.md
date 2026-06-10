# Development Tree Orchestrator Stop-Gate Simplification

**Status:** Active planning source for the current implementation scope. No-stop dual-outcome policy accepted by the user on 2026-06-10.
**Relationship to active architecture docs:** this document does not replace `DevelopmentTree_BranchWorkflow_Architecture.md` or `DevelopmentTree_ProductPartSubagentOrchestration.md`. It narrows the current implementation cycle to blocker elimination.

## 1. Problem

Recent Development Tree testing exposed a repeated workflow failure pattern: Core correctly detects non-ideal intermediate state, but then turns it into a development stop even when the problem is technical and recoverable.

The visible symptoms are:

- managed steps stop on dirty Git instead of committing workflow-owned changes;
- Core emits "cannot continue" messages for stage-plan or commit-boundary problems that the user cannot reasonably fix from chat;
- Core writes messages that are addressed to nobody: not sent to the agent, and carrying no instruction the user could follow;
- Project Manager sometimes keeps the input locked with an "agent is working" state after Core has already reached a user/action gate;
- validators reject usable agent-readable artifacts because of formal shape issues that do not yet affect generated code or the next agent's ability to continue;
- a code audit additionally found silent stop paths where errors are swallowed and the turn settles without sending anything to the agent and without any user-visible state at all.

This makes the script orchestrator behave like an over-strict gatekeeper. The goal is not to remove Core authority. The goal is to make a development stop without an attached action impossible.

## 2. Accepted Policy: No-Stop Dual Outcome

Every Core settlement of a managed turn, validation, commit boundary, or internal error must end in exactly one of two outcomes:

1. **Agent dispatch (~99% of cases).** A repair or continuation prompt is sent to the agent with full inline context: what is broken, where, and what exactly to fix. The cycle continues without the user.
2. **Button gate (~1% of cases).** A concrete user action rendered as a button (such as the existing review confirmation). Never a free-text explanation of a problem.

An informational message that stops development without an attached action is a defect in every case. The legacy "Core cannot continue" card class is removed entirely.

Outcome selection hierarchy:

1. **Silent self-repair first.** Core fixes deterministically what it can fix (auto-commit, retry, reconciliation) without emitting anything.
2. **Agent dispatch second.** Anything Core cannot fix deterministically becomes an instruction to the agent.
3. **Button gate last.** Reserved for user acceptance/confirmation of agent work, irreversible intent (Clear/Undo, refactoring deletions), provider unavailability, and repair-limit exhaustion on Core-required machine fields.

It is explicitly accepted that Core may commit or let pass an imperfection that will be fixed later. Missing a recoverable error is cheaper than stopping development in a state the user cannot continue from.

### 2.1. Dirty Git is eliminated as a stop class

`git commit` is a preserving operation: it cannot lose work. Only rollback operations (`reset --hard`, `checkout`, `clean`) can. Therefore:

- Dirty Git is never a user stop and never a user question, on any boundary (stage start, accepted-step commit, terminal boundary, before rollback).
- Core always auto-commits with **two-basket classification**: workflow/step-owned paths go into the managed step commit; everything else (unclassified, possibly user-authored) goes into a separate `chore: preserve workspace changes` commit. The separate basket keeps step rollback from ever carrying away user work and keeps history revertable per-concern.
- Every destructive operation (workflow rollback, Clear/Undo) is preceded by an auto-commit of the current tree, so losing uncommitted work becomes impossible by construction.
- The only remaining git-related failure is a physically broken repository operation (for example a stale `index.lock` that survives retries). That is handled by the hierarchy like everything else: retry silently, then dispatch the agent to repair the repository state, and only as a last resort raise a button gate.

### 2.2. Bounded repair loops

An endless repair loop is a hidden stop. Repair dispatch attempts per artifact are limited (3). On exhaustion:

- **agent-readable artifacts** are accepted with a recorded warning in the managed plan, and the workflow continues ("fix it later" is the accepted trade-off);
- **Core-required machine fields** (the fields Core must read to compute the next workflow action) raise a button gate: retry repair / continue as is / roll back the step.

The repair-limit gate must obey the dual outcome itself (2026-06-10 FinderWidget retest defect: Confirm on the gate produced no continuation because the stage plan still sat on the open repair task and every review handler declined). Implemented behavior: a managed-stage repair-limit dispatcher runs ahead of the per-stage review handlers whenever the stage plan points at a repair attempt above the limit. Confirm = accept-as-is (auto-commit residue, close the open repair task with an accepted-as-is disposition, advance the stage plan to the next phase task, commit the managed ledger, dispatch the continuation). Revision text = a user-corrections repair prompt executing the already-open repair attempt. An unmatched review confirmation appends a released-input Core message instead of ending as a silent session error.

### 2.3. Validation pressure matches the consumer

- Hard validation (agent dispatch, bounded) is reserved for fields Core reads to compute the next workflow action.
- Agent-readable prose, naming polish, and recoverable detail gaps become warnings recorded in the managed plan while the workflow continues, or revision prompts to the agent. They are never rendered as stopping cards.
- When a lower-level agent receives insufficient contract seed information, the correct outcome is a semantic question/revision request routed through the normal session, not a schema-format rejection.

### 2.4. Honest exceptions

- **Provider unavailable / authentication failure:** the agent physically cannot receive a dispatch. This is the one case where the first outcome is impossible, and it must still be rendered as a button gate (retry / switch provider / re-authenticate), never as text-only.
- **User review gates** (artifact acceptance) are the legitimate planned button gates and remain unchanged.

## 3. Audited Stop Classes

### Class A: silent stops (no message anywhere)

Found by the 2026-06-10 code audit. These violate the dual-outcome invariant in the most severe way: the turn settles, the agent receives nothing, the user sees nothing.

- fire-and-forget agent continuation dispatch swallows send failures (`managed-internal-continuation-dispatch`), so a failed repair prompt send is invisible;
- managed turn-completion handler failures in the provider event router are logged as warnings and the turn settles, losing the prepared repair dispatch;
- quality gates `repair_integration`/`repair_verification` decisions can settle without dispatching the prepared repair prompt;
- unprotected managed plan parsing (`parseStateBlock`) and file I/O in Development Tree turn controllers crash the handler with no resulting message;
- `ensureBoundary`/`commitAcceptedStep` call sites in session handlers let dirty-git errors escape as unhandled exceptions.

Required behavior: dispatch delivery is awaited and failure-handled; any exception on the turn-completion path is converted into an agent repair dispatch (or button gate when dispatch is impossible).

### Class B: stop cards without an action

`plan_mismatch`, `invalid_decision`, `commit_failed`, and similar bookkeeping failures currently produce "Core cannot continue" cards. The user cannot act on them. Required behavior: Core repairs managed plan state when Git plus managed state make the safe transition inferable; otherwise the repair becomes an agent dispatch. The card class is removed.

### Class C: unbounded loops

Repair attempt counters grow without a limit, and terminal residue auto-commit retries are fixed-count without degradation. Required behavior: bounded attempts with the degradation rules from section 2.2.

### Class D: stale UI locks

- a local managed-review pending lock has no expiry, so a lost Core ack blocks input forever;
- unlock events are filtered by a known-reason list, so an unknown reason silently keeps the lock;
- the managed turn-completion arbitration has no time box, so a hung handler holds "agent is working" indefinitely.

Required behavior: `Agent is working` is derived only from an active provider/native turn; pending locks expire; `active: false` unlocks regardless of reason; arbitration is time-boxed; lock state reconciles from Core snapshots on reconnect.

## 4. Stop-Gate Outcome Matrix

Target outcome vocabulary: `auto` (silent self-repair), `agent-dispatch` (repair/continuation prompt), `button-gate` (concrete user action). There is no "informational stop" category.

| Surface | Legacy hard stop | Target outcome | Required behavior |
| --- | --- | --- | --- |
| `WorkflowBoundaryFacade.ensureBoundary` | Dirty Git before a pre-step rollback anchor throws | `auto` | Two-basket auto-commit (step commit + preserve commit), then create the boundary. No user stop for any dirty state. |
| `WorkflowStepCommitFacade.commitAcceptedStep` | Throws if dirty paths remain after the accepted-step commit | `auto` | Commit step-owned paths into the step commit; commit the rest as `chore: preserve workspace changes`. |
| `ensureManagedTerminalGitClean` | Unclassified residue becomes "choose how to handle files" | `auto` | Same two-basket auto-commit; the unclassified-blocker message is removed. |
| Boundary git `index.lock` exhaustion | Text error asking the user to remove the lock | `agent-dispatch`, then `button-gate` | Retry silently; dispatch the agent to repair repository state; gate only if the agent cannot. |
| Diagram/Application/Quality stage plan controllers | `plan_mismatch`, `invalid_decision`, `commit_failed` become "Core cannot continue" cards | `auto`, then `agent-dispatch` | Repair the stage plan when inferable from Git + managed state; otherwise dispatch the agent with the bookkeeping repair instruction. Cards removed. |
| `session-request-handler-managed-workflow-turn` settle paths | Settles with a validation message or with nothing | `agent-dispatch` | Every non-review `nextAction` dispatches its prepared repair prompt. Settling without dispatch is allowed only when a user review gate was opened. |
| Managed continuation dispatch | Fire-and-forget, errors swallowed | `agent-dispatch` (delivery guaranteed) | Await sends; on failure retry, then surface a button gate (retry / switch provider). |
| Turn controllers plan parsing (`parseStateBlock`, file I/O) | Unhandled crash, dialog hangs | `auto`, then `agent-dispatch` | Re-bootstrap or repair plan state deterministically; otherwise dispatch the agent; never crash silently. |
| Artifact validators (managed + Development Tree contracts) | Formal shape issues block review and loop repairs | split per section 2.3 | Core-required machine fields: bounded agent dispatch. Prose/recoverable detail: warning + continue, or revision prompt. |
| Repair loops | Unbounded attempts | bounded + degradation | Section 2.2 rules. |
| Product Part order-plan review | Acceptance blocked by missing/no staged changes or invalid machine JSON | `auto` / `agent-dispatch` / `button-gate` | Auto-reconcile materialized acceptance; machine JSON repairs are bounded agent dispatches; gates only per section 2.2/2.4. |
| Cluster contract turn controller | Missing formal JSON fields send repair loop / block review | `agent-dispatch` (bounded) | Hard fields are only those Core needs to unlock the next module wave: node identity, facade identity, method boundary, input/output type names, module boundary ids. Everything else: warning/revision. |
| Project Manager dialog controller | Managed review click can lock input forever | fix UI state (Class D) | Pending lock expires; unlock on `active: false` regardless of reason; arbitration time-boxed; reconcile on reconnect. |
| Attached worktree runtime events | Missing attachment freezes the dialog until sidebar toggle | keep as hard integration invariant | Core attaches all created worktree roots to the main workspace observation graph at bootstrap/reconciliation. Not a user gate. |
| Provider failure (timeout, stream break, auth) | `session:error` broadcast, possibly without an action | `auto`, then `button-gate` | Retry/recover silently where possible; otherwise a button gate (retry / switch provider / re-authenticate). |
| `scripts/plan-orchestrator` commit scope | Developer plan commits reject out-of-scope files | keep | This guard protects this repository's own development process and is separate from product workflow stop-gates. Do not weaken it. |

## 5. Immediate Fix Order

1. Dirty Git elimination (two-basket auto-commit) at all managed boundaries, because it currently stops the user with files Core can preserve and commit.
2. Silent stop elimination: guaranteed continuation delivery, repair dispatch on settled turns, error containment around boundary calls and plan parsing.
3. Managed plan state auto-repair and removal of the "Core cannot continue" card class.
4. Bounded repair loops with accept-with-warning degradation.
5. Validator severity split (managed validators, then Development Tree contracts).
6. UI lock truthfulness: expiry, reason-agnostic unlock, time-boxed arbitration, reconnect reconciliation.
7. Documentation sync into the two active Development Tree planning documents and Core/Project Manager SSOT documents.

## 6. Button Gates That Remain Valid

The simplification does not mean "no user gates." These button gates remain valid — each is a concrete action, never a text-only stop:

- user review/acceptance of agent-produced artifacts (the planned review gates, including `Подтверждаю`);
- Clear/Undo or refactoring that would delete a node/session/worktree not derivable from accepted upstream truth (explicit confirmation);
- provider credentials/session authentication failures with no local recovery path (retry / switch provider / re-authenticate);
- repair-limit exhaustion on Core-required machine fields (retry repair / continue as is / roll back step);
- a Git repository operation that stays broken after silent retries and an agent repair dispatch.

Notably removed from the legacy list:

- "merge or release quality gates fail" is an agent dispatch (fixing gate failures is agent work), not a stop;
- "Core cannot identify which user-authored file would be overwritten" is eliminated by the preserve commit: Core never needs to identify ownership to keep work safe.

## 7. Non-Goals

- Do not remove Git-first workflow truth.
- Do not replace Core with a conversational top-level agent.
- Do not merge or release generated production code that fails required quality gates (the agent must fix it; the merge gate itself stays).
- Do not weaken irreversible refactoring or deletion confirmations.
- Do not remove node-level Clear/Undo semantics.
- Do not weaken the `scripts/plan-orchestrator` development-process commit scope guard.

## 8. Required References

- `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_ProductPartSubagentOrchestration.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
