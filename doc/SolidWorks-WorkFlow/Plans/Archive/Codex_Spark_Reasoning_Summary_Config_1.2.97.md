# Codex Spark Reasoning Summary Config 1.2.97

**Status:** Implemented and archived; visible Spark summaries remain deferred
**Date:** 2026-04-27
**Owner:** Codex

## Problem

Release `1.2.96` fixed the `gpt-5.3-codex-spark` hard failure by omitting the unsupported explicit App Server `turn/start.summary` field for Spark.

User retest confirmed Spark now runs, creates the Description artifact, and emits ordinary progress commentary. However, no visible reasoning bubbles appear in the dialog even when Codex reasoning is enabled.

Local evidence from the Spark rollout:

- `turn_context.model = "gpt-5.3-codex-spark"`;
- `turn_context.effort = "xhigh"`;
- `turn_context.summary = "none"`;
- `token_count.last_token_usage.reasoning_output_tokens = 1509`;
- provider-home `models_cache.json` says Spark has `supports_reasoning_summaries: true` and `default_reasoning_summary: "none"`.

So Spark performs reasoning, but readable reasoning summary is disabled by model default once CodeAI Hub omits the explicit per-turn summary parameter.

## Decision

Keep the fix Spark-only.

For non-Spark Codex models, keep the existing working path:

- send explicit `turn/start.summary = "detailed" | "none"` based on the shared settings toggle.

For `gpt-5.3-codex-spark`:

- continue omitting `turn/start.summary`, because the provider rejects explicit `reasoning.summary`;
- ensure provider-home App Server config gets `model_reasoning_summary = "auto"` when Codex reasoning is enabled;
- ensure provider-home App Server config gets `model_reasoning_summary = "none"` when Codex reasoning is disabled.

This uses config-level summary control for Spark while preserving per-turn summary control for all other Codex models.

## Scope

Implementation files:

- `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`
- `packages/Codex_AppServer_Module/src/app-server/process/codex-provider-home-config.ts`
- `packages/Codex_AppServer_Module/src/app-server/process/codex-provider-home-config.test.ts`

Documentation files:

- `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/BugRegistry.md`
- `doc/TODO/todo-plan.md`

Release files:

- `README.md`
- `CHANGELOG.md`

## Acceptance

- Spark `turn/start` still omits `summary`.
- Non-Spark `turn/start` payloads still include `summary`.
- Provider-home config for Spark-capable App Server startup writes `model_reasoning_summary = "auto"` when settings enable reasoning summaries.
- Provider-home config writes `model_reasoning_summary = "none"` when settings disable reasoning summaries.
- Targeted Codex app-server build and tests pass.
- Release `1.2.97` is built with normal version bump and produces `codeai-hub-1.2.97.vsix`.

## Result

- Implemented Spark-safe provider-home summary materialization before `codex app-server` startup.
- Preserved Spark `turn/start.summary` omission to avoid the provider-side `reasoning.summary` rejection.
- Added regression coverage for provider-home `model_reasoning_summary = "auto" | "none"` materialization and non-Spark `gpt-5.5` explicit `summary: "detailed"` preservation.
- Updated Codex invocation SSOT, SystemArchitecture, BugRegistry, README, and CHANGELOG.
- Built release `1.2.97` with normal release automation; final VSIX artifact is `codeai-hub-1.2.97.vsix`.
- Post-release user retest confirmed Spark still does not emit visible reasoning summaries; the hard failure remains fixed, and Spark readable summaries are left as a provider-side limitation.
