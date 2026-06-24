# Provider Instruction Profile Calibration — GLM и Kimi

**Статус:** Backlog planning, не реализовано  
**Дата:** 2026-06-24  
**Scope:** CodeAI-owned system profiles для GLM native и Kimi native provider paths  
**Главная цель:** превратить экспериментальный эффект от compact CodeAI prompt в управляемый продуктовый механизм, не зависящий от дрейфа Claude/Kimi defaults.

## 1. Короткое решение

Нужно сделать не копию полного Claude system prompt, а маленький версионируемый **CodeAI system profile** для coding/documentation tasks.

Важно: в проведенных GLM/Kimi A/B тестах использовался **не полный Claude system prompt**, а наш купированный `Claude_My_System_Prompt.md`.

| Artifact | Lines | Chars | Роль |
| --- | ---: | ---: | --- |
| `Claude_My_System_Prompt.md` | 51 | 3 798 | Реально использованный compact CodeAI prompt. |
| `Claude_System_Prompt_2026-04-24T13-55-05-221Z.md` | 264 | 27 733 | Полный captured Claude system prompt; не тестировался в GLM/Kimi A/B. |
| `Claude_System_Tools_2026-04-24T13-55-05-221Z.md` | 738 | 38 258 | Captured Claude tools; не переносились в GLM/Kimi. |

Полный Claude prompt используется только как reference material: из него берем удачные operating rules, но итоговый профиль принадлежит CodeAI Hub. GLM и Kimi получают один и тот же смысловой профиль, но с разными provider addendum, потому что у них разные runtime paths:

- GLM идет через наш собственный `glmNative` client и Z.AI/OpenAI-style request body.
- Kimi идет через родной Kimi ACP runtime и managed profile `codeai-managed-agent/system.md`.

Отдельно про Codex baseline: `Codex GPT 5.5 high` в coding benchmark запускался не с vanilla capture `ProviderPromptsAndTools/native/codex-native-system-instructions.md` и не напрямую с archived `Codex_My_System_Prompt.md`. Он шел через `CodexProviderAdapter`, который при `thread/start` передает `baseInstructions` из `packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts` (`CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT`). На 2026-06-24 этот runtime prompt отличается от archived `Codex_My_System_Prompt.md`, поэтому эти артефакты нельзя смешивать в выводах.

## 2. Что доказали эксперименты

Источник benchmark evidence:

- `doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Coding_Model_Benchmark_RU.md`
- `doc/tmp/prototypes/glm-instruction-stack-ab.md`
- `doc/tmp/prototypes/codeai-provider-code-glm-claude-prompt.md`
- `doc/tmp/prototypes/kimi-instruction-stack-ab.md`

### 2.1 GLM

| Variant | Pass | Compile | Raw clean | Avg latency | Вывод |
| --- | ---: | ---: | ---: | ---: | --- |
| `GLM 5.2 native max` | 8/13 | 3/4 | n/a | 33.4s | Базовый native stack не годится как strict raw-code generator. |
| `GLM 5.2 + compact CodeAI prompt + GLM tools` | 13/13 | 4/4 | 3/4 | 60.9s | Correctness резко вырос, но latency высокий и один кейс вернул fenced markdown. |

Вывод: GLM нельзя оценивать только как модель. Сильно влияет связка `system prompt + tools + client`. Отключение tools/thinking ускоряло, но ломало качество, поэтому первый product candidate должен оставить GLM tools и заменить только system profile.

### 2.2 Kimi

| Variant | Pass | Compile | Raw clean | Avg latency | Вывод |
| --- | ---: | ---: | ---: | ---: | --- |
| `Kimi current managed prompt` | 12/13 | 4/4 | 4/4 | 30.1s | Почти хорошо, но свежий A/B ошибся на `merge-user-events`. |
| `Kimi + compact CodeAI prompt` | 13/13 | 4/4 | 4/4 | 34.3s | Лучший Kimi profile в текущих проверках. |

Вывод: Kimi тоже выигрывает от compact CodeAI system profile. Но технически это не turn flag: Kimi получает system prompt через materialized файл `codeai-managed-agent/system.md`.

## 3. Product principle

Не зависеть от provider default prompts.

Правильная модель управления:

```text
CodeAI profile source
  -> provider-specific materialization
  -> benchmark with profileVersion
  -> manual drift review from Claude/Kimi upstream captures
```

Запрещено:

- автоматически копировать новый полный Claude system prompt в runtime;
- патчить файлы Kimi CLI;
- делать GLM no-tools режим основным только из-за скорости;
- считать публичный benchmark модели равным качеству нашего provider path;
- смешивать качество модели и качество instruction/tool stack.

## 4. Целевой профиль

Минимальный новый профиль:

```text
CodeAI_CodingAgent_SystemProfile_v1
```

Он должен быть коротким и owned by CodeAI Hub:

- роль: точный coding/documentation worker внутри CodeAI Hub;
- output discipline: возвращать только требуемый артефакт;
- raw-code contract: без markdown, prose, imports/dependencies, если prompt просит runnable code;
- source discipline: не выдумывать контекст, файлы, метрики, доступы;
- scope control: не делать редизайн/релиз/большой рефакторинг без запроса;
- tool discipline: использовать только предоставленные provider tools и только по задаче;
- language contract: user-facing text на языке сессии, code/identifiers как требуется задачей.

