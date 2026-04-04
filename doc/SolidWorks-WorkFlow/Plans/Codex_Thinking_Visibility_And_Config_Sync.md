# Codex Thinking Visibility And Config Sync

**Status:** Approved for execution (2026-04-04)
**Created:** 2026-04-04
**Owner:** Oleksandr + Codex
**Scope:** Fix the Codex dialog defect where `Reasoning in dialog` is enabled but no `Thinking` bubbles appear for `gpt-5.3-codex`, and eliminate the provider-owned `config.toml` model drift that still shows `gpt-5.4`.

---

## 1. Problem

Release `1.1.886` left a Codex UX inconsistency:

- the user enables `Reasoning in dialog` for Codex;
- the selected default model in shared settings is `gpt-5.3-codex`;
- but the dialog shows no explicit `Thinking` bubbles;
- at the same time `~/.codeai-hub/providers/codex/home/config.toml` still keeps `model = "gpt-5.4"`.

This creates two failures:

- provider-owned config is not synchronized with the selected model;
- Codex intermediate progress messages are not surfaced as visible `Thinking`.

---

## 2. Root Cause

### 2.1. Config drift

The provider-owned Codex config sync currently updates only `model_reasoning_summary`, not `model`.

Result:

- shared settings can say `gpt-5.3-codex`;
- Core runtime can resolve `gpt-5.3-codex`;
- but provider-owned `config.toml` still advertises `gpt-5.4`.

### 2.2. Thinking visibility gap

Current Codex router emits visible `Thinking` only for SDK events with `item.type = "reasoning"`.

However, real `gpt-5.3-codex` streamed turns can emit intermediate progress text as `agent_message` items instead of `reasoning`.

Provider-native pattern observed in raw JSONL:

- one or more intermediate `item.completed` events with `item.type = "agent_message"`;
- tool/file/command events continue after those messages;
- the final user-facing reply is the last `agent_message` that survives until `turn.completed`.

So the dialog currently misses Codex reasoning because it treats all `agent_message` items as assistant output and does not classify pre-final progress messages separately.

---

## 3. Decision

Use a provider-native event-order rule, not text heuristics.

- For Codex, only the last `agent_message` of a turn is a normal assistant reply.
- Any completed `agent_message` that is followed by more tool/file/command/agent events before `turn.completed` is intermediate progress and must be surfaced as `Thinking` when `Reasoning in dialog` is enabled.
- When `Reasoning in dialog` is disabled, those intermediate Codex progress messages must stay hidden from visible `Thinking`.

Additionally:

- provider-owned `config.toml` must store the same Codex default model as shared settings.

Non-goals:

- do not invent text-based filters;
- do not relabel final Codex answers as `Thinking`;
- do not rely on stale `config.toml` as the source of runtime truth.

---

## 4. Target Change

### 4.1. Provider-owned config sync

Extend Codex provider config materialization/sync so it rewrites both:

- `model = "<selected model>"`;
- `model_reasoning_summary = "auto" | "none"`.

### 4.2. Applied turn display sync for Codex

Codex must receive the runtime `Reasoning in dialog` flag via applied turn config, just like Claude/Gemini already receive their display-sync flags.

### 4.3. Codex event classification

The Codex message router should buffer completed `agent_message` items until the next provider-native event determines their role:

- if the turn completes and no later progress/tool event supersedes the buffered message, emit it as assistant;
- if a later provider-native event proves the buffered message was intermediate progress, emit it as `Thinking` instead.

---

## 5. Verification

Add focused regression coverage for:

1. selected Codex model is persisted into provider-owned `config.toml`;
2. `Reasoning in dialog = true` makes intermediate Codex `agent_message` progress visible as `Thinking`;
3. the final Codex `agent_message` in the same turn still remains the assistant reply;
4. `Reasoning in dialog = false` suppresses visible Codex `Thinking` while preserving the final assistant answer.
