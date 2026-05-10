# Application Skeleton Phase B Orchestration

**Status:** intake (planning document, awaiting user acceptance).
**Pilot scope:** Application Skeleton stage only. Quality Gates symmetry, Diagram Modules review-stream symmetry, generalized Phase Type runtime — separate follow-up cycles.
**Companion documents:**
- `Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md` — deferred design layer; this plan implements its Phase B preconditions for one stage with explicit A/B framing.
- `Application_Skeleton_Architecture.md` — stage SSOT; updated as part of the implementation scope.
- `Archive/Diagram_Modules_Core_Orchestrated_Subturns.md` — Phase A reference pattern (subturn continuation dispatcher).
- `Archive/Managed_Workflow_Runtime_Contract_Conformance.md` — closed previous scope; Phase 10 partially shipped Application Skeleton fixes (R1/R2/R3) but did not close the Phase A vs Phase B behavioural gap surfaced by the 1.2.220 retest.

## Goal

Application Skeleton stage runs as an explicit `A → B → A` sequence. Core accepts the initial contract by structure first, so the user receives a Core-clean draft for review. The user then leads the contract review (Phase B), and when the user explicitly accepts the contract, Core opens materialization and leads the agent through it (Phase A). No "hybrid Phase B" framing, no mid-turn provider correction from filesystem/read-model observation alone, and acceptance is a Core-owned command — never a UI/read-model side-effect.

## Reference: Phase A vs Phase B

Two managed-stage orchestration types, each with its own contract.

- **Phase A — Core ↔ Agent.** Core leads the conversation, sends continuation prompts, validates artifacts at end of turn, and commits when the agent reports readiness. The user is a passive observer; their input field is locked while a turn is in flight. Diagram Modules is the canonical Phase A example today.
- **Phase B — User ↔ Agent.** The user leads the conversation; the agent responds to the user's instructions. Core does not steer content. Core enforces structural correctness at end of turn (artifact format, status fields, no premature state transitions) via a single corrective turn when needed. Per-revision autocommit applies only to artifact-changing revisions; pure discussion turns are recorded in audit/history without Git commits.

## Application Skeleton Target Model

```text
Phase 1A — Core-gated initial contract draft     (Type A, Core-led)
Phase 1B — User-led contract review              (Type B, user-led, Core structural guard)
Phase 2  — Core-led materialization              (Type A, Core-led)
```

Optional later follow-up: post-materialization user correction phase that returns the stage to a Phase B segment for additional contract revisions. Out of scope for this cycle; documented in the deferred design layer for the future generalized runtime.

## Diagnosis: Application Skeleton 1.2.220 Regression

Four behavioural problems were observed during the 1.2.220 user retest. All four trace to the same root cause: Application Skeleton runtime does not differentiate Phase 1A / Phase 1B / Phase 2 and applies a single hybrid policy everywhere.

**D1 — Mid-turn provider-visible correction from read-model observation.** While the agent was still drafting the contract (single uninterrupted turn, no user message yet), Core injected a "Core gate" hint that caused the agent to revise the artifacts immediately. The user's input field stayed locked the entire time. Phase 1A allows correction, but only after readiness and provider terminal event — not from filesystem/read-model observation alone. Phase 1B has the same restriction.

**D2 — No per-revision autocommit during user review.** Only a single commit (`docs: draft application skeleton contract`) was produced. If the user had requested revisions inside what is now Phase 1B, those turns would have left no trace in git. Phase 1B requires every artifact-changing revision accepted by Core's structural guard to produce a managed commit. Pure discussion turns produce no Git commit and live in audit/history.

**D3 — Acceptance is text-pattern only; no UI Accept-Contract command.** The user accepted the contract by typing a phrase. Core's text-pattern recogniser caught it, but only retroactively after the agent had already started materializing. The agent treated the user message as carte blanche to leap from Phase 1 into Phase 2. The Phase 1B → Phase 2 transition needs an explicit, unambiguous Core-owned command. The Project Manager UI button is the primary command surface; typed acceptance, if kept, is a secondary headless fallback through the same Core command handler.

