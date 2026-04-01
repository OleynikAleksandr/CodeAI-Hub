# Claude + Gemini Thinking Display Architecture

## Status
- Proposed: 2026-04-01
- Approved for execution: 2026-04-01

## Problem
- Gemini already has a product-level display toggle for visible thinking bubbles, but that contract is not owned consistently across all settings layers. The webview/UI model knows about `thinkingDisplaySyncEnabled`, while the extension-side Gemini settings snapshot does not treat it as canonical state.
- Claude currently has no separate user-facing display toggle for thinking in the session dialog.
- Claude still emits live visible thinking as legacy `role: "thinking"`, which the session UI renders as a collapsed gray strip instead of the standard provider-colored assistant bubble path already used by Gemini and Codex `assistant + tag: "thinking"`.
- Some session/continuity helper filters still treat only legacy `role: "thinking"` as suppressible thinking output. If Claude moves to tagged assistant thinking, those helpers must be updated too.

## Goal
- Gemini and Claude must both expose a user-facing setting that controls whether thinking is shown in the session dialog.
- Claude visible thinking must switch to the Codex/Gemini visual contract:
  - `role: "assistant"`
  - `tag: "thinking"`
  - standard provider-colored assistant bubble
  - role label: `<Provider> · Thinking`
- Gemini keeps its current visible assistant-thinking path, but the settings/display contract must become canonical and end-to-end consistent.

## Non-goals
- No change to Codex reasoning-summary semantics in this scope.
- No Claude thinking translation in this scope; Claude thinking remains upstream provider text.
- No change to Claude upstream thinking enablement/max tokens semantics beyond separating them from display-only behavior.
- No removal of legacy `role: "thinking"` support for archived history.

## Current State

### Audited implementation points
- `packages/Claude_Module/src/messaging/claude-stream-event-router.ts` currently emits live Claude thinking as `dialog_message` with `role: "thinking"`.
- `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts` already emits visible Gemini thoughts as `assistant + tag: "thinking"` when display sync is enabled.
- `src/client/ui/src/session/dialog-panel.tsx` and `src/client/ui/src/session/dialog-panel-message-utils.ts` already support both the legacy gray thinking strip and the standard tagged assistant bubble path.
- `packages/core/src/config/provider-turn-config-resolver.ts` already resolves `thinkingDisplaySyncEnabled` for Gemini, but not for Claude.
- `src/client/ui/src/components/settings/thinking-settings.tsx` exposes Claude upstream thinking controls, while `src/client/ui/src/components/settings/gemini-default-model/gemini-default-model-card.tsx` already contains the Gemini-visible thinking toggle.

### Session UI
- The session dialog already supports two visual paths:
  - `role: "thinking"` -> collapsed gray thinking strip
  - `role: "assistant"` + `tag: "thinking"` -> standard assistant bubble path with provider label suffix `· Thinking`
- `dialog-panel-message-utils.ts` already merges both message forms and labels tagged assistant thinking correctly.
- No new session bubble renderer is required for Claude; the missing piece is provider emission + helper compatibility, not a third UI message component.
- But rollover/continuity helpers still suppress only `role: "thinking"` in several places, not assistant-tagged thinking.

### Gemini
- Gemini translated thoughts already emit through `assistant + tag: "thinking"`.
- Gemini has a UI toggle called `Thinking display sync`.
- Core turn config already resolves and forwards Gemini `thinkingDisplaySyncEnabled`.
- Extension-side Gemini settings normalization/storage does not own that field canonically yet, so the end-to-end settings contract is split.

### Claude
- Claude upstream thinking mode is controlled separately through existing `thinking.enabled` and `thinking.maxTokens`.
- Claude stream routing currently emits visible thinking as `role: "thinking"` from `claude-stream-event-router.ts`.
- Claude does not currently expose a separate display-only setting for session-dialog thinking.
- Claude SDK/runtime currently reads applied model overrides, but not display-only thinking overrides.

## Target Design

