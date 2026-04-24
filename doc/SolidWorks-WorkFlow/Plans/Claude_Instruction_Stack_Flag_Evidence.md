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
