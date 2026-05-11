# Quality Gates Scenario

**Status:** planning draft for user review.
**Scope:** managed orchestration behavior for the `quality_gates` workflow step.
**Baseline sources:**

- `Plans/Archive/Managed_Step_Orchestration_Diagram_Modules_Scenario_1.2.229.md`
- `Plans/Archive/Managed_Step_Orchestration_Application_Skeleton_Scenario_1.2.238.md`
- `Plans/Archive/Managed_Step_Orchestration_Application_Skeleton_Architecture_1.2.238.md`
- `Plans/Archive/Quality_Gates_Baseline_Prompt_Integration_Refinement.md`
- `Contracts/Managed_Workspace_Lifecycle.md`
- `System/WorkflowSteps_Overview.md`

## Target Shape

Quality Gates Baseline must use the same managed lifecycle discipline that is now accepted for Diagram Modules and Application Skeleton.

Core does not pre-seed a large static stage plan. It creates the next executable microtask only when the previous committed result determines the next valid action.

The step has four managed surfaces:

1. Draft gate contract.
2. User review and acceptance.
3. Integration into the materialized Application Skeleton.
4. Post-completion user-return revisions.

Development Tree unlock is a downstream workspace lifecycle transition after the integration commit. It is not a replacement for the Quality Gates post-completion user-return phase.

## Core Invariants

- Every provider-visible Core instruction that asks the agent to continue, repair, revise, or retry Quality Gates must be represented in `doc/TODO/stages/quality-gates/todo-plan.md` as a concrete microtask with the next paired `Git Commit:` item before Core sends the message.
- Agents own artifact content. Core owns validation, staging, commits, child-plan advancement, repair feedback, hook-registry regeneration, and downstream unlock.
- A rejected attempt is still a durable attempt. If the agent changes valid owned files, Core commits those changes under the active repair task. If there is no acceptable artifact diff, Core writes tracked attempt evidence and commits that evidence.
- Core feedback must not dead-end the agent with "do nothing" instructions when the stage is still unresolved. Feedback must either request a concrete repair, report that the stage is waiting for user review, or report that Core has completed the managed transaction.
- The green/red stage light has one canonical truth. A completed upstream stage must not turn red because a downstream stage has dirty files or a different blocker.

## Scenario

### Phase 1 - Draft Gate Contract

1. Core starts Quality Gates with one draft-contract microtask and its paired commit.
2. The first prompt includes the managed context bundle with `activeStage: "quality_gates"` and the accepted Application Skeleton artifacts inline.
3. The agent writes only:
   - `.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.md`;
   - `.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.json`.
4. Before acceptance, the agent must not create or edit package scripts, tool configs, hook files, CI files, gate scripts, production code, or Development Tree artifacts.
5. The agent stops with content readiness.
6. Core validates the draft and commits it as `docs: draft quality gates contract`.
7. Only after the draft commit succeeds, Core opens the user-led review phase.

Draft validation requires:

- both Quality Gates artifacts exist;
- JSON parses and uses a `commands` object keyed by gate id, not an array;
- `accepted` is not true;
- `integrated` is not true;
- every required gate has desired status, current availability, integration requirement, planned integration paths, and blocking phases;
- advisory, planned, and deferred gates are not active blockers;
- stack-specific tooling is selected from the accepted skeleton instead of hardcoded globally;
- the universal source file/class size rule `<= 500` is present as a mandatory architecture policy;
- dirty Git state is limited to Quality Gates draft-owned paths and the managed child plan.

### Phase 2 - User Review And Acceptance

The review phase is user-led.

Discussion-only turns do not create commits. Any user-return message that asks the agent to change Quality Gates artifacts creates a concrete `revisionN` microtask and paired `Git Commit:` before Core sends the revision request.

Revision commits use the shape:

```text
docs: revise quality gates contract - revision N
```

Acceptance is a Core command, not a provider-owned integration instruction.

When the user accepts the Quality Gates contract, Core must:

1. inject an acceptance microtask and paired commit;
2. update tracked acceptance state in `quality-gates.json`;
3. commit `docs: accept quality gates contract`;
4. re-read child plan, stage progress, and clean Git state;
5. only then create the integration microtask.

The provider must not start integration in the same turn that carries a user acceptance phrase. Typed acceptance, an Accept Contract button, or any future acceptance surface must converge on the same Core-owned acceptance commit boundary.

### Phase 3 - Integration

After the acceptance commit, Core injects the integration microtask and paired commit:

```text
feat: integrate quality gates baseline
```

The integration prompt asks the agent to integrate only the accepted gates into the materialized Application Skeleton. The agent may update the Quality Gates manifest, selected package manifests, selected tool configs, and gate scripts that are explicitly required by the accepted contract.

Hook structure remains Core-owned. The Quality Gates agent can describe hook intent and produce gate content, but `.husky/**` wiring must be regenerated through the Core Hook Registry or another deterministic Core-owned hook boundary. Raw provider-side hook edits are not the source of truth.

Integration validation requires:

- `quality-gates.json` reports `accepted: true`;
- acceptance commit evidence exists before the integration task starts;
- required gate commands are either executable or explicitly unavailable/deferred with rationale;
- required commands are wired through the accepted package/tooling layout;
- `integrated: true` and `integrationState: "integrated"` are set only after actual integration;
- `integratedPaths` names the files actually integrated;
- verification results record the lightest feasible smoke checks;
- dirty Git state is limited to integration-owned paths declared by the accepted contract plus Core-owned hook-registry output.

