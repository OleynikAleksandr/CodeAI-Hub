# Итоги эксперимента по управлению Instruction Stack

**Статус:** итоговый bundle эксперимента
**Дата:** 2026-04-25
**Scope:** Claude Agent SDK и Codex App Server provider/system instruction control
**Главный вывод:** CodeAI Hub управляет и provider/system инструкциями, и workflow user-инструкциями для проверенных провайдеров. Итоговый early-architecture instruction profile подключен в runtime и diagnostic paths для Claude и Codex в релизном scope `1.2.77`; следующий шаг — пользовательский retest native capture.

## 1. Главный результат

Эксперимент доказал, что CodeAI Hub контролирует полный instruction stack, который получает provider agent:

- provider/system prompt layer можно заменить или сформировать самостоятельно;
- provider project-memory / user-instruction discovery можно отключить;
- workflow first user prompt остается owned by CodeAI Hub и виден в native/request diagnostics;
- tool declarations остаются стабильными, если менять только instruction flags;
- provider base prompts отличаются между моделями, поэтому provider defaults нужно считать reference material, а не product SSOT.

Стратегический вывод:

- CodeAI Hub не должен полагаться на один provider-default system prompt для всех workflow-этапов.
- Первые три шага (`Description`, `Virtual Simulation`, `Diagram Modules`) требуют узкий early-architecture system profile, а не широкий coding/frontend/backend prompt.
- Для поздних implementation phases можно использовать более сильные coding/frontend/system prompts, но это должны быть отдельные instruction profiles.

## 2. Слои запроса, которые нужно различать

Provider request фактически состоит из трех разных instruction layers.

### 2.1 Provider/system layer

Это provider harness, который виден как:

- Claude native `body.system`;
- Codex native `response.create.instructions`;
- Codex provider-home `base_instructions.text`.

Этот слой можно менять.

### 2.2 Provider project/user instruction layer

Это provider-side filesystem instruction discovery:

- Claude `CLAUDE.md` / settings sources управляются через `settingSources`;
- Codex `AGENTS.md` / project docs управляются через App Server config, например `project_doc_max_bytes`.

Этот слой можно отключать или ограничивать.

### 2.3 Workflow first user prompt

Это prompt, который строит CodeAI Hub для текущего workflow scenario:

- `Description`;
- `Virtual Simulation`;
- `Diagram Modules`;
- будущие workflow stages.

Этот слой остается в first user message / turn input и не является тем же самым, что provider/system prompt replacement.

## 3. Итоги по Claude

Канонические implementation notes:

- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_Instruction_Stack_Flag_Evidence.md`

Сохраненные artifacts в этом bundle:

- `claude-instruction-analysis/Claude_System_Prompt_2026-04-24T13-55-05-221Z.md`
- `claude-instruction-analysis/Claude_System_Prompt_2026-04-24T13-55-05-221Z.ru.md`
- `claude-instruction-analysis/Claude_System_Tools_2026-04-24T13-55-05-221Z.md`
- `claude-instruction-analysis/Claude_My_System_Prompt.md`

Что доказано:

- `systemPrompt` в Claude Agent SDK меняет Anthropic native `body.system`.
- `systemPrompt: { type: "preset", preset: "claude_code" }` подтягивает большой Claude Code default harness.
- Custom-only `systemPrompt` заменяет этот большой provider harness в diagnostic path.
- `settingSources: []` является безопасным baseline для CodeAI Hub workflow turns, потому что не дает uncontrolled user/project/local Claude settings и memory files попадать в provider request.
- Workflow template остается first user message; его не нужно переносить в `systemPrompt`.
- Tool declarations в успешных instruction-stack tests оставались default Claude Code profile (`10` tools), но это отдельный SDK `body.tools` слой, не `body.system`.
- Новый тестовый флаг `1.2.80` проверяет explicit SDK `tools: ["Read", "Write", "Edit"]` для normal runtime и diagnostic capture, чтобы убрать `Agent`, subagents, `Skill`, `ScheduleWakeup`, `ToolSearch` и broad exploration tool noise из ранних documentation workflow turns.

Product decision:

- Claude custom system prompt пригоден для CodeAI Hub-owned workflow-agent frame.
- Claude provider defaults полезны как reference material, но активный workflow profile должен принадлежать продукту.
- Финальная реализация подключает `CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT` в `ClaudeSDKManager` и `ClaudeNativeRequestCaptureService`, сохраняя `settingSources: []`.
- Текущий Claude workflow tool-profile candidate: `Read` / `Write` / `Edit`. Retest должен доказать, заменяет ли SDK default tools или добавляет allowlist поверх них.

## 4. Итоги по Codex

Канонические implementation notes:

- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`
- `doc/SolidWorks-WorkFlow/Plans/Codex_GPT55_Model_Addition.md`

Сохраненные artifacts в этом bundle:

- `codex-instruction-analysis/Provider Home Base Instruction - GPT-5.3-Codex.md`
- `codex-instruction-analysis/Provider Home Base Instruction - GPT-5.3-Codex.ru.md`
- `codex-instruction-analysis/Provider Home Base Instruction - GPT-5.4.md`
- `codex-instruction-analysis/Provider Home Base Instruction - GPT-5.4.ru.md`
- `codex-instruction-analysis/Provider Home Base Instruction - GPT-5.5.md`
- `codex-instruction-analysis/Provider Home Base Instruction - GPT-5.5.ru.md`
- `codex-instruction-analysis/Codex_My_System_Prompt.md`

Что доказано:

