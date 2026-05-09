# Managed Workflow Context Bundles And Microtasks

**Status:** Accepted and sliced into active implementation plan
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

### 9.1 Active execution slicing

The active `doc/TODO/todo-plan.md` was sliced on 2026-05-09 into the following implementation phases:

1. Prompt and rollover audit across Diagram Modules, Application Skeleton, Quality Gates, and Development Tree node sessions.
2. Managed context bundle foundation and documentation rollover embedding.
3. Diagram Modules Product Part stage-plan microtasks and accepted-artifact commit boundaries.
4. Application Skeleton embedded context and managed microtasks.
5. Quality Gates embedded context and managed microtasks.
6. Development Tree node-session embedded context bundles.
7. SSOT documentation sync.
8. Targeted Core / Project Manager tests and affected builds.
9. Release build confirmation gate, release assembly, user workflow retest, and scope closeout.

### 9.2 Prompt and rollover surface audit

The first implementation stream audited the current managed workflow surfaces before code changes:

- **First-turn source artifact embedding:** `src/client/project-manager/services/workflow-source-artifact-descriptors.ts`, `description-submit-service.ts`, and `prompt-pack-builder.ts` already embed source artifact contents for normal workflow starts, including Diagram Modules upstream documents and Application Skeleton Product Part expansion.
- **Stage continuation prompts:** `src/client/project-manager/services/diagram-modules-continuation-prompt.ts` and `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts` own current Diagram Modules subturn continuation wording. These remain stage-specific and must consume Core progress/target state.
- **Documentation rollover envelope:** `packages/core/src/remote-bridge/handlers/session-request-handler-documentation-continuation-envelope.ts` is the primary defect surface. It currently renders path-based input hints and tells providers to read `doc/TODO/workspace.plan.md`, read the active child plan from `activePlanPath`, and run `npm run plan:status`.
- **Rollover dispatch:** `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` injects the documentation continuation envelope into the next real user message after `session-request-handler-flow-node-rollover.ts` registers lazy rollover context.
- **Managed plan synthesis:** `packages/core/src/managed-workspace/managed-todo-tree.ts` creates broad stage plans for Diagram Modules, Application Skeleton, and Quality Gates. `managed-plan-orchestrator-installer.ts` advances them after commits but still summarizes broad staged files instead of synthesizing per-target tasks.
- **Managed commit gate:** `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.ts` currently commits Diagram Modules only at aggregate-ready; Application Skeleton and Quality Gates commit at broad stage readiness.
- **Development Tree node prompts:** `packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.ts` and `node-prompt-context-extractor.ts` collect owner context. They already know owner artifact paths, but the implementation must ensure provider-visible prompts carry embedded owner text rather than path-driven recovery instructions.

Tests expected to change or expand:

- `packages/core/src/remote-bridge/handlers/session-request-handler.documentation-continuation.test.ts`
- `packages/core/src/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.ts`
- `src/client/project-manager/services/prompt-pack-builder*.test.ts`
- `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts`
- `packages/core/src/development-tree/node-bootstrap/*test.ts`

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

## 12. Verification Evidence

### 2026-05-09 Targeted Context Bundle Tests

