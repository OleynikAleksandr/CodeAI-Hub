# Local Models LM Studio Module Planning

**Status:** Archived accepted planning source
**Created:** 2026-05-28
**Closed:** 2026-05-29 via release 1.2.405 closeout
**Owner:** Oleksandr + Codex

## Goal

Add a local-model translation module backed by LM Studio's OpenAI-compatible API.
The first production use is service translation:

- visible provider Reasoning / Thinking overlays;
- Project Manager / Settings / workflow user-facing localization bundles;
- future model selection from Settings without changing the provider-session model identity contract.

The implementation must use local models as translation engines, not workflow-agent providers.
The existing provider modules remain unchanged.

## Current Empirical Baseline

Local LM Studio 0.4.14 testing on Apple Silicon showed:

- `gemma-4-26b-a4b-it` is the best current candidate for production localization.
- `mistral-small-3.2-24b-instruct-2506-mlx` is slower and less strict with protected terms.
- `ruadaptqwen3-32b-instruct-mlx` needs `/no_think` and still violates some glossary constraints.

The module must not hardcode those three models as the only possible choices.
It should discover locally installed LM Studio models and expose each model as a selectable translation engine.

## Architecture

### Boundary

Create a Core-owned Local Models translation boundary:

- discovery reads LM Studio local model metadata through `lms ls --json` when available;
- translation calls `http://127.0.0.1:1234/v1/chat/completions`;
- each discovered LLM becomes a selectable engine id with the format `lmstudio:<modelKey>`;
- the engine is explicit-only and fail-closed when LM Studio is not running, the model is unavailable, or the response is malformed;
- Core loads CodeAI-owned instances with `codeaihub-*` identifiers and purpose-specific TTL values, then cleans up only idle `codeaihub-*` instances on Local Models provider startup/shutdown.

The local module does not own:

- provider session lifecycle;
- workflow-agent model identity;
- provider picker availability;
- UI localization category ownership;
- user-loaded LM Studio model instances without the `codeaihub-*` identifier prefix;
- LM Studio model download/delete flows in this first production slice.

### Memory Lifecycle

LM Studio models loaded with `lms load` stay in memory unless they have TTL or
are explicitly unloaded. CodeAI Hub therefore treats its own local-model loads as
short-lived external resources:

- localization and generic translation loads use a 300 second idle TTL;
- reasoning translation loads use a 600 second idle TTL;
- workflow-agent loads use an 1800 second idle TTL;
- environment overrides may tune these TTLs without changing persisted project
  settings;
- Core startup/shutdown cleanup unloads only idle `codeaihub-*` instances and
  never issues `lms unload --all`.

This keeps translation warm during active batches while preventing one-off
localization or workflow-agent experiments from pinning large models in memory
after Core restart.

### Settings Surface

Project Manager Settings should show discovered local models in the existing UI Translation Engine and Reasoning Translation Engine selectors.

This keeps the first product surface small:

- selecting `lmstudio:gemma-4-26b-a4b-it` for UI localization materializes interface bundles through that model;
- selecting it for Reasoning translation routes visible reasoning overlays through the same local model;
- existing category language controls and glossary protection stay unchanged.

Future work can add a dedicated Local Models tab with download/delete controls. This scope only makes downloaded LM Studio models selectable and usable.

### Translation Prompt Contract

The LM Studio translation engine must:

- translate only English input to the requested target language;
- return only translated text or JSON when the source is JSON;
- preserve placeholders such as `{providerId}`, `{modelId}`, `%s`, `{{workspaceSlug}}`;
- preserve Markdown structure, code spans, API routes, JSON keys, and protected product/provider terms;
- add `/no_think` for Qwen-family local models to prevent hidden reasoning from consuming the response budget.

### Release Gate

After implementation and verification, Codex must ask for a separate explicit confirmation before release preparation, `build-all.sh`, or `build-release.sh`.

## Verification Plan

Targeted automated checks:

1. local model discovery maps `lms ls --json` entries into `lmstudio:<modelKey>` engine catalogs.
2. local translation engine preserves protected terms/placeholders and calls the OpenAI-compatible endpoint with the selected model key.
3. Settings normalization preserves `lmstudio:*` engine ids instead of falling back to `google-gtx`.
4. Settings UI labels local engines clearly.

Manual/runtime checks after build:

1. Reasoning translation scenario with local engine selected.
2. UI localization bundle scenario with local engine selected.
3. Failure scenario when LM Studio server/model is unavailable.
