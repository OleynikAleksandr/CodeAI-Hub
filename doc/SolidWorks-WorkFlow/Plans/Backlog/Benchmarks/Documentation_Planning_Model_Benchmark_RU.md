# Benchmark моделей для подготовки документации и планирования

Дата фиксации: 2026-06-24.

Статус: Backlog benchmark summary. Это exploratory benchmark, а не финальный SSOT выбора моделей.

Методологическая оговорка: результаты полезны для shortlist, но строгие выводы о влиянии prompt/tool stack требуют отдельного controlled A/B. Для следующего прогона нужно заранее фиксировать exact `system prompt`, `tool set`, client path, reasoning/thinking/temperature и hashes этих артефактов.

## Benchmark Script

Primary runner: [doc/tmp/prototypes/openrouter-docs-planning-model-ranker.mjs](../../../../tmp/prototypes/openrouter-docs-planning-model-ranker.mjs).

Typical run:

```bash
OPENROUTER_API_KEY=... node doc/tmp/prototypes/openrouter-docs-planning-model-ranker.mjs \
  --live \
  --max-output-usd-per-m 2 \
  --limit 25 \
  --case-limit 5 \
  --timeout-ms 60000 \
  --out doc/tmp/prototypes/openrouter-docs-planning-live.md
```

Native provider comparison runner: [doc/tmp/prototypes/codeai-provider-docs-planning-bench.cjs](../../../../tmp/prototypes/codeai-provider-docs-planning-bench.cjs).

## 1. Цель

Найти модели для подготовительной работы вокруг программных продуктов:

- planning-документы;
- спецификации и контракты;
- research protocol для web-поиска;
- architecture/review pack;
- подготовка структуры документа при нехватке вводных.

Это не тот же сценарий, что runtime intent-normalizer. Здесь модель должна не только вернуть короткий intent packet, а подготовить пригодный для сильной модели структурный план работы.

## 2. Best Line

**Best Line / reference:** `Codex GPT 5.5 high`.

Эта модель не является дешевой целевой моделью. Она нужна как эталон качества: дешевые кандидаты сравниваются с ней по смыслу, JSON-дисциплине, умению остановиться при нехватке вводных и способности не выполнять задачу вместо подготовки.

| Модель | Роль | Avg score | Strict JSON | Repaired JSON | Avg latency | Вывод |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `Codex GPT 5.5 high` | **Best Line / reference** | 99.0 | 5/5 | 0/5 | 27.8s | Эталон: почти идеальная структура и строгий JSON. |
| `Claude Opus max` | high-end comparison | 93.2 | 0/5 | 5/5 | 95.2s | Смыслово силен, но как strict JSON worker непригоден без repair/schema-output. |
| `Kimi K2.7 Code` | native provider comparison | 89.0 | 5/5 | 0/5 | 33.8s | Хорошо держит strict JSON, но ошибся на stop/read-only кейсе. |
| `GLM 5.2 native max` | native provider comparison | 87.8 | 5/5 | 0/5 | 82.7s | Strict JSON держит, но часто задает больше 3 вопросов и очень медленный. |

Примечание по Claude: основной прогон дал временный `529 Overloaded` на `architecture-review-pack`; retry этого кейса дал 95/100. Итоговая строка выше использует retry вместо временного server-side сбоя.

Примечание по GLM: прогон выполнен через **native `glmNative`**, не через GLM OpenCode.

## 3. Тестовый набор

Использовались 5 software-product кейсов:

| Case | Проверяет |
| --- | --- |
| `module-planning` | planning-док для будущего intent normalizer: цель, границы, фазы, риски, критерии. |
| `facade-contract` | спецификация фасада `LocalModelManager`: операции, инварианты, ошибки, тесты. |
| `web-research-plan` | research protocol без выдумывания результатов: источники, свежесть, ссылки, сравнение. |
| `missing-product-doc-brief` | остановка при нехватке вводных: формат, аудитория, цель материала. |
| `architecture-review-pack` | read-only architecture review pack без фиксов, релиза и большого рефакторинга. |

Оценка разделяет:

- `avg score` / `strict avg` — смысловое качество с жесткими штрафами за критические ошибки;
- `json` — способность вернуть машинно-парсимый JSON;
- `latency` / `tok/s` — эксплуатационный фильтр, не часть качества;
- `rating` — интегральный ранк скрипта с учетом качества, JSON и скорости.

## 4. OpenRouter: полный strict rescore до $2/M output

