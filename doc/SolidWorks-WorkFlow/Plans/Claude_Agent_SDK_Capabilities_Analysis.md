# Claude Agent SDK: Анализ возможностей и приоритеты для CodeAI Hub

**Date:** 2026-04-19
**Status:** Research / Capabilities analysis (исследовательский документ)
**Source type:** Обзор публичной документации Anthropic (code.claude.com, github.com/anthropics)
**Scope:** Исчерпывающий разбор возможностей `@anthropic-ai/claude-agent-sdk` — библиотеки, через которую в CodeAI Hub работает провайдер Claude. Фиксирует, что мы уже используем и что остаётся на столе.

---

## 0. Как читать этот документ

Документ написан простым языком и рассчитан не только на разработчика. Технические имена полей и функций (например, `query()`, `thinking`, `PreToolUse`) оставлены как есть — они позволяют быстро находить соответствующие разделы в документации Anthropic. Рядом с каждым таким именем идёт объяснение «что это по сути», «зачем нужно» и «как выглядело бы для пользователя CodeAI Hub».

Документ разделён на три смысловые части: (а) что вообще есть у Anthropic как набор технологий, (б) что мы реально используем сегодня, (в) что можно взять в продукт сверх текущего. Сравнение с Codex App Server вынесено в отдельный документ «пересечения» (см. раздел 8).

---

## 1. Введение: несколько способов подключения к Claude

У Anthropic исторически сложилось **несколько разных способов** интегрировать Claude в своё приложение. Очень похоже на ситуацию с OpenAI, только с другими акцентами:

1. **Anthropic Client SDK** (`@anthropic-ai/sdk`) — чистый клиент к API. Вы сами шлёте сообщения, сами реализуете tool loop (цикл «модель вызвала инструмент → исполнили → отдали результат обратно»), сами управляете контекстом.
2. **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) — агентная библиотека. Поверх API даёт встроенный tool loop, 10+ встроенных инструментов, MCP, хуки, сабагентов, менеджмент сессий, менеджмент контекста. По сути — «Claude Code как библиотека».
3. **Claude Code CLI** — интерактивная командная строка. Тот же движок, что в Agent SDK, только через интерфейс терминала.
4. **MCP-серверы Anthropic** — отдельная тема про экосистему инструментов, не отдельный способ подключения к модели.

В CodeAI Hub для провайдера Claude мы используем **Claude Agent SDK**. Это стратегически правильный выбор: Anthropic явно называет Agent SDK основной интеграционной поверхностью поверх API — он даёт «ту же библиотеку, которая стоит за Claude Code».

### 1.1. Ремарка: Client SDK vs Agent SDK

Официальная документация это сравнение формулирует так: **Client SDK — это «вы сами пишете agent loop», Agent SDK — «Claude сам обрабатывает инструменты автономно»**. Простой пример: если вы хотите попросить модель «найди баг в auth.ts», то в Client SDK вам нужно будет самому обработать вызов Read-инструмента, прочитать файл, вернуть содержимое обратно в модель, потом обработать вызов Edit-инструмента и так далее. В Agent SDK всё это уже сделано — вы просто пишете промпт, и Claude сам читает, правит, проверяет.

Важно понимать: **Claude Agent SDK тянет за собой бинарь Claude Code**. При установке npm-пакета он ставится как optional dependency. То есть под капотом Agent SDK запускает тот же процесс, что и CLI, просто оборачивает его в удобный API.

### 1.2. Текущее состояние

Старое название пакета было `@anthropic-ai/claude-code`. Сейчас оно переименовано в `@anthropic-ai/claude-agent-sdk` (у Anthropic есть отдельный migration guide). Это один и тот же продукт под новым брендом.

Для Opus 4.7 (`claude-opus-4-7`) требуется Agent SDK `v0.2.111` или новее — старые версии не умеют корректно обрабатывать `thinking.type.enabled` для этой модели.

---

## 2. Архитектура Claude Agent SDK

### 2.1. Главная точка входа — `query()`

