# Claude Module (work-in-progress)

This workspace packages the Claude provider integration that will bridge CodeAI-Hub Core with Anthropic's Claude Agent SDK.

## Source Layout
```
src/
  auth/                 # SDKAuthManager (CLI subscription checks)
  installer/            # SDKInstaller with per-OS global paths + npm invocation
  session/              # Registry + lifecycle + logger facades
  messaging/            # Stream processor + JSONL file inspectors
  provider/             # ClaudeProviderAdapter / ClaudeSDKManager
  sdk/                  # ClaudeSDKManager orchestration layer
  types/                # Shared config/contracts
```

## Current Status
- Base package scaffold + source layout created.
- Architecture reference: `doc/Project_Docs/Stacks/Claude_Agent_SDK_Module.md`.
- Task tracker: `doc/TODO/todo-plan_Claude_Module.md`.

## Next Steps
1. Plug in real SDK runner (load @anthropic-ai/claude-agent-sdk query function, capture async iterator).
2. Implement JSONL log writer + claudeSessionId promotions/resume handling.
3. Add targeted tests (session promotion, installer fallbacks, auth prompts) once APIs stabilize, then integrate into core + VSIX release flow.