Профиль должен иметь явный `profileVersion`, который попадает в benchmark/report metadata.

## 5. GLM implementation direction

Текущий GLM path:

- system prompt строится в `buildGlmNativeSystemMessage(profile)`;
- tools добавляются в request body как `GLM_NATIVE_WORKFLOW_TOOLS`;
- `tool_choice: "auto"`;
- thinking/reasoning управляются через runtime profile.

Минимальное изменение:

1. Добавить CodeAI-owned system profile resolver для GLM.
2. Заменить hardcoded GLM native system instruction на выбранный `CodeAI_CodingAgent_SystemProfile_v1` + GLM runtime addendum.
3. Оставить GLM tools включенными для первого product pass.
4. Усилить raw-code clamp для coding profile: no markdown/prose/fences.
5. Добавлять `systemProfileId` / `systemProfileVersion` в diagnostics и benchmark output.

Не делать на первом проходе:

- не менять GLM tool definitions;
- не переводить GLM в no-tools режим;
- не трогать GLM OpenCode;
- не делать широкую систему профилей до одного проверенного profile id.

## 6. Kimi implementation direction

Текущий Kimi path:

- Kimi работает через родной ACP runtime;
- CodeAI Hub создает managed profile;
- `agent.yaml` указывает `system_prompt_path: ./system.md`;
- `materializeKimiManagedAgentProfile()` записывает `system.md`.

Минимальное изменение:

1. Заменить inline `KIMI_MANAGED_SYSTEM_PROMPT` на CodeAI-owned profile source + Kimi runtime addendum.
2. При каждом initialize/materialize перезаписывать `codeai-managed-agent/system.md` из нашего profile source.
3. Не патчить Kimi CLI и не полагаться на его внутренние prompt defaults.
4. Добавлять `systemProfileId` / `systemProfileVersion` в diagnostics и benchmark output.

Это переживает обновления Kimi CLI, пока Kimi сохраняет контракт `agent.yaml` + `system_prompt_path`. Если Kimi изменит managed profile format, это станет adapter compatibility issue, а не prompt drift issue.

## 7. Drift policy

Claude и Kimi default prompts могут меняться. Это нормально.

Нужна простая политика:

- раз в релиз или при provider update снимать fresh capture provider default prompt/tool profile;
- сравнивать diff с предыдущим capture;
- вручную переносить только полезные правила в CodeAI-owned profile;
- фиксировать source capture date и profileVersion;
- не обновлять runtime profile автоматически по чужому prompt drift.

## 8. Validation gates

Минимальный coding gate для profile rollout:

- coding benchmark: 13/13 assertions;
- compile: 4/4;
- raw clean: 4/4 для strict raw-code mode;
- latency отдельно фиксируется, но не является главным score;
- два последовательных прогона shortlist без regression.

GLM-specific acceptance:

- улучшить `raw clean` с 3/4 до 4/4;
- подтвердить, что `route-matcher` остается 5/5;
- явно принять высокий latency или оставить GLM только quality fallback.

Kimi-specific acceptance:

- подтвердить `Kimi + CodeAI profile` на повторном прогоне 13/13;
- проверить, что `merge-user-events` стабилен;
- убедиться, что обновление/materialize Kimi profile не ломает provider home.

## 9. Suggested implementation plan

### Phase 1 — Profile source

- Создать один shared CodeAI coding system profile source.
- Добавить provider-specific addendum для GLM и Kimi.
- Не вводить registry на десятки профилей: один profile id достаточно для первого прохода.

### Phase 2 — GLM integration

- Подключить профиль в GLM native system message.
- Сохранить текущие GLM tools.
- Добавить diagnostics metadata: `systemProfileId`, `systemProfileVersion`.
- Прогнать coding benchmark.

### Phase 3 — Kimi integration

- Подключить профиль в materialized `codeai-managed-agent/system.md`.
- Не менять Kimi CLI.
- Добавить diagnostics metadata.
- Прогнать Kimi A/B/coding benchmark.

### Phase 4 — Documentation and benchmark closeout

- Перенести стабильный контракт профилей в SSOT docs.
- Обновить provider docs для GLM/Kimi.
- Сохранить scratch benchmark artifacts как evidence или перенести итоговую таблицу в tracked archive.

## 10. Open questions

- Должен ли первый профиль покрывать только coding tasks или сразу coding + documentation/planning?
- Где лучше держать profile source: в provider-neutral core package или отдельно в каждом provider module с shared text import?
- Нужен ли UI setting для выбора profile id, или profile selection должен оставаться Core-owned и невидимым пользователю?
- Нужно ли отдельное `rawCode` mode поле в turn config, или достаточно task/system profile id?

## 11. Recommendation

Брать в работу после завершения текущего Gemini removal scope.

Самый короткий полезный путь:

1. один CodeAI-owned coding profile;
2. GLM: заменить system prompt, tools оставить;
3. Kimi: materialize тот же профиль в `system.md`;
4. benchmark-gate 13/13, compile 4/4, raw clean 4/4;
5. только потом думать о нескольких system/tool profiles для orchestrator routing.
