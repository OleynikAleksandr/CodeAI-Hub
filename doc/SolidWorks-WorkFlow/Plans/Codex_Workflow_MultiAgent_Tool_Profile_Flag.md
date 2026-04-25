# Codex Workflow Multi-Agent Tool Profile Flag

**Status:** Active test scope
**Date:** 2026-04-25
**Owner:** Codex

## Problem

Codex App Server currently sends the default Codex tool profile to the provider request.

The latest captured Codex workflow request contains `18` tool declarations:

- `exec_command`
- `write_stdin`
- `list_mcp_resources`
- `list_mcp_resource_templates`
- `read_mcp_resource`
- `update_plan`
- `request_user_input`
- `apply_patch`
- `web_search`
- `image_generation`
- `view_image`
- `spawn_agent`
- `send_input`
- `resume_agent`
- `wait_agent`
- `close_agent`
- `mcp__codex__`
- `mcp__playwright__`

For CodeAI Hub early documentation workflow steps, subagents are not part of the intended product workflow. CodeAI Hub owns orchestration itself, so sending the Codex multi-agent tool family to the provider adds noise and creates an unintended capability surface.

## Evidence

The generated Codex App Server protocol schema shows no direct `tools: [...]` allowlist field on `thread/start` or `turn/start`.

Relevant schema:

- `ThreadStartParams` supports `config`, `baseInstructions`, `developerInstructions`, model, sandbox, approval policy, and related thread options.
- `TurnStartParams` supports input, model, effort, summary, output schema, sandbox/permission overrides, and related turn options.
- `Config.tools` currently exposes only specific tool knobs such as `web_search` and `view_image`, not a full provider tool allowlist.

The installed Codex feature registry reports:

```text
multi_agent stable true
```

Running the CLI with `--disable multi_agent` resolves that feature to `false`, which makes it the smallest test flag for removing the subagent tool family.

## Test Flag

Start the CodeAI Hub Codex App Server with:

```text
codex app-server --disable multi_agent
```

Apply it to:

- normal Codex App Server runtime;
- Settings -> General Codex native request capture diagnostic runtime, because both use `CodexAppServerProcess`.

Do not change Codex `baseInstructions`, `project_doc_max_bytes`, model, effort, or summary in this step.

## Expected Retest Result

In the next Codex native request capture:

- `spawn_agent`, `send_input`, `resume_agent`, `wait_agent`, and `close_agent` should be absent from `body.tools`;
- provider request `body.tools` should drop from `18` to about `13` tools if only the multi-agent family is removed;
- system/base instructions should remain the current CodeAI Hub early-architecture prompt;
- `project_doc_max_bytes = 0` should remain present in `thread/start.config`;
- JSONL remains the full evidence source;
- Markdown remains deduped and should show the reduced extracted tool declarations.

## Risk

If `--disable multi_agent` affects only UI/App Server features and not provider request tools, the next capture will still contain the five subagent tools. That would prove the flag is not sufficient and the next candidate should target a lower-level Codex config or a provider tool-generation feature.

This first step intentionally does not disable MCP, web search, image generation, or browser/playwright-related tools. Those are separate flags and should be tested one at a time after the multi-agent result is known.
