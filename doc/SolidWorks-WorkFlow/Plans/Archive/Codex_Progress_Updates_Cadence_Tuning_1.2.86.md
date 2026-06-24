# Codex Progress Updates Cadence Tuning 1.2.86

**Status:** Approved for implementation
**Date:** 2026-04-27
**Owner:** Codex

## Problem
Release `1.2.85` improved Codex progress visibility: `gpt-5.2` emitted ordinary user-visible assistant messages instead of hiding progress in reasoning summaries.

Retest evidence still showed one long silent gap:
- second visible progress message at `07:17:54`;
- next visible progress message at `07:20:49`;
- gap: about 175 seconds;
- SDK app-server log: 20 completed reasoning blocks between these messages, 7 with summaries;
- provider-home rollout: 11 `agent_reasoning` events between these messages.

The current instruction says to send updates roughly every 30 seconds, but it is too weak by itself. The model can continue through many internal analysis/tool cycles without sending another visible update.

## Solution
Keep the successful `ordinary user-visible assistant chat messages` wording and add a stronger cadence rule:
- send a visible update when about 30 seconds have passed since the last visible assistant message while still working;
- if elapsed time is hard to estimate, use work progress as fallback: after 3-5 substantial tool calls, file-reading steps, or internal analysis cycles without a visible update, send one short visible assistant message before continuing.

Avoid naming `reasoning summary blocks` as the primary rule because that is a runtime/log artifact rather than a stable user-facing control surface.

## Scope
Implementation files:
- `packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts`
- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/codex-instruction-analysis/Codex_My_System_Prompt.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`

Release/docs files:
- `CHANGELOG.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`
- `doc/TODO/todo-plan.md`
- `legacy session report (removed)`

## Acceptance
- Runtime prompt and agreed prompt artifact stay text-equivalent.
- Codex module SSOT records the stronger cadence expectation.
- Targeted Codex app-server module build passes before release.
- `./scripts/build-all.sh` completes for `1.2.86`.
- `./scripts/build-release.sh --use-current-version` creates `codeai-hub-1.2.86.vsix`.
