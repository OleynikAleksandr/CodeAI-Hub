# Managed Workflow Context Bundles And Microtasks

**Status:** Accepted for implementation slicing
**Created:** 2026-05-09
**Accepted:** 2026-05-09
**Owner:** Core / Project Manager
**Scope:** Managed documentation workflow stages after `Virtual Simulation`, including `Diagram Modules`, `Application Skeleton`, `Quality Gates`, and later Development Tree documentation sessions.

## 1. Problem Statement

The Diagram Modules Claude retest exposed a broader managed-workflow architecture issue, not just a provider behavior issue.

Core improved Diagram Modules by moving the provider into Core-orchestrated subturns: create the Product Part index first, then materialize one Product Part per turn. That fixed the worst aggregate race, but the lifecycle still has two gaps:

1. **Context delivery is inconsistent.** First turns embed upstream artifact text, while documentation rollover currently points the provider at paths and instructs it to read files. A rollover session can therefore be poorer than the original session and can provoke duplicate file reads even when Core already had the source text.
2. **Managed microtasks are too coarse.** Core can lead one provider turn per Product Part, but managed stage plans and commits can still treat multiple accepted artifacts as one broad task. That weakens recovery, user intervention, and auditability.

This planning scope generalizes the Diagram Modules lessons to the following managed stages. The fix must be Core-owned and executable. Prompt text is a secondary guard, not the primary correctness mechanism.

User acceptance on 2026-05-09 confirmed that the implementation plan must include the same rollover, no-link prompt, stage todo-plan, and microtask commit-boundary checks for each following managed workflow step, with final streams for targeted tests, release assembly, and user retest.

## 2. Architectural Decision

Managed workflow provider prompts are **Core-built context bundles**. They are not link lists.

For initial turns, continuation turns, repair turns, and rollover turns, Core must send the provider the text it needs to act now:

- workflow contract and stage contract;
- current target artifact identity;
- current target output path when writing is required;
- upstream artifact contents;
- active workspace plan contents;
- active stage todo-plan contents;
- current `plan:status` result or equivalent structured state;
- accepted artifact and commit summary relevant to the target;
- last user-visible assistant message when continuing a session;
- exact validation diagnostics when Core is asking for repair.

The provider prompt must not include input-document links or "read this file" instructions when Core embedded the document text. Paths are allowed only for output targets or explicit bounded fallback modes.

## 3. No-Link Prompt Rule

### 3.1 Provider-visible content

Provider-visible prompts may include:

- a write target path;
- generated artifact identifiers;
- embedded source document text;
- embedded plan text;
- embedded validation diagnostics;
- embedded progress and commit summaries.

Provider-visible prompts must not include:

- links to input documents that are already embedded;
- instructions to run `npm run plan:status` if Core can provide the current status text;
- instructions to inspect active stage todo-plan paths when Core can provide the active stage todo-plan text;
- broad "read the workspace" recovery wording for managed documentation stages.

### 3.2 Fallback exceptions

An input path can appear in a provider prompt only when Core marks the bundle as a fallback:

- **Truncated input fallback:** Core embedded a bounded excerpt and explicitly says the full source was truncated.
- **Stale bundle recovery:** Core cannot prove that the embedded source text matches the filesystem state.
- **Debug/operator mode:** The user or Core explicitly requests provider-side file inspection.

In normal workflow execution, file paths remain Core metadata, not provider instructions.

## 4. Rollover Contract

Rollover is a managed auto-compact, not a bare resume.

A new session created by context-window rollover must be richer than the first session. It must carry all first-session source context plus the execution state that accumulated since the first session started.

### 4.1 Required rollover bundle

Every managed documentation rollover prompt must include:

1. Stage identity and provider task contract.
2. Original upstream artifact text used to start the stage.
3. `doc/TODO/workspace.plan.md` contents for the managed workspace, when present.
4. Active stage todo-plan contents.
5. Current plan status as text or structured state.
6. Current microtask id, current target artifact, expected output path, and expected commit message.
7. Accepted artifacts and managed commit hashes relevant to the active stage.
8. Last visible assistant message from the previous session.
9. Pending Core feedback or validation diagnostics, if any.
10. Explicit instruction to continue only the named microtask and stop for Core acceptance.

### 4.2 Rollover must preserve first-turn context

If the first session received upstream documents as embedded text, rollover must embed those same upstream documents again. For example:

- Diagram Modules rollover must embed the current `Final_Description.md` text and `virtual-simulation.md` text, plus Diagram Modules stage plan/progress.
- Application Skeleton rollover must embed the current source docs used for the skeleton prompt: final description, virtual simulation, Product Part index, and accepted Product Part artifacts needed for the active skeleton target.
- Quality Gates rollover must embed the accepted Application Skeleton artifact and skeleton map context required for the active gates target.
- Development Tree node rollover must embed the exact owner artifact text and node-local plan/progress for the active Product Part, Cluster, or Module session.

Rollover must not downgrade to "read these paths" because that changes provider behavior and can create an extra file-read cycle.

## 5. Managed Stage Todo-Plans

Stage todo-plans are order contracts for Core and provider-facing workflow, not just human notes.

Core must synthesize and maintain stage todo-plans at the same granularity as Core acceptance:

- one task for a generated index or planning artifact;
- one task per accepted Product Part, Cluster, Module, quality gate group, or other real target artifact;
- a separate `Git Commit` item after each microtask;
- explicit current target context in the active task;
- exact validation failure notes when a repair turn is required.

If the user edits artifacts or changes a stage composition, Core must resync the stage plan from the current artifact graph and continue from the first unaccepted target.

## 6. Commit Boundary Contract

