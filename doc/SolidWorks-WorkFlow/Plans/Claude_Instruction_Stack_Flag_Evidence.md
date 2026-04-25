# Claude Instruction Stack Flag Evidence

**Статус:** планирование / сбор фактических данных  
**Дата:** 2026-04-24  
**Scope:** только Claude Agent SDK  
**Связанный общий scope:** `doc/SolidWorks-WorkFlow/Plans/Provider_Instruction_Stack_Tuning_Tests.md`

## 0. Назначение документа

Этот документ нужен, чтобы собрать собственную практическую картину по Claude Agent SDK:

- какие options CodeAI Hub передает в SDK;
- какие options реально меняют native request к Anthropic;
- что попадает в поле Anthropic `system`;
- что попадает в `messages`;
- что остается в `tools`;
- какие filesystem/settings источники подтягиваются или не подтягиваются.

Документация SDK описывает поведение слишком общо. Поэтому этот документ должен опираться на реальные captures из живого пути приложения:

`Project Manager -> Core -> Claude provider adapter -> Claude Agent SDK -> Anthropic request`

Raw provider/system prompt dumps нельзя коммитить в git. В этот документ попадают только выводы, короткие выдержки, названия flags и ссылки на runtime logs.

## 1. Текущий baseline вызова Claude SDK

### 1.1 Diagnostic capture path

Текущий diagnostic capture для Claude находится здесь:

- `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts`

Логически вызов SDK сейчас выглядит так:

```ts
sdk.query({
  prompt: resolveCapturePrompt(options),
  options: {
    additionalDirectories: [workspacePath],
    allowDangerouslySkipPermissions: true,
    cwd: workspacePath,
    env: {
      ...authEnvironment,
      ...certificateEnv,
      ALL_PROXY: proxyUrl,
      HTTP_PROXY: proxyUrl,
      HTTPS_PROXY: proxyUrl,
      NODE_EXTRA_CA_CERTS: certificatePath,
      REQUESTS_CA_BUNDLE: certificatePath,
      SSL_CERT_FILE: certificatePath,
    },
    includePartialMessages: false,
    model: selectedModelId ?? defaultModel,
    pathToClaudeCodeExecutable: claudeExecutablePath,
    permissionMode: "bypassPermissions",
    persistSession: false,
    projectPath: claudeProviderProjectDir,
    settingSources: [],
    thinking: { type: "adaptive", display: "summarized" } | { type: "disabled" },
    effort: reasoningEffort,
  },
});
```

В уже полученном capture использовалось:

- `model: "opus"` на уровне настроек CodeAI Hub; upstream это превратилось в `claude-opus-4-7`;
- `thinking: { type: "adaptive", display: "summarized" }`;
- `effort: "max"`;
- `settingSources: []`;
- явный `systemPrompt` не передавался.

Runtime log для этого наблюдения:

- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-24T12-22-42-190Z-claude-native-request.md`

### 1.2 Объяснение текущего diagnostic call простыми словами

Текущий диагностический вызов Claude означает следующее:

- Мы обращаемся к Claude через официальный Claude Agent SDK, а не через самописный HTTP-запрос.
- Основную workflow-инструкцию мы отправляем как главный текстовый prompt. В проверенном capture это была инструкция агента шага `Description`.
- Мы говорим Claude работать внутри текущей workspace-папки.
- Мы разрешаем Claude видеть текущую workspace-папку как дополнительную доступную директорию.
- Мы запускаем запрос в режиме diagnostic capture: локальный proxy перехватывает native request, поэтому запрос не должен нормально завершаться upstream.
- Мы говорим SDK не сохранять эту диагностическую сессию.
- Мы говорим SDK не отдавать CodeAI Hub partial SDK messages во время capture, потому что цель capture — увидеть native request, а не вести живой UI-stream.
- Мы явно разрешаем provider process не спрашивать runtime permissions, потому что CodeAI Hub управляет permission policy на уровне продукта.
- Мы передаем auth environment и локальные proxy/certificate переменные, чтобы MITM capture мог увидеть native request.
- Мы выбираем Claude model и thinking effort из того же applied settings path, который используется обычными workflow turns.
- Мы явно передаем `settingSources: []`. Это значит, что SDK не должен загружать локальные `CLAUDE.md`, user settings, project settings или local settings как источники инструкций.
- Мы не передаем `systemPrompt`. Поэтому SDK использует свое default-поведение для отсутствующего system prompt.

### 1.3 Что это дало в captured Anthropic request

Главный Claude request из capture не содержал полный Claude Code system prompt.

Поле `system` содержало только:

- billing/internal marker;
- минимальную SDK identity строку: `You are a Claude agent, built on Anthropic's Claude Agent SDK.`

Workflow-инструкции не исчезли, но они были отправлены как первый user message, а не как поле Anthropic `system`.

Tool declarations были отправлены полностью через `tools`. В них входят описание `Agent` tool и описания системных инструментов для чтения файлов, записи файлов, редактирования, shell execution и т.п. Эти описания действительно влияют на поведение модели, но транспортно это не то же самое, что Anthropic `system` prompt.