Источник: `doc/tmp/prototypes/openrouter-docs-planning-live-strict.md`.

| Rank | Model | Output $/M | JSON | Strict avg | Rating | Avg latency | tok/s | Вывод |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `qwen/qwen3-coder-flash` | 0.975 | 5/5 | 98.8 | 97 | 6.49s | 137.6 | Лучший дешевый hosted-кандидат после strict rescore. |
| 2 | `qwen/qwen3.5-flash-02-23` | 0.26 | 5/5 | 97.0 | 98 | 19.42s | 33.0 | Очень качественный, но медленный. |
| 3 | `openai/gpt-4o-mini-2024-07-18` | 0.60 | 5/5 | 96.8 | 97 | 6.40s | 95.7 | Стабильный бюджетный baseline. |
| 4 | `openai/gpt-4o-mini` | 0.60 | 5/5 | 96.8 | 96 | 6.66s | 110.1 | Почти то же, что dated version. |
| 5 | `qwen/qwen3.6-flash` | 1.125 | 5/5 | 96.6 | 98 | 27.32s | 43.6 | Качественный, но latency высокий. |
| 6 | `mistralai/mistral-small-24b-instruct-2501` | 0.08 | 5/5 | 96.4 | 97 | 5.81s | 99.8 | Лучший cost/value кандидат. |
| 7 | `mistralai/mistral-small-3.2-24b-instruct` | 0.20 | 5/5 | 96.0 | 98 | 17.05s | 67.8 | Хороший, но медленнее `2501`. |
| 8 | `mistralai/voxtral-small-24b-2507` | 0.30 | 5/5 | 95.8 | 98 | 4.17s | 149.8 | Очень быстрый и достаточно точный. |
| 9 | `google/gemini-2.5-flash-lite-preview-09-2025` | 0.40 | 5/5 | 93.0 | 99 | 4.13s | 310.8 | Быстрый, но strict rescore срезал missing-input кейс. |
| 10 | `qwen/qwen3-30b-a3b-thinking-2507` | 0.40 | 5/5 | 90.0 | 98 | 17.45s | 52.6 | Качественный, но склонен ошибаться на стоп-кейсах. |
| 11 | `deepseek/deepseek-v4-flash` | 0.18 | 4/5 | 77.0 | 82 | 23.84s | 80.7 | JSON нестабилен. |
| 12 | `google/gemini-2.5-flash-lite` | 0.40 | 3/5 | 59.8 | 68 | 4.42s | 302.1 | В полном прогоне провалил JSON, хотя focused rerun лучше. |
| 13 | `qwen/qwen-plus-2025-07-28:thinking` | 0.78 | 3/5 | 53.2 | 58 | 44.73s | 15.3 | Слишком медленный и нестабильный. |
| 14 | `inclusionai/ling-2.6-flash` | 0.03 | 4/5 | 49.4 | 61 | 6.55s | 181.9 | Очень дешевый, но слабый для planning/spec tasks. |
| 15 | `qwen/qwen3-235b-a22b-thinking-2507` | 0.10 | 2/5 | 36.0 | 52 | 17.35s | 36.8 | Нестабильный JSON. |
| 16 | `mistralai/mistral-small-2603` | 0.60 | 2/5 | 34.0 | 50 | 9.71s | 141.4 | Нестабильный JSON. |
| 17 | `minimax/minimax-m2` | 1.00 | 2/5 | 34.0 | 49 | 12.47s | 69.1 | Нестабильный JSON. |
| 18 | `mistralai/ministral-14b-2512` | 0.20 | 2/5 | 34.0 | 49 | 23.76s | 66.2 | Нестабильный JSON. |
| 19 | `minimax/minimax-m2.7` | 0.96 | 1/5 | 13.0 | 35 | 12.01s | 80.2 | Непригоден для strict JSON. |
| 20 | `mistralai/ministral-3b-2512` | 0.10 | 0/5 | 0.0 | 22 | 7.69s | 192.8 | Непригоден. |
| 21 | `minimax/minimax-m2.5` | 0.90 | 0/5 | 0.0 | 19 | 8.56s | 143.0 | Непригоден. |
| 22 | `minimax/minimax-m2.1` | 0.95 | 0/5 | 0.0 | 18 | 9.80s | 146.8 | Непригоден. |
| 23 | `mistralai/ministral-8b-2512` | 0.15 | 0/5 | 0.0 | 21 | 12.83s | 93.1 | Непригоден. |
| 24 | `z-ai/glm-4.7-flash` | 0.40 | 0/5 | 0.0 | 14 | 23.00s | 3.2 | Непригоден и медленный. |
| 25 | `minimax/minimax-m3` | 1.20 | 0/5 | 0.0 | 18 | 23.94s | 34.9 | Непригоден. |