**D4 — No premature-materialization block.** Because there is no explicit Phase 1B → Phase 2 trigger, nothing prevents the agent from flipping `materialized: false → true`, creating production scaffold/`product-parts/**`, or otherwise advancing stage state before Core has officially opened Phase 2. On 1.2.220 the agent did exactly this; Core observed the flip after the fact and recorded the plan advance retroactively. Core must reject any materialization-scope change while the stage is still in Phase 1A or Phase 1B, and the rejection must be delivered at the readiness + terminal boundary (not mid-turn).

## Critical Rule: Observe vs Dispatch

This rule applies to both Phase 1A and Phase 1B and is the single largest behavioural change from the 1.2.220 runtime.

> Core may observe artifact changes and prepare diagnostics during the turn, but must not dispatch provider-visible correction from filesystem/read-model observation alone. Provider-visible correction is allowed only after both content readiness and provider terminal event.

Diagram Modules already obeys this rule (see `Archive/Diagram_Modules_Core_Orchestrated_Subturns.md`). Application Skeleton does not, and that is the proximate cause of D1.

## Target Behaviour

Five orthogonal rules. Each is small enough to ship as its own implementation stream.

**T1 — Phase 1A Core-gated initial contract draft.** Trigger: user clicks `Start Application Skeleton`. Core runs the Application Skeleton agent with the brief to produce the initial contract artifacts (`application-skeleton.md`, `application-skeleton-map.json`). The user does not chat with the agent during Phase 1A; input is locked. The agent writes the draft and stops with readiness/content-ready. Core validates only after readiness plus provider terminal event (Observe-vs-Dispatch rule). If the draft is structurally invalid, Core dispatches one corrective turn to the agent; input remains locked; the agent fixes only the contract; the cycle repeats. When the draft is structurally valid, Core makes the managed draft commit (`docs: draft application skeleton contract`), transitions the stage to Phase 1B, and unlocks user input.

**T2 — Phase 1B user-led review with Core structural guard.** Trigger: Phase 1A produced a Core-clean draft. User reads the contract. User may request revisions, ask clarifying questions, change stack/structure/assumptions, or accept the contract as-is. The agent responds to the user; the agent edits the contract only when the user requests changes. Core does not steer content and does not dispatch a continuation prompt of its own initiative. Core validates artifact-changing revisions only after readiness plus provider terminal event. Outcomes per turn:
- *artifact-changing revision, structurally valid* → managed commit `docs: revise application skeleton contract — <short summary>` and control returns to user;
- *artifact-changing revision, structurally invalid* → one corrective turn to the agent (input locked until repair), then re-validate and commit the clean revision;
- *pure discussion / no-op turn* → recorded in session history and audit stream, no Git commit, control returns to user.

Phase 1B exits only via the explicit Core-owned acceptance command (T3).

**T3 — Explicit Accept Contract command.** Project Manager exposes an `Accept Contract` button on the Application Skeleton stage panel. The button is a *command surface*; the HTTP endpoint (working name `/api/v1/orchestrator/managed-stage-accept-contract`) is *transport only*; the *decision* lives in a single Core command handler. Read-model and UI polling paths are side-effect free. The command is valid only when:
- the stage is in Phase 1B and acceptance-eligible;
- a committed Core-clean contract draft exists;
- the latest artifact-changing revision (if any) has been accepted by Core's structural guard;
- there are no owned dirty changes and no out-of-owner dirty blockers;
- Core is not currently executing an agent / correction / materialization turn;
- workspace/plan is not in `BLOCKED` or open `debt` state.

Button disabled state mirrors these preconditions in PM (read-model only — no decision logic). Typed acceptance fallback is allowed but routes through the same Core command handler, is gated to Phase 1B acceptance-eligible state only, must not be delivered to the provider as a regular user message, and must not fire in Phase 1A.

