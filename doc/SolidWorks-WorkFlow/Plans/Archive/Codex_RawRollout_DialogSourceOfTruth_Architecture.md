# Codex Raw Rollout Dialog Source Of Truth Architecture

**Status:** Active
**Updated:** 2026-04-05
**Owner:** Oleksandr + Codex
**Scope:** Migrate Codex user-visible output parsing, dialog segmentation, and replay from SDK `item.*` mirrors to provider-native raw rollout JSONL under `CODEX_HOME/sessions/**/rollout-*.jsonl`.

---

## 1. Problem

The current Codex integration still normalizes user-visible dialog primarily from the SDK event stream returned by `@openai/codex-sdk`.

That stream is no longer sufficient for CodeAI Hub's output contract:

1. The SDK `ThreadItem` contract in `@openai/codex-sdk 0.53.0` exposes `agent_message` only as `{ id, type, text }`.
2. It does not expose semantic message phase metadata such as `commentary` vs `final_answer`.
3. The provider-native raw rollout JSONL does preserve these semantics in `event_msg.payload.phase`.
4. CodeAI Hub therefore ends up normalizing user-visible dialog from the semantically poorer source while a richer provider-native source already exists locally.

This mismatch has already produced real product-visible failures:

- a turn could end with a large `Codex · Thinking` trace because the SDK-side assistant candidate handling was lossy;
- a later turn mixed progress commentary with reasoning because the live parser could no longer distinguish `commentary` from true `thinking`;
- fixing such issues inside the SDK-stream parser becomes fundamentally limited when the needed metadata is absent upstream.

The result is architectural drift:

- the provider rollout JSONL is effectively the richer truth;
- the SDK stream mirror is the source currently driving dialog normalization;
- CodeAI Hub pays the cost of writing and parsing both while trusting the weaker one for user-visible output.

---

## 2. Evidence

Observed in the local Codex traces for the same live session:

- Raw rollout: `~/.codeai-hub/providers/codex/home/sessions/2026/04/05/rollout-2026-04-05T14-32-39-019d5da1-8406-73e1-9a64-e77662dfed73.jsonl`
- SDK mirror: `~/.codeai-hub/logs/codex/sdk-codex-019d5da1-8406-73e1-9a64-e77662dfed73.jsonl`
- Unified dialog session: `~/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/codexCli/codex-90088705-7679-43ac-aea9-21e067f3b64e-description.jsonl`

What the raw rollout preserves:

- `event_msg.payload.type = "agent_reasoning"` for reasoning-only content;
- `event_msg.payload.type = "agent_message"` with `phase = "commentary"` for progress/user-facing interim updates;
- `event_msg.payload.type = "agent_message"` with `phase = "final_answer"` for the terminal answer.

What the SDK stream mirror exposes for the same turn:

- `sdk:item.completed` with `item.type = "agent_message"` and only `text`;
- no `phase`;
- no reliable separation between commentary and terminal answer.

Conclusion:

- the provider-native rollout already contains the segmentation CodeAI Hub needs;
- the current SDK-driven dialog normalization discards that segmentation;
- any parser built only on top of the SDK stream will remain semantically blind.

---

## 3. Decision

For Codex, CodeAI Hub should treat the provider-native raw rollout JSONL as the single source of truth for user-visible output.

That means:

1. Requests continue to be sent through the SDK/runtime launch path.
2. User-visible output parsing must move to the raw rollout provider events.
3. The SDK event stream is no longer allowed to be the authority for commentary/thinking/final-answer classification.
4. The `sdk-codex-*.jsonl` mirror becomes diagnostics-only and must not drive dialog/history rendering.

This is intentionally not a hybrid enrichment model.

If CodeAI Hub must already wait for raw rollout writes in order to recover the missing semantics, then using the SDK stream as the primary dialog source and raw rollout as an after-the-fact patch source only creates dual-source ordering, dedupe, and replay problems.

---

## 4. Goals

The migration must achieve all of the following for Codex:

1. Commentary, reasoning, and final-answer boundaries are read from provider-native rollout events rather than inferred from text shape.
2. User-visible dialog/history is normalized from one output source only.
3. Multiple assistant segments inside one turn are preserved in order.
4. Cold-start replay and resumed sessions rebuild the same dialog from rollout-derived segments without SDK mirror dependence.
5. Redundant SDK feedback logging for dialog purposes is retired or explicitly reduced to diagnostics-only status.

