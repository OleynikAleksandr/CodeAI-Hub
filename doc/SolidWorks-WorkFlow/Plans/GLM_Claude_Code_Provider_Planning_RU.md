# GLM-Claude-Code Provider Replacement — planning

**Дата:** 2026-05-19  
**Статус:** implementation in progress  
**Scope:** заменить экспериментальный provider `kimi-claude-code` на `glm-claude-code`, чтобы проверить GLM 5.1 через Claude Code-compatible runtime без пересечения с настоящим Claude Code и без второго Kimi-провайдера.

## 1. Решение

Релиз `1.2.317` подтвердил, что Kimi через Claude Code-compatible client работает технически, но по поведению не лучше native Kimi Wire provider. Поэтому `Claude-Kimi` не нужен как product-facing вариант. Native Kimi остается:

- provider id: `kimiCode`;
- user label: `Kimi`;
- runtime: Kimi CLI Wire;
- home: `~/.codeai-hub/providers/kimi/home`.

Claude-compatible runtime при этом полезен как общий механизм для моделей без собственного SDK. Следующий кандидат — Z.AI GLM Coding Plan / GLM 5.1, потому что Z.AI официально документирует Claude Code integration.

## 2. Целевой provider

- Internal provider id: `glmClaudeCode`.
- Runtime namespace: `glm-claude-code`.
- User-facing label: `GLM-Claude-Code`.
- Primary model: `glm-5.1`.
- Fast/default helper models: `glm-5-turbo`, `glm-4.5-air`.
- Runtime home: `~/.codeai-hub/providers/glm-claude-code/home`.
- Local provider config: `~/.codeai-hub/providers/glm-claude-code/config.json`.
- Claude project slug: `glm-claude-code`.
- Anthropic-compatible endpoint: `https://api.z.ai/api/anthropic`.

Implementation should rename/replace the existing `kimiClaudeCode` branch instead of adding a third Kimi-like provider. The active UI after this scope should contain:

1. `Kimi` — native Kimi Wire provider.
2. `GLM-Claude-Code` — GLM through Claude Code-compatible runtime.

There should be no active `Claude-Kimi` provider in Settings, start cards, Capture Workbench, status labels, provider registries or model inheritance after replacement.

## 3. Auth and settings strategy

Kimi reused `~/.kimi/config.toml`, because the user had already authorized Kimi CLI. GLM does not have an equivalent CodeAI-supported local CLI auth source in this project, so the GLM key must be entered explicitly.

The implementation must not write the GLM key into repository files or into the real `~/.claude` home. It should use a CodeAI-owned isolated local config:

```json
{
  "apiKey": "",
  "baseUrl": "https://api.z.ai/api/anthropic",
  "opusModel": "glm-5.1",
  "sonnetModel": "glm-5-turbo",
  "haikuModel": "glm-4.5-air",
  "timeoutMs": 3000000
}
```

Expected config path:

```text
~/.codeai-hub/providers/glm-claude-code/config.json
```

Settings UI must expose enough information for the user to fill this value. Preferred first implementation:

- Settings tab/card `GLM-Claude-Code`;
- API key field or explicit config-file path action;
- base URL field with default `https://api.z.ai/api/anthropic`;
- model fields/defaults for Opus/Sonnet/Haiku routing;
- no secret logging and no secret in native capture artifacts.

Runtime env for Claude SDK/Claude Code-compatible path:

```text
HOME=~/.codeai-hub/providers/glm-claude-code/home
ANTHROPIC_AUTH_TOKEN=<Z.AI API key>
ANTHROPIC_API_KEY=<Z.AI API key>
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
API_TIMEOUT_MS=3000000
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
ANTHROPIC_DEFAULT_OPUS_MODEL=glm-5.1
ANTHROPIC_DEFAULT_SONNET_MODEL=glm-5-turbo
ANTHROPIC_DEFAULT_HAIKU_MODEL=glm-4.5-air
```