Core-owned managed commits must happen at accepted microtask boundaries.

Diagram Modules currently demonstrates why aggregate-only commits are not enough: the provider can create several files, Core can validate subturns, but the plan/commit history can still hide the fact that the work was accepted one target at a time.

The target contract is:

- Core validates the active microtask only.
- Core emits either one repair message or one acceptance/next-target message.
- If accepted, Core creates the managed commit for that microtask before starting the next microtask.
- The next provider turn starts from the committed state and receives the next target.
- The user input lock remains active while validation, commit, feedback dispatch, or Core-owned continuation is pending.

## 7. Stage Coverage

### 7.1 Diagram Modules

Current Product Part composition must remain provider/user-derived. Core reads it from the accepted `product-parts.index.md`; Core must not hardcode the four Product Parts observed in the Claude test.

Required end-state:

- first turn creates only `product-parts.index.md`;
- Core validates and commits the index as its own microtask;
- Core synthesizes one stage-plan task per Product Part declared in the index;
- each Product Part is materialized in its own provider turn;
- each accepted Product Part receives its own managed commit;
- repair prompts name the exact Product Part and exact validation mismatch;
- aggregate completion happens only after every declared Product Part task is accepted and committed.

### 7.2 Application Skeleton

Application Skeleton must receive the accepted Diagram Modules output as embedded text, not as links.

Required end-state:

- initial prompt embeds final description, virtual simulation, Product Part index, and relevant Product Part artifact text;
- Core stage plan uses real skeleton targets rather than one broad "create skeleton" bucket;
- if the skeleton is produced as a single contract artifact, that artifact is one microtask and commit;
- if skeleton materialization expands into Product Part / Cluster / Module files, Core creates one microtask per materialized target or bounded target group;
- rollover embeds the active skeleton plan, current target, accepted commits, and upstream Diagram Modules text needed for that target;
- repair prompts name the precise skeleton validation rule that failed.

### 7.3 Quality Gates

Quality Gates must receive the accepted Application Skeleton context as embedded text.

Required end-state:

- initial prompt embeds `application-skeleton.md`, `application-skeleton-map.json`, and any accepted skeleton plan text needed for gate selection;
- Core separates draft/selection work from integration/materialization work;
- stage plan tasks map to concrete gate groups, files, or integration targets;
- each accepted gate target or bounded target group has a managed commit;
- rollover embeds the active gates plan, current target, skeleton context, and validation diagnostics;
- repair prompts name the exact missing or invalid gate artifact/integration path.

### 7.4 Development Tree Documentation Sessions

Development Tree sessions must inherit the same bundle discipline.

Required end-state:

- Product Part, Cluster, and Module sessions receive the exact owner artifact text embedded in the prompt;
- prompts do not ask the provider to reread the owner artifact by path unless a fallback mode is active;
- node-local plans track one accepted draft or materialization target per microtask;
- rollover embeds node plan, workspace plan, current node target, accepted commits, and last visible assistant message;
- Core does not start sibling node work until the active node microtask has reached a clear accept/repair boundary.

## 8. Core Implementation Shape

The implementation should add a reusable managed context bundle layer rather than stage-specific prompt patches.

Expected components:

- **Managed context bundle builder:** collects source artifact text, workspace plan text, stage plan text, plan status, accepted commits, current target, and diagnostics.
- **Provider prompt renderer:** renders initial, continuation, repair, and rollover prompts from the bundle without leaking input paths.
- **Stage target planner:** maps stage artifacts into Core-owned microtasks and stage-plan entries.
- **Managed commit boundary service:** commits the accepted active microtask before dispatching the next Core-owned provider turn.
- **Rollover envelope replacement:** replaces path-based documentation continuation envelopes with embedded managed context bundles.
- **Validation diagnostics normalizer:** ensures every repair prompt names the exact rule/pattern/target that failed.

## 9. Implementation Streams To Create After Acceptance

After this planning document is accepted, the execution plan should be sliced into microtasks no larger than three files each.

Suggested streams:

1. Audit current stage prompt sources and rollover envelopes for Diagram Modules, Application Skeleton, Quality Gates, and Development Tree node sessions.
2. Add a managed context bundle model and tests.
3. Replace documentation rollover path instructions with embedded context bundles.
4. Move Diagram Modules managed commits from aggregate-ready to index/Product Part microtask boundaries.
5. Extend managed stage plan synthesis and commit boundaries to Application Skeleton.
6. Extend managed stage plan synthesis and commit boundaries to Quality Gates.
7. Extend no-link context bundles to Development Tree node sessions.
8. Update SSOT docs and regression tests.
9. Run targeted builds and stop for explicit release confirmation.

## 10. Non-Goals

- Do not hardcode Product Part names or counts.
- Do not make Claude-specific workflow rules; provider-specific stream parsing fixes remain provider-owned, but workflow orchestration is Core-owned.
- Do not rely on prompts alone to prevent cross-target edits.
- Do not remove target output paths from prompts.
- Do not start a release build from this planning scope without explicit user confirmation.

## 11. Acceptance Criteria

This planning scope is accepted when the user agrees that the future implementation must satisfy all of the following:

- provider prompts embed required input text instead of linking to input files;
- rollover sessions include all first-turn source context plus accumulated plan/progress context;
- stage todo-plans are treated as executable order contracts;
- managed commits happen at accepted microtask boundaries;
- Diagram Modules, Application Skeleton, Quality Gates, and Development Tree sessions share the same Core-owned bundle/commit architecture;
- validation feedback identifies the exact failed target and rule;
- user input remains locked through Core validation, commit, feedback, and automatic continuation boundaries.
