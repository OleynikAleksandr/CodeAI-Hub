# Local Models System Prompt Override Planning

**Status:** Accepted for execution on 2026-06-24  
**Owner:** Oleksandr + Codex  
**Release target:** 1.2.605

## Goal

Enable Local Models / LM Studio provider turns to run with a custom benchmark
system prompt and `temperature: 0.3`, so local models can be tested against the
same normalization prompt stack used for OpenRouter experiments.

## Decision

- Add a Local Models workflow-agent system prompt override:
  - `CODEAI_LMSTUDIO_SYSTEM_PROMPT` for inline text.
  - `CODEAI_LMSTUDIO_SYSTEM_PROMPT_FILE` for a UTF-8 prompt file.
- Keep the implementation provider-local and env-driven for this scope.
- Set workflow-agent temperature to `0.3` for native and workspace tool turns.
- Do not add Project Manager UI settings yet.

## Runtime Prompt Source

The first benchmark prompt source is:

`doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/claude-instruction-analysis/Claude_My_System_Prompt.md`

## Scope

- Native Local Models `/api/v1/chat` workflow turns.
- Workspace-bound `/v1/chat/completions` artifact-tool workflow turns.
- Local Models SSOT documentation and release notes.

## Verification

- Targeted Local Models tests.
- `npm run build --workspace @codeai-hub/core`.
- Release build for `1.2.605`.
