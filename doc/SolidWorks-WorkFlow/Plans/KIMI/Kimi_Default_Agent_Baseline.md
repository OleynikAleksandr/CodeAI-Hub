# Kimi default agent baseline

Дата фиксации: 2026-05-19.

Цель документа: зафиксировать фактический default baseline Kimi CLI перед проектированием CodeAI-owned `--agent-file`, чтобы было понятно, что именно мы заменяем, какие инструменты остаются у провайдера по умолчанию и где лежит runtime evidence.

## Проверенный runtime

- CLI binary: `/Users/oleksandroliinyk/.local/bin/kimi`.
- Реальный target: `/Users/oleksandroliinyk/.local/share/uv/tools/kimi-cli/bin/kimi`.
- CLI version evidence: `kimi info --json` вернул `kimi_cli_version=1.44.0`, `wire_protocol_version=1.10`, `agent_spec_versions=["1"]`, `python_version=3.13.9`.
- MCP evidence: `kimi mcp list` вернул `MCP config file: /Users/oleksandroliinyk/.kimi/mcp.json` и `No MCP servers configured.`
- CodeAI runtime home: `/Users/oleksandroliinyk/.codeai-hub/providers/kimi/home`.
- Авторизационный config path используется как ссылка runtime: `/Users/oleksandroliinyk/.kimi/config.toml`; содержимое config не копировалось в этот плановый baseline.

## Что является default agent

Kimi CLI сам выбирает default agent, если не передан `--agent-file`. В установленном пакете это зафиксировано в:

- source code: `/Users/oleksandroliinyk/.local/share/uv/tools/kimi-cli/lib/python3.13/site-packages/kimi_cli/agentspec.py`
- constant: `DEFAULT_AGENT_FILE = get_agents_dir() / "default" / "agent.yaml"`
- resolved default agent file: `/Users/oleksandroliinyk/.local/share/uv/tools/kimi-cli/lib/python3.13/site-packages/kimi_cli/agents/default/agent.yaml`
- resolved default system prompt file: `/Users/oleksandroliinyk/.local/share/uv/tools/kimi-cli/lib/python3.13/site-packages/kimi_cli/agents/default/system.md`

В эту папку добавлены raw-копии этих файлов:

- `doc/SolidWorks-WorkFlow/Plans/KIMI/Kimi_Default_Agent_Source.yaml`
- `doc/SolidWorks-WorkFlow/Plans/KIMI/Kimi_Default_SystemPrompt_Source.md`

Эти две копии нужно считать baseline snapshot для Kimi CLI `1.44.0`, а не вечным контрактом: при обновлении CLI их нужно переснять.

## Как default prompt попадает в сессию

Фактический поток загрузки в установленном CLI:

1. `kimi_cli.app.KimiCLI.create(...)` получает `agent_file`.
2. Если `agent_file is None`, он подставляет `DEFAULT_AGENT_FILE`.
3. `load_agent(agent_file, runtime, ...)` читает agent spec.
4. `load_agent_spec(...)` резолвит `system_prompt_path`, `tools`, `exclude_tools`, `subagents`.
5. `_load_system_prompt(...)` рендерит `system.md` с runtime placeholders.
6. Если новая сессия не содержит сохраненного prompt, CLI пишет итоговый prompt в `context.jsonl` как `role: "_system_prompt"`.

Именно поэтому baseline состоит из двух уровней:

- source baseline: `agent.yaml` + `system.md`;
- rendered runtime baseline: первая строка `context.jsonl` с `role="_system_prompt"` после подстановок `${KIMI_OS}`, `${KIMI_SHELL}`, `${KIMI_WORK_DIR}`, `${KIMI_WORK_DIR_LS}`, `${KIMI_AGENTS_MD}`, `${KIMI_SKILLS}` и других runtime данных.

## Runtime evidence на текущей CodeAI-сессии

Последняя проверенная Kimi-сессия CodeAI runtime:

- `context.jsonl`: `/Users/oleksandroliinyk/.codeai-hub/providers/kimi/home/sessions/873dc10abe02617dc66a7d9acb9d6e80/bccee7c2-4f60-4891-8ff4-3a8e916c2402/context.jsonl`
- `wire.jsonl`: `/Users/oleksandroliinyk/.codeai-hub/providers/kimi/home/sessions/873dc10abe02617dc66a7d9acb9d6e80/bccee7c2-4f60-4891-8ff4-3a8e916c2402/wire.jsonl`

В `context.jsonl` первая запись содержит `role="_system_prompt"` и полный rendered system prompt. В этом prompt уже видны:

- default Kimi Code CLI system instructions;
- runtime OS/shell/date/workdir;
- directory listing рабочей директории;
- merged `AGENTS.md` content, если применимо;
- built-in skills list;
- пользовательский turn с CodeAI-managed workflow prompt идет отдельно как `role="user"`, а не как замена default system prompt.

В `wire.jsonl` `TurnBegin.payload.user_input` содержит CodeAI-managed prompt для конкретного workflow turn. Это полезно для проверки того, что отправил Core, но это не provider default system prompt.

## Что Capture Workbench дает сейчас

Существующий detached Capture Workbench полезен как UI/transport для provider-native diagnostic artifacts, но текущая реализация Kimi capture в CodeAI Hub является Wire-evidence based:

- `KimiProviderAdapter.captureNativeRequest(...)` пишет applied input envelope: provider home, selected model, user config path, `wire.jsonl` provenance;
- для Kimi capture не выполняется TLS/HTTP MITM body capture;
- Workbench не извлекает автоматически rendered `role="_system_prompt"` из Kimi `context.jsonl`;
- Workbench не показывает raw tool schemas Kimi CLI.

Вывод: Workbench уже помогает найти provenance и связать capture с runtime artifacts, но для задачи “что именно дефолтно послал Kimi” сейчас нужен дополнительный extractor поверх Kimi session `context.jsonl` и installed package resources.

## Практический вывод для замены инструкций

Для CodeAI-owned поведения нужно использовать Kimi-native replacement mechanism:

- `--agent-file <path>` заменяет default agent spec.
- В custom agent file можно указать свой `system_prompt_path`.
- Можно задать собственный `tools` allowlist.
- Можно задать `exclude_tools`.
- Можно отключить/ограничить subagents.
- MCP нужно задавать через CodeAI-owned пустой или curated `--mcp-config-file`, чтобы не подтягивать пользовательский global MCP state.

Это именно замена agent/system/tool policy на уровне Kimi CLI, а не добавление очередной инструкции в user prompt.

## Open points

- Нужно отдельно реализовать CodeAI extractor, который по session id копирует rendered `role="_system_prompt"` и tool inventory в safe artifact без секретов.
- Нужно решить, хранить ли CodeAI-managed Kimi agent profile как tracked template в `packages/Kimi_Module` или генерировать его в provider home на старте runtime.
- Нужно определить минимальный tool allowlist для managed workflow: например, оставить file read/write/search и shell только через Core policy, убрать `Agent`, background tasks и web tools, если они не нужны workflow.
