# Native GLM Provider — planning

**Дата:** 2026-06-17  
**Статус:** active planning source  
**Scope:** добавить отдельный native provider для `GLM 5.2`, который работает напрямую через Z.AI Coding Chat Completions API и не зависит от Claude Code, Codex Responses API или OpenCode runtime.

## 1. Решение

Добавляем отдельный provider:

- provider id: `glmNative`;
- user-facing label: `GLM`;
- default model: `glm-5.2`;
- endpoint: `https://api.z.ai/api/coding/paas/v4/chat/completions`;
- provider home: `~/.codeai-hub/providers/glm-native/home`;
- workspace provider home: `.codeai-hub/<workspaceSlug>/runtime/providers/glm-native/home`;
- release package: `@codeai-hub/glm-module`;
- runtime transport: Node `fetch` + SSE parser, без нового SDK dependency.

Почему не Claude/OpenCode/Codex:

- Claude-compatible Z.AI endpoint дошел до `/v1/messages`, но вернул `529/1305 overloaded` и долго ретраил без ответа модели.
- Codex client использует OpenAI Responses API, а Z.AI documented path для GLM 5.2 здесь Chat Completions-compatible.
- OpenCode работает как fallback, но часть состояния живет в OpenCode runtime/db, а Core теряет полный контроль над usage/session cleanup.
- Native Chat Completions smoke уже подтвердил ответ, reasoning и usage для `glm-5.2`.

## 2. Минимальный runtime contract

Первый релиз делает только то, что нужно workflow sessions:

- `createSession` / `resumeSession` создают Core-owned logical session id.
- `sendMessage` делает один streaming Chat Completions turn.
- `AbortController` закрывает активный request на stop/close.
- `delta.reasoning_content` становится `thinking`.
- `delta.content` становится обычным assistant `Speak`.
- final `usage` становится `token_usage` stream event для статус-панели.
- Every turn ends with `turn_completed` or `turn_failed`.

Deferred:

- provider-native tool calling;
- persisted native conversation replay;
- 5h/weekly subscription limits, если Z.AI не отдаёт публичный endpoint;
- Responses API proxy/shim for Codex.

## 3. Settings и auth

Settings surface:

- API key field;
- base URL field with default `https://api.z.ai/api/coding/paas/v4`;
- model field with default `glm-5.2`;
- reasoning display toggle;
- config path display.

Key resolution:

1. `providers.glmNative.apiKey`;
2. `ZAI_API_KEY`;
3. `ZHIPU_API_KEY`;
4. `Z_AI_API_KEY`;
5. optional OpenCode auth catalog is not reused in the first native release.

The API key must never be logged, copied into diagnostics, or written into runtime logs outside the canonical settings file.

## 4. Z.AI request shape

Streaming request:

```json
{
  "model": "glm-5.2",
  "messages": [
    { "role": "user", "content": "<Core-built prompt>" }
  ],
  "stream": true,
  "thinking": { "type": "enabled" },
  "reasoning_effort": "high"
}
```

The adapter reads SSE `data:` frames until `[DONE]`. It accepts:

- `choices[].delta.reasoning_content`;
- `choices[].delta.content`;
- final `usage.prompt_tokens`;
- final `usage.completion_tokens`;
- final `usage.total_tokens`;
- optional `usage.prompt_tokens_details.cached_tokens`;
- optional `usage.completion_tokens_details.reasoning_tokens`.

Context window for status panel:

- `glm-5.2`: `1_000_000` tokens.

## 5. Core integration

Required Core surfaces:

- provider module loader type + loader;
- provider descriptor factory;
- provider recovery coordinator;
- provider settings snapshot;
- provider turn config resolver;
- workspace runtime capsule provider home;
- provider installed path resolver and release package lookup;
- settings version diagnostics.

Project Manager / UI surfaces:

- provider stack type;
- Settings provider tab/card;
- provider picker order;
- start cards and workflow defaults;
- model label/status chip;
- native request capture provider list, if the existing capture surface supports this provider with minimal diagnostic envelope.

## 6. Packaging

Add:

- `packages/GLM_Module/`;
- `assets/providers/glm-native/manifest.json`;
- release script packaging path for `glm-module-<version>.tar.bz2`;
- root workspace dependency entry where needed.

Do not add `zai-sdk` or OpenAI SDK to the extension runtime. Native `fetch` is enough.

## 7. Verification

Targeted checks:

- `npm run build --workspace=@codeai-hub/glm-module`;
- GLM module unit tests for SSE parsing, reasoning/content split, usage mapping, error classification and abort;
- `npm run build --workspace=@codeai-hub/core`;
- `npm run typecheck:webview`;
- `npm run build:webview`;
- `npm run build:project-manager`.

Live smoke before release:

- use the existing local Z.AI API key;
- send a small prompt to `glm-5.2`;
- verify assistant marker is returned;
- verify `thinking` is emitted when enabled;
- verify final `token_usage` is emitted with non-zero total.

## 8. Acceptance criteria

- `GLM` is selectable in Settings and workflow provider pickers.
- `GLM 5.2` can run a workflow turn without OpenCode or Claude Code.
- Reasoning appears through the existing `Thinking` pipeline and obeys the provider reasoning display toggle.
- The status panel shows non-zero token usage after turn completion.
- Stop/cancel releases the active request and unlocks user input.
- Missing key, invalid auth, rate limit and `529/1305` service failures become visible provider failures, not infinite working state.
- Release artifact includes `glm-module-<version>.tar.bz2`.
