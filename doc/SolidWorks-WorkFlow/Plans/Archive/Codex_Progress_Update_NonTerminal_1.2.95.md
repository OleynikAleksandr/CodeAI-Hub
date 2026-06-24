# Codex Progress Update Non-Terminal Guard 1.2.95

**Status:** Approved for implementation
**Date:** 2026-04-27
**Owner:** Codex

## Problem

Release `1.2.94` removed provider-owned SDK/raw logs and preserved Codex visible progress messages, but one `gpt-5.2` Description retest exposed a different failure mode.

In workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.2`, the provider-home rollout ended with `task_complete` immediately after this ordinary assistant message:

> I read the questionnaire and will next create the first draft of `Final_Description.md`.

Core did not hang and UI did not drop events. The Codex app-server/provider marked the turn complete before the promised file edit. The target `Final_Description.md` was not created.

The adjacent workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.2 02` on the same release completed normally: progress messages appeared, the file was created, and the final answer came after the artifact write.

## Decision

Keep the fix narrow.

Do not duplicate this rule in `description-collector-prompt.md` or any step-specific template. Step templates should stay focused on artifact contracts.

Add one provider-level Codex progress rule in `CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT`:

- progress updates are non-terminal;
- after sending one, Codex must continue the same turn until the promised work or requested artifact is actually complete;
- it must not stop, wait for the user, or treat the progress update as the final answer.

This applies to all Codex models and all current early-workflow steps that use the shared Codex instruction profile.

Do not change Gemini in this release. Gemini currently has no equivalent explicit provider-level workflow system prompt surface in this codebase; adding a cross-provider prompt injection layer would be a separate architecture scope.

## Scope

Implementation / prompt files:

- `packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts`
- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/codex-instruction-analysis/Codex_My_System_Prompt.md`

SSOT / planning files:

- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`
- `doc/TODO/todo-plan.md`

Release docs:

- `README.md`
- `CHANGELOG.md`

## Acceptance

- No Description template files are changed.
- Runtime Codex prompt and the agreed Codex prompt artifact stay text-equivalent for the `Progress Updates` section.
- Targeted Codex app-server module build passes.
- Release `1.2.95` is built with normal version bump and produces `codeai-hub-1.2.95.vsix`.
