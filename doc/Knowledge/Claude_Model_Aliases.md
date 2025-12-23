# Claude Model Aliases and Selection

**Created:** 2025-12-20
**Verified with:** Claude Code CLI 2.0.73
**Last Updated:** 2025-12-20

## Overview

Claude Code CLI uses **model aliases** to provide stable references to the latest model versions. Instead of using date-based model IDs (e.g., `claude-sonnet-4-5-20250929`), you can use simple aliases (`sonnet`, `opus`, `haiku`) that automatically resolve to the current best version.

## Available Models (December 2025)

As of December 20, 2025, **only Claude 4.5 models are available**. All older models (3.x, 3.5, 3.7, 4.0) have been deprecated or are unavailable (return 404 errors).

### Active Models

| Alias               | Full Model ID                | Display Name         | Description                      |
|---------------------|------------------------------|----------------------|----------------------------------|
| `default`, `sonnet` | `claude-sonnet-4-5-20250929` | Sonnet 4.5 (Default) | Best for everyday tasks          |
| `opus`              | `claude-opus-4-5-20251101`   | Opus 4.5             | Most capable for complex work    |
| `haiku`             | `claude-haiku-4-5-20251001`  | Haiku 4.5            | Fastest for quick answers        |

## Getting Model Information via SDK

### Using Claude Agent SDK

The Claude Agent SDK provides the `supportedModels()` method to retrieve available model aliases:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function getAvailableModels() {
  const q = query({
    prompt: "hello",
    options: { maxTurns: 0 }
  });

  const models = await q.supportedModels();
  await q.interrupt();

  return models;
}
```

**Returns:**
```json
[
  {
    "value": "default",
    "displayName": "Default (recommended)",
    "description": "Sonnet 4.5 · Best for everyday tasks"
  },
  {
    "value": "opus",
    "displayName": "Opus",
    "description": "Opus 4.5 · Most capable for complex work"
  },
  {
    "value": "haiku",
    "displayName": "Haiku",
    "description": "Haiku 4.5 · Fastest for quick answers"
  }
]
```

### Important Notes

- **SDK returns aliases only** - The `supportedModels()` method returns short names (`default`, `opus`, `haiku`), not full model IDs
- **Full IDs require verification** - To get actual model IDs, query the model directly or check CLI documentation
- **Aliases auto-update** - When new models are released, aliases will point to the latest versions

## Usage Examples

### Command Line

```bash
# Using aliases (RECOMMENDED)
claude -p "Your prompt" --model opus
claude -p "Your prompt" --model sonnet
claude -p "Your prompt" --model haiku
claude -p "Your prompt" --model default

# Using full model IDs (NOT RECOMMENDED for production)
claude -p "Your prompt" --model claude-opus-4-5-20251101
```

### In Code (Claude Module)

```typescript
import { ClaudeProviderAdapter } from "./packages/Claude_Module";

