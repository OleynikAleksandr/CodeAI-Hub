# Application Skeleton Phase B Orchestration

**Status:** intake (planning document, awaiting user acceptance).
**Pilot scope:** Application Skeleton stage only. Quality Gates symmetry is a separate follow-up cycle.
**Companion documents:**
- `Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md` — deferred design layer; this plan implements its Phase B preconditions for one stage.
- `Application_Skeleton_Architecture.md` — stage SSOT; updated as part of the implementation scope.
- `Archive/Diagram_Modules_Core_Orchestrated_Subturns.md` — Phase A reference pattern (subturn continuation dispatcher).
- `Archive/Managed_Workflow_Runtime_Contract_Conformance.md` — closed previous scope; Phase 10 partially shipped Application Skeleton fixes (R1/R2/R3) but did not close the Phase A vs Phase B behavioural gap surfaced by the 1.2.220 retest.

## Goal

Make the Application Skeleton stage behave correctly under the Phase A / Phase B orchestration model, so that the user sees a predictable contract-drafting loop with the agent (Phase B), then triggers materialization explicitly via a UI button (Phase 1 → Phase 2), then watches Core drive the materialization with the agent (Phase A). Each agent turn during Phase B is recorded as its own git commit by Core, so the full conversation history is reconstructable.

## Reference: Phase A vs Phase B

Two managed-stage phase types, each with its own orchestration contract.

- **Phase A** — Core ↔ Agent. Core leads the conversation, sends continuation prompts, validates artifacts at end of turn, and commits when the agent reports readiness. The user is a passive observer; their input field is blocked while a turn is in flight. Diagram Modules is the canonical Phase A example today (see Archive plan, continuation dispatcher pattern).
- **Phase B** — User ↔ Agent. The user leads the conversation; the agent responds to the user's instructions. Core does not steer content but does enforce structural correctness at end of turn (artifact format, status fields, no premature state transitions). Each completed agent turn is recorded as a git commit by Core.

A managed stage may move between Phase B and Phase A multiple times. Application Skeleton today is intended as Phase B → Phase A → (optionally Phase B again on user-requested revision).

## Diagnosis: Application Skeleton 1.2.220 Regression

Three behavioural problems were observed during the 1.2.220 user retest, all stemming from the same root cause: Application Skeleton runtime does not distinguish Phase A vs Phase B and applies Phase A rules everywhere.

**D1 — Core sends correction messages mid-turn during Phase B.**
While the agent was still drafting the contract (single turn, no user message yet), Core injected a "Core gate" hint that caused the agent to revise the artifacts immediately. The user's input field stayed blocked the entire time. Phase A allows mid-turn correction in some patterns; Phase B must not — Core should only react at end of turn, the same way Diagram Modules does, and only with one corrective message per turn.

**D2 — No per-turn autocommit during Phase B.**
Only a single commit (`docs: draft application skeleton contract`) was produced for the whole drafting phase. If the user had asked the agent for revisions inside Phase B, those turns would have left no trace in git. Phase B requires every completed agent turn to produce a managed commit, so the contract evolution is fully reconstructable.

**D3 — Acceptance is text-pattern only; no UI Accept-Contract trigger.**
The user accepted the contract by typing a phrase. Core's text recogniser caught it, but only retroactively after the agent had already started materializing. The agent treated the user message as carte blanche to leap from Phase 1 (drafting) into Phase 2 (materialization) on its own initiative. The Phase 1 → Phase 2 transition needs an explicit, unambiguous trigger that Core owns: a UI button. Text-based acceptance, if kept at all, is a fallback — never the primary path.

**D4 — No premature-materialization block.**
Because there is no explicit Phase 1 → Phase 2 trigger, nothing prevents the agent from flipping `materialized: false → true` and creating `product-parts/**` before Core has officially opened Phase 2. On 1.2.220 the agent did exactly this; Core observed the flip after the fact and recorded the plan advance retroactively, which the user described as "ядро проснулось один раз и снова уснуло." Core must reject (and revert via end-of-turn correction) any materialization attempt while the stage is still in Phase 1.

## Target Behaviour

Four orthogonal rules. Each is small enough to ship as its own implementation stream.

**T1 — End-of-turn-only correction in Phase B.**
While a managed stage is in Phase B, Core stays silent during the agent's turn. At end of turn, Core reads the artifacts; if structural rules are violated, Core sends exactly one corrective message to the agent and the next turn begins. The user's input field unlocks the same way it does after a normal Phase A turn ends. Diagram Modules' continuation dispatcher pattern is the reference; Phase B reuses the same end-of-turn hook with a different policy (no continuation prompt — Core just hands the floor back to the user).

**T2 — Per-turn autocommit in Phase B.**
Every completed agent turn in Phase B becomes a managed commit. The first turn commits as the existing draft commit (`docs: draft application skeleton contract`). Each subsequent user-driven revision creates a new micro-task pair in the managed stage's todo-plan (`docs: revise application skeleton contract — <short summary>`) and a corresponding commit. Plan-orchestrator advances `currentTaskId` after each commit, identical to Diagram Modules behaviour.

