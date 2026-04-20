# Claude Session List Marker Formatting Architecture

**Date:** 2026-04-20
**Status:** Archived
**Scope:** investigation and fix path for Claude list-marker formatting regressions in Project Manager Session dialog

---

## 1. Problem

Claude currently shows two related but distinct formatting defects in the
Project Manager Session dialog.

### 1.1. Thinking path can split an ordered-list marker away from its item text

Observed user-facing symptoms:

- `2.` appears at the end of one visible thinking chunk;
- the item text (`First-run experience`) appears in the next chunk;
- after UI merge the dialog renders `2.` on its own line or with an extra blank
  line before the item text.

This affects `Claude · Thinking` and is most visible when live reasoning or the
final unseen-tail emission crosses numbered-list content.

### 1.2. Ordinary assistant ordered lists render the marker on a separate line

Observed user-facing symptom in ordinary assistant replies:

- Claude returns valid markdown like `1. **Entry point:** ...`;
- the Session dialog shows `1.` on one line and the item text on the next line.

This happens even when upstream markdown is structurally correct.

---

## 2. Confirmed Evidence

### 2.1. Raw Claude SDK output is correct for the ordinary assistant reply

Runtime artifact:

- `~/.codeai-hub/logs/claude/sdk-claude-33fc6f36-1cd9-400d-bf26-50f1dd9c3f1f.jsonl`

Confirmed `sdk:assistant` / `sdk:result` payload:

- the final assistant reply already contains valid markdown:
  - `1. **Entry point:** ...`
  - `2. **First run without projects:** ...`
  - `3. **Multiple projects:** ...`

Conclusion:

- ordinary assistant list formatting is **not** broken by Claude upstream;
- the defect is introduced by CodeAI Hub runtime/UI handling.

### 2.2. Claude live assistant session JSONL is fragmented at marker boundaries

Runtime artifact:

- `~/.codeai-hub/sessions/.../claude-9496591a-c405-489c-8450-d362087d8517-description.jsonl`

Confirmed append-only live fragments:

- one live assistant message ends with `1.`
- the next live assistant message starts with ` **Entry point:** ...`
- another live assistant message ends with `2.`
- the next live assistant message starts with ` **First run without projects:** ...`

Conclusion:

- the current `ClaudeTextLiveBuffer` is allowed to flush after a marker-only
  tail;
- this creates fragile fragment boundaries even when the final full assistant
  message is valid.

### 2.3. Claude thinking session artifacts confirm the same boundary split

Runtime artifacts:

- `~/.codeai-hub/sessions/.../claude-9496591a-c405-489c-8450-d362087d8517-description.jsonl`
- matching `*.translations.jsonl`

Confirmed thinking fragments:

- one visible thinking fragment ends with `1. ...\n2.`
- the next fragment starts with `First-run experience`
- translated overlay reproduces the same split in Russian

Conclusion:

- the thinking path is currently allowed to materialize a list marker without
  the item text that belongs to it;
- the UI merge path later makes this visible as malformed markdown.

---

## 3. Root Cause

### 3.1. Provider-side live buffers are boundary-aware, but not markdown-list-aware

Current files:

- `packages/Claude_Module/src/messaging/claude-thinking-live-buffer.ts`
- `packages/Claude_Module/src/messaging/claude-text-live-buffer.ts`

Current behavior:

- flush when the unread tail crosses `MIN_FLUSH_CHARS`;
- choose the last boundary matching `[.!?…\n]`;
- emit everything up to that boundary.

Problem:

- `1.` / `2.` satisfies the current sentence-boundary heuristic;
- a flush may therefore end on a marker-only line;
- the next fragment starts with the actual item text.

### 3.2. Thinking UI merge currently injects `\n` between adjacent fragments

Current file:

- `src/client/ui/src/session/dialog-panel-message-utils.ts`

Current behavior:

- `mergeThinkingMessages(...)` joins adjacent thinking fragments with `"\n"`.

Problem:

- if fragment A ends with `2.` and fragment B starts with `First-run...`,
  merged content becomes `2.\nFirst-run...`;
- markdown no longer sees a valid ordered-list item.

### 3.3. Ordinary assistant list rendering is broken by Session UI CSS

Current file:

- `media/session-view.css`

