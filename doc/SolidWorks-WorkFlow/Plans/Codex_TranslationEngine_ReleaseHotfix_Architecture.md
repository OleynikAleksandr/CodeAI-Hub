# Codex Translation Engine Release Hotfix — Architecture Plan

## Status
- Proposed on 2026-04-13 for release `1.1.975` regression hotfix.
- Scope owner: Codex rollout/runtime integration.

## Problem

Release `1.1.975` introduced selectable translation engines for live thinking translation. In the field, `Localization > Translation Engine = OpenAI Codex · GPT-5.3 Codex Spark` exposed a broken runtime path in Codex sessions:

1. visible rollout thinking stayed in English for the whole turn instead of being upgraded through the translation overlay;
2. the provider completed the turn, but the final assistant reply never appeared in the dialog when the session was running under `outputSchema` workflow stages.

Affected reproduction workspace:
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`

Affected diagnostic artifacts:
- `~/.codeai-hub/logs/core/core.log`
- `~/.codeai-hub/logs/codex/sdk-codex-*.jsonl`
- `~/.codeai-hub/providers/codex/home/sessions/**/rollout-*.jsonl`
- `~/.codeai-hub/sessions/**/codex-*.jsonl`

## Confirmed Root Causes

### 1. Double translation on rollout thinking

`CodexRolloutLiveSync` translated rollout thinking provider-locally before emitting `dialog_message`, while Core already owned the new translation overlay path for persisted dialog/thinking messages.

Result:
- rollout thinking was translated twice;
- model-backed Codex translation engines were invoked from inside an active Codex turn;
- Core later received `fallback / empty_translation`, so the original English thinking remained visible.

### 2. Structured-output final answer drop

Rollout `final_answer` content was passed through `StructuredOutputStreamController.complete(...)` even when the provider returned plain text under an `outputSchema` stage. When structured parsing yielded no `assistantText`, `CodexRolloutLiveSync` silently returned without emitting an `assistant` message.

Result:
- raw rollout logs contained the final answer;
- UI showed the thinking trail only;
- the turn ended without a visible final assistant reply.

## Decision

### A. Core owns rollout-thinking translation overlays

For Codex rollout replay/live sync, the provider must emit source-first thinking only. Translation overlays remain a Core responsibility after message persistence.

This keeps one translation owner for visible thinking and avoids nested Codex translation calls inside a live Codex turn.

### B. Rollout final answers must have a safe plain-text fallback

If structured-output parsing does not produce `assistantText`, but the raw rollout payload is non-empty plain text, `CodexRolloutLiveSync` must still emit the raw text as the final assistant reply.

Guardrail:
- no fallback for obviously structured payloads starting with `{` or `[`.

## Target Files

### Code
- `packages/Codex_Module/src/rollout/codex-rollout-live-sync.ts`

### Regression tests
- `packages/Codex_Module/src/rollout/codex-rollout-live-sync.test.ts`
- existing replay/empty-terminal tests remain verification targets

### SSOT sync
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

## Validation Plan

1. Targeted regression tests:
   - `./node_modules/.bin/tsx --test packages/Codex_Module/src/rollout/codex-rollout-live-sync.test.ts packages/Codex_Module/src/messaging/message-processor.replay.test.ts packages/Codex_Module/src/messaging/message-processor.empty-terminal.test.ts`
2. Targeted package build:
   - `npm run build --workspace @codeai-hub/codex-module`
3. Release rebuild:
   - `./scripts/build-all.sh`
   - `./scripts/build-release.sh --use-current-version`
4. Post-build smoke expectation:
   - rollout thinking in Codex sessions reaches Core overlay translation path;
   - workflow stages with `outputSchema` still show the final assistant answer from rollout replay/live sync.

## Non-Goals

- No changes to the translation engine catalog itself.
- No changes to Core overlay storage format.
- No changes to provider model selection or usage-limits logic.
