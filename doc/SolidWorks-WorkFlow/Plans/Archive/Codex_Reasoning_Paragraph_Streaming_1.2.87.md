# Codex Reasoning Paragraph Streaming — 1.2.87

**Date:** 2026-04-27
**Status:** Accepted for implementation
**Owner:** Codex

## 1. Problem

Release `1.2.86` improved Codex visible progress updates, but a test turn still showed a long perceived gap:

- `09:43:04` — visible assistant message before creating `Final_Description.md`;
- `09:46:33` — app-server fileChange arrived for the created artifact;
- `09:47:00` — first `item/reasoning/summaryTextDelta` arrived in the SDK stream;
- `09:48:41` — current implementation emitted all completed reasoning blocks to the Session dialog.

The current Codex provider path accumulates reasoning summary deltas and emits user-facing `thinking` messages only on `item/completed`. This preserves block integrity, but it makes the user receive several reasoning blocks at once and delays Core-owned translation overlays until the whole reasoning item completes.

## 2. Goal

Stream Codex reasoning summary blocks to the Session dialog sequentially, at paragraph/block granularity, without token-level UI noise and without duplicate reasoning messages on `item/completed`.

The user should see a growing reasoning card earlier, and translation overlays should process emitted blocks one by one.

## 3. Evidence From Test Logs

Observed files:

- SDK log: `/Users/oleksandroliinyk/.codeai-hub/logs/codex/sdk-codex-app-server-2026-04-27T07-40-19-674Z-55569f90-d451-45fe-98d8-582d19e10b97.jsonl`
- Provider rollout: `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/04/27/rollout-2026-04-27T09-40-56-019dcde2-587b-7ea2-858d-2fa1f94971fc.jsonl`

Important timing:

- No SDK/native events were present between `09:43:04` and `09:46:33`; that gap is caused by upstream generation of the large `fileChange`.
- Reasoning item started at `09:46:37`.
- First non-empty summary delta appeared at `09:47:00`.
- Five summary blocks were streamed by the SDK before the final `item/completed` at `09:48:41`.

Conclusion: paragraph-level reasoning streaming will not eliminate the pre-fileChange gap, but it can make the post-fileChange reasoning phase visible much earlier.

## 4. Current Contract

Current Codex module SSOT says:

- `item/reasoning/summaryPartAdded` / `item/reasoning/summaryTextDelta` feed provider-local accumulation only;
- `item/completed` is the canonical user-facing emission point;
- reasoning blocks are emitted as assistant messages with `tag: "thinking"`;
- reasoning visibility and translation are owned by Core after message emission.

This was correct for avoiding token-level fragments, but it is too conservative for app-server summary parts because summary parts already represent user-readable reasoning paragraphs/blocks.

## 5. Proposed Design

### 5.1 Provider-side paragraph buffer

Add a Codex-specific microclass responsible for summary block streaming state.

Responsibilities:

- track text per `threadId + itemId + summaryIndex`;
- track which summary indexes were already emitted;
- expose a method to append summary deltas;
- expose a method to flush completed previous blocks when a new `summaryPartAdded` arrives;
- expose a method to flush remaining blocks on `item/completed`;
- provide stable block IDs: `<itemId>::summary-block::<summaryIndex>`.

The event router should remain a router, not become a buffering implementation.

### 5.2 Emission rules

The provider must not emit every token delta.

Instead:

1. On `summaryPartAdded(index)`:
   - ensure the block slot exists;
   - flush all lower indexes for the same reasoning item that have text and were not emitted yet.
2. On `summaryTextDelta(index)`:
   - append text to the current block only.
3. On `item/completed` for reasoning:
   - prefer final `item.summary[]` only for blocks that were not emitted yet;
   - otherwise use accumulated summary parts for non-emitted blocks;
   - then fallback to `item.content[]`;
   - then fallback to raw `textDelta`;
   - emit only non-empty, not-yet-emitted blocks.

This means a block is usually emitted when the next block begins. In the observed test this would make block 0 visible around `09:47:14` at the latest, instead of waiting until `09:48:41`. A later debounce can be considered separately, but the first implementation should avoid timer complexity unless tests show it is necessary.

### 5.3 UI and translation behavior

No UI-level format change is required for the first pass:

- each emitted block remains an append-only message with `role: "assistant"` and `tag: "thinking"`;
- each message has a unique stable `messageId`;
- Core persists and broadcasts each message separately;
- Core translation overlay translates each block independently;
- Session dialog already merges consecutive thinking messages for visual continuity, so the user sees a growing thinking card rather than five unrelated cards.

## 6. Non-goals

- Do not stream token-level reasoning deltas into the dialog.
- Do not read provider-home rollout JSONL as the live dialog source.
- Do not change unified-session persistence format.
- Do not change the Core translation overlay contract.
- Do not solve the upstream silent period while Codex generates a large fileChange; that requires a separate progress source such as fileChange start/output UI surfacing or stronger provider-side commentary behavior.

## 7. Files Expected To Change

Runtime:

- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts`
- `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-summary-stream-buffer.ts` (new)

Tests:

- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.test.ts`
- `packages/Codex_AppServer_Module/src/app-server/codex-reasoning-summary-stream-buffer.test.ts` (new, if needed)

Documentation:

- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md` if UI merge behavior needs explicit mention.

## 8. Verification

Targeted checks:

- `npm run build --workspace=@codeai-hub/codex-app-server-module`
- relevant Codex app-server tests
- inspect a test turn log to confirm first visible `thinking` message is emitted before reasoning `item/completed`
- confirm no duplicate thinking blocks after `item/completed`
- confirm translation overlays attach per emitted block

Release checks:

- update `CHANGELOG.md` for `1.2.87` before build-all;
- run `./scripts/build-all.sh`;
- run `./scripts/build-release.sh --use-current-version`;
- verify SDK exclusions and VSIX package creation.