## 5. CodeAI native providers

Источник: `doc/tmp/prototypes/codeai-provider-docs-planning-glm-kimi.md`.

| Provider | Strict JSON | Repaired JSON | Avg score | Avg latency | Главный вывод |
| --- | ---: | ---: | ---: | ---: | --- |
| `Kimi K2.7 Code` | 5/5 | 0/5 | 89.0 | 33.8s | Лучший из двух native-провайдеров для planning/docs, но требует донастройки stop-кейсов. |
| `GLM 5.2 native max` | 5/5 | 0/5 | 87.8 | 82.7s | Формат держит, но latency высокий и лимит 3 вопросов нарушается. |

Case-level:

| Provider | `module-planning` | `facade-contract` | `web-research-plan` | `missing-product-doc-brief` | `architecture-review-pack` |
| --- | ---: | ---: | ---: | ---: | ---: |
| `Kimi K2.7 Code` | 100 | 100 | 95 | 85 | 65 |
| `GLM 5.2 native max` | 88 | 88 | 88 | 100 | 75 |

## 6. Focused rerun

Источник: `doc/tmp/prototypes/openrouter-docs-planning-live-focused.md`.

Focused rerun полезен как повторная проверка shortlist. Он показал, что некоторые модели нестабильны между живыми прогонами, поэтому итоговый выбор нельзя делать по одному рангу.

| Rank | Model | Output $/M | JSON | Avg score | Rating | Avg latency | tok/s |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | `google/gemini-2.5-flash-lite` | 0.40 | 5/5 | 98.8 | 98 | 4.82s | 300.2 |
| 2 | `openai/gpt-4o-mini` | 0.60 | 5/5 | 96.8 | 96 | 8.29s | 91.8 |
| 3 | `mistralai/mistral-small-24b-instruct-2501` | 0.08 | 5/5 | 96.6 | 97 | 8.35s | 70.4 |
| 4 | `mistralai/mistral-small-3.2-24b-instruct` | 0.20 | 5/5 | 96.0 | 96 | 18.12s | 56.6 |
| 5 | `mistralai/voxtral-small-24b-2507` | 0.30 | 5/5 | 95.8 | 96 | 3.74s | 160.8 |
| 6 | `qwen/qwen3.6-flash` | 1.125 | 5/5 | 93.6 | 93 | 23.05s | 49.5 |
| 7 | `google/gemini-2.5-flash-lite-preview-09-2025` | 0.40 | 5/5 | 93.0 | 93 | 4.01s | 312.8 |
| 8 | `qwen/qwen3-coder-flash` | 0.975 | 5/5 | 93.0 | 92 | 6.13s | 138.9 |
| 9 | `inclusionai/ling-2.6-flash` | 0.03 | 5/5 | 77.6 | 82 | 7.28s | 174.4 |
| 10 | `qwen/qwen3.5-flash-02-23` | 0.26 | 4/5 | 76.0 | 80 | 21.92s | 33.7 |

## 7. Рекомендации

### 7.1. Reference

Использовать `Codex GPT 5.5 high` как Best Line:

- для ручной проверки качества prompt/schema;
- для gold answers в benchmark set;
- для сравнения дешевых моделей после изменения prompt-а;
- для сложных planning/spec tasks, где latency не критичен.

### 7.2. Hosted shortlist до $2/M output

| Приоритет | Модель | Почему |
| ---: | --- | --- |
| 1 | `mistralai/mistral-small-24b-instruct-2501` | Лучший cost/value: strict avg 96.4, JSON 5/5, output $0.08/M, latency около 6-8s. |
| 2 | `qwen/qwen3-coder-flash` | Лучший strict score среди дешевых hosted: 98.8, JSON 5/5, но дороже и не самый дешевый. |
| 3 | `mistralai/voxtral-small-24b-2507` | Быстрый: 3.7-4.2s, JSON 5/5, quality около 95.8. |
| 4 | `openai/gpt-4o-mini` | Стабильный fallback baseline, score 96.8, output $0.60/M. |
| 5 | `google/gemini-2.5-flash-lite` | Потенциально очень хороший и быстрый, но требует повторного контроля JSON-стабильности: full run 3/5 JSON, focused rerun 5/5. |