Весь Agent SDK построен вокруг одной функции `query()`. Она возвращает асинхронный генератор сообщений, по которому можно итерироваться:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Find and fix the bug in auth.ts",
  options: { allowedTools: ["Read", "Edit", "Bash"] }
})) {
  console.log(message);
}
```

`prompt` может быть строкой (single-shot) или `AsyncIterable<SDKUserMessage>` (streaming input mode — когда мы хотим подавать сообщения в активную сессию постепенно, а не в одном запросе).

Возвращаемый объект — это не просто итератор, а **`Query`**: он расширяет `AsyncGenerator<SDKMessage>` и имеет **методы runtime-управления** (см. раздел 2.3).

### 2.2. Опции `ClaudeAgentOptions`

Второй аргумент `query()` — огромный объект опций, который полностью конфигурирует поведение сессии. Ниже — полный перечень полей (имя → что задаёт):

- `abortController` — контроллер отмены операции.
- `additionalDirectories` — дополнительные папки, к которым разрешён доступ агенту.
- `agent` — имя основного агента (если задано несколько).
- `agents` — словарь «имя → AgentDefinition» для programmatic-объявления сабагентов.
- `allowDangerouslySkipPermissions` — разрешить полный обход проверок разрешений (небезопасно).
- `allowedTools` — список инструментов, разрешённых без подтверждения.
- `betas` — список beta-фич, которые активировать.
- `canUseTool` — собственная функция, вызываемая вместо дефолтного permission prompt.
- `continue` — продолжить самую недавнюю сессию.
- `cwd` — текущая рабочая директория.
- `debug` / `debugFile` — режим отладки и куда писать лог.
- `disallowedTools` — чёрный список инструментов (перекрывает `allowedTools`).
- `effort` — уровень старания модели: `low` / `medium` / `high` / `xhigh` / `max`.
- `enableFileCheckpointing` — включить отслеживание изменений файлов для отката.
- `env` — переменные окружения сессии.
- `executable` / `executableArgs` — какой JS-runtime использовать (`node`, `bun`, `deno`).
- `extraArgs` — произвольные дополнительные CLI-аргументы.
- `fallbackModel` — резервная модель, если основная недоступна.
- `forkSession` — начать форк сессии, а не продолжение.
- `hooks` — словарь колбэков жизненного цикла (см. 5.3).
- `includePartialMessages` — включить стриминг сырых событий (`stream_event`).
- `maxBudgetUsd` — бюджет в долларах: остановиться при достижении.
- `maxThinkingTokens` — устарело, использовать `thinking`.
- `maxTurns` — ограничение на количество turn'ов (итераций tool-loop).
- `mcpServers` — словарь MCP-серверов, подключаемых к сессии.
- `model` — конкретная модель Claude.
- `outputFormat` — структурированный вывод через JSON-схему.
- `pathToClaudeCodeExecutable` — явный путь к бинарю Claude Code.
- `permissionMode` — режим разрешений (см. 5.2).
- `permissionPromptToolName` — имя MCP-инструмента, который будет вызываться для prompt-ов разрешения.
- `persistSession` — сохранять ли сессию на диск (по умолчанию да).
- `plugins` — массив локальных путей к плагинам.
- `promptSuggestions` — генерировать ли подсказки продолжений после каждого turn.
- `resume` — ID сессии для возобновления.
- `resumeSessionAt` — возобновить на конкретном UUID сообщения.
- `sandbox` — настройки песочницы.
- `sessionId` — использовать конкретный UUID для сессии.
- `settingSources` — какие файловые настройки грузить: `user` / `project` / `local` (или пустой массив — ничего).
- `spawnClaudeCodeProcess` — функция собственного спавна процесса.
- `stderr` — колбэк для stderr.
- `strictMcpConfig` — жёсткая валидация MCP.
- `systemPrompt` — строка или `{ type: "preset", preset: "claude_code", append, excludeDynamicSections }`.
- `thinking` — настройка extended thinking: `{ type: "adaptive" | "enabled" | "disabled", max_tokens? }`.
- `toolConfig` — поднастройки built-in инструментов (например, формат превью у AskUserQuestion).
- `tools` — список инструментов или preset `claude_code`.

Этот список — важен сам по себе: каждый флаг — это скрытая возможность, которую мы **можем** задать (и не задаём по умолчанию).

### 2.3. Объект `Query` — runtime-управление

После вызова `query()` мы получаем не просто итератор, а объект со следующими методами:

- `interrupt()` — прервать активный turn (аналог Stop-кнопки).
- `rewindFiles(userMessageId, { dryRun })` — откатить файлы до состояния на конкретном сообщении. Это полноценный «undo изменений файлов».
- `setPermissionMode(mode)` — **на лету** сменить режим разрешений.
- `setModel(model)` — **на лету** сменить модель.
- `setMaxThinkingTokens(n)` — **на лету** поменять бюджет thinking.
- `initializationResult()` — дождаться полной инициализации и получить метаданные сессии.
- `supportedCommands()` — список slash-команд, доступных в этой сессии.
- `supportedModels()` — список моделей, поддерживаемых в конфигурации.
- `supportedAgents()` — список сабагентов.
- `mcpServerStatus()` — состояние всех подключённых MCP-серверов.
- `accountInfo()` — инфа об аккаунте.
- `reconnectMcpServer(name)` — переподключить MCP-сервер.
- `toggleMcpServer(name, enabled)` — включить/выключить MCP-сервер в рамках сессии.
- `setMcpServers(servers)` — полностью заменить конфиг MCP.
- `streamInput(stream)` — подать стриминговый ввод (многосообщенческий режим).
- `stopTask(taskId)` — остановить конкретную background-задачу.
- `close()` — закрыть сессию.

Это принципиально: **управление сессией возможно не только в момент запуска**, но и в процессе.

### 2.4. Типы сообщений `SDKMessage` — богатая вселенная

Agent SDK стримит на выход типизированный Union из ~22 типов сообщений. Полный список (из `SDKMessage` в TypeScript reference):

- `SDKAssistantMessage` — сообщение модели с `content[]`: текст, thinking-блоки, вызовы инструментов.
- `SDKUserMessage` / `SDKUserMessageReplay` — пользовательский ввод и его реплей при resume.
- `SDKResultMessage` — финал turn: `result`, `total_cost_usd`, `usage`, `modelUsage`, `permission_denials`, `structured_output`. Варианты: `success` или ошибки `error_max_turns` / `error_during_execution` / `error_max_budget_usd` / `error_max_structured_output_retries`.
- `SDKSystemMessage` (subtype `init`) — инициализация: доступные агенты, источник API-ключа, беты, версия Claude Code, cwd, список инструментов, MCP-серверы и их статус, модель, permission mode, slash-команды, output style, скиллы, плагины.
- `SDKPartialAssistantMessage` (`type: "stream_event"`) — сырые события стриминга Anthropic API: `message_start`, `content_block_start/delta/stop`, `message_delta`, `message_stop`.
- `SDKCompactBoundaryMessage` — граница авто-компакции контекста.
- `SDKStatusMessage` — обновления статуса.
- `SDKLocalCommandOutputMessage` — вывод локальной команды.
- `SDKHookStartedMessage` / `SDKHookProgressMessage` / `SDKHookResponseMessage` — события хуков.
- `SDKPluginInstallMessage` — стадии установки плагина.
- `SDKToolProgressMessage` — прогресс инструмента.
- `SDKAuthStatusMessage` — изменение статуса авторизации.
- `SDKTaskNotificationMessage` / `SDKTaskStartedMessage` / `SDKTaskProgressMessage` — фоновые задачи.
- `SDKFilesPersistedEvent` — файлы были сохранены.
- `SDKToolUseSummaryMessage` — сводка использования инструментов.
- `SDKRateLimitEvent` — предупреждение об rate limit.
- `SDKPromptSuggestionMessage` — подсказка продолжения.

Обрабатывая каждый тип, можно показать пользователю разные элементы UI (прогресс, статус, предупреждения).

---

## 3. Anthropic Client SDK: что мы НЕ используем и почему

Для полноты картины — что мы **не** используем и почему. `@anthropic-ai/sdk` — это тонкий клиент к Messages API. Без built-in tool loop, без сессий, без хуков, без MCP-интеграции на уровне самой библиотеки. Подходит для сценариев «одноразовый запрос → ответ», когда не нужно, чтобы модель автономно читала файлы и запускала команды.

Раз мы используем Agent SDK, мы по определению имеем доступ ко **всему, что умеет Client SDK**, плюс агентный цикл, плюс инструменты, плюс всё остальное. Возвращаться к Client SDK не имеет смысла.

---

## 4. Что мы используем в CodeAI Hub сегодня

По результатам исследования кода `packages/Claude_Module/` (апрель 2026):

### 4.1. Пакет и установка

- Используется **`@anthropic-ai/claude-agent-sdk`**.
- **Версия динамическая** — определяется из `latest` через npm registry, SDK ставится в runtime в пользовательскую директорию (не указана статически в `package.json`). Это сделано, чтобы минимизировать bundle size релиза и всегда иметь свежую версию.

### 4.2. Как вызываем SDK

Используется одна функция `query()`. Результат оборачивается в наш internal session manager, который:

- передаёт в `options` следующие поля: `model`, `thinking` (`{ type: "adaptive" | "disabled", display: "summarized", effort }`), `outputFormat` (`{ type: "json_schema", schema }`), `cwd`, `env`, `projectPath`, `pathToClaudeCodeExecutable`, `settingSources: []` (изоляция), `permissionMode: "bypassPermissions"`, `allowDangerouslySkipPermissions`, `resume`, `additionalDirectories`;
- игнорирует всё остальное — MCP, хуки, сабагентов, плагины, permissions fine-grained и т.п.

### 4.3. Какие сообщения ловим из стрима

- `"assistant"` — финальный текст + thinking-блоки.
- `"stream_event"` — сырые дельты Anthropic (`content_block_start/delta/stop`, `thinking_delta`, `text_delta`).
- `"rate_limit_event"` — rate limiting.
- `"result"` — финал turn.

Построили собственный `ClaudeThinkingLiveBuffer` и `ClaudeTextLiveBuffer` для красивого стриминга в UI (порог ~240 символов для thinking и ~96 для текста, с dedup против final reconciliation).

### 4.4. Какие события эмитим в ядро

- `turn_started` (с UUID и `provider: "claude"`).
- `turn_completed` (с `tokenUsage`, `usageLimits`, флагом `postTurnTokenUsageUnavailable`).
- `turn_failed` (с сообщением об ошибке).
- `user_input`, dialog bubbles.
- `error` трёх категорий: `dispatch`, `processing`, `processor`.
- `realSessionId`, `sessionIdChanged` — promotion временного ID в настоящий.

### 4.5. Чего у нас точно нет

Перечислим явно, чтобы иметь ориентир для приоритизации:

- Нет обработки `tool_use` блоков (никаких UI-панелей инструментов).
- Нет MCP-поддержки (`mcpServers` не передаётся).
- Нет хуков (ни одного из 18 событий).
- Нет сабагентов.
- Нет custom tools через `tool()` / `createSdkMcpServer()`.
- Нет plugins.
- Нет slash-команд.
- Нет agent skills.
- Нет settings discovery (мы намеренно передаём `settingSources: []` для изоляции).
- Нет отката файлов (`rewindFiles`).
- Нет file checkpointing.
- Нет `maxTurns` / `maxBudgetUsd`.
- Нет `fallbackModel`.
- Нет prompt suggestions.
- Нет runtime-управления сессией (`setPermissionMode`, `setModel`, `setMaxThinkingTokens`).
- Нет discovery через `Query` (supported commands/models/agents, mcpServerStatus).
- Нет streaming input mode (`streamInput`).
- Нет background tasks.
- Нет `AskUserQuestion`, `Monitor`, `WebSearch`, `WebFetch`, `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep` — ни один built-in tool не используется.
- Нет compact boundary обработки.
- Нет обработки auth events.

Фактически мы используем Agent SDK как **«чистый LLM с extended thinking»** — без агентного цикла. Это рациональный стартовый минимум, но оставляет большой запас.

---

## 5. Полный каталог дополнительных возможностей

Ниже — сгруппированные возможности Claude Agent SDK, которые мы пока не используем. Формат такой же, как в документе по Codex App Server: «зачем это», конкретные API, «как выглядело бы в UI».

### 5.1. Встроенные инструменты (Built-in tools)

**Зачем это нужно простым языком**: Agent SDK приносит готовый набор «рук» для агента — он может читать файлы, править код, запускать команды, искать в интернете, следить за процессом. Нам не нужно самим реализовывать tool loop.

Полный каталог встроенных инструментов:

- **`Read`** — прочитать файл в рабочей директории. UI: агент «открывает файл X».
- **`Write`** — создать новый файл. UI: карточка «Агент создал файл».
- **`Edit`** — точечно отредактировать существующий файл. UI: diff-просмотрщик правки.
- **`Bash`** — выполнить терминальную команду или скрипт. UI: панель терминала с потоковым выводом.
- **`Monitor`** — следить за фоновым процессом и реагировать на каждую строку вывода как на событие. UI: live-лог с подсветкой паттернов.
- **`Glob`** — найти файлы по шаблону (`**/*.ts`, `src/**/*.py`). UI: «агент ищет по паттерну».
- **`Grep`** — полнотекстовый поиск по содержимому с регулярками. UI: «агент ищет строку».
- **`WebSearch`** — поиск в интернете по актуальной информации. UI: список цитат с источниками.
- **`WebFetch`** — загрузить и распарсить веб-страницу. UI: карточка загруженной страницы.
- **`AskUserQuestion`** — задать пользователю уточняющие вопросы с multiple-choice ответами. UI: форма с радио-кнопками.

Каждый инструмент интегрирован с системой разрешений, может быть включён/выключен через `allowedTools` / `disallowedTools`.

### 5.2. Режимы разрешений (Permission modes)

**Зачем это нужно простым языком**: Контроль того, что агент вправе делать сам, а что должен согласовывать с пользователем. Это не один on/off, а многослойная система.

**Permission modes** (основной режим всей сессии):

- `default` — стандартное поведение: опасные операции требуют подтверждения.
- `acceptEdits` — авто-подтверждать правки файлов и связанные с filesystem Bash-команды. MCP-инструменты при этом НЕ авто-подтверждаются.
- `bypassPermissions` — обойти все проверки. Небезопасно, используем только в контролируемых сценариях (именно этот режим мы используем в CodeAI Hub для translation-only сессий).
- `plan` — режим планирования: модель не исполняет, только описывает шаги.
- `dontAsk` — не спрашивать, отклонять всё, что не было pre-approved.
- `auto` — использовать классификатор модели для auto-решений.

**Правила разрешений**:

- `allowedTools: ["Read", "Glob", "mcp__github__*"]` — pre-approve (поддерживает wildcards для MCP).
- `disallowedTools: ["Bash"]` — жёсткий запрет.
- `canUseTool: (toolName, input) => decision` — собственная функция-классификатор.
- `permissionPromptToolName` — имя MCP-инструмента, вызываемого для интерактивного подтверждения.
- `allowDangerouslySkipPermissions: true` — полный обход (как `bypassPermissions`).

**Приоритет**: при конфликте правил `deny` > `ask` > `allow`.

Runtime-смена режима: `query.setPermissionMode(mode)`.

### 5.3. Хуки (Hooks) — 18 событий жизненного цикла

**Зачем это нужно простым языком**: Хук — это наш код, который Agent SDK вызовет в строго определённый момент: «сейчас агент хочет что-то сделать» или «что-то уже произошло». Хук может заблокировать, изменить ввод, добавить контекст, инициировать подтверждение, записать в audit-log.

**Полный список событий**:

- **`PreToolUse`** — до вызова инструмента. Может заблокировать (`deny`), изменить ввод (`updatedInput`), авто-одобрить (`allow`), спросить у пользователя (`ask`). UI: идеален для custom approval карточек.
- **`PostToolUse`** — после успешного выполнения инструмента. Может добавить контекст в разговор через `additionalContext`. UI: audit log, пост-обработка результата.
- **`PostToolUseFailure`** — после неуспешного выполнения. UI: отловить ошибки инструментов, специальная обработка.
- **`UserPromptSubmit`** — когда пользователь отправил промпт. Можно инжектировать доп.контекст в запрос.
- **`SessionStart`** (только TS) — инициализация сессии. Логирование, телеметрия.
- **`SessionEnd`** (только TS) — завершение сессии. Очистка ресурсов.
- **`Stop`** — агент прекратил работу. Сохранение состояния.
- **`SubagentStart`** — сабагент запустился. Трекинг параллельных задач.
- **`SubagentStop`** — сабагент завершился. Агрегация результатов.
- **`PreCompact`** — перед компактацией контекста. Можно заархивировать полный транскрипт.
- **`PermissionRequest`** — диалог разрешения был бы показан. Custom permission handling.
- **`Notification`** — статусные сообщения (`permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`). UI: можно пересылать в Slack/PagerDuty.
- **`Setup`** (только TS) — задачи инициализации и обслуживания сессии.
- **`TeammateIdle`** (только TS) — коллега-агент простаивает. Переназначение работы.
- **`TaskCompleted`** (только TS) — фоновая задача завершена. Агрегация.
- **`ConfigChange`** (только TS) — изменился конфиг. Подгрузка настроек без перезапуска.
- **`WorktreeCreate`** / **`WorktreeRemove`** (только TS) — создан/удалён git worktree.

**Фильтры (matchers)**: `matcher: "Write|Edit"` или `matcher: "^mcp__"` — регулярное выражение, по которому хук будет срабатывать только для нужных инструментов. Без matcher'а срабатывает на все события типа.

**Формат возврата**:
- Пустой объект `{}` — разрешить без изменений.
- `hookSpecificOutput.permissionDecision`: `"allow"` / `"deny"` / `"ask"`.
- `hookSpecificOutput.updatedInput` — изменить входные параметры инструмента.
- `hookSpecificOutput.additionalContext` — добавить контекст в Post-хуках.
- `systemMessage` — сообщение, которое будет видно модели (объяснить ей, почему заблокировали).
- `continue` — продолжать ли работу после хука.
- Async-режим: `{ async: true, asyncTimeout: 30000 }` — выполнить side-effect и не блокировать.

**Цепочки хуков**: в массиве хуки выполняются по порядку. Удобно разбивать по responsibility (rate limit → authz → sanitize → audit log).

### 5.4. Сабагенты (Subagents)

**Зачем это нужно простым языком**: Основной агент может делегировать часть работы «младшему агенту» с специализированной инструкцией и своим ограниченным набором инструментов. У сабагента **изолированный контекст** — он не засоряет историю основного.

**Как объявляются** — в опциях `agents`:

```typescript
agents: {
  "code-reviewer": {
    description: "Expert code reviewer for quality and security.",
    prompt: "Analyze code quality and suggest improvements.",
    tools: ["Read", "Glob", "Grep"],
    model: "sonnet" // или "opus", "haiku", "inherit"
  }
}
```

**Полный `AgentDefinition`**:
- `description` — когда вызывать сабагента.
- `prompt` — системный промпт сабагента.
- `tools` — whitelist инструментов.
- `disallowedTools` — blacklist.
- `model` — отдельная модель (`sonnet` / `opus` / `haiku` / `inherit`).
- `mcpServers` — собственные MCP-серверы сабагента.
- `skills` — скиллы, доступные сабагенту.
- `maxTurns` — максимум итераций.
- `criticalSystemReminder_EXPERIMENTAL` — критичное напоминание перед каждым turn.

**Как вызываются**: основной агент использует built-in инструмент `Agent`, указывая имя сабагента и его задачу. Поэтому в `allowedTools` главного агента должен быть `"Agent"`.

**Трекинг**: сообщения от сабагента помечены `parent_tool_use_id`. Мы можем в UI отрисовывать «главный агент → сабагент» как вложенный уровень.

UI: отдельная панель «Subagents running», каждый со своим статусом и результатом.

### 5.5. Session management — полный набор операций

**Зачем это нужно простым языком**: Сессия — это один «разговор» с агентом с сохранённым контекстом. SDK даёт богатый surface по работе с ними.

**Функции верхнего уровня**:

- **`listSessions({ dir, limit, includeWorktrees })`** — список сохранённых сессий с метаданными. UI: боковая панель «Мои сессии».
- **`getSessionMessages(sessionId)`** — прочитать историю сообщений без возобновления.
- **`getSessionInfo(sessionId)`** — прочитать метаданные одной сессии.
- **`renameSession(sessionId, title)`** — дать сессии человекочитаемое имя.
- **`tagSession(sessionId, tag | null)`** — навесить или снять тег.

**Опции `query()` для сессий**:

- `resume: sessionId` — возобновить сессию.
- `resumeSessionAt: messageUuid` — возобновить на **конкретном** сообщении. Это rewind: мы перемотали историю назад и продолжаем оттуда.
- `continue: true` — продолжить самую недавнюю.
- `forkSession: true` — форк вместо продолжения.
- `sessionId: string` — явный UUID для новой сессии.
- `persistSession: false` — не сохранять на диск (temporary session).

**Метаданные `SDKSessionInfo`**: `sessionId`, `summary`, `lastModified`, `fileSize`, `customTitle`, `firstPrompt`, `gitBranch`, `cwd`, `tag`, `createdAt`. Достаточно для отрисовки богатой карточки сессии в UI.

### 5.6. File checkpointing и rewind

**Зачем это нужно простым языком**: Отдельная фича «Undo для файлов». Если агент изменил 5 файлов и мы поняли, что это было не то — можем откатить их до состояния на конкретном сообщении.

- `options.enableFileCheckpointing: true` — включить отслеживание.
- `query.rewindFiles(userMessageId, { dryRun })` — откатить файлы до состояния **на** этом сообщении. С `dryRun: true` — только показать, что бы изменилось.
- `SDKFilesPersistedEvent` — уведомление о том, что файлы были зафиксированы (есть чекпоинт).

UI: кнопка «Undo к сообщению X», список «чекпоинтов изменений» в боковой панели.

### 5.7. MCP — Model Context Protocol

**Зачем это нужно простым языком**: Подключать к агенту внешние инструменты (GitHub, базы данных, Slack) через стандарт MCP, без собственных имплементаций tool loop.

**Поддерживаемые типы MCP-серверов**:

- **`stdio`** — локальный процесс, общение через stdin/stdout (пример: `npx @modelcontextprotocol/server-github`).
- **`sse`** — Server-Sent Events через HTTP.
- **`http`** — обычный HTTP (non-streaming).
- **SDK MCP server (in-process)** — описываем инструменты **прямо в коде нашего приложения**, они исполняются в том же процессе. Создаётся через `createSdkMcpServer({ name, version, tools: [tool("myTool", ...)] })`.

**Конфигурация**:

```typescript
mcpServers: {
  github: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN }
  },
  "remote-api": {
    type: "sse",
    url: "https://api.example.com/mcp/sse",
    headers: { Authorization: `Bearer ${token}` }
  }
}
```

**Именование инструментов**: `mcp__<server-name>__<tool-name>`. В `allowedTools` поддерживаются wildcards: `mcp__github__*`.

**OAuth 2.1**: сам SDK не делает OAuth-flow, но принимает access_token через headers. OAuth-flow реализуется нашим приложением, токен пробрасывается.

**Tool search**: когда инструментов много, их определения тоже съедают контекст. Tool search (включён по умолчанию) «придерживает» определения и загружает только те, которые нужны на конкретном turn.

**Runtime-управление через `Query`**:
- `mcpServerStatus()` — состояние всех серверов.
- `reconnectMcpServer(name)` — переподключить.
- `toggleMcpServer(name, enabled)` — включить/выключить.
- `setMcpServers(servers)` — полностью заменить конфиг.

**Обработка ошибок**: в `SDKSystemMessage` init-типа приходит список MCP-серверов со статусом `connected` или `failed`. Пользователь должен увидеть «сервер X не подключился».

### 5.8. Custom tools — `tool()` и `createSdkMcpServer()`

**Зачем это нужно простым языком**: Мы можем дать агенту **свои собственные инструменты**, которые будут выполняться прямо в нашем процессе. Не нужно запускать отдельный процесс — всё идёт в том же Node.js.

```typescript
import { tool, createSdkMcpServer, query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const myTool = tool(
  "get_user_info",
  "Fetch info about a user from our internal DB",
  { userId: z.string() },
  async (args) => {
    const user = await db.users.findById(args.userId);
    return { content: [{ type: "text", text: JSON.stringify(user) }] };
  }
);

const myServer = createSdkMcpServer({
  name: "internal-tools",
  version: "1.0.0",
  tools: [myTool]
});

query({ prompt: "...", options: { mcpServers: { "internal-tools": myServer } } });
```

Все custom tools — типобезопасны через Zod. Agent SDK автоматически сгенерирует JSON Schema.

UI: позволяет нам добавить «наши» кнопки/операции как инструменты агента.

### 5.9. Extended thinking

**Зачем это нужно простым языком**: «Глубокое размышление» модели, когда она перед ответом прогоняет внутренний reasoning. Для сложных задач.

Настройки:

- `thinking: { type: "adaptive" }` — модель сама решает, когда думать (по умолчанию для моделей, которые это умеют).
- `thinking: { type: "enabled", max_tokens: N }` — всегда включено с бюджетом N токенов.
- `thinking: { type: "disabled" }` — никогда.

Плюс удобный параметр `effort: "low" | "medium" | "high" | "xhigh" | "max"` — человекочитаемый уровень старания.

Runtime-смена: `query.setMaxThinkingTokens(n)`.

Важно: для Opus 4.7 нужен SDK v0.2.111+, и обязательно `thinking.display: "summarized"` для получения plain-text `thinking_delta` вместо `signature_delta` (это уже учтено в нашей кодовой базе).

**Prompt caching для thinking**: сами thinking-блоки нельзя кэшировать напрямую через `cache_control`. Но они кэшируются в составе предыдущих assistant-turns и считаются как input tokens при чтении из кэша.

### 5.10. Structured output

**Зачем это нужно простым языком**: Гарантированно получить ответ в виде структурированного JSON по нашей схеме.

```typescript
options: {
  outputFormat: {
    type: "json_schema",
    schema: {
      type: "object",
      properties: {
        bugs: { type: "array", items: { type: "string" } }
      }
    }
  }
}
```

В `SDKResultMessage.success` появится поле `structured_output`. В случае превышения числа retry — `error_max_structured_output_retries`.

### 5.11. Streaming и partial messages

**Зачем это нужно простым языком**: Два режима вывода — сводный (по сообщениям целиком) и сырой (каждое изменение содержимого).

- По умолчанию — `SDKAssistantMessage` с уже собранным content.
- `includePartialMessages: true` — приходят ещё `SDKPartialAssistantMessage` с сырыми событиями Anthropic API (`message_start`, `content_block_start/delta/stop`, `message_delta`, `message_stop`). Нужно для живого стриминга текста/thinking.

Streaming input mode: вместо строки в `prompt` передаём `AsyncIterable<SDKUserMessage>`. Это позволяет подавать новые сообщения в ту же активную сессию без перезапуска — аналог «продолжить разговор, не ломая контекст».

### 5.12. Стоимость и лимиты

**Зачем это нужно простым языком**: Ограничить агента по деньгам или по количеству шагов. Важно для автоматизированных сценариев.

- `maxTurns: 10` — не больше 10 итераций tool-loop. После — `error_max_turns`.
- `maxBudgetUsd: 5.0` — остановиться, когда оценка стоимости достигнет $5. После — `error_max_budget_usd`.
- `SDKRateLimitEvent` — предупреждение об rate limit.
- В `SDKResultMessage`: `total_cost_usd`, `usage` (input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens), `modelUsage[modelName]`, `permission_denials`.

UI: индикатор «$ потрачено / $ лимит», счётчик шагов, предупреждения о приближении к лимитам.

### 5.13. Модели и fallback

- `model: "claude-sonnet-4-6"` (или любая другая).
- `fallbackModel: "claude-haiku-4-5"` — если основная недоступна.
- Runtime: `query.setModel(model)`.
- Discovery: `query.supportedModels()` → список `ModelInfo[]`.

Авторизация через третьи облака:

- `ANTHROPIC_API_KEY` — прямая работа с Anthropic.
- `CLAUDE_CODE_USE_BEDROCK=1` — через AWS Bedrock.
- `CLAUDE_CODE_USE_VERTEX=1` — через Google Vertex AI.
- `CLAUDE_CODE_USE_FOUNDRY=1` — через Azure AI Foundry.

**Важно**: Anthropic **запрещает** третьим сторонам предлагать claude.ai OAuth-логин в своих продуктах. Единственный путь — API key или облачные провайдеры.

### 5.14. Settings discovery (`settingSources`)

**Зачем это нужно простым языком**: Agent SDK может автоматически подтягивать настройки из файлов `.claude/` в рабочей директории и в домашней. Мы это у себя отключили (`settingSources: []`), но для полноты — это даёт:

- **`user`** — `~/.claude/settings.json` (глобальные настройки пользователя).
- **`project`** — `.claude/settings.json` в проекте (общие настройки команды).
- **`local`** — `.claude/settings.local.json` (личные переопределения в проекте).

Если `settingSources` включены, SDK подтянет:
- **Skills** — `.claude/skills/*/SKILL.md`.
- **Slash commands** — `.claude/commands/*.md`.
- **Memory** — `CLAUDE.md` или `.claude/CLAUDE.md`.
- **Hooks** (только shell command-типа) — из settings.json.
- **MCP-серверы** — из `.mcp.json`.

Для нашего продукта отключение было правильным стартовым решением (изоляция), но можно добавить **опциональное** подключение, когда пользователь хочет использовать свой `CLAUDE.md`.

### 5.15. Agent Skills

**Зачем это нужно простым языком**: Скилл — папка с `SKILL.md` и опциональными ресурсами, которая задаёт специализированные инструкции агенту.

- Подтягиваются автоматически при `settingSources` включающем `project` или `user`.
- Разрешаются per-cwd.
- Видны в `SDKSystemMessage.skills` и `AgentDefinition.skills`.

UI: список «активных скиллов» в заголовке сессии.

### 5.16. Slash commands

**Зачем это нужно простым языком**: Пользователь может в чате набрать `/название-команды`, и Agent SDK исполнит её по файлу `.claude/commands/название.md`.

- Поддерживаются при включённом `settingSources`.
- Discovery: `query.supportedCommands()`.
- Видны в `SDKSystemMessage.slash_commands`.

UI: автокомплит slash-команд при вводе.

### 5.17. Plugins

**Зачем это нужно простым языком**: Плагины — это набор скиллов, команд, MCP-серверов и хуков, упакованный в одну папку и подключаемый программно.

- `plugins: SdkPluginConfig[]` — список локальных путей.
- `SDKPluginInstallMessage` со статусами `started` / `installed` / `failed` / `completed`.
- Видны в `SDKSystemMessage.plugins`.

UI: «Управление плагинами», установка, включение, удаление.

### 5.18. Background tasks

**Зачем это нужно простым языком**: Агент может запускать фоновые задачи, которые продолжаются параллельно с основной работой (например, длинный Bash-скрипт).

- `SDKTaskStartedMessage` — задача запущена.
- `SDKTaskProgressMessage` — прогресс.
- `SDKTaskNotificationMessage` — уведомление.
- `TaskCompleted` hook — агрегация.
- `query.stopTask(taskId)` — остановить.

UI: панель «Running background tasks» с прогресс-барами.

### 5.19. Auto-compact

**Зачем это нужно простым языком**: Когда история становится длинной, SDK автоматически сжимает её в сводку, чтобы влезать в контекст.

- `SDKCompactBoundaryMessage` со `compact_metadata.trigger: "manual" | "auto"` и `pre_tokens`.
- `PreCompact` hook — возможность архивировать полную историю до сжатия.

UI: индикатор «история сжата — полная версия заархивирована».

### 5.20. Prompt suggestions

**Зачем это нужно простым языком**: SDK может генерировать 1-3 предложения «что делать дальше» после каждого turn.

- `promptSuggestions: true` в опциях.
- `SDKPromptSuggestionMessage` со `suggestion`.

UI: чипы-подсказки над полем ввода «Продолжить с…», «Также попробовать…».

### 5.21. Sandbox settings

`sandbox: SandboxSettings` — программное конфигурирование песочницы. Детальной публичной схемы в overview-документации не раскрыто (отсылка к TypeScript reference). Частично перекрывается с `additionalDirectories` (какие папки разрешены) и `permissionMode` (что можно делать без прозможного prompt'а).

### 5.22. Plan mode

`permissionMode: "plan"` — специальный режим, в котором модель не исполняет инструменты, а только описывает, что бы сделала. Это встроенная альтернатива полноценному ReAct: сначала план, потом — явное подтверждение пользователя, потом исполнение.

UI: отдельная кнопка «Сначала спланируй», превью шагов с подтверждением.

### 5.23. Pre-warming через `startup()`

`startup(options)` → `WarmQuery`. Позволяет заранее подготовить процесс Claude Code **до** того, как мы знаем промпт. Уменьшает первую задержку. После `startup` вызываем `warm.query(prompt)` вместо `query(...)`.

UI: «мгновенный ответ» на первый запрос пользователя.

### 5.24. Structured errors

Четыре варианта `SDKResultMessage.error`:

- `error_max_turns` — превышен лимит turn'ов.
- `error_during_execution` — ошибка исполнения.
- `error_max_budget_usd` — превышен бюджет.
- `error_max_structured_output_retries` — не удалось получить валидный structured output.

Плюс `permission_denials: SDKPermissionDenial[]` — список всех случаев, когда инструмент был заблокирован. UI: отдельная секция «что я не смог сделать».

### 5.25. Auth status events

- `SDKAuthStatusMessage` — изменения статуса авторизации.
- `auth_success` в `Notification` hook — успешная авторизация.

UI: индикатор «не авторизовано / авторизация истекает» в статус-баре.

---

## 6. Приоритеты для CodeAI Hub

Ниже — рекомендованный порядок внедрения сверх текущего минимума. Сортировка по соотношению «видимая польза / цена внедрения» с учётом того, что UI-слой у нас единый для всех провайдеров.

### Приоритет 1. Переход из «чистого LLM» в «агентный режим»

1. **Обработка `tool_use` блоков** — научиться отрисовывать в UI вызов инструмента (имя, аргументы, результат).
2. **Built-in tools** `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep` — включить их и начать показывать как first-class item-ы в UI (диффы, терминал, файл-операции).
3. **Permission flow** через `canUseTool` или `PreToolUse` hook — полноценные approval-карточки для опасных действий.
4. **`allowedTools` / `disallowedTools`** — per-session whitelist из UI.

### Приоритет 2. Управляемый запуск

5. **`maxTurns`** — защита от бесконечных циклов.
6. **`maxBudgetUsd`** — бюджет в долларах, важно для автоматизации.
7. **`fallbackModel`** — устойчивость к недоступности модели.
8. **Runtime-управление**: `setModel`, `setPermissionMode`, `setMaxThinkingTokens` — переключатели прямо во время сессии.
9. **Structured errors обработка** — разное UX для `error_max_turns`, `error_max_budget_usd`, `error_during_execution`, `error_max_structured_output_retries`.

### Приоритет 3. MCP и экосистема инструментов

10. **MCP support** (`mcpServers`) — подключение внешних MCP-серверов, stdio/SSE/HTTP, auth через env/headers.
11. **Custom tools через `tool()` / `createSdkMcpServer()`** — дать возможность добавлять наши собственные инструменты в процессе.
12. **MCP runtime-управление**: `mcpServerStatus`, `reconnectMcpServer`, `toggleMcpServer`, `setMcpServers` — UI управления подключёнными серверами.

### Приоритет 4. Жизненный цикл и UX сессий

13. **`listSessions` + `getSessionInfo` + `getSessionMessages`** — полноценная боковая панель истории.
14. **`renameSession` + `tagSession`** — человекочитаемые имена и теги.
15. **`forkSession`** — ветвление.
16. **`resumeSessionAt`** — перемотка истории на конкретное сообщение.
17. **`enableFileCheckpointing` + `rewindFiles`** — Undo-кнопка для файлов.
18. **`SDKCompactBoundaryMessage` handling** + `PreCompact` hook — UI компактации.

### Приоритет 5. Хуки и интеграции

19. **`Notification` hook** — вынести статус-уведомления в панель продукта или во внешние системы (Slack, почта).
20. **`SessionStart` + `SessionEnd` hooks** — телеметрия/клинап.
21. **`PostToolUse`** — audit log, централизованная пост-обработка.
22. **`UserPromptSubmit`** — инжекция контекста в каждый запрос (например, подставить project info).

### Приоритет 6. Сабагенты и делегирование

23. **`agents` + `AgentDefinition`** — декларация сабагентов с собственными инструментами.
24. **Обработка `parent_tool_use_id`** — вложенное отображение «главный → сабагент».
25. **Built-in `Agent` tool** — позволить модели вызывать сабагентов.

### Приоритет 7. Качество и UX

26. **`includePartialMessages: true`** — богатый стриминг (у нас есть частично через stream_event).
27. **`outputFormat`** — structured output на уровне API (у нас частично используется).
28. **`promptSuggestions`** — чипы-подсказки.
29. **`startup()`** pre-warming — ускорить первый ответ.
30. **`AskUserQuestion` built-in tool** — интерактивные уточнения.
31. **`plan` permission mode** — встроенный режим планирования.

### Приоритет 8. Settings discovery и экосистема

32. **Опциональный `settingSources`** — если пользователь хочет подключить свой `CLAUDE.md` / `.claude/skills/` / `.claude/commands/`.
33. **Plugins** (`plugins: SdkPluginConfig[]`) — установка плагинов.
34. **Slash commands discovery** через `supportedCommands()` — автокомплит в вводе.

### Приоритет 9. Background tasks и Claude-specific фичи

35. **Background tasks** — отображать `SDKTaskStartedMessage` / `Progress` / `Notification`, давать `stopTask`.
36. **`Monitor` tool** — watch background scripts.
37. **`TaskCompleted` hook** — завершение фоновых.
38. **`WorktreeCreate` / `WorktreeRemove` hooks** — git worktree lifecycle.

### Что НЕ стоит делать в ближайшее время

- **Не стоит привязываться к Bedrock/Vertex/Azure** авторизации — это специфично для Claude и может ломать multi-provider UX.
- **Не стоит брать полный `settingSources`** без опт-ина — пользователь не ожидает, что мы читаем его `~/.claude/`.
- **Не стоит использовать `allowDangerouslySkipPermissions` в интерактивных сессиях** — только в translation-only/CI-режимах.
- **Не стоит делать custom MCP OAuth-flow** без явного запроса — пусть пользователь сам проходит OAuth в своём браузере.
- **Не гнаться за экспериментальными хуками** (`TeammateIdle`, `Setup`, и т.п.) — они Claude-specific и могут не иметь аналогов у других провайдеров.

---

## 7. Ссылки на первоисточники

Вся информация в документе опирается на публичные источники Anthropic. Ссылки на оригиналы:

### 7.1. Официальная документация Anthropic / Claude

- Agent SDK overview: https://code.claude.com/docs/en/agent-sdk/overview
- TypeScript reference: https://code.claude.com/docs/en/agent-sdk/typescript
- Python reference: https://code.claude.com/docs/en/agent-sdk/python
- Hooks guide: https://code.claude.com/docs/en/agent-sdk/hooks
- MCP integration: https://code.claude.com/docs/en/agent-sdk/mcp
- Permissions: https://code.claude.com/docs/en/agent-sdk/permissions
- Subagents: https://code.claude.com/docs/en/agent-sdk/subagents
- Custom tools: https://code.claude.com/docs/en/agent-sdk/custom-tools
- Sessions: https://code.claude.com/docs/en/agent-sdk/sessions
- Streaming vs single mode: https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode
- Streaming output: https://code.claude.com/docs/en/agent-sdk/streaming-output
- Tool search: https://code.claude.com/docs/en/agent-sdk/tool-search
- Slash commands: https://code.claude.com/docs/en/agent-sdk/slash-commands
- Plugins: https://code.claude.com/docs/en/agent-sdk/plugins
- Skills: https://code.claude.com/docs/en/agent-sdk/skills
- Modifying system prompts (memory): https://code.claude.com/docs/en/agent-sdk/modifying-system-prompts
- Migration guide (Claude Code SDK → Claude Agent SDK): https://code.claude.com/docs/en/agent-sdk/migration-guide
- User input / approvals / AskUserQuestion: https://code.claude.com/docs/en/agent-sdk/user-input
- Quickstart: https://code.claude.com/docs/en/agent-sdk/quickstart

### 7.2. API-level документация (Claude Platform)

- Building with extended thinking: https://platform.claude.com/docs/en/build-with-claude/extended-thinking
- Prompt caching: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Prompt engineering best practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Agent Skills: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- Release notes: https://platform.claude.com/docs/en/release-notes/overview

### 7.3. Исходники и пакеты

- TypeScript SDK на GitHub: https://github.com/anthropics/claude-agent-sdk-typescript
- TypeScript SDK changelog: https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md
- Python SDK на GitHub: https://github.com/anthropics/claude-agent-sdk-python
- Python SDK releases: https://github.com/anthropics/claude-agent-sdk-python/releases
- npm: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
- Demo-агенты Anthropic: https://github.com/anthropics/claude-agent-sdk-demos

### 7.4. Инженерный блог и сторонние обзоры

- Anthropic Engineering: «Building agents with the Claude Agent SDK»: https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
- Promptfoo: https://www.promptfoo.dev/docs/providers/claude-agent-sdk/
- Popular AI Tools — Claude Agent SDK Guide 2026: https://popularaitools.ai/blog/claude-agent-sdk-guide-2026
- Releasebot — Anthropic release notes: https://releasebot.io/updates/anthropic

### 7.5. MCP-экосистема

- Model Context Protocol spec: https://modelcontextprotocol.io/docs/getting-started/intro
- MCP OAuth 2.1 authorization: https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization
- Официальные MCP-серверы: https://github.com/modelcontextprotocol/servers

---

## 8. Итог одной строкой

Claude Agent SDK — это не «клиент API», а полноценная агентная библиотека, эквивалентная по функциональности тому, чем является Codex App Server для экосистемы OpenAI: готовый agent loop с 10+ встроенными инструментами, 4 типами MCP-серверов, 18 хуками жизненного цикла, сабагентами, управлением сессиями, чекпоинтингом файлов, hot-reload MCP, structured output, extended thinking с runtime-управлением, bug budgeting по деньгам и по шагам. В CodeAI Hub мы используем **менее 10%** этого surface — фактически, только streaming текста и thinking. Оставшиеся 90% — это тот резерв, из которого имеет смысл выбирать только те фичи, у которых есть аналог в Codex App Server, чтобы сохранить единый UX-контракт поверх всех провайдеров. Список пересечений вынесен в отдельный документ [`CrossProvider_Common_Capabilities.md`](./CrossProvider_Common_Capabilities.md).