const provider = new ClaudeProviderAdapter({
  model: "opus", // Use alias for auto-updates
  // NOT: model: "claude-opus-4-5-20251101" - will break when new version releases
});
```

## Advantages of Using Aliases

### ✅ Best Practices

1. **Always Current** - Automatically uses the latest model version
2. **Stable Code** - No need to update code when models are updated
3. **Readable** - `opus` is clearer than `claude-opus-4-5-20251101`
4. **Future-Proof** - When Claude 5 releases, `opus` will point to the new version

### ❌ Avoid Full IDs in Production

1. **Brittle** - Code breaks when models are deprecated
2. **Maintenance** - Requires manual updates across codebase
3. **Verbose** - Harder to read and maintain
4. **Date-Dependent** - Ties code to specific release dates

## Verifying Available Models

To verify which models are currently available:

```bash
# Check if a model works
claude -p "What is your exact model ID?" --model opus
claude -p "What is your exact model ID?" --model sonnet
claude -p "What is your exact model ID?" --model haiku
```

## Deprecated Models

The following models return **404 not_found_error** or deprecation warnings:

- `claude-3-opus-20240229` - deprecated, EOL 2026-01-05
- `claude-3-5-sonnet-20241022` - unavailable
- `claude-3-5-sonnet-20240620` - unavailable
- `claude-3-5-haiku-20241022` - unavailable
- All Claude 3.x, 3.7, 4.0 models - unavailable

## Implementation in CodeAI-Hub

### Model Data

The complete model information is stored in `doc/Knowledge/claude-models-final.json`.

This file contains:
1. All active Claude 4.5 models with full IDs
2. Alias mappings (default, opus, sonnet, haiku)
3. Model metadata (family, tier, display names, descriptions)

**Output:**
```json
{
  "timestamp": "2025-12-20T15:56:58.594Z",
  "source": "claude-code-cli-2.0.73",
  "models": [
    {
      "id": "claude-opus-4-5-20251101",
      "family": "claude-4.5",
      "tier": "opus",
      "displayName": "Opus 4.5",
      "description": "Most capable for complex work",
      "status": "active"
    }
    // ... more models
  ],
  "aliases": {
    "default": "claude-sonnet-4-5-20250929",
    "sonnet": "claude-sonnet-4-5-20250929",
    "opus": "claude-opus-4-5-20251101",
    "haiku": "claude-haiku-4-5-20251001"
  }
}
```

### CodeAI Hub Settings

Release `1.1.339` formalised the full path that backs the Claude picker:
1. The Claude card simply renders the alias list from `doc/Knowledge/Claude_Model_Aliases.md` and persists the chosen value in `~/.codeai-hub/settings/settings.json` under `providers.claude.defaultModel`.
2. The extension mirror this file into `CLAUDE_SETTINGS_PATH` (always pointing to the cached settings JSON) and updates `CLAUDE_DEFAULT_MODEL` immediately, so any subsequent `loadConfig()` read sees the same alias.
3. Core's provider registry picks up `claudeDefaultModel` from that env variable, passes it to `ClaudeWorkspaceOptions`, and the Claude SDK manager re-reads `settings.json` every time `query()` is invoked to honour both alias and thinking options (`maxThinkingTokens`) before streaming a new session.

Thanks to this chain, new Claude sessions launched via UI/CLI, the VS Code webview, or the CEF launcher all inherit the alias without embedding a hardcoded full model ID.

### UI alias metadata

The values rendered in the Claude settings block come straight from `src/types/claude-model-registry.ts`. In 1.1.339 `CLAUDE_MODEL_ALIASES` lists `default` (Sonnet 4.5), `opus` (Opus 4.5), and `haiku` (Haiku 4.5), together with the same display names and descriptions shown on the cards. The picker component `src/client/ui/src/components/settings/claude-default-model/claude-default-model-card.tsx` iterates over that array, reuses the shared `src/client/ui/src/components/settings/shared-model-card-styles.ts` constants (no shorthand borders, hover/selected colors, `tabIndex={-1}` rows, `role="radio"`, `outline: none` / `boxShadow: none`), which also backs the Codex cards, and pushes the selected alias into the shared `settings.json` entry that backs `CLAUDE_DEFAULT_MODEL`.

## Recommendations

### For Production Code

```typescript
// ✅ GOOD - Use aliases
const config = {
  model: "opus",  // Auto-updates to latest Opus
};

// ❌ BAD - Hardcoded full ID
const config = {
  model: "claude-opus-4-5-20251101",  // Will break when deprecated
};
```

### For Testing Specific Versions

Only use full model IDs when you need to:
- Test against a specific model version
- Reproduce bugs tied to a particular release
- Compare behavior across versions

## Future Updates

When new models are released:

1. **Aliases update automatically** - No code changes needed if using aliases
2. **Full IDs require manual updates** - Must update all hardcoded model IDs
3. **Old models get deprecated** - 404 errors for unsupported versions

## See Also

- [Codex Model Selection Guide](./Codex_Model_Selection.md) - For Codex/OpenAI models
- [Gemini Model Selection Guide](./Gemini_Model_Selection.md) - For Gemini models

## References

- Claude Code CLI: `claude --help`
- Claude Agent SDK: `@anthropic-ai/claude-agent-sdk`
- Model deprecations: https://docs.anthropic.com/en/docs/resources/model-deprecations

---

**Maintenance Note:** This document should be updated when:
- New Claude model families are released (e.g., Claude 5)
- Model deprecation notices are issued
- SDK API changes affect model retrieval