- `npm run build --workspace=@codeai-hub/core` — passed.
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler.documentation-continuation.test.js packages/core/dist/remote-bridge/handlers/session-request-handler-managed-context-bundle.test.js packages/core/dist/managed-workspace/managed-plan-orchestrator-installer.test.js packages/core/dist/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.js packages/core/dist/development-tree/node-bootstrap/node-first-message-builder.test.js packages/core/dist/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.js packages/core/dist/development-tree/node-bootstrap/node-prompt-context-extractor.test.js` — passed, 27/27 tests.
- `npm run typecheck:webview` — passed.

### 2026-05-09 Affected Builds

- `npm run build --workspace=@codeai-hub/core` — passed.
- `npm run build:project-manager` — passed.
- `npm run typecheck:webview` — passed.

## 13. Release Decision

On 2026-05-09 the user explicitly authorized continuing without pauses through implementation, verification, and new release assembly. This satisfies the release build confirmation gate for this execution cycle.

## 14. Release Build Evidence

- `./scripts/build-all.sh` — passed, produced provider/core/UI/launcher artifacts for version `1.2.208`.
- `./scripts/build-release.sh --use-current-version --allow-dirty` — passed, verified SDK exclusions, local artifacts, markdown links, duplication advisory gate, VSIX package surface, and produced `codeai-hub-1.2.208.vsix`.
- Release artifacts are available in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.

## 15. Claude Retest Blocker: Product Part Sequencing

The `v1.2.208` Claude retest exposed two Core-side stage-plan defects:

- Product Part extraction in the managed plan shim accepted bullets/tables/comment words from `product-parts.index.md` and produced fake targets such as `Id`, `Title`, `Purpose`, and prose words.
- The shim exposed every future Product Part task immediately after index acceptance, which made Claude infer that Core requested all remaining Product Part files in one turn.

The fix makes Product Part extraction header-only (`### Product Part: <lowercase-kebab-id>`) and opens only one visible Product Part microtask at a time. After a Product Part commit, the shim re-reads the accepted index and opens the next not-yet-committed Product Part.

Verification:

- `npm run build --workspace=@codeai-hub/core` — passed.
- `node --test packages/core/dist/managed-workspace/managed-plan-orchestrator-installer.test.js` — passed, 5/5 tests.

## 16. Sequencing Fix Release Decision

On 2026-05-09 the user explicitly confirmed building a new follow-up release for the managed Product Part sequencing fix. This satisfies the release build confirmation gate for the sequencing fix stream.

## 17. Sequencing Fix Release Build Evidence

- `./scripts/build-all.sh` — passed, produced provider/core/UI/launcher artifacts for version `1.2.209`.
- `./scripts/build-release.sh --use-current-version --allow-dirty` — passed, verified SDK exclusions, local artifacts, markdown links, duplication advisory gate, VSIX package surface, and produced `codeai-hub-1.2.209.vsix`.
- Release artifacts are available in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.

## 18. Claude Retest Blocker: Product Part Acceptance Boundaries

The `v1.2.209` Claude retest showed that Product Part sequencing improved but Core still breaks the managed subturn contract after the first Product Part:

- Core emitted a failed aggregate Diagram Modules acceptance message after `project-manager.md` was written, even though one valid Product Part is expected at that point.
- Core refused the managed commit because the provider also updated `product-parts.index.md` status from `planned` to `generated`; that index status update is a Core-owned stage artifact and must either be included in the current Product Part commit or be owned exclusively by Core.
- Core then immediately emitted an accepted continuation for `core-runtime.md`, even though the managed commit for `project-manager.md` did not succeed and the active stage todo-plan still pointed to `diagram-modules.product-part.project-manager`.
- The aggregate repair wording still said to update artifacts until every planned Product Part has a valid file, which pushed Claude to create `core-runtime.md`, `ai-providers.md`, and `vscode-extension.md` in one turn.

Repair direction:

- Do not send an accepted continuation or advance the next Product Part unless the current Product Part managed commit succeeds.
- Product Part subturn feedback must be target-scoped: validate and report only the current target artifact, not the whole `0/4`, `1/4`, `4/4` aggregate stage.
- Include the Product Part index status update in the active Product Part allowlist, or move status updates fully into Core after the commit. Sibling Product Part files must remain outside the allowlist.
- Keep the session stopped before the next release build until focused regressions pass and the user explicitly confirms another release assembly.

Implementation note:

- The first repair blocks PM automatic Product Part continuation while the workflow-state payload still carries managed dirty or out-of-target dirty files.
- The second repair keeps `product-parts.index.md` inside the current Product Part managed commit allowlist so provider-updated status markers can be committed with the accepted Product Part file.

Verification:

- `npm run build --workspace=@codeai-hub/core` — passed.
- `npm run typecheck:webview` — passed.
- `npm run build:project-manager` — passed.
- `node --test packages/core/dist/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.js packages/core/dist/remote-bridge/handlers/workflow-state-managed-documentation-commit.test.js packages/core/dist/managed-workspace/managed-plan-orchestrator-installer.test.js` — passed, 13/13 tests.

Release status:

- Stop before release build confirmation. No `build-all.sh` or `build-release.sh` was run for this repair stream.

## 19. Product Part Acceptance Repair Release Decision

On 2026-05-09 the user explicitly confirmed building a new release for the Product Part acceptance repair stream. This satisfies the release build confirmation gate for the repair stream.

The release must include:

- blocked automatic Product Part continuation while managed commit state is dirty or out-of-target;
- target-scoped managed commit feedback that does not ask the provider to create every Product Part;
- Product Part index status updates included in the active Product Part managed commit.

## 20. Product Part Acceptance Repair Release Build Evidence

- `./scripts/build-all.sh` — passed, produced provider/core/UI/launcher artifacts for version `1.2.210`.
- `./scripts/build-release.sh --use-current-version --allow-dirty` — passed, verified SDK exclusions, local artifacts, markdown links, duplication advisory gate, VSIX package surface, and produced `codeai-hub-1.2.210.vsix`.
- Release artifacts are available in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.

## 21. Claude Retest Blocker: Core-Only Managed Messaging

The `v1.2.210` Claude retest showed that Diagram Modules Product Part sequencing is improved, but the managed workflow still has two architectural leaks:

- Description and Virtual Simulation first prompts still expose provider-visible file paths even when the source documents are already embedded as text. These prompts must stop inviting the agent to spend a turn reading files that Core already provided.
- Diagram Modules can still deliver two contradictory Core-looking messages at one Product Part boundary: a deferred failure and an accepted next-target continuation. The root cause is split ownership: Core sends managed feedback, while Project Manager can still send automatic continuation after a workflow-state refresh. Project Manager must remain UI/read-model only; only Core may send automatic managed workflow messages to the provider.

The corrected Diagram Modules ownership model is:

- Phase 1 is a Core/agent-owned automatic conversation. It creates the Product Parts index/graph and materializes every Product Part under Core-owned continuation until all Product Parts are accepted.
- After all Product Parts are accepted, Phase 1 completes and the agent stops.
- Phase 2 is user-owned review/editing. Each user turn that changes Product Parts, clusters, modules, names, or descriptions is opened by Core as an independent microtask and commit boundary.

Implementation must stop before the next release build. No `build-all.sh` or `build-release.sh` is authorized for this repair stream yet.

Prompt no-link repair verification:

- `npm run typecheck:webview` — passed after removing Description and Virtual Simulation provider-visible input paths.
- `npm run build:project-manager` — passed after removing Description and Virtual Simulation provider-visible input paths.
- Prompt builder assertions now cover that Description omits `Questionnaire (relative)`, `Questionnaire (absolute)`, and `Template (absolute)` when source text is embedded, and Virtual Simulation omits `Final_Description.md (relative)` / `(absolute)` when source text is embedded.

Core-only Diagram Modules messaging verification:

- `npm run build --workspace=@codeai-hub/core` — passed after moving Diagram Modules continuation dispatch into Core and adding the user-owned review phase.
- `node --test packages/core/dist/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.js packages/core/dist/managed-workspace/managed-plan-orchestrator-installer.test.js` — passed. The tests cover Core-owned next-target continuation, no continuation while the managed commit gate is dirty, one-at-a-time Product Part plan advancement, and Phase 2 insertion only after the final Product Part commit.
- `npx tsx --test src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts` — passed. The PM invariant test confirms Project Manager no longer calls `api.sendSessionMessage(...)` or owns Diagram Modules continuation prompt text.
- `npm run typecheck:webview` and `npm run build:project-manager` — passed after the Core-only messaging and Diagram Modules phase-boundary changes.
