# GLM-OpenCode Provider — planning

**Дата:** 2026-06-16  
**Статус:** planning  
**Scope:** добавить отдельный provider `GLM-OpenCode`, который запускает GLM 5.2 через OpenCode CLI и Z.AI Coding Plan endpoint, не меняя существующий `GLM-Claude-Code`.

## 1. Решение

`GLM-Claude-Code` оставляем как есть. Он полезен как Claude Agent SDK-compatible path и может снова заработать, если текущий сбой у Z.AI/Claude-wrapper временный.

Добавляем второй GLM-провайдер:

- provider id: `glmOpenCode`;
- runtime namespace: `glm-opencode`;
- user-facing label: `GLM-OpenCode`;
- default model: `glm-5.2`;
- OpenCode model selector: `zai-coding-plan/glm-5.2`;
- Coding API endpoint: `https://api.z.ai/api/coding/paas/v4`;
- runtime family: OpenCode CLI `run` через AI SDK `@ai-sdk/openai-compatible`.

Проверенный live smoke 2026-06-16:

```text
opencode 1.17.7
opencode run --dangerously-skip-permissions --format json --model zai-coding-plan/glm-5.2 ...
llm.provider=zai-coding-plan
llm.model=glm-5.2
assistant text: OPENCODE_GLM52_OK
```

## 2. Почему не чинить GLM-Claude-Code этим scope

- `GLM-Claude-Code` использует Anthropic-compatible endpoint и Claude Agent SDK-compatible runtime.
- `GLM-OpenCode` использует Z.AI Coding Plan Chat Completions endpoint через OpenCode.
- Эти path имеют разные failure modes, разные auth/env и разные model-selector rules.

Смешивание двух runtime внутри одного provider id ухудшит диагностику: по UI будет непонятно, какой transport реально работал. Поэтому новый provider должен быть отдельной строкой в Settings, provider picker, status/model chip, capture diagnostics и release artifacts.

## 3. Runtime и auth

Локальная конфигурация:

```text
~/.codeai-hub/providers/glm-opencode/config.json
```

Минимальный формат:

```json
{
  "apiKey": "",
  "baseUrl": "https://api.z.ai/api/coding/paas/v4",
  "model": "zai-coding-plan/glm-5.2",
  "opencodePath": ""
}
```

API key resolution order:

1. `CODEAI_GLM_OPENCODE_API_KEY`
2. `GLM_OPENCODE_API_KEY`
3. `ZHIPU_API_KEY`
4. `ZAI_API_KEY`
5. `Z_AI_API_KEY`
6. `~/.codeai-hub/providers/glm-opencode/config.json` field `apiKey`

Runtime env for OpenCode:

```text
ZHIPU_API_KEY=<resolved Z.AI API key>
ZAI_API_KEY=<resolved Z.AI API key>
Z_AI_API_KEY=<resolved Z.AI API key>
```

Do not pass `--pure`: in local verification it removed the provider catalog and made OpenCode report `Model not found` for `zai-coding-plan/glm-5.2`.

## 4. Provider-home and session contract

- Global provider home: `~/.codeai-hub/providers/glm-opencode/home`.
- Managed workspace home: `.codeai-hub/<workspaceSlug>/runtime/providers/glm-opencode/home`.
- OpenCode process runs with `HOME` / `XDG_*` pointed at the selected provider home, so OpenCode logs, cache, auth files and sessions do not leak into the user's real home.
- One Core send maps to one `opencode run` invocation for the selected logical session.
- The adapter must always finish with `turn_completed` or `turn_failed`; socket close, model-not-found, missing-key and rate-limit errors must become visible provider failure messages, not a permanent working lock.
- First implementation may treat OpenCode sessions as one-shot stateless turns. Persistent OpenCode session resume is deferred until we prove it improves CodeAI workflow behavior.

## 5. Implementation shape

Use a dedicated provider module, not a generic OpenCode abstraction:

- package: `packages/GLM_OpenCode_Module/`;
- public facade: `packages/GLM_OpenCode_Module/src/provider/glm-opencode-provider-adapter.ts`;
- runtime profile/config: `packages/GLM_OpenCode_Module/src/runtime/glm-opencode-runtime-profile.ts`;
- process runner: `packages/GLM_OpenCode_Module/src/runtime/glm-opencode-process.ts`;
- model capabilities: `packages/GLM_OpenCode_Module/src/model/glm-opencode-model-capabilities.ts`;
- public export: `packages/GLM_OpenCode_Module/src/index.ts`;
- release artifact: `glm-opencode-module-<version>.tar.bz2`;
- provider manifest: `assets/providers/glm-opencode/manifest.json`.

