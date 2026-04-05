# Codex Empty Terminal Answer Recovery Architecture

> Archived after implementation in release `1.1.892` on `2026-04-05`. This intake remains as historical context for the narrow Codex router fallback that preserves the last substantive assistant candidate when a later reasoning tail ends with an empty terminal answer.

**Status:** Archived
**Updated:** 2026-04-05
**Owner:** Oleksandr + Codex
**Scope:** Hotfix intake for Codex turns that finish with an empty terminal assistant message after already emitting substantive user-facing content and long thinking/reasoning tails.

---

## 1. Problem

The latest Codex runtime trace shows a specific failure pattern:

1. Codex emits multiple `agent_message` items during the turn.
2. A substantive user-facing message is produced.
3. The model keeps reasoning, may emit additional progress commentary, and then ends the turn with an empty terminal `agent_message`.
4. CodeAI Hub currently demotes the earlier substantive `agent_message` into `thinking` once later work continues.
5. The turn reaches `turn.completed` with no final assistant content, so the dialog shows large `Codex · Thinking` output and no user-facing completion.

This is not a provider crash:

- provider-home trace ends with `turn.completed`;
- there is no `turn_failed`, `stream_error`, or timeout in the captured session;
- the defect is in how our Codex bridge classifies and preserves late-turn assistant candidates.

---

## 2. Evidence

Observed in:

- provider session: `019d5d49-d394-7791-984d-0cfee0dc81b8`
- unified dialog session: `codex-e46d16be-88cd-41d0-bc65-d50d85ab2618-description`
- SDK log: `~/.codeai-hub/logs/codex/sdk-codex-019d5d49-d394-7791-984d-0cfee0dc81b8.jsonl`

Relevant sequence:

1. A substantive `agent_message` is emitted with the actual user-facing questions.
2. A later `reasoning` item arrives.
3. A later progress `agent_message` and command execution follow.
4. The terminal `agent_message` is empty.
5. The turn completes successfully.

Current router behavior:

- pending `agent_message` content is flushed as `thinking` as soon as a later item proves the turn continues;
- empty terminal `agent_message` yields no assistant output on `turn.completed`;
- the turn finishes without any assistant completion even though a substantive user-facing candidate already existed earlier in the same turn.

---

## 3. Goal

Prevent Codex turns from ending as "thinking-only + empty completion" when the same turn already contained a substantive user-facing assistant candidate.

The user-facing effect must be:

- no silent loss of the last substantive assistant candidate;
- no false `turn_failed`;
- the session remains resumable and structurally normal;
- regression coverage locks the observed event order.

---

## 4. Non-Goals

- Do not redesign Codex thinking UX globally in this hotfix.
- Do not suppress all thinking output.
- Do not add provider-specific prompt changes.
- Do not alter continuity/workflow routing.

---

## 5. Proposed Fix

### 5.1. Narrow fallback in the Codex router

Add a turn-local fallback assistant candidate in `CodexStreamEventRouter`.

Behavior:

1. If a substantive `agent_message` is about to be demoted to `thinking` because a later `reasoning` tail arrived, remember it as a fallback assistant candidate for the same turn.
2. If the turn later reaches `turn.completed` with an empty terminal assistant payload, emit the remembered fallback candidate as the assistant completion for that turn.
3. Clear the fallback state on successful non-empty assistant completion, turn failure, or turn cleanup.

Why this is intentionally narrow:

- the captured production bug is specifically "substantive assistant candidate -> reasoning tail -> empty terminal answer";
- this avoids broad reinterpretation of normal progress commentary;
- it preserves current `thinking` sync behavior for true in-progress tool work.

### 5.2. Substantive-candidate guard

The fallback must not promote short progress pings such as:

- "Checking workspace state..."
- "I will verify one more file..."

The remembered fallback is therefore limited to substantive assistant candidates rather than all demoted commentary.

---

## 6. Implementation Surface

Primary code surface:

- `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`

Regression coverage:

- `packages/Codex_Module/src/messaging/message-processor.test.ts`

Execution planning:

- `doc/TODO/todo-plan.md`

---

## 7. Verification

Minimum verification for this hotfix:

1. Targeted Codex messaging test covering the real empty-terminal sequence.
2. Targeted build for the affected package(s).
3. Full release cycle with packaged VSIX validation before handoff.

---

## 8. Exit Criteria

This hotfix is complete only if all conditions hold:

1. The captured sequence no longer ends with thinking-only transcript loss.
2. A substantive earlier assistant candidate is preserved as the user-facing completion when the terminal assistant payload is empty.
3. Short progress commentary is not accidentally promoted by the fallback.
4. Regression tests pass.
5. A new packaged release is built for user verification.
