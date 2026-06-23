# Local Models Workflow Warmup Hotfix Planning

## Scope
Fix Project Manager/Core startup stalls caused by selected LM Studio workflow-agent warmup loading heavy local models synchronously.

## Root Cause
- Core startup/settings warmup preloads `providers.localModels.defaultModel` as a persistent workflow-agent worker.
- The workflow-agent load path uses `lms load ... --context-length 16384`.
- When LM Studio CLI hangs or times out on a heavy model, Core is blocked during warmup and Project Manager cannot reliably change model settings or restart Core.

## Minimal Fix
- Keep reasoning-translation warmup.
- Defer workflow-agent model loading until the first actual Local Models turn.
- Use `8192` as the default workflow-agent context; keep `CODEAI_LMSTUDIO_AGENT_CONTEXT_LENGTH` as the opt-in override for larger prompts.

## Files
- `packages/core/src/local-models/local-models-warmup-service.ts`
- `packages/core/src/local-models/local-models-runtime-load-manager.ts`
- `packages/core/src/local-models/*.test.ts`
- `doc/SolidWorks-WorkFlow/Modules/LocalModels.md`