**T4 — Phase 2 Core-led materialization.** Trigger: T3 acceptance command succeeds. Core opens Phase 2 inside the same managed transaction that records acceptance (see Acceptance Commit Policy below). Core dispatches the materialization continuation prompt (existing `application-skeleton-continuation-dispatcher.ts`; see Existing Code Inventory). The agent materializes only the Application Skeleton-owned materialization scope: production scaffold/root files, mapping/projection files, `product-parts/**` subset declared by the skeleton map, and `application-skeleton-map.json` status/progress fields. Core validates materialization, commits `feat: materialize application skeleton`, and advances the stage.

**T5 — Premature materialization block (Phase 1A and Phase 1B, before T3).** Core's structural guard rejects any of the following before the T3 acceptance command fires:
- `materialized: false → true`;
- creation/modification of production scaffold or root files declared as materialization-owned by the skeleton map;
- creation/modification of downstream Development Tree materialization paths;
- creation/modification of `product-parts/**` paths declared as materialization-owned (vs paths that are part of the contract draft itself);
- changes to progress/unlock state that effectively open Phase 2;
- any path inside the materialization-owned scope derived from skeleton map / stage ownership.

The block scope is *derived from the skeleton map and stage ownership at validation time*, not a hardcoded glob. Rejection is delivered at the readiness + terminal boundary as a single corrective turn (Observe-vs-Dispatch rule). The block lifts the moment the T3 command succeeds.

## Acceptance Commit Policy

The T3 acceptance command must produce one of these two outcomes — not a no-op Git commit and not a manual edit of machine-owned `todo-plan.md`:

- **Option A — owned-diff commit.** The acceptance commit (`docs: accept application skeleton contract`) carries an explicitly owned diff: an acceptance marker in a managed stage artifact (e.g. `accepted: true` plus `acceptedAt` timestamp in `application-skeleton-map.json`, or a dedicated acceptance audit record under the existing managed audit stream). Plan-orchestrator advance follows in the post-commit hook as usual.
- **Option B — fold acceptance into Phase 2 transition transaction.** No separate acceptance commit. The T3 handler records acceptance internally, opens Phase 2 by dispatching the materialization continuation prompt, and the next managed commit is `feat: materialize application skeleton` with a side-effect-free header that records "acceptance recorded at <timestamp> by <command source>" inside the managed audit stream.

The choice between A and B is one of the Open Questions below. Either choice is implementable; the document reserves the decision for user direction.

## Existing Code Inventory (verified)

Snapshot of relevant Application Skeleton runtime as of `694efceeb`:

- `application-skeleton-continuation-dispatcher.ts` — **Phase 2 materialization continuation dispatcher only.** Gates on `progress.substep === "awaiting_acceptance" || "accepted"` plus `!progress.materialized` plus session presence in `recentlyAcceptedSessions`. A Phase 1A corrective dispatcher does **not** exist; it is a new file in this scope.
- `managed-workflow-post-turn-service.ts` — owns the Phase 10 broadened text-pattern acceptance recogniser (`recognizeManagedContractAcceptancePhrase`) and writes session ids into `recentlyAcceptedSessions`. The new T3 command handler must populate the same marker to reuse the existing Phase 2 dispatcher.
- `application-skeleton-progress.ts` — observes `application-skeleton-map.json` and reports progress. Will be consumed by the new Phase 1A/1B structural guards.
- `application-skeleton-materialization-validator.ts` — validates the materialization commit boundary. Will be consumed by T5; the inverse (premature-materialization rejection) is a new sibling validator.
- `workflow-state-managed-documentation-commit.ts` — owns the managed commit boundary for Application Skeleton. T2 per-revision autocommit reuses this path with a microtask injector for managed stage todo-plan revisions.
- `session-request-handler-message-dispatch.ts` — current entry point for typed acceptance dispatch. T3 routing must classify text-pattern matches as commands (not provider messages) and route them through the same Core command handler as the UI button.

## Implementation Surfaces (preview)

