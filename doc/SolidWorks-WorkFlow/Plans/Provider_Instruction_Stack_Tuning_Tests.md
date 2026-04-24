# Provider Instruction Stack Tuning Tests

**Status:** planning / pre-implementation  
**Date:** 2026-04-24  
**Scope:** Claude Agent SDK and Codex App Server instruction-stack tuning  
**Out of scope:** provider system tools, tool declarations, MCP/tool allowlists, sandbox/permission policy changes

## 0. Цель

Нужно получить управляемый способ проверять, как CodeAI Hub может менять структуру и содержание инструкций, которые фактически уходят провайдерам:

- provider/system harness;
- developer-level или provider-equivalent инструкции;
- filesystem/user instruction sources (`CLAUDE.md`, `AGENTS.md`, skills, settings);
- наш workflow first user turn для `Description`, `Virtual Simulation`, `Diagram Modules`.

Ключевой критерий: тестовые кнопки и будущие настройки должны идти тем же application path, что и реальные workflow turns. Нельзя делать отдельный "лабораторный" запрос, который не проходит через PM -> Core -> provider adapter -> provider client path.

`System Tools` не меняем. В каждом тесте допускается только менять instruction-related flags/options. Список native tools должен оставаться тем же: сверяем count, names и hash tool declarations до/после.

## 0.1 Research Input

Локально проверенные версии:

- `@anthropic-ai/claude-agent-sdk 0.2.119`
- `codex-cli 0.124.0`
- Codex App Server schema regenerated через `codex app-server generate-ts --out <tmp-dir>`.

Документация и локальные источники, на которые опирается план:

- Anthropic Agent SDK TypeScript reference: `https://platform.claude.com/docs/en/agent-sdk/typescript`
- Claude Code settings: `https://code.claude.com/docs/en/settings`
- Claude Code output styles: `https://code.claude.com/docs/en/output-styles`
- OpenAI Codex config reference: `https://developers.openai.com/codex/config-reference`
- OpenAI Codex App Server: `https://developers.openai.com/codex/app-server`
- OpenAI Codex repo config notes: `https://github.com/openai/codex/blob/main/docs/config.md`
- Existing CodeAI Hub docs:
  - `doc/SolidWorks-WorkFlow/Plans/Claude_Agent_SDK_Capabilities_Analysis.md`
  - `doc/SolidWorks-WorkFlow/Plans/Codex_AppServer_Capabilities_Analysis.md`
  - `doc/SolidWorks-WorkFlow/Plans/CrossProvider_Common_Capabilities.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Provider_Native_Request_Capture_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Native_Request_Capture_Workflow_Scenarios_1.2.66.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Native_Request_Capture_Codex_Turn_Context_Hotfix_1.2.67.md`

## 0.2 Baseline Vault: сначала сохраняем системные инструкции

Перед любой попыткой отключать или подменять системные инструкции нужно сохранить текущий baseline. Raw provider prompts могут содержать служебную информацию, account/session metadata и провайдерские proprietary prompt fragments, поэтому не кладем их в git.

Runtime vault:

```text
~/.codeai-hub/logs/instruction-stack-baselines/
  YYYY-MM-DDTHH-mm-ss-provider-model-scenario/
    raw-native-request.jsonl
    raw-native-request.md
    extracted-instruction-stack.md
    tool-declarations.sha256
    tool-declarations-summary.md
    curated-keep.md
    removal-candidates.md
    test-result.md
```

Что сохраняем в `extracted-instruction-stack.md`:

- provider/model/scenario/runtime versions;
- полный native request body или frame references из `~/.codeai-hub/logs/native-request-capture/`;
- извлеченные `system`, `developer`, `instructions`, `messages`, `user_instructions`;
- workflow first user prompt;
- tool declaration count/name/hash;
- known dynamic blocks: cwd/date/timezone/git status/memory/project docs/skills/hooks.

Что вручную заполняем в `curated-keep.md` до экспериментов:

- provider safety and execution harness fragments, которые нельзя терять;
- file editing / shell / sandbox / permissions behavioral rules, если они живут в instructions, а не в tools;
- response formatting and streaming constraints, от которых зависит наш parser/UI;
- provider-specific reminders, которые реально нужны для стабильности agent loop;
- блоки, которые можно перенести из system/developer в наш step-specific first user prompt.

Что фиксируем в repo после анализа: только summary/decision, без raw prompts.