---

## 5. Non-Goals

- Do not migrate Claude in this scope.
- Do not migrate Gemini in this scope.
- Do not replace the SDK as the turn-send/control-plane entrypoint for Codex in this wave.
- Do not redesign the Project Manager dialog UI beyond fixing semantic source ownership.
- Do not introduce a provider-neutral cross-provider rollout contract yet.

---

## 6. Architecture

### 6.1. Source boundary

For Codex the runtime pipeline must be split explicitly:

- SDK path:
  - create/resume threads;
  - send prompts;
  - keep coarse turn lifecycle and failure transport while needed.
- Raw rollout path:
  - user-visible message segments;
  - reasoning/commentary/final-answer classification;
  - replay/cold-start reconstruction;
  - any provider-native evidence used by dialog normalization.

The output plane must no longer depend on `sdk:item.started|updated|completed` for `agent_message` meaning.

### 6.2. Rollout event classes to trust

The provider rollout parser should treat these events as the primary output surface:

- `event_msg.agent_reasoning`
- `event_msg.agent_message` with `phase = commentary`
- `event_msg.agent_message` with `phase = final_answer`
- `event_msg.task_complete` only as a terminal reconciliation/fallback signal, not as the main source for intermediate segmentation

`response_item` records may still be useful for audits, but they are not the preferred source for user-visible display segmentation when the corresponding `event_msg` already carries stronger semantics.

### 6.3. Normalization rules

The new parser contract must be:

1. `agent_reasoning` becomes visible `thinking` content only.
2. `agent_message.phase = commentary` becomes a normal assistant commentary/progress segment, never `thinking`.
3. `agent_message.phase = final_answer` becomes the terminal assistant answer.
4. Multiple `commentary` messages before the final answer remain separate segments.
5. Missing final answers may be reconciled only from provider-native terminal evidence, not from SDK mirror guesswork.

### 6.4. Live tailing and replay

The rollout reader must support both:

- live turn consumption while the provider is still appending to the rollout file;
- replay from the same file after reconnect/resume/restart.

This requires session-local cursoring:

- last processed file path;
- last processed byte or line offset;
- stable dedupe keys for already-normalized rollout events.

The replay path must not re-emit already delivered segments during the active session, while cold-start rebuild must remain deterministic.

### 6.5. SDK feedback retirement

Once rollout-backed dialog normalization is active:

- `sdk-codex-*.jsonl` may remain as a debug log for launch/runtime diagnostics;
- but it must no longer be treated as a dialog-source log;
- SDK-side `agent_message` mirroring that only duplicates rollout-backed output should be removed or fenced away from the user-visible dialog pipeline.

---

## 7. Implementation Surface

Primary code surface expected in this wave:

- `packages/Codex_Module/src/rollout/` — new raw rollout reader/parser/tail state cluster
- `packages/Codex_Module/src/messaging/` — cut over from SDK `agent_message` routing to rollout-derived dialog routing
- `packages/Codex_Module/src/logging/` — retire or reduce redundant SDK feedback mirroring

Execution planning lives in:

- `doc/TODO/todo-plan.md`

---

## 8. Verification

Minimum acceptance for this migration:

1. Regression for the observed Codex second-turn Description case where `commentary` and `thinking` were mixed in the current product.
2. Regression for the previous empty-terminal-answer pattern so the rollout migration does not reintroduce it.
3. Replay verification from a saved raw rollout file.
4. Resume/cold-start verification that already-emitted rollout segments are not duplicated.
5. Packaged release validation from a new VSIX.

---

## 9. Exit Criteria

This scope is complete only if all of the following hold:

1. Codex user-visible dialog is derived from raw rollout provider events rather than SDK `agent_message` mirrors.
2. `commentary`, `thinking`, and `final_answer` are classified from provider-native semantics.
3. The specific mixed commentary/thinking failure no longer reproduces.
4. The specific empty-terminal-answer failure remains fixed.
5. The active dialog pipeline no longer depends on `sdk-codex-*.jsonl` as a semantic source.
6. A new packaged release is built for user validation.
