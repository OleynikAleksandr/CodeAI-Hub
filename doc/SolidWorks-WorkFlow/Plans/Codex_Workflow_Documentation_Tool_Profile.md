# Codex Workflow Documentation Tool Profile

**Status:** Active test scope
**Date:** 2026-04-25
**Owner:** Codex

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
