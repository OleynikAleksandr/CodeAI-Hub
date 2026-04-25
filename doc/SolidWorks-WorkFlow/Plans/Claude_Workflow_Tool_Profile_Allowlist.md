# Claude Workflow Tool Profile Allowlist

**Status:** Retest confirmed
**Date:** 2026-04-25
**Owner:** Codex

## Problem

Claude Agent SDK sends the default Claude Code built-in tool profile when CodeAI Hub does not pass an explicit `tools` option.

The current captured Claude workflow request contains `10` tool declarations:

- `Agent`
- `Bash`
- `Edit`
- `Glob`
- `Grep`
- `Read`
- `ScheduleWakeup`
- `Skill`
- `ToolSearch`
- `Write`

For CodeAI Hub early documentation workflow steps, `Agent`, subagents, `Skill`, scheduled wakeups, deferred tool discovery, and broad codebase exploration are not part of the intended product workflow. In the latest capture, `body.tools` is about `35.9K` JSON characters and about `61%` of the captured Claude request body.

## SDK Evidence

Installed SDK: `@anthropic-ai/claude-agent-sdk@0.2.119`.

The SDK `Options.tools` contract supports:

- `tools: ["Bash", "Read", "Edit"]` to specify an explicit built-in tool set;
- `tools: []` to disable all built-in tools;
- `tools: { type: "preset", preset: "claude_code" }` to use the default Claude Code tool set.

`disallowedTools` is less suitable for this experiment because it can remove specific tools but does not prove that a compact positive tool profile replaces the default tool set.

## Test Flag

Apply an explicit CodeAI Hub-owned Claude workflow tool profile:

```ts
tools: ["Read", "Write", "Edit"]
```

Apply it to:

- normal Claude SDK workflow turns;
- Settings -> General Claude native request capture diagnostic turns.

Do not apply it to translation-only Haiku turns; those already use `tools: []`.

## Expected Retest Result

In the next Claude native request capture:

- `body.tools` should contain only `Read`, `Write`, and `Edit`;
- `Agent`, `Skill`, `ScheduleWakeup`, and `ToolSearch` should be absent;
- descriptions containing subagent/skills workflow should disappear from `body.tools`;
- JSONL remains the full evidence source;
- Markdown remains deduped and should show the compact extracted tool declarations.

## Risk

If the SDK treats `tools` as additive instead of restrictive, retest will show the default `10` tools still present. That is acceptable for this experiment and will become evidence for the next flag choice.

If `Read` / `Write` / `Edit` is too narrow for a future workflow step, the profile should become stage-specific. For the current documentation-first steps, it is the right first reduction candidate.

## Retest Result

User retested release `1.2.80`.

Fresh capture:

- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T14-38-27-844Z-claude-native-request.jsonl`
- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T14-38-27-844Z-claude-native-request.md`

Result: `works`.

Evidence:

- captured workflow request count: `1`;
- `body.tools` count: `3`;
- tools: `Edit`, `Read`, `Write`;
- `body.tools` JSON length: `5166` chars;
- request `bodyTextLength`: `23522`;
- `Agent`, `Skill`, `ToolSearch`, and subagent wording are absent from tool declarations;
- ignored SDK request with tools has `toolsCount: 0`;
- Markdown size dropped from about `76K` to about `38K`; JSONL size dropped from about `218K` to about `112K`.

Conclusion: Claude Agent SDK treats explicit `tools: ["Read", "Write", "Edit"]` as a restrictive tool profile for this workflow request, not as an additive list.
