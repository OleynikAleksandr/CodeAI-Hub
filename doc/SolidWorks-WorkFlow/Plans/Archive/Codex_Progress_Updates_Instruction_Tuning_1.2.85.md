# Codex Progress Updates Instruction Tuning 1.2.85

**Status:** Approved for implementation
**Date:** 2026-04-27
**Owner:** Codex

## Problem
Codex `gpt-5.2` did not emit visible progress updates during a long Description task even though the active CodeAI Hub-owned system prompt required short progress messages.

Log evidence showed the visible assistant answer is represented as ordinary user-visible assistant output:
- app-server transport: `item.type = "agentMessage"`, `phase = null`;
- provider rollout: `payload.type = "agent_message"`, `phase = null`;
- response item: `payload.type = "message"`, `role = "assistant"`, `content.type = "output_text"`.

The current wording says `short commentary messages`. That phrase is ambiguous for Codex: the model can associate it with hidden/internal commentary, reasoning summaries, or tool-adjacent notes rather than normal chat output.

## Solution
Replace the ambiguous progress-update instruction with wording that asks for ordinary user-visible assistant chat messages and explicitly excludes hidden/internal channels.

Target wording:

```md
- During work, send short progress updates as ordinary user-visible assistant chat messages.
- These updates must appear in the conversation as normal assistant messages, not only in reasoning summaries, hidden commentary, tool-call notes, metadata, or any other non-user-visible channel.
```

Keep the change narrow and experimental. Resume-time instruction injection is a separate topic and remains out of scope for this release.

## Scope
Implementation files:
- `packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts`
- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/codex-instruction-analysis/Codex_My_System_Prompt.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`

Release/docs files:
- `README.md`
- `CHANGELOG.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`
- `doc/TODO/todo-plan.md`
- `legacy session report (removed)`

## Acceptance
- Runtime prompt and agreed prompt artifact stay text-equivalent for the Progress Updates section.
- Codex module SSOT records the new visibility expectation.
- Targeted Codex app-server module build passes before release.
- `./scripts/build-all.sh` completes for `1.2.85`.
- `./scripts/build-release.sh --use-current-version` creates `codeai-hub-1.2.85.vsix`.