After the integration commit succeeds, Core opens the post-completion user-return phase and unlocks Development Tree startability from the clean post-commit snapshot.

### Phase 4 - Post-Completion User Return

Quality Gates remains available for later corrections after integration.

This phase is not a handoff anchor. It is a user-return revision loop:

- every later user request to revise Quality Gates creates a tracked `revisionN` task pair;
- Core commits accepted gate changes or tracked failed-attempt evidence;
- downstream Development Tree nodes may become `OUTDATED`, but that propagation is separate from the Quality Gates completion truth.

## Correction Turns

If Core rejects a draft, review revision, acceptance-state update, or integration result, Core must create a repair microtask before provider-visible feedback.

Required sequence:

1. Core detects validation failure.
2. Core injects `quality-gates.<phase>.repairN.task1`.
3. Core injects the paired `Git Commit:`.
4. Core sends repair feedback to the agent.
5. Agent replies.
6. Core commits the attempt result.

The attempt commit is mandatory even when the repair is still wrong. Failed-attempt evidence should include:

- phase and target;
- expected current microtask;
- Core validation errors;
- dirty owned paths observed by Core;
- agent outcome summary;
- next required repair direction.

The attempt must not live only in ignored runtime state, provider jsonl, or UI transcript.

## Artifact Ownership

Draft and review owned paths:

```text
.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.md
.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.json
doc/TODO/stages/quality-gates/todo-plan.md
```

Integration owned paths are derived from the accepted contract and may include:

```text
.codeai-hub/<workspaceSlug>/quality_gates/**
package.json
package-lock.json
pnpm-lock.yaml
yarn.lock
scripts/gates/**
tool-specific config files named by quality-gates.json
Core hook-registry generated output
```

Integration must not touch feature implementation files or Development Tree node drafts.

## JSON Contract Direction

`quality-gates.json` should preserve a deterministic contract with separate intent, acceptance, and integration state.

Representative shape:

```json
{
  "schema": "codeai-quality-gates-v1",
  "accepted": false,
  "acceptanceCommitted": false,
  "integrated": false,
  "integrationState": "draft",
  "commands": {
    "build": {
      "command": "npm run build",
      "desiredStatus": "required",
      "availability": "not_integrated",
      "integrationRequired": true,
      "blockingIn": ["beforeModuleExecution"],
      "plannedIntegrationPaths": ["package.json"]
    }
  },
  "requiredBeforeCommit": [],
  "requiredBeforePush": [],
  "requiredBeforeModuleExecution": ["build"],
  "integratedPaths": [],
  "verification": [],
  "validationErrors": []
}
```

Implementation planning may refine field names, but it must keep these semantic separations:

- desired gate policy versus current executability;
- accepted contract versus integrated filesystem wiring;
- planned integration paths versus actually integrated paths;
- advisory/deferred gates versus blocking gates.

## Stage Light And Completion Truth

Quality Gates status must be derived from one canonical Core workflow-state snapshot.

Minimum states:

- `idle`: no Quality Gates child plan yet.
- `drafting`: draft task active.
- `review`: draft committed and waiting for user review or revisions.
- `accepted`: acceptance committed, integration not complete.
- `integrating`: integration task active.
- `completed`: integration committed, manifest validated, Git clean from the post-commit snapshot.
- `failed`: active repair task required.
- `outdated`: accepted upstream Application Skeleton changed after this contract or integration.

The PM sidebar light should be:

- gray for `idle`;
- orange for active work, review, accepted-not-integrated, failed repair, or outdated;
- green only for `completed`.

Starting Development Tree or any downstream step must not recolor completed Application Skeleton or completed Quality Gates unless the canonical upstream revision graph marks that specific step outdated.

## Required Implementation Tests

The future implementation plan must include deterministic tests for these cases:

1. Quality Gates bootstrap creates only the draft microtask and paired commit.
2. Draft output that tries to edit package scripts, hooks, configs, gate scripts, CI, production code, or Development Tree files is rejected before commit.
3. Core rejection injects a repair microtask and paired `Git Commit:` before provider-visible feedback.
4. A failed repair with no valid artifact diff writes tracked attempt evidence and commits it.
5. User acceptance commits `docs: accept quality gates contract` before the integration prompt can be sent.
6. Integration cannot start from the draft phase or from an uncommitted acceptance flag.
7. The integration task commits `feat: integrate quality gates baseline` only after accepted contract evidence exists.
8. Hook wiring is generated through the Core-owned hook boundary, not by raw provider-side `.husky/**` edits.
9. A user-return revision after completed integration creates a `revisionN` task pair and commit.
10. A Quality Gates blocker does not turn the completed Application Skeleton LED red.
11. A downstream Development Tree blocker does not turn the completed Quality Gates LED red.
12. Workflow-state, PM sidebar, status cards, and artifact panes read the same completion truth and do not trigger side effects.

## Non-Goals

- Implementing Quality Gates runtime code in this planning scope.
- Starting Development Tree implementation planning before this scenario is accepted.
- Reopening accepted Diagram Modules or Application Skeleton implementation scopes.
- Building a generalized semantic approval engine for every user discussion turn.
