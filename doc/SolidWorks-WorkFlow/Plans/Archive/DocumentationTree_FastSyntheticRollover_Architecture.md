# Documentation Tree Fast Synthetic Rollover — Architecture

**Status:** archived planning-doc rev2 — accepted in release `1.2.133`
**Created:** 2026-05-03
**Owner:** Core continuity / Documentation Tree workflow runtime
**Supersedes:** `doc/SolidWorks-WorkFlow/Plans/Codex_FlowNode_ReportCompletionGate_Architecture.md`
**Parent planning-doc:** `doc/SolidWorks-WorkFlow/Plans/Codex_FlowNode_Continuity_Rollover_Architecture.md`
**Target release:** next patch release after `1.2.132`

---

## 1. Problem

Release `1.2.132` restored Codex flow-node continuity after per-turn model/reasoning changes, but the next retest showed that the current rollover flow is too heavy for Documentation Tree steps.

Current flow:

1. Source session reaches context threshold after a normal user-facing turn.
2. Core sends an internal `Flow Node Continuity — Create Report` turn to the old provider session.
3. Agent writes a continuity report.
4. Core waits for the report file.
5. Core creates the next provider session.
6. Core sends a resume bootstrap turn.
7. Only after this chain can the user continue.

This creates visible latency exactly when the user is ready to answer the last assistant questions. The input remains locked while Core asks the old agent to summarize a documentation state that is already represented by canonical artifacts and workflow metadata.

There is also a provider-tool mismatch:

- Core template asks for `atomic write: tmp -> rename`.
- Claude workflow sessions expose only `Read`, `Write`, `Edit`.
- Claude correctly falls back to direct final-path `Write`.
- Codex can use shell, but the 1.2.132 retest showed shell/heredoc tail can leak into report body when Core reads too early.

The deeper issue is therefore not only premature file readiness. For Documentation Tree, agent-authored reports are mostly unnecessary.

---

## 2. Scope

This planning-doc changes continuity behavior for Documentation Tree trunk stages:

```text
description
virtual_simulation
diagram_modules
```

These stages are artifact-first, document-only workflow nodes. Their continuation state is recoverable from:

- the stage contract prompt;
- canonical artifact paths;
- current artifacts on disk;
- workflow state / last active artifact;
- provider/model binding;
- the last visible assistant message before rollover;
- the next real user message.

Implementation-heavy / Development Tree continuity is not removed by this plan. For future code/implementation branches, report-based handoff may still be useful because state can include git commits, active diffs, build/test status, and files that are not a single canonical workflow artifact.

---

## 3. Target Behavior

### 3.1 Documentation Tree fast path

When a trunk Documentation Tree session crosses the context threshold after a normal turn:

1. Core records a pending synthetic rollover context for the stage.
2. Core captures the last user-visible assistant message from the source dialog.
3. Core creates / materializes the continuation logical session without sending an internal Create Report turn.
4. Core unlocks the input as soon as the continuation session is ready to accept the user's next message.
5. Core does not send a standalone resume bootstrap turn.
6. On the next real user message, Core sends one provider turn that combines:
   - the normal workflow start/step contract prompt;
   - a small `Continuation mode` block;
   - the last visible assistant message before rollover;
   - the user's real message.

The user experiences one continuous dialog: they answer the last assistant question, and the new provider session receives enough context to understand what the answer refers to.

### 3.2 Continuation prompt shape

Continuation is not the same instruction contract as a cold stage start. It must reuse the normal workflow start prompt pack as the immutable stage contract, but it must add a continuation overlay that changes the agent's interpretation of the turn:

- this is not a new empty stage;
- existing artifacts on disk are authoritative current state;
- the old assistant already asked a visible question or proposed next steps;
- the user's message is an answer or continuation of that visible assistant message;
- report files are not part of this Documentation Tree handoff.

The new provider turn should look conceptually like:

```text
<normal workflow start prompt pack for the same stage>

## Continuation Mode

- This is a continuation of the same Documentation Tree stage after context rollover.
- Do not create, read, or update continuity report files.
- Use the existing canonical workflow artifacts as the current state.
- The previous provider session ended after the assistant message below.
- The user's message after this block is the user's answer or next instruction in response to that assistant message.

## Last Assistant Message Before Rollover

<last user-visible assistant message only>

## User Message

<real user message>
```

The last assistant message must exclude:

- reasoning/thinking entries;
- internal `Ready to continue working` acknowledgements;
- system notices;
- translation overlays;
- provider diagnostics.

### 3.3 Existing start prompt as the memory base

The existing workflow start prompt pack already contains most of the required recovery context:

- full step contract;
- stage identity;
- target artifact path;
- input artifact paths;
- artifact language directive;
- output file name;
- stage-specific iteration rules.

Therefore the fast path should reuse that contract instead of asking the old agent to summarize it again.

---

## 4. Design Decisions

### 4.1 No agent-authored report for Documentation Tree

Documentation Tree rollover should not send `Flow Node Continuity — Create Report` and should not wait for a report file.

The canonical artifacts are the state. The workflow start prompt is the contract. The last visible assistant message is the conversational bridge.

### 4.2 Lazy provider bootstrap