## 0.3 Common Test Protocol

Для каждого provider/model/scenario:

1. Запустить baseline capture без новых флагов.
2. Сохранить baseline в vault.
3. Выполнить один тестовый флаг или одну комбинацию флагов.
4. Снова запустить capture тем же scenario path: `Description`, `Virtual Simulation`, `Diagram Modules`.
5. Сравнить:
   - instruction stack diff;
   - workflow first user prompt diff;
   - tool declaration hash;
   - наличие/отсутствие `CLAUDE.md`, `AGENTS.md`, skills/settings blocks;
   - provider diagnostic context (`thread/start`, `thread/resume`, `turn/start` для Codex).
6. Записать результат в `test-result.md`: `works`, `partial`, `no-op`, `rejected by schema`, `unsafe`.

Acceptance для любого кандидата:

- workflow first user turn остается сформированным нашим ядром;
- tool declarations не меняются;
- provider request visibly reflects the tested flag;
- важные baseline-инструкции либо сохранены в system/developer layer, либо перенесены в approved first user prompt;
- тест можно повторить через Settings -> General capture buttons без ручных CLI-only шагов.

## 1. Claude

### 1.1 Текущая интеграция

CodeAI Hub сейчас использует `@anthropic-ai/claude-agent-sdk` через `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`.

Наблюдения:

- workflow turns явно передают `settingSources: []`;
- workflow turns не передают `systemPrompt`;
- capture path в `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts` также передает `settingSources: []` и не передает `systemPrompt`;
- translation-only сервис уже использует `systemPrompt` с `tools: []`, но это отдельный non-workflow path и не может считаться доказательством для workflow agent loop.

Важный нюанс версии: публичная TypeScript reference показывает `settingSources` default как no settings, а локальный `sdk.d.ts` версии `0.2.119` в комментариях говорит, что omitted может вести себя как CLI defaults и загружать sources. Поэтому в продуктовых workflow turns нужно оставлять explicit `settingSources: []` до тех пор, пока тесты не докажут обратное.

### 1.2 Claude candidate flags/options

Primary candidates:

- `systemPrompt: string`  
  Полная кастомная system instruction для main agent loop.

- `systemPrompt: string[]`  
  Кастомная system instruction как набор блоков. В локальном SDK есть `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`, который разделяет static cacheable prefix и dynamic suffix.

- `systemPrompt: { type: "preset", preset: "claude_code", append: string }`  
  Сохраняет Claude Code preset и добавляет наш step-specific system/developer-like frame в конец system prompt.

- `systemPrompt: { type: "preset", preset: "claude_code", excludeDynamicSections: true }`  
  Убирает dynamic sections из system prompt и реинжектит их первым user message. Это не удаление контекста, а изменение веса/позиции.

- `settingSources: [] | ["project"] | ["user", "project", "local"]`  
  Управляет загрузкой filesystem settings и `CLAUDE.md`. Для CodeAI Hub baseline должен быть `[]`; остальные режимы нужны как controlled negative/diagnostic tests.

Secondary candidates:

- `managedSettings.includeGitInstructions: false`  
  Потенциально убирает Claude git workflow instructions и git status snapshot из system prompt без отключения tools.

- `managedSettings.outputStyle` или settings-backed `outputStyle`  
  Output styles напрямую меняют system prompt. Тестировать аккуратно, потому что custom output styles могут отключать coding-specific default instructions, если не включен `keep-coding-instructions`.

- SDK hooks (`SessionStart`, `UserPromptSubmit`) с hook output `systemMessage` или additional context  
  Нужны только как доказательство, что hook path append-only или reminder-like. Не использовать как основной механизм замены system prompt, если native capture не покажет нужный hierarchy/position.

Out of scope for this cycle:

- `tools`, `allowedTools`, `disallowedTools`, `mcpServers`, `toolConfig`;
- `tools: []`, даже если оно уже используется translation-only сервисом;
- subagent `AgentDefinition.prompt`, потому что workflow step у нас уже отдельный provider session/agent, а не Claude subagent внутри Claude loop;
- `criticalSystemReminder_EXPERIMENTAL`, если оно применимо только к subagents.

### 1.3 Claude Test Matrix

