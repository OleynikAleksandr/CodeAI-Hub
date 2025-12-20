# Gemini Model Selection Guide

**Last Updated:** 2025-12-20  
**Source:** Gemini CLI v0.21.2 + [Official Google Documentation](https://ai.google.dev/gemini-api/docs/models)

## Overview

Gemini CLI provides access to Google's latest AI models, including the cutting-edge Gemini 3 family (preview) and stable Gemini 2.5 models. All models feature a 1 million token context window and multimodal capabilities.

## Available Models (December 2025)

### Gemini 3 Family (Preview)

| Model ID                 | Display Name          | Context | Status  | Best For                                   |
|--------------------------|-----------------------|---------|---------|-------------------------------------------|
| `gemini-3-pro-preview`   | Gemini 3 Pro Preview  | 1M      | Preview | Complex reasoning, PhD-level problems     |
| `gemini-3-flash-preview` | Gemini 3 Flash Preview| 1M      | Preview | Fast reasoning, high-frequency workflows  |

### Gemini 2.5 Family (Generally Available)

| Model ID               | Display Name         | Context | Status | Best For                                    |
|------------------------|----------------------|---------|--------|---------------------------------------------|
| `gemini-2.5-pro`       | Gemini 2.5 Pro       | 1M      | GA     | Complex math, deep reasoning, advanced code |
| `gemini-2.5-flash`     | Gemini 2.5 Flash     | 1M      | GA     | Summarization, chat apps, data extraction   |
| `gemini-2.5-flash-lite`| Gemini 2.5 Flash Lite| 1M      | GA     | Translation, classification, high-volume    |

## Model Comparison

### Gemini 3 Pro Preview

**Capabilities:**
- **Context Window:** 1 million tokens
- **Knowledge Cutoff:** January 2025
- **Top Performance:** 1501 Elo on LMArena (highest score), 78% on SWE-bench verified

**Features:**
- Multimodal: text, audio, images, video, PDFs, entire code repositories
- Thinking level parameter: `low`, `high`
- Media resolution parameter: `low`, `medium`, `high`
- Streaming function calling
- Enhanced multi-turn function calling with multimodal support

**Use Cases:** Complex problem solving, advanced coding, research tasks

### Gemini 3 Flash Preview

**Capabilities:**
- **Context Window:** 1 million tokens
- **Knowledge Cutoff:** January 2025
- **Performance:** 90.4% GPQA Diamond, 81.2% MMMU-Pro
- **Speed:** 3x faster than 2.5 Pro at fraction of cost

**Features:**
- Thinking levels: `minimal`, `low`, `medium`, `high` (4 options)
- Advanced visual and spatial reasoning
- Code execution for visual input processing
- Multimodal processing

**Pricing:**
- Input: $0.50 / 1M tokens
- Output: $3.00 / 1M tokens

**Use Cases:** Terminal workflows, fast iterations, cost-efficient reasoning

### Gemini 2.5 Pro

**Capabilities:**
- **Context Window:** 1 million tokens
- **Deep Think Mode:** Advanced reasoning using multiple hypothesis testing

**Features:**
- Controllable thinking budgets
- Grounding with Google Search
- Code Execution
- URL Context
- Multimodal input

**Use Cases:** Complex mathematics, advanced coding, deep analysis

### Gemini 2.5 Flash

**Capabilities:**
- **Context Window:** 1 million tokens
- **Focus:** High-throughput enterprise tasks

**Features:**
- Controllable thinking budgets
- Native tool support (Search, Code Execution, URL Context)
- Multimodal input

**Use Cases:** Large-scale summarization, responsive chat, data extraction

### Gemini 2.5 Flash Lite

**Capabilities:**
- **Context Window:** 1 million tokens
- **Speed:** Lowest latency in 2.5 family
- **Cost:** Most cost-efficient ($0.10 input, $0.40 output per 1M tokens)

**Features:**
- Fastest response times
- Lower latency than both 2.0 Flash-Lite and 2.0 Flash
- Controllable thinking budgets
- Native tools (Search, Code Execution)

**Use Cases:** Translation, classification, high-volume tasks

## Thinking Levels

Gemini models support controllable reasoning depth:

### Gemini 3 Pro
| Level  | Description                           |
|--------|---------------------------------------|
| `low`  | Faster responses, lighter reasoning   |
| `high` | Deeper reasoning, complex problems    |

### Gemini 3 Flash
| Level     | Description                                  |
|-----------|----------------------------------------------|
| `minimal` | Fastest, minimal reasoning overhead          |
| `low`     | Light reasoning for straightforward tasks    |
| `medium`  | Balanced reasoning and speed                 |
| `high`    | Maximum reasoning depth for complex problems |

### Gemini 2.5 Models
- **Deep Think Mode** (Pro only): Advanced reasoning with multiple hypothesis testing
- **Controllable Thinking Budgets**: Adjust reasoning depth for all 2.5 models

## Usage Examples

### CLI

```bash
# Select model via flag
gemini --model gemini-3-flash-preview

# Shorter form
gemini -m gemini-3-pro-preview

# Interactive selection
gemini
# Then press Ctrl+M or use /model command
```

### During Session

```bash
# Use slash command
/model

# Select from:
# 1. gemini-3-pro-preview
# 2. gemini-3-flash-preview
# 3. gemini-2.5-pro
# 4. gemini-2.5-flash
# 5. gemini-2.5-flash-lite
```

### Configuration

Gemini CLI uses `~/.gemini/settings.json` for configuration. Model selection is primarily done via CLI flags and interactive selector.

## Model Selection Strategy

### For Production Code
→ Use `gemini-3-pro-preview` or `gemini-2.5-pro` (GA)

### For Fast Iterations
→ Use `gemini-3-flash-preview` (best speed/quality balance)

### For High-Volume Tasks
→ Use `gemini-2.5-flash-lite` (most cost-efficient)

### For Enterprise Applications
→ Use `gemini-2.5-flash` (high-throughput, GA)

### For Complex Research
→ Use `gemini-3-pro-preview` with `high` thinking level

## Important Notes

1. **All models have 1M token context window** - Exceptional for large codebases
2. **Gemini 3 models are in preview** - Subject to changes before GA
3. **Multimodal by default** - All models support text, images, video, PDFs
4. **Native tools** - Search grounding, code execution, URL context available
5. **Knowledge cutoff** - Gemini 3: January 2025

## Programmatic Model Discovery

### Challenge
Gemini CLI does not expose a direct programmatic API to list available models from code.

### Solutions

#### 1. Interactive CLI Selector
```bash
gemini
# Press Ctrl+M or /model to see current list
```

#### 2. Official Documentation
Monitor [Google AI for Developers - Gemini Models](https://ai.google.dev/gemini-api/docs/models) for updates.

#### 3. Configuration-Based Approach
Maintain a local registry based on Gemini CLI interactive selector and official sources.

## Version Requirements

- **Gemini 3 models:** Requires Gemini CLI v0.21.1+
- **Preview features:** Enable in settings via `/settings` → "Preview features" → true

## See Also

- [Claude Model Selection Guide](./Claude_Model_Aliases.md) - For Claude Agent SDK
- [Codex Model Selection Guide](./Codex_Model_Selection.md) - For Codex/OpenAI models
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs/models)
- [Gemini CLI Documentation](https://geminicli.com/docs/)

## Sources

- [Gemini 3: Latest Model from Google](https://blog.google/products/gemini/gemini-3/)
- [Gemini 3 Flash Announcement](https://blog.google/products/gemini/gemini-3-flash/)
- [Gemini 3 Flash in CLI](https://developers.googleblog.com/gemini-3-flash-is-now-available-in-gemini-cli/)
- [Gemini 2.5 Flash-Lite GA](https://developers.googleblog.com/en/gemini-25-flash-lite-is-now-stable-and-generally-available/)
- [Gemini API Models Documentation](https://ai.google.dev/gemini-api/docs/models)

---

**Maintenance Note:** This document should be updated when:
- Gemini 3 models move from preview to GA
- New model versions are released
- Context windows or pricing changes
- New features are added to models