### 1. Canonical settings contract
- Gemini and Claude both expose a persisted provider setting:
  - `thinkingDisplaySyncEnabled: boolean`
- Default: `true`
- User-facing copy should be short and consistent:
  - Title: `Thinking in dialog`
- Semantics:
  - `true` -> visible thinking bubbles may be emitted into the session dialog
  - `false` -> visible thinking bubbles are suppressed from the session dialog

### 2. Provider-specific semantics

#### Gemini
- Gemini keeps the current transport and display behavior:
  - translated thinking remains `assistant + tag: "thinking"`
- The implementation scope for Gemini is contract cleanup, not transport redesign:
  - canonical persistence through extension settings/storage
  - canonical defaults/load/save behavior
  - aligned UI copy

#### Claude
- Claude keeps existing upstream thinking-mode controls:
  - `thinking.enabled`
  - `thinking.maxTokens`
- New display behavior is separate:
  - if Claude thinking mode is off, no thinking arrives from upstream
  - if Claude thinking mode is on and `thinkingDisplaySyncEnabled = true`, visible thinking is emitted as `assistant + tag: "thinking"`
  - if Claude thinking mode is on and `thinkingDisplaySyncEnabled = false`, visible thinking is not emitted to the session dialog
- Provider raw logs and SDK diagnostics remain unchanged.

### 3. Core / applied-turn-config reuse
- No new websocket or provider transport contract is required.
- The existing `AppliedProviderTurnConfig.thinkingDisplaySyncEnabled` channel is reused.
- Core must resolve Claude and Gemini thinking-display state from the shared settings snapshot and attach it to turn options for both providers.

### 4. Claude runtime path
- Claude needs a thin applied-turn-config reader similar in role to Gemini’s runtime helper, but only for display-only thinking gating.
- The display setting should be stored on the active Claude session/runtime state for the currently executing turn.
- The routing layer then decides whether to emit a visible `dialog_message`.

### 5. Session UI compatibility rules
- New live Claude thinking must no longer go through the gray collapsible strip.
- The gray collapsible `role: "thinking"` path remains only as compatibility fallback for old stored history and old provider sessions.
- UI helpers that currently suppress/filter only `role: "thinking"` must be upgraded to treat `assistant + tag: "thinking"` as equivalent thinking-display content where suppression logic depends on that category.

### 6. Settings UX placement
- Gemini:
  - keep the toggle in the Gemini default-model card
  - rename/copy-tighten the toggle text to the canonical short wording
- Claude:
  - add a display-only toggle inside Claude thinking settings
  - keep it visibly separate from `Enable thinking mode`
- Product law:
  - `Enable thinking mode` controls whether Claude thinks upstream
  - `Thinking in dialog` controls whether visible thinking bubbles are shown locally

## Required Code Changes

### Settings and persistence
- Extension-side Claude/Gemini settings types and defaults
- Extension settings storage normalization/persistence
- Core default settings snapshot alignment
- Webview raw/model/helper state mapping

### Settings UI
- Claude thinking settings card adds the new display toggle
- Gemini toggle wording aligns to the canonical product copy

### Core
- Shared settings snapshot loader exposes Gemini + Claude `thinkingDisplaySyncEnabled`
- Provider turn config resolver resolves that field for both providers
- Applied-turn-config attachment keeps Claude and Gemini aligned

### Claude provider
- Add display-only applied-turn-config plumbing
- Emit `assistant + tag: "thinking"` instead of live `role: "thinking"` for new Claude turns when enabled
- Suppress visible thinking emission when disabled

### Session UI helpers
- Continuity / virtual-conversation suppression helpers must recognize tagged assistant thinking as thinking-display content

## Verification
- `npm run build --workspace @codeai-hub/claude-module`
- Focused Claude tests for visible thinking contract and gating
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## SSOT Impact After Implementation
- Move the final Claude/Gemini thinking-display contract into:
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Keep this planning doc in `Plans/` only until the implementation is completed and the final contract is promoted into SSOT.
