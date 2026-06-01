# Kimi default tooling baseline

Дата фиксации: 2026-05-19.

Этот документ фиксирует инструменты, которые default Kimi agent получает из установленного `kimi-cli 1.44.0`.

## Default agent tool list

Источник: `doc/SolidWorks-WorkFlow/Plans/Backlog/KIMI/Kimi_Default_Agent_Source.yaml`.

Default root agent включает:

| Tool path | Tool name | Назначение baseline |
| --- | --- | --- |
| `kimi_cli.tools.agent:Agent` | `Agent` | Запуск/возобновление subagent instance. |
| `kimi_cli.tools.ask_user:AskUserQuestion` | `AskUserQuestion` | Интерактивные вопросы пользователю через Wire client. |
| `kimi_cli.tools.todo:SetTodoList` | `SetTodoList` | Внутренний todo-лист агента. |
| `kimi_cli.tools.shell:Shell` | `Shell` | Выполнение shell-команд, включая background mode. |
| `kimi_cli.tools.background:TaskList` | `TaskList` | Просмотр background tasks. |
| `kimi_cli.tools.background:TaskOutput` | `TaskOutput` | Чтение output background task. |
| `kimi_cli.tools.background:TaskStop` | `TaskStop` | Остановка background task. |
| `kimi_cli.tools.file:ReadFile` | `ReadFile` | Чтение текстовых файлов. |
| `kimi_cli.tools.file:ReadMediaFile` | `ReadMediaFile` | Чтение media-файлов. |
| `kimi_cli.tools.file:Glob` | `Glob` | Поиск файлов по glob pattern. |
| `kimi_cli.tools.file:Grep` | `Grep` | Поиск по содержимому файлов. |
| `kimi_cli.tools.file:WriteFile` | `WriteFile` | Создание/перезапись файлов. |
| `kimi_cli.tools.file:StrReplaceFile` | `StrReplaceFile` | Замена фрагментов в файле. |
| `kimi_cli.tools.web:SearchWeb` | `SearchWeb` | Web search. |
| `kimi_cli.tools.web:FetchURL` | `FetchURL` | Загрузка URL. |
| `kimi_cli.tools.plan:ExitPlanMode` | `ExitPlanMode` | Выход из plan mode. |
| `kimi_cli.tools.plan.enter:EnterPlanMode` | `EnterPlanMode` | Вход в plan mode. |

Default agent не задает `exclude_tools`, поэтому все перечисленные инструменты доступны root agent.

## Default subagents

Default agent регистрирует три built-in subagent type:

| Subagent | Source | Tool policy |
| --- | --- | --- |
| `coder` | `kimi_cli/agents/default/coder.yaml` | Allowlist: `Shell`, `ReadFile`, `ReadMediaFile`, `Glob`, `Grep`, `WriteFile`, `StrReplaceFile`, `SearchWeb`, `FetchURL`; excluded: `Agent`, `AskUserQuestion`, `SetTodoList`, plan tools. |
| `explore` | `kimi_cli/agents/default/explore.yaml` | Read-only/code exploration allowlist: `Shell`, `ReadFile`, `ReadMediaFile`, `Glob`, `Grep`, `SearchWeb`, `FetchURL`; excluded: write/replace, question/todo/agent/plan tools. |
| `plan` | `kimi_cli/agents/default/plan.yaml` | Planning allowlist: `ReadFile`, `ReadMediaFile`, `Glob`, `Grep`, `SearchWeb`, `FetchURL`; excluded: shell, write/replace, question/todo/agent/plan tools. |

## Tool description sources

Kimi tool descriptions are loaded from installed package markdown files or rendered dynamically from those markdown files:

| Tool | Description source |
| --- | --- |
| `Agent` | `kimi_cli/tools/agent/description.md`, rendered with built-in subagent list. |
| `AskUserQuestion` | `kimi_cli/tools/ask_user/description.md`. |
| `SetTodoList` | `kimi_cli/tools/todo/set_todo_list.md`. |
| `Shell` | `kimi_cli/tools/shell/bash.md`, rendered with runtime shell name/path. |
| `TaskList` | `kimi_cli/tools/background/list.md`. |
| `TaskOutput` | `kimi_cli/tools/background/output.md`. |
| `TaskStop` | `kimi_cli/tools/background/stop.md`. |
| `ReadFile` | `kimi_cli/tools/file/read.md`, rendered with runtime context. |
| `ReadMediaFile` | `kimi_cli/tools/file/read_media.md`, rendered with runtime context. |
| `Glob` | `kimi_cli/tools/file/glob.md`, rendered with runtime context. |
| `Grep` | `kimi_cli/tools/file/grep.md`. |
| `WriteFile` | `kimi_cli/tools/file/write.md`, rendered with runtime context. |
| `StrReplaceFile` | `kimi_cli/tools/file/replace.md`, rendered with runtime context. |
| `SearchWeb` | `kimi_cli/tools/web/search.md`. |
| `FetchURL` | `kimi_cli/tools/web/fetch.md`. |
| `ExitPlanMode` | `kimi_cli/tools/plan/description.md`. |
| `EnterPlanMode` | `kimi_cli/tools/plan/enter_description.md`. |

## Parameters visible from installed source

Important root tools expose these high-impact parameters:

- `Agent`: `description`, `prompt`, `subagent_type`, optional `model`, optional `resume`, `run_in_background`, optional `timeout`.
- `AskUserQuestion`: `questions[]`, each with `question`, `header`, `options[]`, `multi_select`.
- `Shell`: `command`, `timeout`, `run_in_background`, `description`.
- `ReadFile`: file path plus read-range/options from tool schema source.
- `WriteFile`: target path and full file content.
- `StrReplaceFile`: target path, old/new text replacement contract.
- `SearchWeb` / `FetchURL`: provider-native web access surfaces.

## Tooling implications for CodeAI-managed Kimi

The default toolset is too broad for deterministic CodeAI workflow execution:

- `Agent` can spawn nested subagents and create independent context histories.
- `Shell` can execute local commands and background commands.
- `TaskList`/`TaskOutput`/`TaskStop` expose background task lifecycle.
- `SearchWeb`/`FetchURL` allow external web access from the provider runtime.
- `AskUserQuestion` can bypass the Core-owned dialog contract unless normalized carefully.

For managed workflow turns, CodeAI should prefer a custom `--agent-file` with an explicit allowlist. A reasonable first managed profile can start from file/search tools needed for artifact creation and then add `Shell`, web, subagents, and interactive questions only when the Core contract explicitly supports them.

## MCP state

Runtime command `kimi mcp list` on 2026-05-19 showed no configured MCP servers:

```text
MCP config file: /Users/oleksandroliinyk/.kimi/mcp.json
No MCP servers configured.
```

For reproducible managed sessions, CodeAI should not rely on this user-global file staying empty. Kimi supports `--mcp-config-file` and `--mcp-config`, so managed sessions should pass a CodeAI-owned empty or curated MCP config.
