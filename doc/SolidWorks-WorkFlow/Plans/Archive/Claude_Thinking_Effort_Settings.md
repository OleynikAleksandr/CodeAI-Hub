# Claude Thinking Effort Settings - Plan

## Problem

Claude settings in CodeAI Hub still expose `thinking.maxTokens`, but the installed Claude SDK now treats `maxThinkingTokens` as a deprecated adaptive-thinking control rather than as a stable verbosity dial. This creates two product issues:

- the saved UI contract no longer matches the SDK contract;
- Claude runtime model sync cannot show an explicit effort switch to the client.

## Decision

CodeAI Hub should move Claude thinking settings to an effort-based contract:

- persisted settings: `providers.claude.thinking = { enabled, effort }`
- legacy snapshot migration: old `maxTokens` values map to the nearest effort tier
- Core-applied turn config: Claude receives explicit `thinkingEnabled` + `reasoningEffort`
- runtime effective identity:
  - thinking off -> `<alias> thinking:off`
  - thinking on -> `<alias> reasoning:<effort>`

## Scope

1. Extension/webview settings normalization and migration from legacy `maxTokens`.
2. Core resolver and applied turn config delivery, including `thinkingDisplaySyncEnabled`.
3. Claude module SDK query options migration from deprecated `maxThinkingTokens` to `thinking + effort`.
4. Session/client sync so Claude effort changes are visible in runtime model identity.
5. SSOT and release-note updates.

## Validation

- `npm run build --workspace @codeai-hub/claude-module`
- `npm test --workspace @codeai-hub/claude-module`
- `npm run build --workspace @codeai-hub/core`
- `npm test --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
