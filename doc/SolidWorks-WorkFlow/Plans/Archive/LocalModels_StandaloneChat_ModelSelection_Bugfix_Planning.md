# Local Models Standalone Chat Model Selection Bugfix Planning

**Date:** 2026-06-23
**Owner:** Codex
**Status:** Accepted for immediate bugfix scope

## Problem

Standalone Project Manager chat sessions using provider `localModels` do not reliably expose or apply the selected LM Studio model:

- the lower Session Status Panel may show no useful Local Models model identity;
- choosing Local Models in a standalone chat can run the first LM Studio model from discovery instead of the selected/default model;
- `LocalModelsProviderAdapter` currently falls back to `models[0]` when the requested model id does not match a discovered `modelKey`, which hides selection/binding bugs.

## Goal

Make Local Models standalone chat behavior explicit and debuggable:

- Session Status Panel renders Local Models model identity when `status.models[0]` is present;
- Local Models picker/switch keeps session-scoped model identity visible;
- provider runtime uses the requested model id from applied turn config/env when it matches a discovered model;
- provider runtime fails with a clear diagnostic when a requested model id is unavailable, instead of silently running the first discovered model;
- no workflow-step changes and no new orchestration layer.

## Non-goals

- No Chat Intake Preflight implementation.
- No dynamic tool/system-prompt generation.
- No release build in this scope.
- No LM Studio model download/delete/configuration UI.

## Relevant Files

- `packages/core/src/local-models/local-models-provider-adapter.ts`
- `packages/core/src/local-models/local-models-provider-adapter.test.ts`
- `src/client/ui/src/session/status-panel.tsx`
- `src/client/ui/src/session/status-panel.test.tsx`
- `doc/SolidWorks-WorkFlow/Modules/LocalModels.md`
- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`

## Test Seed From User Experiment

Local model sample: `Gemma 4 E4b Qat`.

Observed output quality:

- understood the broad intent and correctly asked for clarification;
- produced malformed JSON-like output, so it is not contract-safe without schema validation/repair;
- over-generalized the request into "general project analysis";
- invented/garbled a path (`/Users/oleksandroliinykVSCODETest_png`);
- missed several requested fields' syntax boundaries.

Initial conclusion: useful as a cheap clarification classifier only if Core enforces a strict schema and keeps the original user text as source truth.