- `thread/start.config.project_doc_max_bytes = 0` отключает project `AGENTS.md` discovery для проверенного Codex diagnostic thread.
- При этом `thread/start.response.instructionSources = []`.
- Provider-home `turn_context.user_instructions` становится пустым или отсутствует, поэтому project `AGENTS.md` не попадает в provider context.
- `thread/start.baseInstructions` заменяет Codex provider/system base prompt.
- Когда `baseInstructions` отправлен, один и тот же compact text появляется и в native `response.create.instructions`, и в provider-home `base_instructions.text`.
- Tool declarations оставались стабильными во время instruction-only tests.
- Новый тестовый флаг `1.2.81` проверяет startup feature flag `codex app-server --disable multi_agent`, чтобы убрать из Codex provider-native tools subagent family: `spawn_agent`, `send_input`, `resume_agent`, `wait_agent`, `close_agent`.
- Workflow first user prompt оставался в `turn/start.input[0].text`.
- Финальная реализация подключает `CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT` и `project_doc_max_bytes = 0` в diagnostic `thread/start` и normal runtime `thread/start`.

Что отложено или не является текущим решением:

- `thread/start.developerInstructions` не был правильной следующей целью, потому что активная задача была не добавить developer frame, а сократить/заменить system/base prompt.
- `model_instructions_file`, `thread/resume.baseInstructions`, `thread/resume.developerInstructions` и `TurnStartParams.collaborationMode` остаются future candidates.

## 5. Инвентаризация Codex model base prompts

Все три English-файла в `codex-instruction-analysis/` являются точными extracts provider/system prompt из native captures.

| Model | Length | SHA-256 | Notes |
| --- | ---: | --- | --- |
| `gpt-5.3-codex` | `12343` | `6fdc9b734797bf69f7982c747cd869a834615baab4244bd1bb7676625717f598` | Более короткий coding-agent prompt. |
| `gpt-5.4` | `14732` | `478e8a11b180adb2659f21aba51744711f79f665039bb0bc4a13d3c051fcb76c` | Более широкий, но еще относительно компактный coding/frontend guidance profile. |
| `gpt-5.5` | `21335` | `c2a980bc28af132eb89e0b4c68ae884043faae83a1afd3fd4889f7e8a1ada7b0` | Значительно более широкий prompt с explicit engineering judgment и подробной frontend/design policy. |

Важный результат сравнения:

- `gpt-5.5` не является просто `gpt-5.4` с другим model id.
- `gpt-5.5` добавляет примерно `6603` символа относительно `gpt-5.4`.
- Основная добавленная ценность — широкий product/frontend/design/engineering behavior.
- Для первых трех шагов CodeAI Hub большая часть этого provider prompt является шумом, потому что эти шаги еще не являются implementation, frontend, backend или deployment work.

## 6. Улучшения Native Capture

Эксперимент также исправил сам evidence path.

До исправления:

- Codex native WebSocket capture мог показывать ранний `response.create` frame с `input: []` и `generate: false`.
- Реальный workflow prompt и provider-home `turn_context.user_instructions` приходилось искать вручную во втором rollout JSONL файле.

После исправления:

- Settings -> General native request capture artifacts содержат `Provider Diagnostic Context`.
- Codex diagnostic artifacts содержат `thread/start`, `turn/start` и embedded `codex_provider_home_rollout_context`.
- Один `.md` / `.jsonl` capture теперь доказывает:
  - selected model и reasoning;
  - был ли отправлен `baseInstructions`;
  - был ли отправлен `project_doc_max_bytes = 0`;
  - пустой ли `instructionSources`;
  - совпадает ли provider-home `base_instructions.text` с native `response.create.instructions`;
  - остался ли workflow prompt в `turn/start.input[0].text`;
  - изменились ли tools.

## 7. Текущий универсальный Codex prompt candidate

Текущий candidate file:

- `codex-instruction-analysis/Codex_My_System_Prompt.md`

Назначение:

- system/base prompt candidate для первых трех CodeAI Hub workflow steps;
- намеренно не является general coding prompt;
- намеренно исключает широкий frontend/backend/implementation/dev-server guidance;
- концентрирует агента на architecture discovery, product meaning, scenarios, boundaries, assumptions и artifact-first work.

Этот файл стал reference copy для runtime prompt source. Активная Codex runtime-константа живет в `packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts`.

## 8. Product Direction

Эксперимент показывает, что в продукте нужен концепт `WorkflowInstructionProfile`.

Ожидаемая форма:

- provider-neutral profile intent на Core/workflow уровне;
- provider-specific rendering для Claude и Codex;
- отдельный profile для early architecture steps;
- отдельный profile для implementation/coding steps;
- отдельный profile для frontend-heavy implementation, если понадобится;
- diagnostic native capture остается evidence gate перед включением profile в normal workflow.

Рекомендуемый следующий шаг:

- Не внедрять сразу три разных system prompts для `Description`, `Virtual Simulation` и `Diagram Modules`.
- Сначала спроектировать или реализовать один общий early-architecture system profile для всех трех шагов.
- Детальные step-specific инструкции оставить в существующем workflow user prompt/template layer.
- Разделять system profile по шагам только если capture/retest evidence покажет, что общий early profile слишком широкий или слабый.

## 9. Файлы, перенесенные из временного хранилища

Перенесено из:

- `doc/tmp/codex-instruction-analysis`
- `doc/tmp/claude-instruction-analysis`

Перенесено в:

- `doc/SolidWorks-WorkFlow/Plans/Instruction_Stack_Control_Experiment_Results/codex-instruction-analysis`
- `doc/SolidWorks-WorkFlow/Plans/Instruction_Stack_Control_Experiment_Results/claude-instruction-analysis`

Причина:

- эти prompts и переводы больше не являются временным scratch output;
- это evidence artifacts для instruction-stack control experiment;
- они должны оставаться рядом с итоговым summary эксперимента.