The implementation currently sets both `ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_API_KEY` at runtime only, because different Claude Code-compatible paths may read different Anthropic-style key variables. The key is still stored in one local config field or env source and must not be duplicated into tracked files.

## 4. System prompt and tool profile

GLM-Claude-Code should reuse the CodeAI-owned Claude workflow system prompt and the compact workflow tool profile:

- `systemPrompt = CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT`;
- `settingSources: []`;
- `tools: ["Read", "Write", "Edit"]`;
- `permissionMode: "bypassPermissions"`;
- `allowDangerouslySkipPermissions: true`.

This keeps the comparison meaningful: GLM receives the same CodeAI workflow rules that worked best for Claude and were tested for `Claude-Kimi`.

The provider must not load:

- real `~/.claude` settings;
- global `CLAUDE.md`;
- project/user Claude Code memories;
- Kimi CLI config or Kimi provider home.

## 5. Replacement scope

The implementation should replace, not duplicate:

- `packages/Claude_Module/src/glm-claude-code/*` owns GLM-specific runtime/profile/auth/facade names;
- provider id is `glmClaudeCode`;
- settings key is `providers.glmClaudeCode`;
- UI label is `GLM-Claude-Code`;
- model label is `GLM 5.1 / Claude-Code`;
- home path is `~/.codeai-hub/providers/glm-claude-code/home`;
- docs module is `Modules/GLM_Claude_Code.md`.

Native Kimi files and docs must remain intact except for removing obsolete active references to the old `Kimi-Claude-Code` boundary. Historical archive docs may still mention the closed experiment.

## 6. Product surfaces

`GLM-Claude-Code` must appear anywhere a provider/model can be selected or inspected:

- Settings provider tab/card;
- Description questionnaire submit provider picker;
- workflow step start cards;
- Development Tree start/fix cards;
- status line/model chip/session title;
- provider tint/theme mapping;
- Capture Workbench provider/model selector;
- effective model identity and next-step provider inheritance.

If user chooses `GLM-Claude-Code` on one step, the next step start card must preserve that provider by default, same as other providers.

## 7. Diagnostics and telemetry

Native request capture may reuse the Claude SDK diagnostic capture path, but provider metadata must be GLM-specific:

- host/base URL: `api.z.ai/api/anthropic`;
- provider id: `glmClaudeCode`;
- model id: `glm-5.1` or selected GLM model;
- config path shown without API key;
- tools/system prompt captured without secret headers.

Usage-limits and context-window telemetry should start as unavailable unless Z.AI exposes a reliable provider-specific endpoint and the same account/key source is proven.

## 8. Verification gates

Before product release:

1. Create isolated provider config with no real secret in Git.
2. Run a live smoke through Claude SDK-compatible path after the user fills API key:
   - short answer;
   - one workflow-style prompt;
   - `Read/Write/Edit` tool availability;
   - `turn_started` -> visible assistant/progress -> `turn_completed`;
   - Stop/close behavior.
3. Run targeted tests for:
   - auth/config resolver;
   - runtime profile env;
   - provider registry/settings defaults;
   - UI provider option lists;
   - native capture provider allowlist.
4. Run targeted builds:
   - `npm run build --workspace packages/Claude_Module`;
   - `npm run build --workspace packages/core`;
   - `npm run typecheck:webview`;
   - `npm run build:webview`.
5. Ask user for explicit release build confirmation before `build-all.sh`.

## 9. Acceptance criteria

- `Claude-Kimi` / `kimiClaudeCode` no longer appears in active runtime/UI surfaces.
- Native `Kimi` remains present and unchanged as Kimi Wire provider.
- `GLM-Claude-Code` is selectable in Settings, step cards, Capture Workbench and status identity surfaces.
- GLM provider state is isolated under `~/.codeai-hub/providers/glm-claude-code/home`.
- User can enter or place Z.AI API key without touching real `~/.claude`.
- First live smoke can start a session, produce visible output, complete the turn, and leave input unlocked.
- Missing API key fails with an explicit recovery hint, not with a hanging session.
