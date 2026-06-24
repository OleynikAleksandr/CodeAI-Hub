# Benchmark моделей для coding tasks

Дата фиксации: 2026-06-24.

Статус: Backlog benchmark summary. Это exploratory benchmark, а не финальный SSOT выбора моделей.

Методологическая оговорка: часть native-provider сравнений проводилась до того, как мы строго зафиксировали exact `system prompt`, `tool set`, client path и их hashes. Поэтому таблицы ниже полезны как smoke/evidence map, но выводы про "какой prompt лучше" требуют повторного controlled A/B с замороженным instruction/tool stack.

## 1. Цель

Найти недорогие модели, которые хорошо справляются с маленькими coding tasks:

- написать одну CommonJS-функцию;
- соблюдать точные edge cases;
- вернуть runnable JavaScript без markdown и зависимостей;
- пройти assert-проверки в Node.js.

Это не полноценный agentic benchmark с редактированием репозитория. Это быстрый тест чистой способности модели написать корректный небольшой код.

## 2. Best Line

**Best Line / reference:** `Codex GPT 5.5 high`.

Эта модель используется как эталон качества для coding benchmark. Она прошла все тесты через наши provider-модули.

| Модель | Роль | Pass | Compile | Correctness | Avg latency | Вывод |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `Codex GPT 5.5 high` | **Best Line / reference** | 13/13 | 4/4 | 100.0 | 12.5s | Эталон: все кейсы пройдены, все ответы компилируются. |
| `Kimi + compact CodeAI prompt` | calibrated native comparison | 13/13 | 4/4 | 100.0 | 34.3s | Лучший свежий Kimi A/B: full pass и raw clean 4/4. |
| `Kimi K2.7 Code` | native provider comparison | 13/13 | 4/4 | 100.0 | 35.1s | Тоже прошел все кейсы; медленнее Codex, но сильный native coding candidate. |
| `GLM 5.2 + compact CodeAI prompt + GLM tools` | calibrated native comparison | 13/13 | 4/4 | 100.0 | 60.9s | Полный pass после смены system prompt; slow, raw clean 3/4. |
| `GLM 5.2 native max` | native provider comparison | 8/13 | 3/4 | 61.5 | 33.4s | Частично пригоден, но route-matcher вернул некомпилируемый/prose output. |
| `Claude Opus max` | high-end comparison, retry | 11/13 | 3/4 | 84.6 | 43.0s | Смыслово силен, но нестабилен в raw-code output: один кейс оборвался. |
| `Claude Opus max` | high-end comparison, first run | 2/13 | 1/4 | 15.4 | 49.9s | Первый полный прогон провалился из-за незакрытого финального `};` в 3/4 кейсов. |

Важно: в provider-runner был исправлен баг склейки assistant chunks (`join('')` вместо `join('\n')`). После этого Claude smoke начал компилироваться. Но даже с исправленной склейкой полный retry оставил один оборванный ответ.

Примечание по GLM: прогон выполнен через **native `glmNative`**, не через GLM OpenCode.

Примечание по calibrated prompt: в GLM/Kimi A/B использовался не полный `Claude_System_Prompt_2026-04-24T13-55-05-221Z.md` (264 строки, 27 733 символа) и не Claude tools capture (738 строк, 38 258 символов), а наш купированный `Claude_My_System_Prompt.md` (51 строка, 3 798 символов). В таблицах ниже он переименован в `compact CodeAI prompt`.

Примечание по Codex baseline: `Codex GPT 5.5 high` в этом benchmark не запускался с `Plans/Backlog/Benchmarks/ProviderPromptsAndTools/native/codex-native-system-instructions.md` и не с archived `Codex_My_System_Prompt.md`. Скрипт использовал `CodexProviderAdapter`, а тот на `thread/start` передает runtime `baseInstructions` из `packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts` (`CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT`). Этот runtime prompt сейчас не совпадает с archived `Codex_My_System_Prompt.md`.

## 3. Тестовый набор

Использовались те же 4 кейса, что и в OpenRouter coding benchmark:

| Case | Checks |
| --- | --- |
| `signup-validator` | email/password/age/terms validation, exact `"invalid"` values. |
| `route-matcher` | route params, wildcard, root path, trailing slash handling. |
| `visible-files` | DFS traversal, skip hidden entries and `node_modules`, extension filtering. |
| `merge-user-events` | group by email, latest event wins, deleted user removal, tag merge/sort. |

Всего: 13 runtime assertions и 4 compile checks.

## 4. CodeAI providers