Ponytail boundary: do not build a generic "OpenCode provider marketplace" now. One GLM/OpenCode provider is enough until another OpenCode-backed model is explicitly needed.

## 6. Core integration

Core changes:

- add `GlmOpenCodeAdapterCtor` to provider loader types;
- build descriptor:
  - id `glmOpenCode`;
  - name `GLM-OpenCode`;
  - description `Runs GLM 5.2 through OpenCode and Z.AI Coding Plan`;
  - model sync enabled;
  - immediate binding only if the adapter can create a usable runtime session without spawning the model turn;
- add installed path resolution and packaging path for `glm-opencode`;
- add provider failure classification for:
  - missing key;
  - OpenCode binary not found/outdated;
  - model not found;
  - socket closed/retry exhausted;
  - Z.AI rate/usage limit errors.

Settings/defaults:

- add `providers.glmOpenCode` settings snapshot;
- default model stays `zai-coding-plan/glm-5.2`;
- reasoning display toggle can reuse the existing thinking-display field if OpenCode exposes reasoning text; otherwise keep it as no-op/unavailable in the first release;
- provider inheritance between workflow steps must preserve `glmOpenCode`.

## 7. Project Manager surfaces

`GLM-OpenCode` must appear in every user-facing provider selection surface:

- Settings tabs, next to `GLM-Claude-Code`;
- Description provider picker;
- workflow step start cards;
- Development Tree node start/revision cards;
- provider snapshot filtering/order;
- status/model chip and provider color/tint mapping;
- Capture Workbench provider/model selector;
- provider versions/update row if OpenCode version management is wired.

The Settings card should show:

- API key field;
- config path;
- base URL;
- OpenCode binary/version status;
- model selector value `zai-coding-plan/glm-5.2`;
- short note that `GLM-Claude-Code` is a separate provider and is not modified by this setting.

## 8. OpenCode install/update policy

Minimum viable policy:

1. Resolve OpenCode binary from:
   - explicit `providers.glmOpenCode.opencodePath`;
   - `~/.opencode/bin/opencode`;
   - `~/.npm-global/bin/opencode`;
   - `PATH`.
2. Require version `>= 1.17.7` for `zai-coding-plan/glm-5.2` support.
3. If missing/outdated, Settings shows an explicit fix instruction or update action.

Deferred: owning a full bundled OpenCode install under `~/.codeai-hub/providers/glm-opencode/opencode`. Add it only if user-level OpenCode resolution proves unstable in release testing.

## 9. Diagnostics and live testing

Required live checks before release:

1. Direct Z.AI Coding API:
   - endpoint `https://api.z.ai/api/coding/paas/v4/chat/completions`;
   - model `glm-5.2`;
   - response text matches smoke marker.
2. OpenCode model catalog:
   - `opencode models zai-coding-plan --verbose`;
   - contains `zai-coding-plan/glm-5.2`;
   - API URL is `https://api.z.ai/api/coding/paas/v4`;
   - npm package is `@ai-sdk/openai-compatible`.
3. OpenCode run:
   - command uses `--model zai-coding-plan/glm-5.2`;
   - command does not use `--pure`;
   - logs show `llm.provider=zai-coding-plan` and `llm.model=glm-5.2`;
   - assistant text returns the requested marker.
4. CodeAI provider turn:
   - Description or Virtual Simulation can start with `GLM-OpenCode`;
   - output appears in dialog;
   - stop unlocks input;
   - missing key and rate-limit errors do not hang the session.

Native request capture for this provider should record OpenCode command args, selected model and sanitized env names, but never the API key.

## 10. Verification gates

Targeted checks:

- `npm run build --workspace=@codeai-hub/glm-opencode-module`;
- `npm run build --workspace=@codeai-hub/core`;
- `npm run typecheck:webview`;
- provider adapter tests for success, missing key, binary missing, model-not-found and socket-close failure;
- settings/state tests for `providers.glmOpenCode`;
- Project Manager provider picker/settings tests;
- live smoke with the user's current Z.AI key.

Release build still requires separate explicit user confirmation before `build-all.sh` / `build-release.sh`.

## 11. Acceptance criteria

- `GLM-Claude-Code` remains present and unchanged.
- `GLM-OpenCode` is selectable in Settings and all workflow provider pickers.
- A workflow step can run through OpenCode and returns a visible answer from `zai-coding-plan/glm-5.2`.
- UI/model labels clearly distinguish `GLM-Claude-Code` from `GLM-OpenCode`.
- Missing/outdated OpenCode and missing/limited Z.AI key fail with visible recovery text.
- Stop/cancel never leaves the input locked after OpenCode process termination.
- Release artifact includes `glm-opencode-module-<version>.tar.bz2`.
