# Codex Workflow Documentation Tool Profile — Technical Protocol

**Status:** Completed experiment protocol
**Date:** 2026-04-25
**Owner:** Codex
**Release validated:** `1.2.82`

This file keeps the technical protocol for the Codex documentation-tree tool-profile experiment. Product-level conclusions and release results are summarized in `Experiment_Results.md`.

## Problem

After the successful `--disable multi_agent` retest, Codex workflow requests still send tools that are not needed for CodeAI Hub documentation-tree stages.

The intended early workflow stages are:

- `Description`;
- `Virtual Simulation`;
- `Diagram Models` / `Diagram Modules`.

For these stages CodeAI Hub wants a small provider-visible tool profile. The agent may need to read files, write/update artifacts, apply patches, search the web when needed, and inspect user-provided images. It should not receive browser automation, nested Codex sessions, MCP resources, image generation, plugins/apps, or subagent tools.

## Target Tool Profile

Keep:

- `exec_command`;
- `write_stdin`;
- `apply_patch`;
- `update_plan`;
- `web_search`;
- `view_image`.

Remove if supported by Codex runtime knobs:

- `mcp__playwright__`;
- `mcp__codex__`;
- `list_mcp_resources`;
- `list_mcp_resource_templates`;
- `read_mcp_resource`;
- `image_generation`;
- `request_user_input`.

## Confirmed Technical Inputs

Current provider Codex home config contains explicit MCP servers:

```toml
[mcp_servers.codex]
command = "codex"
args = ["mcp-server"]

[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest"]
```

`codex app-server -c 'mcp_servers={}'` does not clear the effective MCP server table. The confirmed override is address-specific:

```text
-c mcp_servers.codex.enabled=false
-c mcp_servers.playwright.enabled=false
```

An app-server `config/read` probe confirms both entries become `enabled: false`.

Confirmed feature flags:

```text
--disable multi_agent
--disable browser_use
--disable in_app_browser
--disable computer_use
--disable image_generation
--disable plugins
--disable apps
--disable tool_search
```

`codex features list` and app-server `config/read` confirm these flags resolve to `false` when passed at startup.

## Unconfirmed / Not Claimed

`request_user_input` has no confirmed removal knob yet.

Evidence:

- `default_mode_request_user_input` is already `false` in the effective feature list;
- the `request_user_input` tool still appeared in the latest captured provider request;
- therefore disabling `default_mode_request_user_input` is not a proven way to remove provider-visible `request_user_input`.

This release may or may not remove `request_user_input` indirectly. Retest must verify it from provider-native JSONL.

## Test Change

Start CodeAI Hub Codex App Server with:

```text
codex app-server \
  --disable multi_agent \
  --disable browser_use \
  --disable in_app_browser \
  --disable computer_use \
  --disable image_generation \
  --disable plugins \
  --disable apps \
  --disable tool_search \
  -c mcp_servers.codex.enabled=false \
  -c mcp_servers.playwright.enabled=false
```

Apply it to both normal runtime and Settings -> General native request capture because both use `CodexAppServerProcess`.

## Expected Retest Result

The next Codex native request capture should keep:

- `exec_command`;
- `write_stdin`;
- `apply_patch`;
- `update_plan`;
- `web_search`;
- `view_image`.

It should remove:

- `mcp__playwright__`;
- `mcp__codex__`;
- `image_generation`.

It may remove the MCP resource trio if Codex only includes those tools when MCP servers are active:

- `list_mcp_resources`;
- `list_mcp_resource_templates`;
- `read_mcp_resource`.

`request_user_input` is explicitly unknown and must be checked in the retest.

## Retest Evidence To Collect

Compare fresh `1.2.82` Codex JSONL against:

- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T14-59-13-002Z-codex-native-request.jsonl`

Check:

- exact `body.tools` names;
- nested namespace tools, if any namespace remains;
- `body.tools` JSON length;
- `body.instructions` hash unchanged;
- workflow `turn/start.input[0].text` hash unchanged;
- `thread/start.config.project_doc_max_bytes = 0`;
- `instructionSources = []`.

## Retest Result Reference

User retested release `1.2.82`.

Fresh capture:

- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T15-27-58-551Z-codex-native-request.jsonl`
- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T15-27-58-551Z-codex-native-request.md`

Baseline comparison:

- `1.2.79` / pre-tool-profile baseline: `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T14-08-10-831Z-codex-native-request.jsonl`
- `1.2.81` / after `multi_agent` baseline: `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T14-59-13-002Z-codex-native-request.jsonl`

Full product-level result is recorded in `Experiment_Results.md`, section `4.1 Codex documentation tool profile`.

Technical result: `mostly works`.

Provider-native `body.tools` dropped:

- from `18` in the pre-tool-profile baseline;
- to `13` after `--disable multi_agent`;
- to `7` after the documentation profile.

Fresh tool list:

- `exec_command`;
- `write_stdin`;
- `update_plan`;
- `request_user_input`;
- `apply_patch`;
- `web_search`;
- `view_image`.

Removed successfully:

- `mcp__playwright__`;
- `mcp__codex__`;
- `list_mcp_resources`;
- `list_mcp_resource_templates`;
- `read_mcp_resource`;
- `image_generation`.

Still present:

- `request_user_input`.

Size evidence:

- provider request body dropped from `28726` to `12208` chars compared with the `1.2.81` multi-agent-only baseline;
- `body.tools` JSON dropped from `22734` to `6482` chars;
- JSONL dropped from `162467` to `104227` bytes;
- Markdown dropped from `54686` to `25336` bytes.

Control fields stayed stable:

- model: `gpt-5.5`;
- reasoning effort: `high`;
- `thread/start.config.project_doc_max_bytes = 0`;
- `thread/start.response.instructionSources = []`;
- CodeAI Hub `baseInstructions` length/hash stayed `5021` / `20a9fda290415bad2b2fd0f1fe05fd65f2f34eb4743cf3565eafcf01955f48eb`;
- native `body.instructions` length/hash stayed `5021` / `20a9fda290415bad2b2fd0f1fe05fd65f2f34eb4743cf3565eafcf01955f48eb`;
- workflow `turn/start.input[0].text` length/hash stayed `12973` / `90054eee3308614b58dcc59671fa7d117f9e649d558e95e10d205fa492c192a8`;
- provider-home `turn_context.user_instructions` stayed empty.

Conclusion:

- The confirmed startup flags and MCP server overrides remove all non-documentation tool classes except `request_user_input`.
- `request_user_input` needs separate investigation because `default_mode_request_user_input=false` was already ineffective for provider-visible tool removal.