The new provider session should not receive a standalone internal bootstrap turn if there is no real user message yet.

Standalone bootstrap turns cost time, create extra `Ready to continue working` messages, consume context, and keep input locked. The continuation block should be sent only with the user's next actual message.

### 4.3 Last visible assistant message is mandatory

The user sees the old assistant question and answers it. The new provider session must see that same question to avoid interpreting the user's answer without its prompt.

Core should persist enough dialog metadata to identify the last visible assistant message before rollover and inject it into the next-turn continuation envelope.

### 4.4 Preserve report-based continuity for non-documentation scopes

This plan does not delete the report machinery globally. It changes the eligible Documentation Tree flow to bypass reports.

For implementation-heavy continuity, the correct report path remains:

```text
valid report + completed matching internal report turn
```

But that path becomes fallback / future Development Tree behavior, not the primary trunk documentation path.

### 4.5 Remove Documentation Tree dependencies on old rollover code

The codebase should not keep two active Documentation Tree handoff implementations.

After the synthetic fast path is added, Documentation Tree stages must be cleaned out of:

- Create Report eligibility checks;
- resume-bootstrap dispatch branches;
- report-file wait / report-ready state transitions;
- UI lock reasons that are only meaningful for report generation;
- stale constants, helper names, and tests that imply Documentation Tree requires agent-authored reports.

This is a scoped cleanup, not a global deletion of report continuity. Report machinery can remain only behind explicit non-Documentation / future Development Tree boundaries.

### 4.6 Threshold semantics unchanged

The current threshold is a remaining-context threshold. A value of `80` means rollover starts when remaining context is `<= 80%`.

This plan does not rename or invert that setting.

---

## 5. Implementation Streams

### Stream 11W — Documentation Tree Synthetic Rollover State

Introduce a small Core owner for pending Documentation Tree synthetic rollover state.

Expected output:

- records source session id, target stage, workspace, provider/model binding, rollover id;
- captures the last user-visible assistant message;
- marks report generation as skipped for Documentation Tree stages;
- unlocks UI after continuation session materialization, not after report/resume bootstrap.

### Stream 11X — Lazy Continuation Prompt Envelope

Send the continuation contract only with the next real user message.

Expected output:

- reuse existing workflow prompt pack semantics for `description`, `virtual_simulation`, `diagram_modules`;
- append a `Continuation Mode` block that explicitly distinguishes continuation from a cold start;
- append `Last Assistant Message Before Rollover`;
- append the real user message;
- do not send standalone `Ready to continue working` bootstrap turns.

### Stream 11Y — Documentation Tree Legacy Rollover Cleanup

Remove obsolete Documentation Tree dependencies on the old report/resume implementation.

Expected output:

- Documentation Tree stages are no longer eligible for Create Report dispatch;
- Documentation Tree fast path no longer waits on report-ready state;
- stale report/resume state is cleared or ignored for the synthetic path;
- tests fail if any Documentation Tree rollover attempts report generation or standalone resume bootstrap.

### Stream 11Z — Continuation Contract Regression Coverage And SSOT

Add tests and documentation for the fast path.

Expected output:

- regression proves Documentation Tree rollover does not send Create Report;
- regression proves the input can unlock before the next user message;
- regression proves the next provider send includes start contract + continuation block + last visible assistant message + user text;
- regression proves the continuation block has continuation-specific semantics and does not present the session as a cold start;
- docs describe the split between Documentation Tree synthetic rollover and report-based implementation continuity.

### Stream 11AA — Release Build

Build the next patch release after targeted verification passes.

### Stream 11AB — User Visual Acceptance Testing

User retests:

- threshold rollover in Documentation Tree no longer blocks on report creation;
- answering the old assistant question in the new session works naturally;
- model/reasoning selected for the continuation turn is preserved;
- no `Provider codexCli unavailable`;
- no indefinite `Agent is resuming your session... Please wait`;
- no continuity report shell-tail leakage because no report is produced on the fast path.

---

## 6. Out Of Scope

- Removing report-based continuity globally.
- Development Tree / implementation branch continuity redesign.
- Changing threshold semantics or UI wording.
- Reworking provider-native context window reporting.
- Rewriting Description / Virtual Simulation / Diagram Modules agent prompts beyond the minimal continuation envelope.

The next implementation-heavy continuity redesign is captured separately in `doc/SolidWorks-WorkFlow/Plans/Backlog/Implementation_Continuity_Deterministic_Snapshot_Architecture.md`.

---

## 7. Acceptance Checklist

1. Trigger context-threshold rollover in a Documentation Tree stage.
2. Confirm Core does not send `Flow Node Continuity — Create Report`.
3. Confirm Core does not create/read a continuity report file for this fast path.
4. Confirm Core creates/materializes continuation state and unlocks input promptly.
5. Send a user answer to the old assistant question.
6. Confirm the provider receives one turn with:
   - normal stage contract;
   - continuation mode block;
   - last visible assistant message;
   - real user message.
7. Confirm the new agent continues the same artifact iteration without confusion.
8. Confirm selected model/reasoning is applied to the next provider turn.
9. Confirm failure paths do not leave Project Manager locked.