| ID | Flag set | Что проверяем | Ожидаемый результат |
| --- | --- | --- | --- |
| C0 | Current baseline: `settingSources: []`, no `systemPrompt` | Сохраняем текущий native system/request/tool baseline | Vault заполнен, tool hash зафиксирован |
| C1 | `systemPrompt: "<minimal CodeAI Hub harness>"`, `settingSources: []` | Может ли SDK полностью заменить system prompt main loop | Native `system` видимо меняется; first user prompt остается workflow prompt |
| C2 | `systemPrompt: [staticHarness, SYSTEM_PROMPT_DYNAMIC_BOUNDARY, scenarioFrame]` | Можно ли разделить static/dynamic system blocks без потери workflow path | Native system содержит оба блока; boundary влияет только на cache/dynamic split |
| C3 | `systemPrompt: { type: "preset", preset: "claude_code", append: scenarioFrame }` | Безопасный режим: сохранить Claude Code harness и добавить step frame | Default harness остается, append виден в system |
| C4 | C3 + `excludeDynamicSections: true` | Можно ли снизить вес cwd/git/memory dynamic sections без потери контекста | Dynamic sections исчезают из system и появляются в first user/system-reminder-like user block |
| C5 | C3 + `managedSettings.includeGitInstructions: false` | Можно ли убрать встроенные git instructions/git status из system prompt | Git-specific system blocks исчезают; tools unchanged |
| C6 | C3 + custom `outputStyle` with `keep-coding-instructions: true` | Можно ли использовать output style как системную специализацию без отключения coding harness | Output style append виден; core coding/tool behavior preserved |
| C7 | `settingSources: ["project"]` + preset | Controlled positive: доказываем, как `CLAUDE.md` попадает в request | `CLAUDE.md` появляется; baseline policy остается `[]` |
| C8 | `settingSources: ["user", "project", "local"]` + preset | Controlled negative: показываем, почему нельзя грузить все sources в CodeAI Hub workflow | User/local noise появляется; помечаем как unsafe default |
| C9 | Hook `UserPromptSubmit` adds systemMessage/additional context | Проверяем hierarchy/position hook output | Если append-only, не используем для замены system; можно оставить как telemetry/reminder candidate |

### 1.4 Claude Decision Criteria

Предпочтительный порядок внедрения, если тесты подтвердят поведение:

1. `systemPrompt: { type: "preset", preset: "claude_code", append: scenarioFrame }` как safe mode.
2. `excludeDynamicSections: true` только если перенос dynamic sections в user layer не ломает поведение.
3. Custom `systemPrompt: string[]` для advanced mode, если curated keep полностью покрывает provider harness.
4. `managedSettings.includeGitInstructions: false` как точечный cleanup, если наш workflow сам задает git/session rules.
5. `settingSources` остается explicit `[]` в product baseline; non-empty values только для diagnostic tests.

## 2. Codex

### 2.1 Текущая интеграция

CodeAI Hub уже использует Codex App Server через `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`.

Наблюдения:

- `thread/start` и `thread/resume` сейчас передают `cwd`, `approvalPolicy`, `sandbox`, `model`, `persistExtendedHistory`;
- `thread/start` и `thread/resume` не передают `baseInstructions`, `developerInstructions`, `config`;
- `turn/start` передает `threadId`, `input`, `cwd`, `model`, `effort`, `summary`, optional `outputSchema`;
- `turn/start` не передает `collaborationMode`;
- Codex provider home сейчас `~/.codeai-hub/providers/codex/home`;
- текущий `config.toml` не содержит `model_instructions_file`, `project_doc_max_bytes`, skills/plugin instruction flags или explicit developer instructions.

Локально сгенерированная App Server schema для `codex-cli 0.124.0` показывает:

- `ThreadStartParams.baseInstructions?: string | null`
- `ThreadStartParams.developerInstructions?: string | null`
- `ThreadStartParams.config?: Record<string, JsonValue> | null`
- `ThreadResumeParams.baseInstructions?: string | null`
- `ThreadResumeParams.developerInstructions?: string | null`
- `TurnStartParams.collaborationMode?: CollaborationMode | null`
- `CollaborationMode.settings.developer_instructions: string | null`

OpenAI Codex config reference дополнительно показывает:

- `model_instructions_file` как replacement for built-in instructions;
- `instructions` как reserved/future-use, prefer `model_instructions_file` or `AGENTS.md`;
- `project_doc_max_bytes` как лимит чтения `AGENTS.md`;
- `project_doc_fallback_filenames` и `project_root_markers` как управление discovery project docs/root.