Текущая интерпретация:

- `settingSources: []` успешно блокирует filesystem/settings instruction sources.
- Если `systemPrompt` не передан, SDK сейчас дает минимальный system prompt, а не полный Claude Code preset.
- Полный блок tool declarations остается на месте даже при минимальном system prompt.

Открытый вопрос:

- Можно ли получить полный Claude Code system prompt, если явно передать `systemPrompt: { type: "preset", preset: "claude_code" }`?

## 2. Baseline обычного workflow path

Обычные workflow turns используют:

- `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`

Options похожи на diagnostic capture path, но не полностью совпадают:

```ts
sdk.query({
  prompt: workflowPrompt,
  options: {
    cwd: session.workspacePath,
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    additionalDirectories: [session.workspacePath],
    includePartialMessages: true,
    projectPath: claudeProviderProjectDir,
    settingSources: [],
    env: authEnvironment,
    pathToClaudeCodeExecutable: claudeExecutablePath,
    model: appliedModelId ?? defaultModel,
    thinking: { type: "adaptive", display: "summarized" } | { type: "disabled" },
    effort: reasoningEffort,
    resume: existingClaudeSessionId,
    outputFormat: optionalJsonSchemaOutputFormat,
  },
});
```

Отличия от diagnostic capture простыми словами:

- Обычный workflow может продолжать существующую Claude-сессию через `resume`; diagnostic capture специально делает несохраняемый диагностический запрос.
- Обычный workflow включает `includePartialMessages: true`, потому что UI нужен live stream; diagnostic capture отключает partial messages, потому что собирает только native request.
- Обычный workflow не добавляет MITM proxy/certificate переменные, если capture не активен.
- Обычный workflow иногда может запросить structured JSON output через `outputFormat`, если конкретный внутренний workflow turn этого требует.

Важный общий baseline:

- Оба пути сейчас передают `settingSources: []`.
- Оба пути сейчас не передают явный `systemPrompt`.
- Оба пути полагаются на то, что workflow prompt уйдет как user message content.

## 3. Ближайшая цель Claude-тестов

Первый Claude-specific test не должен менять tools или permission policy.

Он должен ответить только на один вопрос:

> Что именно меняется в native Anthropic request, когда CodeAI Hub передает явный Claude SDK `systemPrompt` option?

Минимальные следующие captures:

1. Текущий baseline: `settingSources: []`, без `systemPrompt`.
2. Preset baseline: `settingSources: []`, `systemPrompt: { type: "preset", preset: "claude_code" }`.
3. Preset append: `settingSources: []`, `systemPrompt: { type: "preset", preset: "claude_code", append: "<CodeAI Hub scenario frame>" }`.
4. Custom minimal system: `settingSources: []`, `systemPrompt: "<minimal CodeAI Hub harness>"`.

Для каждого capture фиксируем:

- длину и общую структуру `system`;
- остался ли workflow prompt в `messages`;
- count/name/hash для `tools`;
- появился ли где-либо `CLAUDE.md` или settings content;
- добавил или убрал ли SDK reminders, skills, deferred tools, dynamic context blocks.

## 4. Наблюдение после тестового релиза 1.2.68

В релизе `1.2.68` diagnostic capture path действительно получил:

```ts
systemPrompt: { type: "preset", preset: "claude_code" }
```

Флаг подтвержден в установленном bundle:

- `~/.codeai-hub/providers/claude/1.2.68/dist/diagnostics/claude-native-request-capture-service.js`

Но новый runtime capture:

- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-24T13-35-33-342Z-claude-native-request.md`
- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-24T13-35-33-342Z-claude-native-request.jsonl`

не является валидным C1 для сравнения с baseline. Причина: proxy завершил capture на первом Anthropic `/v1/messages` request, которым оказался provider-owned translation/localization request:

- model: `claude-haiku-4-5-20251001`;
- tools count: `0`;
- request shape совпадает с translation/localization profile, а не с workflow agent loop.

Baseline `2026-04-24T12-22-42-190Z` содержал два captured Anthropic requests:

- first: `claude-haiku-4-5-20251001`, `tools: 0`;
- second: `claude-opus-4-7`, `tools: 10`, основной workflow agent-loop request.

Вывод:

- размер нового файла меньше из-за того, что основной workflow request не был captured;
- сам `systemPrompt` flag не опровергнут и не подтвержден runtime-сравнением;
- нужна корректировка diagnostic capture filter, но только для Settings capture command, не для реальных runtime sessions.

Корректирующее решение:

- для Claude `Native Request Capture` считать успешным target request только Anthropic `/v1/messages` с agent-loop tool declarations;
- translation/localization requests внутри того же diagnostic run записывать как ignored/intermediate и продолжать ждать следующий request;
- реальный Claude/Haiku runtime traffic не менять.

## 5. Наблюдение после корректирующего релиза 1.2.69

Runtime capture после установки `1.2.69`:

- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-24T13-55-05-221Z-claude-native-request.md`
- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-24T13-55-05-221Z-claude-native-request.jsonl`

