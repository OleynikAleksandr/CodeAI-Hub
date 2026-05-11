# Application Skeleton Scenario

**Status:** implemented scenario, pending release/user acceptance.
**Scope:** managed orchestration behavior for the `application_skeleton` workflow step.
**Baseline source:** `Application_Skeleton_Architecture.md`.
**Implementation note:** current scope implements the incremental child-plan growth, Core rejection/repair loop, acceptance commit boundary, materialization gate, Quality Gates handoff, and post-completion user-return revision loop.

## Target Shape

Application Skeleton should follow the same incremental discipline as Diagram Modules. Core must not pre-seed a static Phase 1 / 2 / 3 / 4 block at step bootstrap. The stage plan grows from runtime decisions.

## Scenario

1. Core starts the step with one draft-contract microtask and its paired `Git Commit:`.
2. Agent writes `application-skeleton.md` and `application-skeleton-map.json`, then stops for Core.
3. Core validates the draft contract.
4. If accepted, Core commits the draft and opens the user-led contract review surface.
5. User revisions before acceptance become tracked revision microtasks with paired commits.
6. User acceptance is a Core command, not a provider instruction. The command injects an acceptance microtask and paired commit, patches tracked acceptance state, and only then creates the materialization microtask.
7. Core sends the materialization prompt only after the acceptance commit is complete.
8. Agent materializes the filesystem projection and stops for Core.
9. Core validates Markdown, JSON, and filesystem agreement.
10. If accepted, Core commits materialization, opens the post-completion user-return phase, creates the next step's active plan if needed, and advances the workspace ledger to Quality Gates Baseline.

Runtime constraints:

- the generated Application Skeleton child plan starts with only Phase 1 draft and its paired commit;
- Phase 2 review is inserted only after the draft commit;
- acceptance is committed as `docs: accept application skeleton contract` before materialization can be prompted;
- Phase 3 materialization is inserted only after the acceptance commit evidence exists in the workspace ledger;
- all managed stage child plans are present before ledger handoff, so the terminal materialization commit can switch `activeStage` to Quality Gates without a missing-plan failure.

## Correction Turns

If Core rejects draft, review, acceptance-state, or materialization output, Core must create a repair microtask before sending provider-visible feedback.

Required sequence:

1. Core detects the failure.
2. Core injects `application-skeleton.<phase>.repairN.task1`.
3. Core injects the paired `Git Commit:`.
4. Core sends the repair feedback to the agent.
5. Agent replies.
6. Core commits the attempt result.

The attempt commit must exist even when the agent failed to satisfy Core. If the agent produced no valid artifact diff, Core writes tracked attempt evidence: target, Core errors, agent response result, and the next required repair. This is mandatory so repeated attempts are recoverable from Git and the stage plan.

Implemented forced-rejection behavior:

- Core injects the repair task pair before provider-visible feedback;
- repeated invalid repair output writes `.codeai-hub/<workspaceSlug>/workflow/revisions/application-skeleton/attempts/attempt-*.json`;
- the failed attempt evidence is committed under the active repair task instead of silently leaving dirty state.

## Post-Completion User Return

After materialization is accepted, Application Skeleton remains available for later user corrections.

This post-completion phase is not a handoff anchor. It is a user-return revision loop:

- every later user request to revise Application Skeleton becomes a tracked microtask with a paired `Git Commit:`;
- the agent can update the skeleton contract and, when needed, the materialized projection;
- Core records the result as accepted changes or tracked attempt evidence;
- downstream stages may need outdated/revision propagation, but that propagation is a follow-up after this step scenario is accepted.

The open revision surface uses concrete `revisionN` task pairs. The standing user-return anchor stays available for subsequent returns, while the active concrete revision is the only `IN_PROGRESS` task at commit time.

## Handoff To Quality Gates

Handoff is a workspace lifecycle transition:

- Core creates or ensures the Quality Gates stage plan before switching `activeStage`;
- Core updates the workspace ledger after the materialization commit;
- Application Skeleton's post-completion user-return phase remains in its own stage plan and can be revisited later.

## Out Of Scope For This Scenario

- Quality Gates Baseline scenario details;
- generalized semantic approval of every user revision;
- full downstream migration planning after post-completion revisions.