Current behavior:

- `.session-dialog__content ol` and `ul` use `list-style-position: inside`;
- ordinary Claude replies often use loose markdown lists, so React Markdown
  renders `li > p`.

Problem:

- with `inside`, the ordered-list marker belongs to the list item's principal
  box, while the paragraph starts in its own block line;
- the visual result is marker-on-one-line, text-on-the-next-line even though
  the markdown source is correct.

This is a UI-layer defect, not a provider defect.

---

## 4. Accepted Design

### 4.1. Add marker-safe flush guards to Claude live buffers

Both live buffers must stop treating a marker-only tail as a safe flush point.

Required rule:

- if a candidate emitted segment would end with a markdown list marker line
  without following item text, that boundary is rejected;
- the buffer must backtrack to the previous safe boundary;
- if no earlier safe boundary exists, it must keep buffering until more text
  arrives or until terminal flush.

This applies to:

- ordered markers like `1.` / `2.` / `10.`
- unordered markers like `-`, `*`, `+` when they appear as marker-only lines

Goal:

- Claude must never emit a visible fragment whose tail is only a list marker.

### 4.2. Add a merge-time repair guard for adjacent thinking fragments

`mergeThinkingMessages(...)` should become marker-aware.

Required rule:

- if the previous fragment ends with a marker-only line and the next fragment
  starts with normal text, the merge joiner must not be `"\n"`;
- it must join as the same list item line (`" "` or equivalent safe repair)
  after trimming only the artificial split boundary.

Rationale:

- this is defense in depth for already-persisted histories and any residual
  edge case that still reaches the UI;
- provider-side guard remains the primary fix, but UI should not amplify an
  already-bad split into invalid markdown.

### 4.3. Switch Session dialog list markers back to outside positioning

For ordinary assistant and thinking markdown lists in the Session dialog:

- use `list-style-position: outside`;
- keep explicit left padding / indentation in CSS;
- preserve compact nested-list spacing from the existing 1.2.24 formatting work.

Goal:

- valid loose ordered lists rendered by React Markdown must display marker and
  item paragraph on the same visual line.

### 4.4. Do not rewrite valid full assistant markdown upstream

No fix should mutate the final assistant markdown payload when it is already
correct.

Specifically:

- do not add provider-specific regex rewrites to `extractAssistantText(...)`;
- do not rewrite `sdk:assistant` / `sdk:result` content after the fact just to
  compensate for CSS;
- fix the actual owners: live fragment flush policy, thinking merge joiner, and
  Session dialog list CSS.

---

## 5. File-Level Plan

### Stream A - Claude live marker-safe flush

- `packages/Claude_Module/src/messaging/claude-thinking-live-buffer.ts`
- `packages/Claude_Module/src/messaging/claude-text-live-buffer.ts`
- `packages/Claude_Module/src/messaging/claude-text-live-buffer.test.ts`

### Stream B - Thinking merge repair

- `src/client/ui/src/session/dialog-panel-message-utils.ts`
- `src/client/ui/src/session/dialog-panel-message-utils.test.ts`

### Stream C - Session dialog ordered-list rendering

- `media/session-view.css`

### Stream D - SSOT sync after implementation

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`

---

## 6. Verification

Minimum regression guards:

- unit test: thinking live buffer must not flush a segment ending with `2.`
  when the item text has not arrived yet;
- unit test: text live buffer must not flush a segment ending with `1.`
  / `2.` without the list item body;
- unit test: thinking merge must repair `2.` + `First-run experience` into one
  valid list item line;
- visual verification: ordinary ordered list rendered from valid markdown
  `1. **Entry point:** ...` must keep marker and content on the same line;
- visual verification: nested lists remain compact after the CSS change;
- targeted build/test:
  - `npm run build --workspace @codeai-hub/claude-module`
  - relevant Claude messaging tests
  - `npm run build:webview`

---

## 7. Outcome Contract

After the fix:

- Claude thinking must not materialize numbered/bulleted marker-only fragments;
- merged thinking content in PM must remain valid markdown for ordered lists;
- ordinary assistant loose ordered lists must render markers on the same line as
  their item text;
- the same numbered-list prompt from the 2026-04-20 screenshot must display
  correctly in both `Claude` and `Claude · Thinking`.
