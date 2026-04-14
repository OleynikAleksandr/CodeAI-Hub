# Localization Translation Recovery Architecture

**Status:** Draft
**Updated:** 2026-04-14
**Owner:** Codex

---

## 1. Problem

Post-release validation on `1.1.979` exposed a broader localization regression
cluster after the chunked-translation refactor:

- persisted localization selections can already be correct in
  `~/.codeai-hub/settings/settings.json`, but the UI may still render stale or
  default-looking values after restart;
- user-facing helper text, status copy, and session output can remain partially
  English even when Russian is selected for user-facing categories;
- live translation of reasoning / commentary degrades heavily under load and
  often falls back to the source text;
- localization bundle materialization and live session translation compete for
  the same translation engine capacity.

The most important operational issue is not the visual drift by itself. The
critical failure is that CodeAI Hub currently tries to translate too many things
at once, without a strict bootstrap gate for interface localization and without
a strong success contract for user-facing localization bundles.

---

## 2. Agreed Execution Order

When the user changes Localization settings and presses `Save Changes`, the
system must switch from "best-effort async background translation" to a strict
bootstrap synchronization contract.

Required order:

1. Persist the new settings snapshot.
2. Enter a blocking `localization sync` state.
3. Show a visible spinner / busy message in the UI.
4. Block Project Manager launch and any new session flows that would trigger
   additional translation work.
5. Materialize the required localization bundles in deterministic priority.
6. Refresh the runtime localization bootstrap snapshot.
7. Only then unlock the UI and allow the user to continue.

This contract intentionally prefers correctness over immediate interactivity.

---

## 3. Localization Sync Contract

### 3.1 Blocking Behavior

While `localization sync` is active:

- Settings must stay in a busy state;
- Project Manager must not open new translation-triggering flows;
- live session translation must not preempt the initial localization sync.

User-facing copy should explicitly explain that a large localization update is
being prepared and that work can continue after synchronization completes.

### 3.2 Success Condition

Success is **not** "every visible string in the product became Russian".

Success is:

- every required bundle for the selected user-facing categories has been
  materialized successfully;
- the runtime localization payload has been refreshed from those bundles;
- no required category is left in fallback / partial-fallback state.

This avoids false failures for intentionally preserved English content such as:

- provider names;
- model names;
- protected glossary terms;
- categories intentionally left in English by settings.

### 3.3 Failure Condition

If synchronization cannot produce all required bundles after retries:

- do not silently continue with a half-English UI;
- keep the change blocked as incomplete;
- show an explicit sync failure state and offer retry.

---

## 4. Translation Policy Split

The system needs two different translation modes.

### 4.1 Interface / Bootstrap Localization

For Settings, Project Manager help, user-facing messages, and other materialized
localization bundles:

- do **not** use chunking by default;
- prefer larger single requests or large batched requests;
- prioritize completeness and stability over latency;
- treat `null`, empty output, fallback, or partial-fallback as internal failure;
- retry automatically before surfacing failure to the user.

This path is not real-time and therefore should avoid multiplying provider calls
unnecessarily.

### 4.2 Live Session Translation

For reasoning / commentary / streaming session text:

- chunking may remain available when needed;
- but execution must be gated behind queueing / concurrency control;
- this path is lower priority than the initial localization sync.

The system must not let live translation flood the provider while user-facing
bootstrap localization is still incomplete.

---

## 5. Timeout and Retry Strategy

Timeouts must remain in the system, but only as watchdogs against hangs.

Rules:

- do not use a tiny fixed timeout like the current `3000ms` for interface
  localization;
- use a longer or dynamically scaled timeout based on request size;
- clamp the timeout to a safe range;
- on timeout, `null`, empty output, fallback, or partial-fallback, retry the
  translation attempt automatically;
- only declare failure after the retry budget is exhausted.

Timeout purpose:

- detect a stuck provider call;
- cancel and retry it;
- never treat "slow but progressing" localization as a successful reason to
  fall back to English.

---

## 6. Deterministic Category Priority

Required materialization order for blocking localization sync:

1. `ui_helper_text`
2. `messages_for_the_user`
3. `artifacts_for_the_user`
4. `ui_labels`
5. `workflow_terms`

Reasoning:

- helper text and user-facing messages are needed first for coherent operation;
- artifacts are important for workflow output;
- labels can wait slightly longer when the user intentionally leaves them in
  English;
- workflow terms follow the labels policy and are lowest priority here.

---

## 7. Scope Decision

This execution cycle prioritizes translation recovery first.

Secondary issues such as:

- restart hydration drift;
- stale runtime model label display;
- other apparent UI inconsistencies;

must be re-evaluated **after** localization sync reliability is restored,
because part of the observed bug surface may disappear once translation
bootstrap stops racing with live translation.

---

## 8. Files In Scope

Primary implementation areas for this cycle:

- `src/client/ui/src/components/settings/use-settings-state.ts`
- `src/extension-module/message-handlers/settings-message-handler.ts`
- `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`
- `packages/localization/src/localization-facade.ts`
- `packages/localization/src/localization-materializer.ts`
- `packages/translation/src/translation-facade.ts`
- `packages/core/src/session-translation/session-translation-facade.ts`

Documentation sync:

- `doc/TODO/todo-plan.md`
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

---

## 9. Verification

Minimum verification for this scope:

1. Save localization settings with:
   - `UI Labels = en`
   - `UI Helper Text = ru`
   - `Messages for the User = ru`
   - `Artifacts for the User = ru`
2. Confirm the UI enters a blocking localization sync state after save.
3. Confirm Project Manager launch stays blocked until sync completion.
4. Confirm required bundles finish materialization without partial English
   fallback for the selected user-facing categories.
5. Confirm the runtime localization payload is refreshed only after bundle
   completion.
6. Re-test live session translation after bootstrap recovery and only then
   continue with secondary regression triage.