### 7.3. Native provider notes

- `Kimi K2.7 Code`: пригоден для дальнейшей настройки как native planning/docs worker, потому что strict JSON 5/5 и первые 3 кейса сильные. Главный дефект: `architecture-review-pack` ошибочно получил `canStart=false`.
- `GLM 5.2 native max`: не брать как быстрый worker. Формат хороший, но average latency 82.7s и частые 5-8 вопросов вместо лимита 3.
- Отдельно проверить не только модели, а связку `модель + клиент + system prompt + tooling`: GLM сейчас идет через наш собственный `glmNative` client, а Kimi — через родной клиент провайдера. Поэтому текущие цифры сравнивают provider path, а не чистую способность моделей. Для честной настройки нужны отдельные прогоны: без tools/raw-output, с минимальным task-specific tooling и с разными системными инструкциями.

### 7.4. Не брать как основной planning worker

- `Claude Opus max`: смыслово хорош, но strict JSON 0/5 и latency около 95s. Подходит как сильный текстовый аналитик, не как машинный worker.
- `inclusionai/ling-2.6-flash`: очень дешевый и быстрый, но planning/spec score низкий. Может быть интересен для более простого intent normalization, но не для сложной подготовки документации.
- `ministral-*`, `minimax-*`, `z-ai/glm-4.7-flash`: провал strict JSON в текущем benchmark.

## 8. Практический контракт для следующего benchmark

Не смешивать качество и скорость:

- сначала сортировать по strict/repaired JSON и semantic score;
- потом среди близких score выбирать меньший latency и цену;
- отдельно считать стоп-кейсы, где правильный ответ — `canStart=false`;
- отдельно штрафовать больше 3 вопросов;
- не засчитывать repaired JSON как strict JSON, но хранить repaired score для понимания смысловой пригодности модели.

Минимальный порог кандидата для production-подготовки документации:

- strict JSON: 5/5;
- semantic score: не ниже 95;
- стоп-кейс `missing-product-doc-brief`: `canStart=false`, 1-3 вопроса;
- latency: желательно до 10s;
- output price: желательно до $1/M, максимум $2/M.

## 9. Артефакты эксперимента

- OpenRouter docs/planning runner: `doc/tmp/prototypes/openrouter-docs-planning-model-ranker.mjs`
- OpenRouter full live report: `doc/tmp/prototypes/openrouter-docs-planning-live.md`
- OpenRouter strict rescore: `doc/tmp/prototypes/openrouter-docs-planning-live-strict.md`
- OpenRouter focused rerun: `doc/tmp/prototypes/openrouter-docs-planning-live-focused.md`
- CodeAI provider runner: `doc/tmp/prototypes/codeai-provider-docs-planning-bench.cjs`
- CodeAI provider report: `doc/tmp/prototypes/codeai-provider-docs-planning-bench.md`
- Claude retry report: `doc/tmp/prototypes/codeai-provider-docs-planning-claude-architecture-retry.md`
- GLM/Kimi native provider report: `doc/tmp/prototypes/codeai-provider-docs-planning-glm-kimi.md`

## 10. Текущий вывод

Для документации, planning и спецификаций:

1. `Codex GPT 5.5 high` — **Best Line / reference**.
2. Лучший дешевый рабочий shortlist: `mistralai/mistral-small-24b-instruct-2501`, `qwen/qwen3-coder-flash`, `mistralai/voxtral-small-24b-2507`, `openai/gpt-4o-mini`.
3. Из native-провайдеров интереснее `Kimi K2.7 Code`: strict JSON 5/5, но требуется доработка prompt-а на stop/read-only кейсы.
4. `GLM 5.2 native max` держит JSON, но слишком медленный и нарушает лимит уточняющих вопросов.
5. `google/gemini-2.5-flash-lite` стоит проверить еще раз отдельным стабильностным прогоном, потому что focused run отличный, но full run имел JSON-провалы.
6. `Claude Opus max` не годится как строгий JSON worker в текущем generic provider mode, несмотря на хороший смысловой результат.
7. Для GLM и Kimi нужен отдельный calibration track по системным инструкциям и набору tools: Kimi уже показывает сильный результат в родном клиенте, а GLM может быть недооценен из-за нашего собственного клиента и текущего tool/system режима.
8. Любые будущие рекомендации по system prompt должны опираться на frozen prompt/tool hashes, а не на названия вроде "Claude prompt" / "Codex prompt".
