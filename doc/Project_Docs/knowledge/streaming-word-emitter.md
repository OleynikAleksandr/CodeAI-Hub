# Streaming Word Emitter Implementation

**Source plan:** `doc/tmp/TODO_Plan_Phases.md`
**Module:** streaming-mode-module
**Version:** Introduced in v1.22.65 (updated v1.22.68)

---

## Summary
- Added `StreamingWordEmitter` micro-class to emit assistant responses word-by-word while keeping Markdown styles intact.
- Updated `StreamingEventHandler` to delegate incremental updates to the emitter.
- Webview auto-scroll now follows the tail of the dialog unless the user scrolls upwards.
- Plain-text fallback in UI (v1.22.67) keeps `white-space: pre-wrap`, so temporary unformatted states preserve newline structure.

## Emitter Responsibilities
- Maintain per-message state (`buffer`, `emittedLength`, `lastRawLength`).
- On each `content_block_delta`, slice new text, break into segments (words, whitespace, punctuation, newline markers).
- Rebuild structured blocks via `formatStaticText` for each emitted segment, ensuring formatting consistency.
- Handle rewinds (when accumulated text shrinks) by resetting state and reprocessing.
- Force flush on message_stop to emit any remaining content.

### Segment Rules
- `splitSegments` treats `\n`, whitespace, punctuation (`.,!?;:()[]{}` etc.), and hyphen-space (`- `) boundaries as emission points.
- Remaining partial word stays in buffer until more text arrives or message completes.
- Inline-code guard (v1.22.68): while a backtick stack is open, additional formatting markers (`**`, `__`, `~~`) are ignored so ordered lists continue to emit new items even when chunks contain `` `**/*.ts` ``.

## Integration in StreamingEventHandler
- `handleMessageStart`: resets formatter state, calls `wordEmitter.start`.
- `handleContentBlockDelta`: accumulates text, feeds emitter; each emission triggers `buildIncrementalMessage` with new content/blocks.
- `handleMessageStop`: flushes emitter, then emits final message via existing builder; clears formatter state.
- `cancelStreaming/cleanup`: propagate to emitter to avoid memory leaks.

## Auto-Scroll UX
- `DialogRendererFacade` tracks whether the user is at the bottom (`distanceFromBottom <= 40`).
- When auto-scroll is active, new messages scroll smoothly into view; manual scroll upwards pauses auto-scroll until user returns to bottom.

## Testing / Verification
- Manual verification in dev VSIX builds, including regression on JSONL replay (`doc/sdk-sessions/sdk-session-fd69ef53.jsonl`).
- Architectural checks (`npm run compile`) ensure file-size constraints remain within limits.
- Release script (`./build-release.sh <version>`) bundles React UI and packages VSIX; current validated version `1.22.68`.

---
*This document captures the implemented plan from `doc/tmp/TODO_Plan_Phases.md`.*
