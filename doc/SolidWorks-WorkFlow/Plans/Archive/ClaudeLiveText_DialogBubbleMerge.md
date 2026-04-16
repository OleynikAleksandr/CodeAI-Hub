# Claude Live Text — Dialog Bubble Merge

**Scope:** retest fix for 1.1.998 regression. Live `text_delta` fragments currently render as one dialog card per sentence; fix so they render as a single growing card, symmetric to how consecutive thinking deltas already collapse.

## Problem

After Phase 1 of Session 037, `emitClaudeAssistantLiveText` emits each readable segment as an append-only assistant message with a unique uuid suffix. Multiple segments in one turn → multiple dialog cards. Thinking has the same emit pattern but *looks* merged in UI because `mergeThinkingMessages` in [dialog-panel-message-utils.ts](../../../../src/client/ui/src/session/dialog-panel-message-utils.ts) collapses consecutive thinking-display messages. No equivalent pass exists for live assistant text.

Provider-side emit is correct and must not change — stable per-segment `messageId`s are required by Invariant 25 so Core translation overlays can attach `localizedContent` to each bubble independently. The fix lives on the UI rendering side.

## Root cause

`mergeThinkingMessages` matches on `role === "thinking" || (role === "assistant" && tag === "thinking")`. Live assistant text messages satisfy neither predicate — `role === "assistant"` with no `tag` — so they fall through the merge and render one-per-segment.

## Solution

One UI-side change in `dialog-panel-message-utils.ts`, mirroring thinking merge:

- Mark live emits with a distinguishable signal. Minimal-invasive option: add `tag: "live"` to `emitClaudeAssistantLiveText` output (same mechanism thinking already uses). Does not change provider emit semantics, only labels the bubble.
- Add `mergeLiveAssistantMessages(messages)` pass with predicate `role === "assistant" && tag === "live"`, `\n`-join of `content` and `localizedContent`, keeps the first bubble's messageId.
- In `DialogPanel.displayMessages` run both passes: `mergeLiveAssistantMessages(mergeThinkingMessages(messages))`. Order matters — thinking between live plates must break the live group, and vice versa; running them sequentially enforces this by construction.
- Role label for the merged bubble stays "Assistant" (or provider label), not "Thinking" — existing `resolveRoleLabel` already returns the right value because `tag` is only consulted for the thinking case.
- `virtual-conversation.tsx` does not render directly — it builds `SessionMessage[]` and hands it to `DialogPanel`. No change needed there.

## Interactions with existing behavior

- **Final dedup.** Router-level final text dedup (`consumeFinalText`) already ensures we either skip the final assembled bubble (fully covered) or emit only the tail as a live bubble. Both cases remain correct: fully-covered → nothing new; tail → additional live bubble merges into the existing card.
- **Translation overlays.** `resolveDisplayContent(previous) + "\n" + resolveDisplayContent(next)` pattern (already used by thinking merge) handles per-bubble `localizedContent` correctly. If translation for some segments has not yet arrived, merged `localizedContent` falls back to raw `content` per segment — matches current thinking behavior.
- **Segment boundaries / non-live assistant.** `isSegmentBoundaryMessage` and any non-live (untagged) assistant message break the group because they don't satisfy the predicate. Expected behavior.

## Definition of Done

- Consecutive live assistant fragments render as one dialog card with growing content.
- Thinking bubbles between live fragments break the live group (two separate live cards before/after a thinking card).
- Non-live assistant message breaks the live group.
- `localizedContent` assembles correctly for fully-localized, partially-localized, and untranslated cases.
- New unit tests in `dialog-panel-message-utils.test.ts` covering the four cases above.
- Existing `mergeThinkingMessages` tests stay green.
- Release 1.1.999 packaged: VSIX + tarballs in `doc/tmp/releases/`, SSOT Invariant 25 extended with one-line UI-merge note.

## Out of scope

- No change to provider emit (`emitClaudeAssistantLiveText` signature/semantics) beyond adding a `tag: "live"` literal.
- No change to info-card effort display (decision: applied identity stays authoritative — see memory `feedback-applied-vs-settings-surface.md`).
- No change to `ClaudeTextLiveBuffer` flush thresholds.
- No new Settings toggles.
