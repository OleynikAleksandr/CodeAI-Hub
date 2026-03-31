# Codex Reasoning Summary Settings Architecture

## Status
- Proposed: 2026-03-31
- Approved for execution: 2026-03-31

## Problem
- Codex reasoning visibility is currently controlled by two different mechanisms:
  - upstream provider config `CODEX_HOME/config.toml -> model_reasoning_summary`
  - local CodeAI Hub presentation flag `thinkingDisplaySyncEnabled`
- This is misleading for Codex. When `model_reasoning_summary = "none"`, reasoning summaries are not delivered to CodeAI Hub at all. There is nothing to translate or display.
- Current provider-home config generation also hardcodes `model_reasoning_summary = "auto"`, so user intent cannot become the stable source of truth.
- The settings UI does not describe the real behavior clearly enough.

## Goal
- Codex must expose one user-facing setting for reasoning visibility in dialog.
- That setting must be the single source of truth for Codex reasoning summaries:
  - `On` -> provider-owned `config.toml` gets `model_reasoning_summary = "auto"`
  - `Off` -> provider-owned `config.toml` gets `model_reasoning_summary = "none"`
- If Codex does not send reasoning summaries, CodeAI Hub does not attempt to translate or display them.
- Codex must no longer keep a second independent display-only gate for the same behavior.

## Non-goals
- No change to Gemini thinking transport semantics in this scope.
- No change to Codex reasoning effort selection per model in this scope.
- No change to transcript compatibility for already stored legacy thinking records.

## Current State

### Upstream reality
- Codex reasoning summaries are controlled by `model_reasoning_summary` in `config.toml`.
- `default_reasoning_summary` is legacy/non-stable and must be normalized away.
- `models_cache.json` is only an upstream cache and must not be used as the source of truth.

### CodeAI Hub reality
- Codex reasoning is translated and emitted on the Gemini-like visible assistant path.
- A separate local flag still suppresses the visible bubble even when reasoning already arrived.
- Provider-home config materialization currently forces `"auto"` instead of reading the saved Codex setting.

## Target Design

### 1. Canonical setting
- Add a Codex-specific settings field: `reasoningSummaryEnabled: boolean`.
- Backward compatibility:
  - if `reasoningSummaryEnabled` is absent, fall back to legacy `thinkingDisplaySyncEnabled`
  - default remains `true`

### 2. Provider-home config contract
- `~/.codeai-hub/providers/codex/home/config.toml` remains provider-owned.
- It is materialized from the user base config `~/.codex/config.toml` plus CodeAI overrides.
- Current override scope:
  - `model_reasoning_summary = "auto" | "none"`
- `auth.json` may remain linked or copy-migrated from `~/.codex/auth.json`.

### 3. Runtime behavior
- Codex runtime reads the saved settings snapshot and resolves reasoning summary mode before materializing provider-home config.
- The local Codex-only `thinkingDisplaySyncEnabled` gate is removed from the reasoning emit path.
- Effective behavior becomes upstream-driven:
  - `none` -> no reasoning summaries arrive, no translation/display path is exercised
  - `auto` -> reasoning summaries may arrive, and if they do, CodeAI Hub translates and shows them

### 4. Settings UX
- Codex settings card exposes one short checkbox for this behavior.
- Recommended UI copy:
  - Title: `Reasoning in dialog`
  - Description: `When enabled, Codex can send reasoning summaries. CodeAI Hub translates them and shows them in the dialog.`
- Existing note remains: changes apply to new Codex sessions.

### 5. Immediate sync requirement
- When the checkbox is toggled in the settings UI, provider-home `config.toml` must be updated immediately so the generated Codex home reflects the selected mode without waiting for a future provider bootstrap.
- Persisted settings remain the long-term source of truth used on the next startup/release.

## Required Code Changes

### Settings/UI layer
- Extension settings snapshot types and normalization for `reasoningSummaryEnabled`
- Webview settings raw/model/helper wiring
- Codex settings card rename and copy update
- Immediate extension-side provider-home config sync on toggle

### Core/provider turn-config layer
- Stop resolving/passing Codex `thinkingDisplaySyncEnabled` as a second source of truth
- Keep Gemini `thinkingDisplaySyncEnabled` untouched

### Codex provider layer
- Resolve reasoning summary mode from saved settings snapshot
- Use that mode in auth bootstrap and SDK sanitize paths
- Keep provider-home config materialization centralized

## Verification
- `npm run build --workspace @codeai-hub/codex-module`
- `node --test packages/Codex_Module/dist/auth/*.test.js packages/Codex_Module/dist/sdk/*.test.js`
- `npm run build --workspace @codeai-hub/core`
- `npm run typecheck:webview`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## SSOT impact after implementation
- Move the final Codex reasoning-summary setting contract into:
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Remove this planning doc from active `Plans/` after the scope is completed and migrated into SSOT.
