# Claude Thinking Message Classification Fix

**Status:** Approved for execution (2026-04-04)
**Created:** 2026-04-04
**Owner:** Oleksandr + Codex
**Scope:** Fix the Claude dialog classification bug where pre-tool assistant text from the same provider-native message as `thinking` is rendered as a normal assistant reply instead of continuing the visible `Thinking` stream.

---

## 1. Problem

Release `1.1.883` fixed long-thinking translation and chunking, but one Claude UX defect remains.

Observed behavior:

- Claude emits one provider-native message that contains:
  - a `thinking` block;
  - then a `text` block;
  - then one or more `tool_use` blocks;
  - and finally `message_delta.delta.stop_reason = "tool_use"`.
- CodeAI Hub currently translates the `thinking` block into `Claude · Thinking`, but the intermediate `text` block is emitted as a regular `assistant` message.
- In the dialog this looks like reasoning was split into `Thinking -> Assistant -> Thinking`, even though the middle text still belongs to the same pre-tool reasoning turn.

This is a message-classification bug in the Claude provider path.

---

## 2. Root Cause

Current router logic distinguishes only:

- `tool_use` preambles without semantic context -> regular assistant text, translated on the user-facing path;
- `thinking` blocks -> visible `Thinking` bubbles.

But Claude can emit both inside the same logical message id before `tool_use`. In that case, the `text` block is not a standalone answer. It is a continuation of the same pre-tool reasoning envelope.

---

## 3. Decision

Use a provider-native classification rule:

- if a Claude message already emitted `thinking`;
- and later in the same `message.id` a `text` block appears;
- and that message resolves with `stop_reason = "tool_use"`;
- then that text must be emitted as `Thinking`, not as a regular assistant reply.

Non-goals:

- do not relabel normal final assistant replies ending with `end_turn`;
- do not filter out tool-use progress text that has no preceding `thinking` block;
- do not rely on text heuristics.

---

## 4. Target Change

### 4.1. Router state

The Claude stream router should remember the current message id that has already emitted visible `thinking`.

### 4.2. Pending assistant classification

Queued pre-tool assistant text should carry a semantic flag:

- `assistant` when it is plain pre-tool progress text;
- `thinking` when it belongs to a provider-native message that already emitted `thinking`.

### 4.3. Flush behavior

On `stop_reason = "tool_use"`:

- pending text with semantic `assistant` stays a normal translated assistant progress message;
- pending text with semantic `thinking` is emitted as a `dialog_message` with `role: "assistant"` and `tag: "thinking"`.

---

## 5. Verification

Add focused regression coverage for:

1. `thinking -> text -> tool_use` within one message id => middle text is emitted as `Thinking`;
2. plain `text -> tool_use` with no prior `thinking` => stays a normal assistant progress message;
3. `thinking -> text -> end_turn` => final answer still stays a normal assistant reply.