Источник:

- `doc/tmp/prototypes/codeai-provider-code-bench.md`
- `doc/tmp/prototypes/codeai-provider-code-bench-claude-retry.md`

| Provider | Run | Pass | Compile | Correctness | Avg latency | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `Codex GPT 5.5 high` | main | 13/13 | 4/4 | 100.0 | 12.5s | Best Line. |
| `Kimi + compact CodeAI prompt` | calibrated native A/B | 13/13 | 4/4 | 100.0 | 34.3s | Full pass and raw clean 4/4 in fresh A/B. |
| `Kimi K2.7 Code` | native | 13/13 | 4/4 | 100.0 | 35.1s | Full pass, but slower than Codex and OpenRouter cheap shortlist. |
| `GLM 5.2 + compact CodeAI prompt + GLM tools` | calibrated native | 13/13 | 4/4 | 100.0 | 60.9s | Full pass; `visible-files` still used fenced markdown, so raw clean is 3/4. |
| `GLM 5.2 native max` | native | 8/13 | 3/4 | 61.5 | 33.4s | Failed `route-matcher`; one response was not usable raw code. |
| `Claude Opus max` | retry | 11/13 | 3/4 | 84.6 | 43.0s | Passed 3 cases; `merge-user-events` compile fail. |
| `Claude Opus max` | main | 2/13 | 1/4 | 15.4 | 49.9s | Unstable raw-code output, missing final closure in most cases. |

Case-level result:

| Provider | `signup-validator` | `route-matcher` | `visible-files` | `merge-user-events` |
| --- | ---: | ---: | ---: | ---: |
| `Codex GPT 5.5 high` | 4/4 | 5/5 | 2/2 | 2/2 |
| `Kimi + compact CodeAI prompt` | 4/4 | 5/5 | 2/2 | 2/2 |
| `Kimi K2.7 Code` | 4/4 | 5/5 | 2/2 | 2/2 |
| `GLM 5.2 + compact CodeAI prompt + GLM tools` | 4/4 | 5/5 | 2/2 | 2/2 |
| `GLM 5.2 native max` | 4/4 | 0/5 compile fail | 2/2 | 2/2 |
| `Claude Opus max` retry | 4/4 | 5/5 | 2/2 | 0/2 compile fail |
| `Claude Opus max` main | 0/4 compile fail | 0/5 compile fail | 2/2 | 0/2 compile fail |

## 5. OpenRouter live benchmark до $2/M output

Источник: `doc/tmp/prototypes/openrouter-code-model-live-v2.md`.

| Rank | Model | Output $/M | Pass | Compile | Rating | Avg latency | tok/s | Вывод |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `mistralai/devstral-2512` | 2.00 | 13/13 | 4/4 | 89 | 24.8s | 23.3 | Единственный OpenRouter-кандидат с 13/13; медленный и на верхней границе цены. |
| 2 | `inclusionai/ling-2.6-flash` | 0.03 | 10/13 | 4/4 | 81 | 2.3s | 141.8 | Очень быстрый и дешевый, но не reference. |
| 3 | `qwen/qwen3-coder-next` | 0.80 | 10/13 | 4/4 | 80 | 2.7s | 185.3 | Хороший быстрый coding-кандидат. |
| 4 | `qwen/qwen3-coder-30b-a3b-instruct` | 0.27 | 10/13 | 4/4 | 80 | 3.7s | 106.4 | Хороший cost/value coding-кандидат. |
| 5 | `kwaipilot/kat-coder-pro-v2` | 1.20 | 10/13 | 4/4 | 79 | 2.8s | 99.7 | Быстрый, но дороже Qwen 30B A3B. |
| 6 | `qwen/qwen3-coder-flash` | 0.975 | 10/13 | 4/4 | 79 | 3.7s | 103.0 | Хороший, но дороже `qwen3-coder-next`/30B A3B. |
| 7 | `qwen/qwen3-coder` | 1.80 | 10/13 | 4/4 | 78 | 4.2s | 136.6 | Дороже при том же pass count. |
| 8 | `mistralai/codestral-2508` | 0.90 | 9/13 | 4/4 | 74 | 2.0s | 148.7 | Быстрый, но ниже correctness. |
| 9 | `openai/gpt-oss-20b:free` | 0.00 | 8/13 | 3/4 | 69 | 7.2s | 42.2 | Бесплатный, но compile/correctness не хватает. |
| 10 | `google/gemma-4-31b-it:free` | 0.00 | 8/13 | 3/4 | 68 | 9.5s | 31.2 | Бесплатный, но слабее paid shortlist. |
| 11 | `mistralai/mistral-nemo` | 0.03 | 7/13 | 4/4 | 64 | 4.2s | 42.0 | Дешевый, но низкий pass count. |
| 12 | `meta-llama/llama-3.1-8b-instruct` | 0.03 | 6/13 | 4/4 | 57 | 4.5s | 215.4 | Быстрый, но слабый для точных edge cases. |
| 13 | `openai/gpt-5.1-codex-mini` | 2.00 | 6/13 | 2/4 | 53 | 3.5s | 236.1 | Для этого micro-code теста неудачен. |
| 14 | `qwen/qwen-2.5-coder-32b-instruct` | 1.00 | 0/13 | 2/4 | 20 | 5.2s | 38.3 | Непригоден в этом прогоне. |
| 15 | `qwen/qwen3-coder:free` | 0.00 | 0/13 | 0/4 | 8 | n/a | n/a | Провал/ошибки provider routing. |
| 16 | `cohere/north-mini-code:free` | 0.00 | 0/13 | 0/4 | 8 | n/a | n/a | Провал/ошибки provider routing. |
| 17 | `google/gemma-4-26b-a4b-it:free` | 0.00 | 0/13 | 0/4 | 8 | n/a | n/a | Провал. |
| 18 | `qwen/qwen3-next-80b-a3b-instruct:free` | 0.00 | 0/13 | 0/4 | 8 | n/a | n/a | Провал/rate limits. |
| 19 | `qwen/qwen3-235b-a22b-thinking-2507` | 0.10 | 0/13 | 0/4 | 8 | n/a | n/a | Провал. |
| 20 | `arcee-ai/coder-large` | 0.80 | 0/13 | 0/4 | 7 | n/a | n/a | Провал. |