### 2.2 Codex candidate flags/options

Primary App Server candidates:

- `thread/start.baseInstructions`
  Вероятный прямой способ заменить или задать base/model instructions при создании thread.

- `thread/start.developerInstructions`
  Вероятный способ добавить developer-level frame для workflow/scenario.

- `thread/resume.baseInstructions`
  Проверка, применяются ли новые base instructions при resume существующего provider thread.

- `thread/resume.developerInstructions`
  Проверка, можно ли менять developer frame на resumed thread.

- `thread/start.config`
  Inline config overrides без записи global `config.toml`; нужен для controlled diagnostic toggles.

- `turn/start.collaborationMode.settings.developer_instructions`
  Experimental per-turn preset override. Документация предупреждает: `collaborationMode` takes precedence over model/reasoning/developer instructions; `developer_instructions: null` значит built-in mode instructions, а не clear.

Primary config candidates:

- `model_instructions_file`
  Самый сильный кандидат на замену built-in model instructions. Высокий риск: сначала нужен `curated-keep.md`.

- `project_doc_max_bytes = 0`
  Кандидат на отключение чтения `AGENTS.md` как user/project instructions.

- `project_doc_fallback_filenames = []`
  Кандидат на сужение fallback project instruction discovery.

- `project_root_markers = [...]`
  Кандидат для диагностики root discovery. Сам по себе не отключает `AGENTS.md`, но может менять откуда Codex ищет project docs.

Suspected / verify-before-use candidates:

- `developer_instructions` в config/profile  
  Ищем только через generated schema/config schema. Если текущий Codex не принимает ключ, помечаем rejected.

- `include_environment_context = false`
  Возможный флаг отключения environment-context блока. В текущей публичной config reference не найден; сначала schema/binary/config-read validation.

- `include_permissions_instructions = false`
  Возможный флаг отключения permissions/sandbox text. В текущей публичной config reference не найден; сначала validation. Не должен менять `sandbox`/`permissionProfile`.

- `include_apps_instructions = false`
  Возможный флаг отключения apps/connectors instruction text. В текущей публичной config reference не найден; сначала validation.

- `[skills] include_instructions = false` или equivalent skills instruction toggle  
  Возможный флаг отключения skill instructions. В текущей публичной config reference не найден; сначала validation. Не путать с `turn/start` skill input items.

Negative / low priority candidates:

- `instructions`
  Официально reserved/future-use; тестировать только чтобы подтвердить no-op или rejected.

- `personality`
  Может менять style/system frame, но не является полноценной заменой instruction stack.

- hooks (`SessionStart`, `UserPromptSubmit`)
  Допускаются как append-only diagnostics, но не как primary system replacement.

Out of scope for this cycle:

- `tools`, MCP, Apps tool enablement, web search mode, shell tool config;
- `sandbox`, `sandboxPolicy`, `permissionProfile`, approvals policy;
- `experimentalRawEvents`, кроме как instrumentation для capture visibility.

### 2.3 Codex Test Matrix