Результат подтверждает, что diagnostic-only filter работает по назначению:

- JSONL record `25`: `request_ignored`, reason `request_body_not_matched`, model `claude-haiku-4-5-20251001`, `tools: 0`;
- JSONL record `28`: `request_captured`, model `claude-opus-4-7`, `tools: 10`;
- raw runtime/localization request не теряется, но больше не закрывает Settings capture раньше основного workflow request.

Где лежат prompt и tools в captured request:

- `body.system` — Anthropic system prompt field. В Markdown dump это начинается около line `449`; в JSONL это поле находится в captured record `28`.
- `body.tools` — Anthropic tool declarations field. В Markdown dump это начинается около line `476`; в JSONL это поле находится в captured record `28`.
- `body.messages` — user-message payload с workflow prompt. В Markdown dump это начинается около line `422`.

Captured request summary:

- model: `claude-opus-4-7`;
- body key order: `model -> messages -> system -> tools -> metadata -> max_tokens -> thinking -> context_management -> output_config -> stream`;
- `messages`: `1`, hash `24c98fd552e2a4ba`;
- `system`: `4` text blocks, text chars `84, 62, 9936, 18404`, hash `124660c13277895d`;
- `tools`: `10`, hash `4a3f9e88a7a8bd49`;
- tool names: `Agent`, `Bash`, `Edit`, `Glob`, `Grep`, `Read`, `ScheduleWakeup`, `Skill`, `ToolSearch`, `Write`.

Транспортное различие:

- system prompt — это не список tools; это `body.system`;
- системные инструменты Claude Code передаются отдельно как `body.tools`;
- часть текста внутри `body.system` может объяснять правила использования инструментов, но сами tool schemas находятся только в `body.tools`.

## 6. Сравнение baseline C0 и preset C1

Сравниваем только основной workflow agent-loop request:

- C0 baseline: `2026-04-24T12-22-42-190Z-claude-native-request.jsonl`, record `28`, model `claude-opus-4-7`;
- C1 preset: `2026-04-24T13-55-05-221Z-claude-native-request.jsonl`, record `28`, model `claude-opus-4-7`.

Что не изменилось:

- `messages` hash остался `24c98fd552e2a4ba`;
- `tools` count остался `10`;
- `tools` hash остался `4a3f9e88a7a8bd49`;
- tool names остались `Agent`, `Bash`, `Edit`, `Glob`, `Grep`, `Read`, `ScheduleWakeup`, `Skill`, `ToolSearch`, `Write`;
- workflow prompt продолжает находиться в `body.messages`, а не переносится в `body.system`.

Что изменилось:

- C0 `body.system`: `2` text blocks, text chars `146`, hash `fa24a5d30f64f5b3`;
- C1 `body.system`: `4` text blocks, text chars `28486`, hash `124660c13277895d`;
- C1 добавил два больших cached text blocks после двух коротких baseline blocks.

High-level headings, обнаруженные в новых cached system blocks C1:

- block `2`: `System`, `Doing tasks`, `Executing actions with care`, `Using your tools`, `Tone and style`;
- block `3`: `Text output (does not apply to tool calls)`, `System reminders`, `Session-specific guidance`, `auto memory`, `Types of memory`.

Вывод:

- `systemPrompt: { type: "preset", preset: "claude_code" }` действительно меняет native Anthropic request и добавляет большой Claude Code instruction stack в `body.system`;
- это не изменяет `body.tools`: schemas инструментов остаются отдельным полем Anthropic request;
- это не переносит наш workflow prompt из `body.messages` в `body.system`;
- следующая полезная проверка — C2 `preset + append`, чтобы понять, можно ли добавить CodeAI Hub frame поверх Claude Code preset без потери preset blocks.

## 7. План C2: custom-only neutral system prompt

После анализа extracted Claude Code prompt принято не использовать `preset + append` для следующей проверки:

- `preset + append` ожидаемо отправит полный Claude Code preset stack плюс наш append;
- цель C2 — проверить минимальный custom-only system layer без полного Claude Code preset;
- step-specific templates остаются в первом user message и не переносятся в system prompt.

Новый diagnostic C2 должен передавать:

```ts
systemPrompt: AGENT_OPERATING_RULES_SYSTEM_PROMPT
```

Требования к custom system prompt:

- не упоминать `CodeAI Hub`, `orchestrator`, wrapper/надстройку или third-party app;
- не утверждать, что runtime является Claude Code CLI;
- описывать только нейтральные operating rules: instruction priority, source boundaries, prompt-injection boundary, artifact-first workflow, accuracy/assumptions, scope control, short communication;
- не содержать step-specific правил `Description`, `Virtual Simulation` или `Diagram Modules`;
- не переносить workflow templates из `~/.codeai-hub/templates/` в system prompt.

Ожидаемая проверка после релиза:

- `body.system` содержит baseline SDK markers и custom neutral operating rules;
- большие Claude Code preset blocks из C1 отсутствуют;
- `body.tools` остается с теми же agent-loop tool declarations;
- `body.messages` продолжает содержать workflow step template.
