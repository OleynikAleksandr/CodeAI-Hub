# Local Models Persistent LM Studio Loads Planning

**Status:** Accepted for implementation
**Date:** 2026-06-20
**Scope:** Keep selected LM Studio reasoning-translation and Local Models workflow-agent models loaded while Core is running, and swap them only when Settings selection changes.

## Problem

The current LM Studio runtime load policy was designed for short-lived CodeAI-owned workers:

- selected reasoning translation and workflow-agent models are warmed on Project Manager settings load;
- later translation or workflow-agent calls can unload idle CodeAI-owned workers for other model keys;
- selected loads use finite TTL, so LM Studio may eject them after idle time;
- Settings save does not schedule a new local-model warmup/reconcile.

This causes the selected reasoning translation model and the selected Local Models workflow model to evict each other, then reload on demand.

## Target Behavior

- If `general.localization.reasoningEngineId` is `lmstudio:<modelKey>`, that model is a protected selected reasoning-translation target.
- If `providers.localModels.defaultModel` or `CODEAI_LMSTUDIO_DEFAULT_MODEL` is set, that model is a protected selected workflow-agent target.
- Both selected targets are loaded during Project Manager startup warmup.
- Selected targets are loaded without idle TTL.
- Runtime translation/workflow calls must not unload the other selected CodeAI-owned model.
- When Settings saves a different selected local model, Core schedules the same local-model reconcile so the new selected model loads and idle stale CodeAI-owned workers can unload.
- Core still never unloads user-loaded LM Studio instances.

## Minimal Implementation

- Reuse `LocalModelsRuntimeLoadManager`; do not add a new daemon or background service.
- Stop cross-model unloads from ordinary `ensureModelLoaded` calls. Finite-TTL one-off generic/localization loads can expire naturally.
- Add a persistent-load option that omits `--ttl`.
- Add a narrow cleanup helper that unloads idle CodeAI-owned workers except selected model keys during warmup/reconcile.
- Schedule local-model warmup after `settings:save`, matching existing `settings:load` behavior.

## Verification

- Targeted Node tests for local-model runtime load manager, warmup service, and settings save scheduling.
- `npm run build --workspace=@codeai-hub/core`
- `npm run plan:validate`

## Release

User explicitly requested a new release build on 2026-06-20 after implementation.