| ID | Flag set | Что проверяем | Ожидаемый результат |
| --- | --- | --- | --- |
| X0 | Current baseline: no `baseInstructions`, no `developerInstructions`, current config | Сохраняем native `instructions`, `tools`, app-server diagnostic context, rollout `turn_context` | Vault заполнен, tool hash зафиксирован |
| X1 | `thread/start.baseInstructions = minimal CodeAI Hub harness` | Заменяет ли App Server base/model instructions | Native `instructions` visibly changes; tools unchanged |
| X2 | `thread/start.developerInstructions = scenarioFrame` | Добавляется ли developer-level workflow frame | Diagnostic context и native request показывают developer block/position |
| X3 | `thread/start.baseInstructions + developerInstructions` | Рабочий combined mode для новых threads | Base + developer оба видны; first user prompt остается workflow prompt |
| X4 | `thread/resume.baseInstructions` on existing thread | Можно ли менять base instructions при resume | Subsequent turn shows changed or unchanged behavior; результат фиксируется |
| X5 | `thread/resume.developerInstructions` on existing thread | Можно ли менять developer frame при resume | Developer block changes or App Server rejects/no-ops |
| X6 | `turn/start.collaborationMode` with custom `settings.developer_instructions` | Может ли per-turn collaboration mode заменить developer instructions | Если precedence ломает model/effort/developer path, помечаем high-risk |
| X7 | `turn/start.collaborationMode.settings.developer_instructions = null` | Подтверждаем documented semantics: null uses built-in instructions | Не считаем null способом очистки |
| X8 | `thread/start.config.project_doc_max_bytes = 0` | Отключается ли `AGENTS.md` в `turn_context.user_instructions` и native request | `AGENTS.md` исчезает; system/tools unchanged |
| X9 | `thread/start.config.project_doc_fallback_filenames = []` | Сужает ли fallback project docs | Нет fallback noise; `AGENTS.md` root behavior отдельно |
| X10 | Temp `CODEX_HOME/config.toml` or profile with `model_instructions_file` | Реально ли заменить built-in instructions файлом | Native instructions заменены; curated keep must be complete |
| X11 | `thread/start.config.model_instructions_file = <path>` | Принимает ли App Server inline config для model instruction file | Если accepted, preferred over global config edits; если rejected, use temp profile |
| X12 | `thread/start.config.instructions = "..."` | Negative test для reserved key | Expected no-op/rejected; не использовать в продукте |
| X13 | Suspected `include_environment_context = false` | Есть ли рабочий флаг убрать environment block | Schema accepted + native diff; иначе rejected-candidate |
| X14 | Suspected `include_permissions_instructions = false` | Есть ли рабочий флаг убрать permissions text без изменения sandbox/tools | Schema accepted + native diff; иначе rejected-candidate |
| X15 | Suspected `include_apps_instructions = false` | Есть ли рабочий флаг убрать apps/connectors instructions | Schema accepted + native diff; иначе rejected-candidate |
| X16 | Suspected `[skills] include_instructions = false` equivalent | Есть ли рабочий флаг убрать skills instruction injection | Schema accepted + native diff; иначе rejected-candidate |
| X17 | `personality = null/default/pragmatic` | Насколько personality меняет instruction stack | Low-priority style diff only |

### 2.4 Codex Validation Details

Для Codex одного native WebSocket frame недостаточно. Нужно читать три слоя:

- `Provider Diagnostic Context` в capture `.md/.jsonl`: `thread/start`, `thread/resume`, `turn/start` payloads;
- provider-native `response.create` / WebSocket frame: `instructions`, `input`, tool declarations;
- Codex provider-home rollout JSONL under `~/.codeai-hub/providers/codex/home/sessions/...`: `turn_context.user_instructions`, `collaboration_mode.settings.developer_instructions`, model/effort/personality.

Особенно проверяем `AGENTS.md`: последние captures показывали, что Codex может класть root `AGENTS.md` в `turn_context.user_instructions`. Для нашей цели это отдельный, управляемый source. Если workflow step уже отправляет полноценный first user prompt, `AGENTS.md` не должен молча добавлять большой универсальный блок, если мы его явно не разрешили.

### 2.5 Codex Decision Criteria

Предпочтительный порядок внедрения, если тесты подтвердят поведение:

1. `thread/start.developerInstructions` для step-specific provider frame.
2. `thread/start.baseInstructions` только после curated keep baseline.
3. `thread/start.config.project_doc_max_bytes = 0` для отключения `AGENTS.md` noise, если это работает inline.
4. `model_instructions_file` через temp profile/provider-home only as advanced replacement mode.
5. `collaborationMode` не использовать в product baseline, если оно перетирает model/effort/developer settings.
6. Suspected include flags использовать только после schema/config validation и native diff proof.

## 3. Expected Implementation After Approval

После утверждения этого planning-doc нужно создать `doc/TODO/todo-plan.md` с микро-задачами. Предварительная нарезка:

1. Baseline vault writer/extractor: сохранять raw capture reference, extracted instruction stack, tool hashes.
2. Claude instruction profile experiments: добавить diagnostic-only instruction profile selector/flags в capture path, не меняя normal workflow default.
3. Codex instruction profile experiments: протянуть `baseInstructions`, `developerInstructions`, `config`, `collaborationMode` через existing App Server path.
4. Settings -> General UI: режим выбора provider/model/scenario/instruction-profile для capture.
5. Report writer: в `.md` capture выводить explicit sections `Instruction Stack Diff`, `Tool Hash`, `Workflow First User Prompt`, `Rejected/Accepted Flags`.
6. Test run and release build after approved scope.

До утверждения пользователем `todo-plan.md` не создается.