## 6. Рекомендации

### 6.1. Reference

Использовать `Codex GPT 5.5 high` как Best Line:

- для gold answers;
- для проверки качества coding prompt-а;
- для сравнения дешевых кандидатов после изменений test set;
- для сложных или рискованных coding задач, где latency и цена вторичны.

### 6.2. Hosted shortlist до $2/M output

| Приоритет | Модель | Почему |
| ---: | --- | --- |
| 1 | `mistralai/devstral-2512` | Единственный OpenRouter-кандидат 13/13, но latency 24.8s и output $2/M. |
| 2 | `qwen/qwen3-coder-30b-a3b-instruct` | 10/13, compile 4/4, output $0.27/M, latency 3.7s. Лучший cost/value среди быстрых. |
| 3 | `qwen/qwen3-coder-next` | 10/13, compile 4/4, latency 2.7s, но output $0.80/M. |
| 4 | `inclusionai/ling-2.6-flash` | 10/13, compile 4/4, ultra-cheap $0.03/M, latency 2.3s. Хорош для чернового/низкорискового кода. |
| 5 | `qwen/qwen3-coder-flash` | 10/13, compile 4/4, latency 3.7s, но дороже Qwen 30B A3B. |

### 6.3. Native provider notes

- `Kimi K2.7 Code`: хороший native coding candidate. Прошел 13/13, но latency 35.1s, то есть это скорее качественный native fallback, а не дешевый быстрый worker.
- `GLM 5.2 native max`: не брать как основной raw-code worker для маленьких задач. Он прошел 8/13, но один ответ ушел в некомпилируемый/prose output.
- Отдельно проверить не только модели, а связку `модель + клиент + system prompt + tooling`: GLM сейчас идет через наш собственный `glmNative` client, а Kimi — через родной клиент провайдера. Для raw-code задач это критично: лишние tools/agentic-инструкции могут уводить модель в prose output, а не в чистый runnable code.

Focused A/B на проваленном ранее `route-matcher` подтвердил, что GLM чувствителен к instruction stack:

| Variant | Pass | Compile | Latency | Вывод |
| --- | ---: | ---: | ---: | --- |
| GLM + compact CodeAI prompt + GLM tools | 5/5 | yes | 83.3s | Лучший вариант в коротком тесте: чистый code output без markdown/prose. |
| GLM current tools max | 5/5 | yes | 113.7s | Смыслово прошел, но нарушил raw-output contract: добавил prose и fenced markdown. |
| GLM minimal raw prompt, no tools, thinking off | 3/5 | yes | 12.5s | Быстро, но качество хуже. |
| GLM + compact CodeAI prompt, no tools, thinking off | 2/5 | yes | 16.5s | Хуже всех: отключение tools/thinking не является бесплатным улучшением. |