Anchor points for the implementation cycle, not commitments. Exact ≤3-file microtask carving happens in the implementation todo-plan after this planning doc is accepted.

- Phase A / Phase B classifier registry (stage id + current sub-phase → phase type).
- Phase 1A post-turn structural guard (consumes Observe-vs-Dispatch rule).
- Phase 1A corrective dispatcher (new file, sibling to existing materialization dispatcher).
- Phase 1B post-turn structural guard with revision-vs-discussion classifier (artifact diff present?).
- Phase 1B per-revision autocommit driver (managed stage todo-plan microtask injector + reuse of existing managed commit transaction).
- Core acceptance command handler (single decision point; UI button transport and text-pattern fallback both route through it).
- UI Accept Contract button on Application Skeleton stage panel (read-model preconditions only).
- Core HTTP endpoint as transport only (`/api/v1/orchestrator/managed-stage-accept-contract`).
- Premature-materialization validator (scope derived from skeleton map + stage ownership).
- Acceptance commit policy enforcement (Option A or Option B per user decision).
- SSOT updates: `WorkflowSteps_Overview.md`, `SystemArchitecture.md`, `Application_Skeleton_Architecture.md` document Phase 1A / 1B / 2 model and the five rules.
- Regression coverage: end-to-end test exercising draft → autocommit → user revision (artifact-changing) → autocommit → discussion turn (no commit) → premature materialization attempt blocked → T3 command fires → Phase 2 opens → materialization commit → terminal handoff.

## Out Of Scope (explicit)

This cycle is an Application Skeleton-specific pilot. The following are not implemented here:

- Quality Gates symmetric fix.
- Diagram Modules review-stream Phase B symmetry.
- Generalized Phase Type runtime (per-stage phase type read from stage metadata).
- Universal final correction phase for all managed steps.
- Full Type B candidate microtask lifecycle from the deferred design layer.
- Post-materialization optional Phase B return-to-review.

The pilot uses the minimum Application Skeleton-specific mechanism for each rule. Generalization happens in a later cycle once the pilot proves the model.

## Open Questions For User Discussion

1. **Quality Gates timing.** Ship Quality Gates symmetric fix immediately after Application Skeleton in the same release line (1.2.221) or split across release lines (1.2.221 Application Skeleton, 1.2.222 Quality Gates)?
2. **Text-pattern acceptance fallback.** Keep typed-acceptance fallback as a headless secondary path through the same Core command handler, or remove it entirely and make the UI button the only acceptance surface? Keeping it requires precedence rules (button always wins) and precise message classification so the typed phrase never reaches the provider as a regular user message.
3. **No-op vs revision classifier.** Define "artifact-changing" by tracked artifact diff (any diff = revision, no diff = discussion), or by something stricter (e.g. structural change to schema fields, ignoring whitespace/comment edits)? Diff-based is simple but counts cosmetic edits as revisions.
4. **Diagram Modules review-stream symmetry.** Apply T1/T2 to the Diagram Modules `Phase 2 — User Review` stream now (would expand this cycle's scope) or split into a separate follow-up cycle?
5. **Phase Type registry granularity.** Hard-code phase type per stage id and sub-phase (simple, brittle to add new stages) or read from stage todo-plan metadata (flexible, requires a new field in stage plan template)? The deferred design layer prefers metadata; the pilot can ship hard-coded and migrate later.
6. **Acceptance commit policy.** Choose Option A (owned-diff `docs: accept application skeleton contract` commit with acceptance marker in artifact) or Option B (fold acceptance into Phase 2 transition transaction with no separate commit)? Option A is more transparent in git history; Option B has fewer commits and avoids the acceptance-marker schema change.
7. **Phase 1A corrective dispatcher pattern.** Implement Phase 1A corrective dispatcher as a separate new file (clear separation, two dispatchers to maintain) or extend the existing `application-skeleton-continuation-dispatcher.ts` with a `policy: "phase1a-correction" | "phase2-materialization"` parameter (single dispatcher, slightly larger file approaching the architecture warn zone)?
