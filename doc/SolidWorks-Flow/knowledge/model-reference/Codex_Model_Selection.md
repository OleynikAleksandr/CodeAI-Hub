# Codex Model Selection Guide

**Last Updated:** 2025-12-22  
**Source:** [Official Codex Documentation](https://developers.openai.com/codex/models/)

## Overview

Codex supports multiple GPT-5 series models optimized for different coding scenarios. This guide helps you select the right model and reasoning level. In CodeAI Hub, the default model and per-model reasoning levels are stored in `~/.codeai-hub/settings/settings.json` and passed to the Codex CLI via runtime `--config` overrides (no direct edits to `~/.codex/config.toml`).

## Available Models (December 2025)

### Recommended Models

| Model ID            | Display Name       | Description                                 | Best For                                 |
|---------------------|--------------------|---------------------------------------------|------------------------------------------|
| `gpt-5.3-codex`     | GPT-5.3-Codex      | Most advanced agentic coding model          | Complex engineering tasks, production code |
| `gpt-5.1-codex-max` | GPT-5.1-Codex-Max  | Optimized for long-horizon agentic tasks    | Deep refactoring, large-scale changes    |
| `gpt-5.1-codex-mini`| GPT-5.1-Codex-Mini | Smaller, cost-effective version             | Quick tasks, cost optimization           |
| `gpt-5.2`           | GPT-5.2            | Best general agentic model                  | Cross-industry tasks, general coding     |

### Legacy Models (Deprecated)

These models have been succeeded by newer versions and are not recommended for new projects:

| Model ID           | Succeeded By            |
|--------------------|-------------------------|
| `gpt-5.1`          | `gpt-5.2`               |
| `gpt-5.1-codex`    | `gpt-5.1-codex-max`     |
| `gpt-5-codex`      | `gpt-5.1-codex`         |
| `gpt-5-codex-mini` | `gpt-5.1-codex-mini`    |
| `gpt-5`            | `gpt-5.1`               |

## Reasoning Effort Levels

Codex models support 4 reasoning effort levels that control the depth of analysis:

| Level    | Description                           | Use Case                             | Default |
|----------|---------------------------------------|--------------------------------------|---------|
| `low`    | Fast responses with lighter reasoning | Quick tasks, simple queries          | No      |
| `medium` | Balances speed and reasoning depth    | Most development tasks               | **Yes** |
| `high`   | Greater reasoning depth               | Complex refactoring, architecture    | No      |
| `xhigh`  | Extra high reasoning depth            | Very complex problems                | No      |

In CodeAI Hub, each model keeps its own reasoning level, and the saved value is applied when that model is selected as the default.

## Usage Examples

### CodeAI Hub Settings (Recommended)

Use Settings → Codex to pick the default model and per-model reasoning. Stored in `~/.codeai-hub/settings/settings.json`:

```json
{
  "providers": {
    "codex": {
      "defaultModel": "gpt-5.3-codex",
      "reasoningByModel": {
        "gpt-5.3-codex": "high",
        "gpt-5.1-codex-max": "medium",
        "gpt-5.1-codex-mini": "low"
      }
    }
  }
}
```

### CLI

```bash
# Select model via command line flag
codex --model gpt-5.3-codex

# With custom reasoning effort
codex --model gpt-5.3-codex --config model_reasoning_effort=high

# Non-interactive example
codex exec --model gpt-5.3-codex --config model_reasoning_effort=high \
  --sandbox read-only "Checking reasoning"

# Interactive model selection
codex
# Then use: /model
```

### Standalone Configuration File (Optional)

For standalone Codex CLI usage (CodeAI Hub does not edit this file), you can set defaults in `~/.codex/config.toml`:

```toml
model = "gpt-5.3-codex"
model_reasoning_effort = "medium"
```

### TypeScript SDK

```typescript
import { Codex } from "@openai/codex-sdk";

const codex = new Codex();

const thread = codex.startThread({
  model: "gpt-5.3-codex",
  workingDirectory: process.cwd(),
});

const result = await thread.exec("Your prompt here");
```

Note: In CodeAI Hub, the reasoning effort is applied by the CLI runner using `--config model_reasoning_effort=...`, so SDK usage does not require editing `~/.codex/config.toml`.

## Model Selection Strategy

### For Production Code
→ Use `gpt-5.3-codex` with `medium` or `high` reasoning

### For Quick Prototyping
→ Use `gpt-5.1-codex-mini` with `low` or `medium` reasoning

### For Complex Refactoring
→ Use `gpt-5.1-codex-max` with `high` or `xhigh` reasoning

### For General Tasks
→ Use `gpt-5.2` with `medium` reasoning

## Important Notes

1. **Model Availability**: All models are available across CLI, SDK, IDE Extension, Cloud, and API
2. **Default Model**: In CodeAI Hub, stored in `~/.codeai-hub/settings/settings.json` and applied to new sessions
3. **Per-Model Reasoning**: CodeAI Hub stores `reasoningByModel` and passes the selected level to the CLI via `--config model_reasoning_effort=...`
4. **Custom Providers**: Codex supports custom providers with Chat Completions or Responses APIs
5. **Dynamic Discovery**: For programmatic model discovery, use [official Codex documentation](https://developers.openai.com/codex/models/) as the source of truth

## Programmatic Model Discovery

### Challenge
Unlike Claude Agent SDK which provides `supportedModels()` API, Codex SDK does not expose a programmatic method to list available models.

### Solutions

#### 1. OpenAI Platform API (Requires API Subscription)
If you have an OpenAI Platform API key (not ChatGPT subscription):

```bash
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

**Note:** This requires an OpenAI Platform API subscription, separate from ChatGPT subscriptions.

#### 2. Use Official Documentation
The most reliable source is the [official Codex models page](https://developers.openai.com/codex/models/), which lists all current models.

#### 3. Configuration-Based Approach
Read available models from your config file and documentation, maintaining a local registry based on official sources.

## See Also

- [Claude Model Selection Guide](./Claude_Model_Aliases.md) - For Claude Agent SDK
- [Gemini Model Selection Guide](./Gemini_Model_Selection.md) - For Gemini models
- [Official Codex Models Documentation](https://developers.openai.com/codex/models/)
- [Codex CLI Features](https://developers.openai.com/codex/cli/features/)

## Sources

- [Codex Models](https://developers.openai.com/codex/models/)
- [Codex CLI Documentation](https://developers.openai.com/codex/cli/)
- [OpenAI Codex Tips & Tricks](https://cloudartisan.com/posts/2025-04-21-openai-codex-tips-tricks/)
