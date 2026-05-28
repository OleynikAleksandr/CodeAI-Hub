# Provider Workspace-Home Readiness Repair — Planning

**Status:** Accepted planning source for the next execution scope
**Date:** 2026-05-27
**Owner:** Oleksandr + Codex

## 1. Problem

After the workspace-owned runtime capsule refactor, Claude and Codex work with per-workspace provider homes. Three other provider surfaces are not ready:

- **Gemini** is shown as `AVAILABLE` in the Description provider picker, but the workspace provider home is empty and authenticated Gemini files still live in `~/.gemini`.
- **Kimi** is shown as `UNAVAILABLE` with `ENOENT: no such file or directory, mkdir '/.codeai-hub'`.
- **GLM-Claude-Code** is shown as `UNAVAILABLE` because no GLM/Z.AI API key is resolved.

The user-visible symptom is a mixed provider picker: Claude/Codex start, Gemini appears selectable but cannot actually start, and Kimi/GLM are unavailable.

## 2. Evidence

Current local evidence from `~/.codeai-hub/logs/core/core.log`:

- Gemini module loads and initializes with CLI `v0.43.0`, so the module/install path is not the immediate blocker.
- The active workspace capsule contains:
  - `.codeai-hub/codeai-hub-codex-5-4/runtime/providers/claude/home`
  - `.codeai-hub/codeai-hub-codex-5-4/runtime/providers/codex/home`
  - empty `.codeai-hub/codeai-hub-codex-5-4/runtime/providers/gemini/home`
  - empty `.codeai-hub/codeai-hub-codex-5-4/runtime/providers/kimi/home`
- `~/.gemini/oauth_creds.json`, `~/.gemini/google_accounts.json`, and `~/.gemini/settings.json` exist; matching workspace-home Gemini files do not.
- Kimi repeatedly fails during provider initialization with `mkdir '/.codeai-hub'`, which points to an invalid workspace root / `process.cwd()` fallback.
- GLM-Claude-Code repeatedly fails in `GlmClaudeCodeSDKAuthManager.ensureSubscriptionAuth` because no API key is resolved from env or config.

## 3. Architecture Decision

Provider readiness must mean "can create a provider session in the active workspace", not only "module loaded".

The repair must keep these boundaries:

- Project Manager remains a projection. It renders Core provider status and must not invent provider readiness.
- Core/provider modules own workspace-home bootstrap and provider auth preflight.
- Workspace runtime capsule remains the preferred mutable runtime location:
  - `.codeai-hub/<workspaceSlug>/runtime/providers/<provider>/home`
- Existing user-global auth may be used only as a bootstrap source:
  - Gemini may copy or bridge existing `~/.gemini` auth/settings into workspace-home if the workspace-home copy is missing.
  - Kimi may reference `~/.kimi/config.toml` for credentials unless an explicit workspace/provider config path exists.
  - GLM may resolve API key from workspace settings/config/env, but must not write secrets into tracked files.

## 4. Provider-Specific Repair

### 4.1 Gemini

Target behavior:

- Gemini workspace home is materialized before `config.refreshAuth(...)`.
- If workspace `.gemini/oauth_creds.json` is missing and user-global `~/.gemini/oauth_creds.json` exists, bootstrap it into workspace-home.
- `settings.json`, `google_accounts.json`, and `installation_id` are copied when needed to match Gemini CLI auth expectations.
- Gemini provider status must not remain `AVAILABLE` if initialization/preflight knows auth is missing.
- The storage patch must resolve against the active workspace home deterministically, not against a stale process-global default.

Likely code areas:

- `packages/Gemini_Module/src/runtime/cli-bridge-provider-home.ts`
- `packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts`
- `packages/Gemini_Module/src/session/gemini-session-settings-resolver.ts`
- `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`

### 4.2 Kimi

Target behavior:

- Core passes the active workspace path to `KimiProviderAdapter`; it must not use `process.cwd()` when Core was launched from `/`.
- `KIMI_SHARE_DIR` resolves to the active workspace capsule home.
- Kimi config resolution follows the module SSOT:
  - default credential source remains `~/.kimi/config.toml`;
  - workspace/provider-home config is used only when explicitly materialized or configured.
- Provider initialization should fail with a useful "Kimi config/CLI unavailable" message, not `mkdir '/.codeai-hub'`.

Likely code areas:

- `packages/core/src/provider-registry/provider-descriptor-factory.ts`
- `packages/Kimi_Module/src/provider/kimi-managed-agent-profile.ts`
- `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`

### 4.3 GLM-Claude-Code

Target behavior:

- GLM-Claude-Code resolves API-key/base-url/model defaults from the same workspace settings snapshot that the Settings UI writes.
- Env vars remain highest priority.
- Explicit config file remains supported.
- Empty workspace setting values must not override valid env/config values.
- Provider status should guide the user to the exact missing secret source when no key exists.

Likely code areas:

- `packages/core/src/provider-registry/provider-descriptor-factory.ts`
- `packages/Claude_Module/src/glm-claude-code/glm-claude-code-runtime-profile.ts`
- `packages/Claude_Module/src/glm-claude-code/glm-claude-code-sdk-auth-manager.ts`

## 5. Verification Strategy

Minimum automated checks:

- Gemini unit tests for workspace-home auth bootstrap from a mocked legacy `~/.gemini`.
- Kimi unit tests for workspace capsule home resolution when Core passes a workspace path.
- GLM unit tests for env/config/workspace settings precedence and empty-value handling.
- Provider picker/status test so `AVAILABLE` means Core reported an active provider and known failures are visible.

Manual retest after implementation:

1. Restart Core from Project Manager.
2. Open Description provider picker.
3. Confirm Gemini, Kimi, and GLM statuses match real readiness.
4. Start Description with Gemini and verify the first turn reaches provider dispatch and terminal `turn_completed` or explicit `turn_failed`.
5. Start or probe Kimi only after confirming `~/.kimi/config.toml` exists.
6. Start or probe GLM only after providing a Z.AI/GLM API key through env, config, or Settings.

## 6. Out Of Scope

- No release build without a separate explicit user confirmation.
- No changes to Claude and Codex behavior except shared provider-status projection if required.
- No generic provider-switch takeover.
- No fake usage/context telemetry for Kimi or GLM.
- No tracked persistence of provider secrets.
