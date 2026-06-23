# OpenRouter Agent Profile And Tooling — Planning Doc

**Статус:** accepted implementation scope  
**Дата:** 2026-06-23  
**Цель:** продолжить OpenRouter после MVP bare chat: дать моделям системный профиль Codex и исполняемую tool surface для workflow/agent turns.

## 1. Решение

OpenRouter остается прямым HTTP провайдером через `/api/v1/chat/completions`; Agent SDK не добавляем.

Для workflow/agent turns OpenRouter получает:

- `system` message из CodeAI Hub Codex workflow invocation profile (`resolveCodexWorkflowInvocationProfile().baseInstructions`);
- OpenAI-compatible function tools из уже реализованной GLM Native tool surface;
- локальное исполнение tool calls через тот же executor, который уже проверен для GLM Native;
- обычный Chat Completions tool loop: assistant `tool_calls` -> локальные `tool` results -> следующий streaming request.

Это минимальный путь: не копируем нативный Codex JSON с неисполняемыми MCP/browser/plugin tools, не тянем OpenRouter Agent SDK, не создаем новый общий abstraction layer.

## 2. Scope

### Runtime

- Экспортировать из `@codeai-hub/glm-module` существующие tool definitions/executor helpers, нужные OpenRouter.
- В OpenRouter adapter:
  - сохранять `workspacePath` на session;
  - prepend system message в каждый request;
  - отправлять `tools` и `tool_choice: "auto"`;
  - парсить streamed `tool_calls`;
  - выполнять tool calls локально и продолжать loop до финального assistant content.

### UI/provider lists

- OpenRouter теперь может участвовать в workflow start surfaces, включая Quality Gates, потому что получает research/file/tool surface.

### Documentation

- Обновить SystemArchitecture и OpenRouter planning/archive notes: старое "standalone only / no managed workflow" больше не является текущим контрактом.

## 3. Non-goals

- Не добавлять OpenRouter server tools (`web_search`, `subagent`, `advisor`, `fusion`, `apply_patch`) как remote OpenRouter features.
- Не добавлять OpenRouter Agent SDK.
- Не копировать полный нативный Codex tool catalog, где нет локальных executors.
- Не делать отдельный marketplace/profile UI.
- Не менять release/version scripts без отдельного подтверждения пользователя.

## 4. Acceptance Criteria

- OpenRouter request body содержит `system` message, `tools`, `tool_choice: "auto"` и выбранный `model`.
- Если модель вызывает tool, Core исполняет tool локально и отправляет результат обратно в OpenRouter в следующем request.
- Если выбран `endpointTag`, строгий routing `provider.order` сохраняется.
- Existing standalone chat остается рабочим.
- Quality Gates provider picker больше не скрывает OpenRouter.
- Документация отражает новый контракт.
