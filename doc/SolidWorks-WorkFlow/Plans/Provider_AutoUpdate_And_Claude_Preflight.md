# Provider Auto-Update And Claude Preflight Fix

**Status:** Active
**Created:** 2026-04-25
**Owner:** Codex

## Problem

After the `1.2.77` instruction-profile retest release, the first Claude native request capture for `opus` could fail with:

```text
Native request capture failed. provider_not_supported
```

Core logs showed the real root cause earlier in startup:

```text
Provider initialization failed
providerId: claudeCodeCli
Command failed: npx @anthropic-ai/claude-code --version
```

The provider was later recovered after a normal Claude session started, and Claude native capture then worked. This means `opus` was supported, but the initial provider readiness path was fragile and the diagnostic error was misleading.

Separately, the Settings `autoUpdate.enabled` checkbox became a persisted UI setting without a real Core startup effect after Settings moved from the VS Code WebView surface to Project Manager.

## Target Behavior

1. Core startup reads the canonical settings snapshot from `~/.codeai-hub/settings/settings.json`.
2. For each provider with `autoUpdate.enabled === true`, Core updates the provider CLI/SDK packages before provider initialization:
   - Claude: `@anthropic-ai/claude-code`, `@anthropic-ai/claude-agent-sdk`
   - Codex: `@openai/codex`, `@openai/codex-sdk`
   - Gemini: `@google/gemini-cli`, `@google/gemini-cli-core` through the existing Gemini installer path.
3. If a provider has `autoUpdate.enabled === false`, Core does not update its packages on startup. Missing first-run installs remain allowed where provider startup requires them.
4. Claude auth preflight uses the installed Claude executable path resolved by `SDKInstaller` instead of relying on interactive `npx @anthropic-ai/claude-code --version`.
5. Native request capture returns a provider readiness reason when a known provider exists but its adapter is not initialized, instead of reporting it as unsupported.

## Implementation Scope

### Stream A — Core Startup Auto-Update

- Add a small Core service that resolves enabled provider auto-update targets from the persisted settings snapshot.
- Run it in `CoreOrchestrator.start()` before `providerRegistry.initialize()`.
- Keep failures non-fatal per provider target: log the failure and continue provider initialization/recovery.

### Stream B — Claude Non-Interactive Preflight

- Extend `SDKAuthManager` / `ClaudeAuthRuntime` to accept an optional Claude executable path for auth checks and provider-home probe.
- Pass `installer.getExecutablePath()` from normal SDK runtime, native capture diagnostics, and Claude Haiku translation runtime.
- Let `SDKInstaller.ensureInstalled()` install missing SDK/CLI dependencies but stop doing unconditional SDK latest checks internally; startup auto-update owns update policy.

### Stream C — Diagnostic Reason

- Add `provider_not_ready` to native request capture failure reasons.
- Return it when the public provider id maps to a known runtime provider descriptor but the active adapter/capture method is unavailable.

## Verification

- Targeted Core tests for auto-update plan/routing.
- Targeted Claude module tests for executable-path auth preflight threading.
- Targeted native request capture test for `provider_not_ready`.
- Targeted builds:
  - `npm run build --workspace=@codeai-hub/core`
  - `npm run build --workspace=@codeai-hub/claude-module`
- Release build after docs/release notes are updated.
