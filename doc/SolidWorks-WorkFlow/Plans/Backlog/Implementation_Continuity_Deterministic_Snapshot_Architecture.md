# Implementation Continuity Deterministic Snapshot — Architecture

**Status:** deferred planning-doc rev1
**Created:** 2026-05-03
**Owner:** Core continuity / Development Tree workflow runtime
**Depends on:** `doc/SolidWorks-WorkFlow/Plans/DocumentationTree_FastSyntheticRollover_Architecture.md`
**Target iteration:** next continuity refactor after Documentation Tree fast synthetic rollover is accepted

---

## 1. Thesis

Implementation-heavy continuity should not depend on an agent-authored narrative report as the primary handoff mechanism.

The better handoff is a deterministic snapshot produced by Core from factual project state:

- active `doc/TODO/todo-plan.md`;
- required planning and SSOT documents from the todo Context Pack;
- git status, staged diff, unstaged diff, and recent commits;
- active microtask and required next Git Commit item;
- touched files and changed packages;
- last known test/build results;
- provider/model/reasoning binding;
- last user-visible assistant message;
- next real user message.

The next agent should recover context from these sources directly. This is more reliable than asking the old agent to summarize them.

---

## 2. Problem

Agent-authored continuity reports are useful as a temporary bridge, but they are not the strongest source of truth for implementation work.

They can be:

- incomplete;
- stale by the time Core reads them;
- inconsistent with git state;
- too verbose or too compressed;
- dependent on provider tools and prompt compliance;
- slow, because Core must ask the old agent to write them before the user can continue.

The project already has a stricter execution model:

```text
microtask -> Git Commit -> todo-plan status/hash update
```

That model makes implementation state machine-readable. Core can reconstruct the current development context from repository state and planning documents without waiting for a provider-written report.

---

## 3. Scope

This document is for a future implementation-heavy continuity refactor. It is not part of the current Documentation Tree fast rollover release.

Target flows:

- Development Tree implementation sessions;
- code-changing execution scopes with active `doc/TODO/todo-plan.md`;
- sessions where git state, build/test status, and touched files matter more than a single documentation artifact.

Out of scope for this future iteration:

- replacing the current Documentation Tree fast synthetic rollover plan;
- changing the mandatory microtask / Git Commit discipline;
- changing release acceptance gates;
- inventing an agent-memory database separate from filesystem/git state.

---

## 4. Core-Generated Snapshot

Core should generate a structured continuation snapshot at rollover time.

Minimum fields:

```text
snapshotId
sourceSessionId
targetSessionId
workspacePath
branch
packageVersion
providerId
model
reasoning
activeTodoPath
activePlanningSources
requiredContextDocs
activePhase
activeStream
activeMicrotask
nextRequiredGitCommitItem
gitStatus
stagedDiffSummary
unstagedDiffSummary
recentCommits
touchedFiles
changedPackages
lastTestResults
lastBuildResults
lastUserVisibleAssistantMessage
createdAt
```

The snapshot should be generated from deterministic sources, not from provider prose.

Priority order for truth:

1. filesystem and git;
2. `doc/TODO/todo-plan.md`;
3. planning docs and canonical SSOT docs;
4. Core session metadata;
5. provider-visible conversation messages.

Narrative summaries, if any, are advisory only.

---

## 5. Continuation Prompt Shape

The new provider session should receive a continuation envelope with the first real user message after rollover.

Conceptual shape:

```text
This is a continuation of an implementation-heavy workflow session, not a cold start.

Read the required context documents listed below.
Then inspect the deterministic snapshot.
Trust filesystem/git/todo-plan over narrative summaries.
Continue from the first TODO/IN_PROGRESS item in todo-plan.
Do not skip the required Git Commit item after a microtask.

## Required Context Documents
<paths from active todo-plan Context Pack>

## Deterministic Execution Snapshot
<Core-generated structured snapshot>

## Last Assistant Message Before Rollover
<last user-visible assistant message>

## User Message
<real user message>
```

The continuation envelope must make clear that the session has historical state, but the new agent must verify current state before editing.

---

## 6. Design Decisions

### 6.1 Reports become fallback, not primary state

Agent-authored reports can remain as an optional diagnostic fallback during migration, but they should not block implementation continuity.

Primary handoff state is:

```text
Core snapshot + git + todo-plan + required docs
```

### 6.2 Snapshot is generated after the user-facing turn completes

Core should not interrupt an agent mid-turn. The trigger can be detected during/after the turn, but snapshot creation should use the completed user-facing state.

### 6.3 Snapshot does not replace required reading

The snapshot tells the next agent where to resume. It does not replace reading the active planning source, SSOT docs, and relevant contracts.

### 6.4 Uncommitted work must be explicit

If there are staged or unstaged changes, the continuation envelope must call them out clearly:

- staged files;
- unstaged files;
- untracked files;
- whether the active microtask already has its required commit;
- whether the next action is implementation, verification, commit, or todo update.

### 6.5 Test/build evidence is factual and bounded

Core should include concise evidence:

- command;
- exit status;
- timestamp;
- short failure summary or "passed".

It should not paste large logs into the provider prompt by default. Large logs should be referenced by path.

---

## 7. Implementation Streams For Future Todo Plan

### Stream A — Snapshot Collector

Add a Core owner that reads todo-plan context, git state, recent commits, touched files, and session metadata into a typed snapshot.

### Stream B — Snapshot Persistence And Session Binding

Persist the snapshot with source/target session ids and bind it to the continuation session until the first real user message consumes it.

### Stream C — Implementation Continuation Envelope

Build the first-turn envelope for implementation-heavy flows: required docs, deterministic snapshot, last visible assistant message, and real user text.

### Stream D — Report Fallback Boundary

Keep old report-based continuity only behind an explicit fallback flag / unsupported-flow boundary. It must not be the default for implementation-heavy sessions once deterministic snapshot is active.

### Stream E — Regression Coverage And SSOT

Add tests for:

- active microtask detection;
- required Git Commit item detection;
- staged/unstaged/untracked file reporting;
- recent commit handoff;
- continuation prompt shape;
- no blocking report turn on the deterministic path.

Update canonical continuity docs after implementation.

---

## 8. Acceptance Criteria

1. Trigger rollover during an implementation-heavy session with an active `doc/TODO/todo-plan.md`.
2. Confirm Core does not require the old agent to write a continuity report.
3. Confirm Core generates a structured snapshot from git, todo-plan, docs, and session metadata.
4. Confirm input is not blocked by report generation.
5. Send the next real user message.
6. Confirm the provider receives continuation instructions, required docs list, snapshot, last visible assistant message, and user text.
7. Confirm the new agent identifies the correct active microtask and next required Git Commit item.
8. Confirm staged/unstaged/untracked changes are represented accurately.
9. Confirm test/build evidence is included or referenced without flooding the prompt.
10. Confirm report-based continuity remains available only as a bounded fallback.

