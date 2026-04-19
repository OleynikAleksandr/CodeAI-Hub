# Codex Final Summary Reasoning Rendering Architecture

**Date:** 2026-04-19
**Status:** Completed
**Scope:** bugfix for Codex reasoning rendering contract and standalone bold heading rhythm in Session UI

---

## 1. Problem

### 1.1. Current Codex live reasoning materialization breaks semantic paragraph boundaries

Current Codex app-server integration materializes visible `thinking` bubbles from live `item/reasoning/summaryTextDelta` and optional `item/reasoning/textDelta`.

To avoid token-level bubbles, `CodexReasoningLiveBuffer` currently:
- accumulates deltas per item;
- waits until the unread tail exceeds `240` characters;
- flushes the tail only at `[.!?…\n]` boundaries.

This readable chunking was introduced as a UX mitigation for token streaming, but it is still sentence/length driven rather than semantic-block driven.

Observed effect:
- a standalone bold section title may be emitted at the end of one live bubble;
- its body may arrive as the next bubble;
- translation and markdown normalization then receive already broken units and cannot reliably reconstruct the original structure.

### 1.2. Final upstream artifact is already better structured than our live readable buffer

Transport/runtime artifacts from the same user session show two layers:
- live `summaryTextDelta` arrives almost token-by-token or word-by-word;
- the final `item/completed.summary[]` payload already contains completed section blocks.

For the observed problematic case this means:
- live stream produced a split around `**Crafting concise questions**`;
- final `item/completed.summary[]` already grouped `**Exploring model synchronization** ...` and `**Crafting concise questions** ...` as separate completed blocks.

So the current CodeAI Hub live buffer is not repairing upstream fragmentation. It is degrading a structure that upstream already assembles correctly by completion time.

### 1.3. Translation is not the root cause for this Codex reasoning bug

`reasoning` translation in the shared translation module already uses disabled translation chunking by default.

Therefore:
- the translator is not splitting this text;
- the translator only sees the already fragmented units that the Codex provider path emits;
- changing translation prompts alone cannot fix heading/body splits that happen before translation.

### 1.4. There is also a secondary render-layer rhythm issue for standalone bold heading paragraphs

Even when a standalone bold heading is already isolated correctly, current Session UI spacing can still leave the visual gap after the heading instead of only before it.

This is not the primary root cause of the observed Codex bug, but it remains a valid follow-up polish after provider-side block emission is corrected.

---

## 2. Accepted Design

### 2.1. User-facing Codex reasoning must be emitted from completed summary blocks, not from live deltas

Visible Codex `thinking` messages must no longer be materialized from `summaryTextDelta` or `textDelta`.

New contract:
- `item/reasoning/summaryPartAdded`, `item/reasoning/summaryTextDelta`, and optional `item/reasoning/textDelta` may still be observed and accumulated;
- but they are not emitted to dialog history/UI as live `thinking` bubbles;
- user-facing reasoning emission happens only on `item/completed`.

### 2.2. Canonical block selection order on `item/completed`

For a completed reasoning item the provider must choose final visible blocks in this priority order:
1. `item.summary[]`
2. accumulated summary parts from `summaryPartAdded` + `summaryTextDelta`
3. `item.content[]`
4. accumulated raw `textDelta`

Rules:
- empty blocks are dropped;
- each non-empty block is emitted as its own `thinking` message;
- markdown must be preserved as-is inside each emitted block;
- no post-hoc tail reconciliation is needed once live user-facing emission is removed.

### 2.3. `CodexReasoningLiveBuffer` changes responsibility

The current buffer no longer owns:
- readable chunk extraction;
- `MIN_FLUSH_CHARS`;
- sentence-boundary-based live flushing.

Its new responsibility is only:
- keep per-item accumulated reasoning state until `item/completed`;
- support the fallback order above if the final item payload is partially populated;
- reset state after final emission.

If implementation is cleaner by renaming/replacing the class with a narrower accumulator, that is allowed, but the public reasoning contract above is fixed.

### 2.4. Translation impact

No change is required in the translation chunk planner for this scope.

Improvement comes from a different layer:
- Codex provider emits complete semantic blocks;
- translation then receives those blocks as ordinary reasoning messages;
- existing no-chunk reasoning translation policy remains intact.

### 2.5. Session UI heading-spacing follow-up

After provider-side final-summary emission is in place, standalone bold heading paragraphs must be re-tested in Session UI.

If the visual rhythm is still inverted, a minimal render-layer correction is allowed, but only for the standalone-heading pattern. The provider-side block-emission contract must remain the primary fix.

Accepted minimal form:
- keep the regular paragraph gap before a standalone bold-only heading paragraph;
- suppress the extra gap on the immediately following sibling, e.g. selector shape equivalent to `p:has(> strong:only-child) + *`.

### 2.6. Accepted tradeoff

This design intentionally removes progressive live reasoning animation for Codex.

Accepted tradeoff:
- later but semantically intact paragraph blocks are preferred;
- faster but structurally broken live fragments are no longer acceptable for user-facing reasoning.

---

## 3. Non-goals

- Do not change the shared translation chunk planner for this scope.
- Do not add heuristic regex/AI rules that reinterpret any inline bold phrase as a heading.
- Do not change assistant final-answer emission.
- Do not change user-facing `Response Mode` semantics.
- Do not change the `Reasoning in dialog` toggle contract; when reasoning is disabled, no reasoning bubbles should appear at all.

---

## 4. File-Level Plan

### Stream A — Codex final-summary reasoning emission
- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts`
- `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-live-buffer.ts`

### Stream B — Regression coverage for the new reasoning contract
- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.test.ts`
- `packages/Codex_AppServer_Module/package.json`

### Stream C — Optional Session UI heading-spacing polish
- `media/session-view.css`

### Stream D — SSOT synchronization after implementation
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`

---

## 5. Verification

Minimum implementation guards:
- the observed `**Crafting concise questions**` case must render as one complete reasoning block with its body, not as two bubbles;
- no user-facing `thinking` bubbles may be emitted from live `summaryTextDelta` token/sentence fragments;
- if `item.summary[]` is absent, fallback emission must still materialize complete reasoning from accumulated summary/content/text state;
- `npm run build --workspace @codeai-hub/codex-app-server-module` must pass;
- downstream confidence builds for impacted surfaces must pass (`@codeai-hub/core`, Webview path as needed);
- if the CSS stream is executed, standalone bold heading spacing must be re-checked against the original user screenshots/scenario.

---

## 6. Outcome Contract

After implementation:
- visible Codex reasoning must be emitted as completed semantic blocks rather than readable live chunks;
- paragraph heading/body boundaries must follow upstream final summary blocks;
- translation and markdown normalization must receive intact reasoning blocks instead of provider-split fragments;
- Session UI must not preserve inverted spacing around standalone bold heading paragraphs if the optional CSS polish stream is executed.