Полный coding benchmark подтвердил короткий A/B: `GLM 5.2 + compact CodeAI prompt + GLM tools` прошел 13/13 и compile 4/4. Но это не быстрый worker: average latency 60.9s, а raw-output discipline 3/4 (`visible-files` был в fenced markdown). Значит, направление рабочее, но ему нужен дополнительный prompt clamp именно на "no markdown/prose".

Kimi устроен иначе: это ACP/родной runtime, где CodeAI Hub materializes `codeai-managed-agent/system.md`, а не передает system prompt флагом на каждый turn. Scratch A/B с подменой этого файла показал, что compact CodeAI prompt тоже полезен для Kimi: свежий прогон `Kimi + compact CodeAI prompt` дал 13/13, compile 4/4, raw clean 4/4, latency 34.3s. Текущий Kimi managed prompt в том же A/B дал 12/13 из-за ошибки в `merge-user-events`.

### 6.4. Не брать как основной coding worker

- `Claude Opus max` через текущий raw-code provider path: нестабилен, может не закрывать финальный блок. Хорош как reasoning/review модель, но не как cheap coding worker для строгого raw output.
- `openai/gpt-5.1-codex-mini`: в этом micro-code benchmark дал только 6/13 и compile 2/4.
- free coder routes: слишком много 429/timeout/provider instability.

## 7. Практический контракт для следующего coding benchmark

Минимальный порог кандидата:

- compile: 4/4;
- pass: минимум 10/13 для дешевого worker, 13/13 для reference;
- latency: желательно до 5s для cheap worker;
- output price: желательно до $1/M, максимум $2/M;
- повторяемость: минимум 2 живых прогона на shortlist, потому что Claude retry показал сильную вариативность.

Что улучшить в следующем benchmark:

- добавить TypeScript/patch-style case, а не только pure function;
- добавить небольшой refactor case;
- добавить test-writing case;
- добавить case на чтение/изменение existing code fragment;
- отдельно считать raw-output discipline: markdown/prose, incomplete code, extra dependencies.

## 8. Артефакты эксперимента

- OpenRouter coding runner: `doc/tmp/prototypes/openrouter-code-model-ranker.mjs`
- OpenRouter coding report v2: `doc/tmp/prototypes/openrouter-code-model-live-v2.md`
- OpenRouter coding report v1: `doc/tmp/prototypes/openrouter-code-model-live.md`
- CodeAI provider coding runner: `doc/tmp/prototypes/codeai-provider-code-bench.cjs`
- CodeAI provider coding report: `doc/tmp/prototypes/codeai-provider-code-bench.md`
- GLM calibrated coding report: `doc/tmp/prototypes/codeai-provider-code-glm-claude-prompt.md`
- Claude retry report: `doc/tmp/prototypes/codeai-provider-code-bench-claude-retry.md`
- GLM/Kimi native provider report: `doc/tmp/prototypes/codeai-provider-code-glm-kimi.md`
- GLM instruction stack A/B runner/report: `doc/tmp/prototypes/glm-instruction-stack-ab.cjs`, `doc/tmp/prototypes/glm-instruction-stack-ab.md`
- Kimi instruction stack A/B runner/report: `doc/tmp/prototypes/kimi-instruction-stack-ab.cjs`, `doc/tmp/prototypes/kimi-instruction-stack-ab.md`

## 9. Текущий вывод

Для coding tasks:

1. `Codex GPT 5.5 high` остается **Best Line / reference** для этого набора задач.
2. `Kimi K2.7 Code` и `Kimi + compact CodeAI prompt` выглядят сильными native coding candidates, но нуждаются в controlled повторе с зафиксированным profile hash.
3. `GLM 5.2 + compact CodeAI prompt + GLM tools` показал резкий рост correctness, но из-за смешанного instruction/tool/client фактора это пока гипотеза для повторного A/B, а не финальное доказательство.
4. Лучший OpenRouter quality winner: `mistralai/devstral-2512`.
5. Лучший cheap/fast shortlist: `qwen/qwen3-coder-30b-a3b-instruct`, `qwen/qwen3-coder-next`, `inclusionai/ling-2.6-flash`, `qwen/qwen3-coder-flash`.
6. `GLM 5.2 native max` без calibration и `Claude Opus max` не стоит использовать как strict raw-code generators в этом режиме.
7. Следующий честный прогон должен фиксировать: model, provider/client path, exact system prompt path + sha256 + size, tool set hash, thinking/reasoning/temperature, test cases и scoring script.
