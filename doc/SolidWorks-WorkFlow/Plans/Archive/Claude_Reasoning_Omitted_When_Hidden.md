# Claude Reasoning Summary Omitted When Hidden

## Status

Active hotfix scope, accepted by the user on 2026-05-13.

## Problem

When the user disables `Thinking in dialog` (`thinkingDisplaySyncEnabled = false`) for Claude, Core already routes hidden thinking outside the visible transcript and outside the Core overlay translation queue. The Claude SDK turn, however, still requests `thinking: { type: "adaptive", display: "summarized" }`, so Claude continues to emit plain-text `thinking_delta` chunks and a final assembled `thinking` block into the provider stream. The user never sees that reasoning, but tokens are spent producing and transporting it.

## Target Behavior

1. When `thinkingDisplaySyncEnabled = false` and thinking is enabled, the SDK turn must request `thinking: { type: "adaptive", display: "omitted" }` plus the resolved `effort`. The model still reasons but does not surface plain-text `thinking_delta` (Opus 4.7 falls back to encrypted `signature_delta` only; Sonnet/Haiku/older Opus simply stop emitting summary deltas).
2. When `thinkingDisplaySyncEnabled = true`, behavior is unchanged: `display: "summarized"`.
3. When thinking is disabled at the Settings layer, behavior is unchanged: `thinking: { type: "disabled" }` with no `effort` and no `display`.
4. Native request capture diagnostics mirror the same `display` selection so capture artifacts reproduce the actual runtime payload.
5. The Claude messaging cluster (live thinking buffer, thought translation adapter, dialog emitter) remains correct as a no-op when no `thinking_delta` arrives. Hidden Claude thinking already bypasses the Core overlay translation queue at emission time, so no translation work is requested.
6. Release `1.2.252` ships the fix.

## Implementation Notes

- The signal already exists in `AppliedClaudeTurnConfig.thinkingDisplaySyncEnabled` and is threaded by Core through `session-request-handler-applied-turn-config.ts`.
- `claude-sdk-manager.ts:resolveThinkingOptions(snapshot, appliedConfig)` is the only place that picks `display` for the normal turn. Extend the enabled-thinking branch to choose `"summarized"` vs `"omitted"` from `appliedConfig.thinkingDisplaySyncEnabled` (default `true` when absent). The settings-fallback branch keeps `"summarized"` because the snapshot path is the legacy bootstrap-only fallback.
- The diagnostic capture service has its own narrower `ClaudeNativeRequestCaptureAppliedTurnConfig` and a local `resolveThinkingOptions` helper. Extend the type with `thinkingDisplaySyncEnabled?: boolean`, widen `display` to `"summarized" | "omitted"`, and mirror the same selection.
- SSOT update: `Modules/Claude.md` must add the omission invariant under the messaging cluster contract: hidden thinking selects `display: "omitted"`; the live thinking pipeline must remain no-op when no `thinking_delta` arrives.
- No other consumer of `AppliedClaudeTurnConfig` needs to change.