**T3 — UI Accept-Contract button as the Phase 1 → Phase 2 trigger.**
Project Manager exposes an "Accept Contract" button on the Application Skeleton stage panel, enabled only when the stage is in Phase 1 with at least one committed draft. Clicking the button calls a new Core HTTP endpoint (working name `/api/v1/orchestrator/managed-stage-accept-contract`) which:
1. Validates the stage is in Phase 1 with a committed contract;
2. Records an explicit acceptance commit (`docs: accept application skeleton contract`);
3. Opens Phase 2 by writing the next-task pointer in the managed stage todo-plan (`feat: materialize application skeleton`);
4. Dispatches the materialization continuation prompt to the agent (the Phase 10 dispatcher already exists; this trigger replaces the text-pattern recogniser as its primary input).

The text-pattern recogniser from Phase 10 stays in place as a fallback, but is gated behind a feature-flag policy decision (see Open Questions below).

**T4 — Premature-materialization block in Phase 1.**
While the stage is in Phase 1, Core's end-of-turn validator rejects any artifact change that would set `materialized: true`, create paths matching the stage's materialization scope (`product-parts/**`), or otherwise advance the stage state. The rejection is delivered as a single corrective message (T1 mechanism) telling the agent to revert the changes and wait for explicit acceptance. The block lifts the moment the UI trigger from T3 fires.

## Scope And Pilot

**In scope (this implementation cycle):** Application Skeleton stage end-to-end. T1 through T4 implemented for Application Skeleton runtime only.

**Explicitly deferred:**
- Quality Gates symmetric fix. Quality Gates is also a Phase B-then-A stage and will need the same four rules. It is deferred to a separate cycle so the Application Skeleton implementation can validate the orchestration model first without doubling the surface area.
- Diagram Modules behaviour. Diagram Modules is a Phase A stage end-to-end and does not need a Phase 1 → Phase 2 button. Its review-stream after Phase 1 (the `[IN_PROGRESS]` user-review task observed in the 1.2.220 managed plan) is a Phase B segment, but is out of scope for this cycle. If user feedback during retest indicates the symmetric fix is needed for Diagram Modules review too, it becomes its own follow-up.
- Generalised Phase Type runtime. The deferred design layer describes a fully generalised Phase A / Phase B / corrective operations runtime. This cycle ships only the Application Skeleton-specific surfaces; generalisation is a later cycle once two stages prove the model.

## Implementation Surfaces (preview, exact ≤3-file microtasks cut in implementation todo-plan)

These are anchor points for the implementation cycle, not commitments.

- **Phase A vs Phase B classifier.** A stage-id-keyed registry under `packages/core/src/remote-bridge/handlers/` that returns the active phase type for a given stage and current state (Phase 1 / Phase 2 / etc.). T1, T2, T4 all consume this.
- **Phase B end-of-turn hook.** Sibling to `diagram-modules-continuation-dispatcher.ts`; runs after every Phase B agent turn, validates artifacts, optionally emits one corrective message, never sends a continuation prompt.
- **Phase B autocommit driver.** Reuses the existing managed commit transaction; adds a per-turn microtask injector for managed stage todo-plans so each Phase B turn produces a fresh task pair before the commit.
- **UI Accept-Contract button.** New element on the Application Skeleton panel under `src/client/project-manager/components/` (exact path picked when implementation starts). Button is disabled by Phase / state predicate exposed on the existing workflow-state-client.
- **Core managed-stage-accept-contract HTTP endpoint.** New handler in `packages/core/src/remote-bridge/handlers/` registered through `http-api-router.ts`. Subsumes the responsibility of the text-pattern recogniser as the primary acceptance path.
- **Premature-materialization validator.** Sibling to `application-skeleton-materialization-validator.ts`, but enforces the inverse condition (no materialization while in Phase 1).
- **SSOT updates.** `WorkflowSteps_Overview.md` and `SystemArchitecture.md` updated with Phase A vs Phase B as first-class concepts; `Application_Skeleton_Architecture.md` documents the four rules.
- **Regression coverage.** End-to-end test exercising: draft turn → autocommit → user revision turn → autocommit → premature-materialization attempt blocked → UI accept trigger fires → Phase 2 opens → materialization commit → terminal handoff.

## Open Questions For User Discussion

1. **Quality Gates symmetry timing.** Ship Quality Gates symmetric fix immediately after Application Skeleton in the same release line (1.2.221), or split into two release lines (1.2.221 Application Skeleton, 1.2.222 Quality Gates)? Same-line is faster but doubles the regression surface; split is safer but slower.
2. **Text-pattern acceptance fallback.** Keep the Phase 10 text recogniser as a fallback when the UI button cannot be clicked (e.g. user typed acceptance before noticing the button), or remove it entirely so the only acceptance path is the button? Keeping it requires precedence rules (button always wins); removing it simplifies the contract but breaks any user habit formed on 1.2.218–1.2.220.
3. **Per-turn commit cadence vs noise.** Every completed Phase B turn commits even if it is a tiny clarification ("agent: yes, that section is final"). Should there be a minimum-content threshold (e.g. only commit if any tracked artifact changed), or commit every turn unconditionally for full reconstructability? Diagram Modules commits every continuation step, which suggests "every turn unconditionally."
4. **Diagram Modules review-stream symmetry.** The Diagram Modules managed plan ends in a `Phase 2 — User Review` stream which is structurally Phase B but currently has no per-turn autocommit and no UI trigger. Apply T1/T2 to that stream now (would expand this cycle's scope), or leave it as a known follow-up?
5. **Phase Type registry granularity.** Hard-code phase types per stage id (simple, brittle to add new stages) or read them from the stage's todo-plan metadata (flexible, requires a new field in the stage plan template)? The deferred design layer leans toward metadata-driven; this cycle could ship hard-coded and migrate later.
