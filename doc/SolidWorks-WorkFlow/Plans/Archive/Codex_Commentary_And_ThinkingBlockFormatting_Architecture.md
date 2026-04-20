# Codex Commentary And Thinking Block Formatting Architecture

**Date:** 2026-04-20
**Status:** Approved for execution planning
**Scope:** restore visible Codex progress commentary on the app-server path and normalize heading/block spacing inside merged Codex thinking cards

---

## 1. Problem

### 1.1. Codex commentary is present upstream but missing in the normalized session trail

Current Codex app-server artifacts show that the provider emits real intermediate `agentMessage` items with `phase: "commentary"` before the terminal `final_answer`.

Observed evidence from the active user session:
- provider-native rollout contains multiple `agent_message` entries with `phase: "commentary"` and one later `phase: "final_answer"`;
- the app-server transport log contains matching `item/started` and `item/completed` notifications for those commentary items;
- the persisted normalized session JSONL contains only `thinking` blocks and one final assistant answer.

Root cause:
- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts` currently emits completed `agentMessage` items only when `phase === "final_answer" || phase === null`;
- `phase: "commentary"` is therefore dropped after the transport layer even though upstream delivered it correctly.

User-facing effect:
- with visible reasoning enabled, the user sees many thinking bubbles and then one terminal answer;
- with visible reasoning disabled, the user sees a long silence and then one terminal answer;
- this regresses the historical Codex UX where the agent kept the user informed with progress commentary during the turn.

### 1.2. Merged thinking cards lose the blank line before the next bold section heading

Current Codex thinking cards are visually merged in:
- `src/client/ui/src/session/dialog-panel-message-utils.ts`

The merge helper currently:
- repairs split list markers inline when needed;
- otherwise joins adjacent thinking fragments with a single `\n`.

However, the current Codex source blocks already arrive as semantic completed sections such as:

```md
**Creating and reading files**

Body...
```

The translated overlay for the observed session preserves exactly that structure per block. The visual defect appears later, when adjacent blocks are merged into one display card with a single newline separator:
- the blank line before the next `**Heading**` is lost;
- the following heading is visually attached directly after the previous body paragraph;
- the existing CSS then still removes the gap after the heading, which makes the rhythm inconsistent.

The resulting screen pattern matches the user screenshot:
- no blank line before the next bold heading block;
- no blank line after the bold heading;
- section rhythm becomes harder to scan.

### 1.3. The issue is not a wrong model flag

This is not primarily a model-selection or reasoning-effort problem.

Upstream artifacts already prove:
- commentary exists;
- completed thinking blocks already have good heading/body structure.

The active defects are introduced inside CodeAI Hub:
- first by app-server commentary filtering;
- then by display-time thinking merge normalization.

---

## 2. Accepted Design

### 2.1. Preserve Codex commentary as a provider-specific non-terminal dialog message

Accepted contract:
- `phase: "commentary"` must be emitted from the Codex app-server router as a non-terminal `dialog_message`;
- the emitted message keeps `role: "assistant"` and carries `tag: "commentary"`;
- `phase: "final_answer"` continues to materialize as terminal `type: "assistant"`;
- no new global `SessionMessageRole` is introduced for this scope.

Reasoning:
- the shared session model already distinguishes terminal assistant answers from non-terminal dialog messages;
- introducing a new global role would force broader changes across storage, bridge, UI, dedupe, and translation layers with little benefit;
- a provider-specific `tag` preserves semantics without widening the global contract unnecessarily.

### 2.2. Thinking merge must preserve semantic block boundaries before standalone bold headings

Accepted merge policy for adjacent thinking display fragments:
1. If the boundary is a split marker-only markdown list item tail, repair it on the same line.
2. Otherwise, if the next fragment begins with a standalone bold heading paragraph followed by body text, preserve a blank paragraph boundary before that heading block.
3. Otherwise, keep the existing compact continuity join for generic live-fragment stitching.

This means the merge helper becomes block-aware rather than only line-aware.

Desired visible result:
- blank line before each new bold section heading block;
- no blank line between a standalone bold heading and its own body;
- no regression for list marker repair such as `2.` + `First-run experience`.

### 2.3. CSS remains the render-layer guard for "no gap after heading"

`media/session-view.css` already contains the render-layer rule that suppresses the extra gap after a standalone bold-only heading paragraph.

Accepted render contract for this scope:
- the UI should keep the visual gap before a standalone bold heading block;
- the UI should not insert an extra gap between that heading and the immediately following body;
- any CSS adjustment in this scope must remain minimal and must not regress ordered/unordered list spacing.

The primary fix is still the merge-boundary normalization. CSS is a follow-up guard, not the main data repair layer.

### 2.4. Scope boundary

This scope does not:
- reintroduce live sentence-level Codex reasoning bubbles;
- change final-answer rendering semantics;
- create a dedicated commentary panel;
- add a new cross-provider global role.

---

## 3. File-Level Plan

### Stream A — App-server commentary normalization
- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts`
- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.test.ts`

### Stream B — Thinking merge boundary normalization
- `src/client/ui/src/session/dialog-panel-message-utils.ts`
- `src/client/ui/src/session/dialog-panel-message-utils.test.ts`

### Stream C — Session markdown spacing revalidation
- `media/session-view.css`

### Stream D — SSOT synchronization
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`

---

## 4. Verification

Minimum acceptance checks:
- Codex app-server sessions must persist and display intermediate commentary updates before the final answer.
- When `Reasoning in dialog` is disabled, the user must still receive Codex progress commentary during the turn.
- Merged Codex thinking cards must preserve a blank line before each standalone bold section heading block.
- Standalone bold headings must not keep an extra gap between the heading line and its body text.
- Existing split-list repair must remain green.
- Targeted verification must include:
  - `npm run build --workspace @codeai-hub/codex-app-server-module`
  - `node --test packages/Codex_AppServer_Module/dist/app-server/codex-app-server-event-router.test.js`
  - `npm exec -- tsx --test src/client/ui/src/session/dialog-panel-message-utils.test.ts`
  - `npm run build:webview`

---

## 5. Outcome Contract

After implementation:
- Codex commentary will again reach the Project Manager dialog as visible non-terminal progress updates;
- Codex final answers will remain terminal assistant messages;
- merged Codex thinking cards will preserve section rhythm for bold headings;
- the user will no longer experience the combination of "many thoughts + no progress updates" or "long silence + one final blob" on the app-server line.
