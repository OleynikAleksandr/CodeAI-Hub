# Managed Workspace Lifecycle

**Status:** Active contract
**Created:** 2026-05-07
**Owner:** Oleksandr + Codex

## 1. Boundary

`Diagram Modules` is the first managed-mode boundary of a user workspace.

Before Core creates the provider session for `Diagram Modules`, it must initialize or validate the managed lifecycle:

- Git repo exists or is created with `git init`;
- `doc/TODO/todo-plan.md` exists and is the recovery owner;
- Plan Orchestrator scripts or stack-neutral shims exist;
- minimal hooks exist for plan validation, commit message validation, post-commit state advancement, branch/debt checks, and push blockers;
- tracked workflow control plane exists under `.codeai-hub/workflow`;
- machine runtime folders are ignored: `.codeai-hub/runtime`, `.codeai-hub/logs`, `.codeai-hub/cache`.

If this baseline is missing or blocked, Core must not start long filesystem agent work.

## 2. Ownership

Core owns lifecycle infrastructure:

- bootstrap and repair;
- hook installation and deterministic regeneration;
- workflow artifact validation;
- lifecycle blocker/debt reporting;
- stage gates;
- revision snapshots and downstream migration task generation.

Agents own semantic work only:

- stage artifacts and decisions;
- accepted skeleton files;
- Quality Gates gate content and manifest.

Agents must not become owners of Git, hooks, Plan Orchestrator scripts, or lifecycle repair.

## 3. Upstream Freeze

After managed `Diagram Modules` starts:

- `Description` and `Virtual Simulation` artifacts stay viewable;
- historical sessions stay readable;
- new messages into those agents are blocked;
- direct upstream artifact mutation is blocked.

Product-level changes after this boundary must route through a `Diagram Modules` revision. Hard reset/new workflow is a separate explicit product action.

## 4. Recovery

Primary recovery for managed stages is:

1. read `doc/TODO/todo-plan.md`;
2. run `plan:status`;
3. read only the active plan Context Pack;
4. continue the current task.

Provider native compact is fallback only. It must not replace the product-owned recovery path.

## 5. Quality Gates

At `Diagram Modules` start, hooks are lifecycle-minimal and stack-neutral.

`Quality Gates Baseline` may create stack-specific scripts/configs/manifests after acceptance. Core validates the manifest and uses the Hook Registry to regenerate hook wiring. Agents must not hand-edit hook structure as the source of truth.

After integrated Quality Gates, Core unlocks Development Tree read model but does not automatically start all branch agents. Product Part / Cluster / Module nodes are startable units. A node Start command must validate clean Git and the materialized node folder, persist/use the selected provider/model/reasoning defaults, create only that node's draft artifacts, and create only that node's workflow session.

## 6. Agent Acceptance Feedback

Core acceptance is an active loop, not a passive lock.

When a managed stage agent commits work, Core must verify the actual workspace
result against the stage contract before unlocking downstream work. This applies
to every managed trunk stage that participates in the plan/commit lifecycle:

- `Diagram Modules`: planned Product Parts must resolve to valid generated
  Product Part artifacts, and `blocked_ambiguity` must be resolved in the
  owning session.
- `Application Skeleton`: `application-skeleton-map.json` flags are not enough;
  declared production `codePath` and `materializedPaths` must exist and match
  the accepted skeleton lifecycle state.
- `Quality Gates Baseline`: `quality-gates.json` flags are not enough; required
  gates must be wired into lifecycle hooks and the managed plan transaction must
  be accepted.

If acceptance fails, Core must:

- keep downstream stages blocked;
- send the validation result back into the owning workflow session;
- include the concrete failed checks, the observed Core check context, and a
  repair request;
- avoid duplicate feedback for the same session/error set on the same workspace
  commit, including concurrent workflow-state reads that observe the same
  failing commit before the first feedback delivery finishes;
- resend feedback after a new agent repair commit if the same validation still
  fails, because that represents a new failed acceptance attempt;
- re-run acceptance on the next workflow state read after the agent repairs and
  commits the stage.

Core must reserve the feedback signature before awaiting provider/session
delivery. If delivery fails, the reservation is released so the next state read
can retry the same acceptance feedback.

The user should not have to infer the blocker from a locked next stage. The
same agent that produced the incomplete stage result must receive the Core
acceptance feedback and continue the repair in place. Feedback must be specific
enough for the agent to compare what it believes it changed with what Core
actually observed: checked artifact/rule, observed counters or lifecycle flags,
the failed field/path/gate, and the required repair direction.
