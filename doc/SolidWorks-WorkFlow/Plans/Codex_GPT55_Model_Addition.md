# Codex GPT-5.5 Model Addition And Prompt Inventory

**Status:** Active planning
**Date:** 2026-04-25
**Owner:** Oleksandr + Codex

## 1. Problem

The Codex provider settings currently expose the tested Codex model set, including `gpt-5.3-codex`, `gpt-5.4`, and `gpt-5.4-mini`. OpenAI now has `gpt-5.5` available in the Codex tool schema, and we need to add it as a selectable Codex model so the native request capture workflow can collect its real provider base/system instructions.

The immediate product need is diagnostic, not prompt tuning:
- add `gpt-5.5` next to the existing Codex model buttons;
- keep the same reasoning levels as `gpt-5.4`: `low`, `medium`, `high`, `xhigh`;
- keep all existing models unchanged;
- build a release, let the user capture `gpt-5.5`, then compare the system/base instructions against `gpt-5.3-codex` and `gpt-5.4`.

## 2. Current Evidence

The `1.2.75` full base prompt retake release already proved that `gpt-5.3-codex` and `gpt-5.4` do not share an identical provider base prompt.

Known evidence from captured markdown logs:
- `gpt-5.3-codex` (`2026-04-25T09-28-41-532Z`): base instructions length `12343`, sha256 `6fdc9b734797bf69f7982c747cd869a834615baab4244bd1bb7676625717f598`.
- `gpt-5.4` (`2026-04-25T10-25-45-352Z`): base instructions length `14732`, sha256 `478e8a11b180adb2659f21aba51744711f79f665039bb0bc4a13d3c051fcb76c`.
- Workflow prompt stayed identical across those two captures: length `12973`, sha256 `90054eee3308614b58dcc59671fa7d117f9e649d558e95e10d205fa492c192a8`.
- Both captures had `thread/start.config.project_doc_max_bytes = 0` and no `thread/start.baseInstructions`, so the observed difference is model-specific provider base instructions, not project `AGENTS.md` noise or our compact replacement prompt.

Because the base prompt is already model-specific between 5.3-Codex and 5.4, `gpt-5.5` must be inventoried before deciding whether `Codex_My_System_Prompt.md` should stay shared or become model-specific.

## 3. Implementation Contract

### Model registry

Add `gpt-5.5` to the shared Codex model registry with the same user-facing capability shape as `gpt-5.4`.

Expected properties:
- id: `gpt-5.5`
- display name: `GPT-5.5`
- reasoning levels: inherited through the existing Codex settings contract (`low`, `medium`, `high`, `xhigh`)
- default reasoning: `medium`, matching the current persisted defaults used for other Codex settings models
- existing models remain unchanged

### Settings UI

`Settings -> General -> Provider Native Request Capture` already renders Codex capture model buttons from `CODEX_SETTINGS_MODELS`. Therefore the correct UI change is to add the model to the registry, not to hard-code a separate button.

The same registry also feeds the Codex default model settings card, so `gpt-5.5` will become selectable there through the same source of truth.

### Core settings/defaults

Core settings validation and persisted snapshot defaults must accept `gpt-5.5`, otherwise the UI can present the model but Core may reject or omit its reasoning setting.

Required code surfaces:
- `src/types/codex-model-registry.ts`
- `packages/core/src/config/provider-defaults-resolver.ts`
- `packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts`

Optional verification surface:
- `packages/core/src/config/index.test.ts`, only if a narrow regression assertion is needed.

## 4. Release And Test Flow

1. Commit planning documents.
2. Add `gpt-5.5` to the model registry and Core settings defaults.
3. Run targeted builds/tests for touched areas.
4. Prepare release notes for the next version.
5. Build a new release.
6. Stop after the build and wait for the user to install, run the native capture test with `GPT-5.5`, and provide logs.
7. Compare the fresh `gpt-5.5` capture with known `gpt-5.3-codex` and `gpt-5.4` captures.
8. Decide whether compact Codex base instructions can be shared across models or need a model-specific branch.

## 5. Non-Goals

- Do not remove or rename existing Codex models.
- Do not change the active diagnostic flags in the Codex capture path during the model-addition release.
- Do not reintroduce `thread/start.baseInstructions` until after `gpt-5.5` full base prompt inventory is captured.
- Do not change Claude or Gemini model lists.
