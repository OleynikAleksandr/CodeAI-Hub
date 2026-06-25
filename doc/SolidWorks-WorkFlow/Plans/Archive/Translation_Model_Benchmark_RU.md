# Benchmark моделей для перевода reasoning EN -> RU

Дата фиксации: 2026-06-25.

Статус: Backlog benchmark protocol. Это не результат прогона и не финальный SSOT выбора моделей.

Назначение: выбрать быстрые и качественные модели для модуля локализации, прежде всего для live-перевода видимых provider `Thinking` / `Reasoning` блоков с английского на русский.

## Benchmark Script

Primary runner: `scripts/benchmarks/translation-model-benchmark-runner.mjs`.

Dry run / shape check:

```bash
node scripts/benchmarks/translation-model-benchmark-runner.mjs \
  --case-limit 2
```

Typical live run:

```bash
OPENROUTER_API_KEY=... node scripts/benchmarks/translation-model-benchmark-runner.mjs \
  --live \
  --iterations 3 \
  --timeout-ms 30000 \
  --out doc/tmp/prototypes/translation-model-benchmark-live.md
```

By default the script uses the candidate list in §9. Custom ad-hoc candidates can still be passed with `--openrouter-model <slug>` and `--local-model lmstudio:<modelKey>`; an OpenRouter provider route can be forced with `--openrouter-model <slug>@groq` or `--openrouter-model <slug>@parasail`. Local Models defaults use LM Studio `modelKey` values from `lms ls --json`; the runner also accepts the original display/path names from §9 as aliases.

The script writes a Markdown report plus raw JSON payload to the output file. Its automated score covers protected terms, structure, and output discipline only; semantic fidelity and Russian style stay manual review fields. OpenRouter routed candidates use `provider.order` with `allow_fallbacks: false`; this follows the official OpenRouter provider routing contract.

## 1. Цель

Проверить две provider-линии:

- OpenRouter hosted models: exact model slugs and endpoint routes are listed in §9.
- Local Models через LM Studio: exact `lmstudio:<modelKey>` candidates are listed in §9.

Главный сценарий — plain text in, plain text out. Модель получает английский reasoning-фрагмент и возвращает только русский перевод. JSON, tool calls, file writes, schema output и repair parsing в этом benchmark не нужны.

## 2. Prompt Stack

System prompt фиксируется из:

`doc/SolidWorks-WorkFlow/Plans/Backlog/Benchmarks/Instruction_Stack_Control_Experiment_Results/claude-instruction-analysis/Claude_My_System_Prompt.md`

Runner обязан сохранить hash этого файла в отчете. Инструменты отключены.

User task prompt добавляется поверх system prompt:

```text
Your current task is translation only.

Translate the supplied English visible reasoning text to Russian.
Return only the translated text. Do not add explanations, summaries, notes, quotes, labels, or Markdown fences unless they already exist in the source text.

Preserve every protected English term exactly as written. Do not translate, transliterate, inflect, pluralize, or quote protected terms.
Translate only surrounding natural-language explanations.

Protected terms:
<TERMS>

Text to translate:
<TEXT>
```

Для Qwen-family Local Models runner может prefix-ить user prompt строкой `/no_think`, как текущий LM Studio translation path, чтобы не платить за рассуждения внутри переводчика.

## 3. Protected Terms Seed

Этот список нужен не как окончательный glossary, а как benchmark seed. Перед прогоном его можно расширить фактическим glossary из продукта.

| Group | Terms |
| --- | --- |
| Product | `CodeAI Hub`, `Project Manager`, `Session UI`, `Workflow Tree`, `Documentation Tree`, `Development Tree`, `Local Models`, `LM Studio`, `OpenRouter` |
| Core/runtime | `Core`, `Core Orchestrator`, `runtime`, `workspace`, `workflow`, `snapshot`, `sidecar`, `overlay`, `provider`, `adapter`, `facade`, `handoff`, `rollover`, `fallback`, `fail-closed`, `warmup`, `preload`, `stale binding` |
| Provider/model | `Claude`, `Codex`, `Kimi`, `GLM`, `Gemini`, `OpenAI`, `Anthropic`, `Qwen`, `Mistral`, `Gemma`, `thinking`, `reasoning`, `streaming` |
| Dev/runtime tokens | `shell`, `prompt`, `system prompt`, `tool`, `tool call`, `JSON`, `Markdown`, `Git`, `commit`, `branch`, `hook`, `Husky`, `npm`, `build`, `typecheck`, `lint`, `package.json`, `AGENTS.md`, `API`, `WebSocket`, `CEF`, `VS Code` |
| Events/fields | `turn_completed`, `token_usage`, `usage_limits`, `providerSessionId`, `reasoningEngineId`, `uiEngineId`, `messageId`, `sourceHash`, `localizedContent` |

Banned examples for this benchmark:

| Source term | Bad translation |
| --- | --- |
| `Project Manager` | `Менеджер проекта` |
| `shell` | `оболочка` |
| `Core` | `ядро` |
| `provider` | `поставщик` |
| `runtime` | `среда выполнения` |
| `workspace` | `рабочее пространство` |
| `workflow` | `рабочий процесс` |
| `fallback` | `резервный вариант` |
| `commit` | `фиксация` |
| `hook` | `крючок` |

## 4. Test Set

Каждый case отправляется как обычный текст. Output сравнивается с source по сохранению структуры и protected terms, а качество русского проверяется вручную.

| Case | Проверяет |
| --- | --- |
| `term-preservation-basic` | `Project Manager`, `Core`, `workflow`, `shell` не переводятся, пояснения переводятся. |
| `runtime-event-order` | causal logic, event names, `token_usage`, `turn_completed`, `fallback` preservation. |
| `cli-paths-and-files` | CLI commands, paths, filenames, backticks and Markdown survive unchanged. |
| `lmstudio-warmup-latency` | смысл warmup vs task latency не искажается. |
| `fail-closed-vs-fallback` | модель не путает fail-closed и fallback semantics. |
| `markdown-list-reasoning` | bullets, indentation, inline code and product terms. |
| `long-reasoning-block` | multi-paragraph reasoning, style, no omissions. |
| `short-stream-fragment` | короткий live-fragment переводится без дописывания контекста. |

### Case Sources

#### term-preservation-basic

```text
The Project Manager is only a projection. It can show a shell-like command surface, but Core owns the workflow state and the next user gate.
```

#### runtime-event-order

```text
If turn_completed arrives before token_usage, Core keeps rollover arbitration pending until the trailing usage snapshot or an explicit unavailable signal arrives. A silent fallback here would unlock the session too early.
```

#### cli-paths-and-files

```text
Run `npm run plan:status`, then inspect `doc/TODO/todo-plan.md`. Do not call `git reset --hard` unless the user explicitly approved it.
```

#### lmstudio-warmup-latency

```text
If LM Studio already has `codeaihub-qwen3-translation` loaded with enough context, reuse that runtime. Do not include model warmup, preload, or `lms load` time in task latency.
```

#### fail-closed-vs-fallback

```text
Fallback is acceptable for non-blocking UI rendering, but fail-closed is required when the user explicitly selected an unavailable reasoningEngineId. The engine must not silently switch to google-gtx.
```

#### markdown-list-reasoning

```text
The safe path is:
- keep provider output source-first;
- store translated text as an overlay keyed by messageId and sourceHash;
- render localizedContent when it exists;
- leave the native transcript untouched.
```

#### long-reasoning-block

```text
The bug is not in the Project Manager button. The button only submits a raw review action, while Core decides whether that action belongs to the active gate.

If the provider turn is still settling, accepting the visible card too early can race against managed commit cleanup. The correct fix is to keep the input locked until Core has persisted messages, classified residue, and opened the next gate.
```

#### short-stream-fragment

```text
Waiting for providerSessionId rebind before sending the next user message.
```

## 5. Scoring

Quality score is 100 points:

| Metric | Points | How to score |
| --- | ---: | --- |
| Protected terms | 30 | Exact protected terms preserved; banned translations absent. Automated check can cover most of this. |
| Meaning | 30 | Ownership, causality, negation, timing and safety constraints preserved. Manual review required. |
| Russian style | 20 | Natural technical Russian without machine-translation awkwardness. Manual review required. |
| Structure | 10 | Paragraphs, bullets, inline code, paths and Markdown shape preserved. |
| Output discipline | 10 | Only translated text; no explanations, labels, source echo, apologies, or extra wrappers. |

Hard fail:

- any protected product term is translated in a way that changes the canonical token;
- code/path/CLI token is changed;
- output includes commentary instead of only translated text;
- a sentence with safety/ownership meaning is omitted or reversed;
- the model answers the task instead of translating it.

Speed is reported separately, not folded into quality:

| Metric | Why |
| --- | --- |
| `first_token_latency_ms` | Useful for future live streaming UX, but not the main acceptance metric. |
| `full_latency_ms` | Main reasoning overlay metric: the UI patch arrives after the translation finishes. |
| `tokens_per_second` | Helps compare hosted and local throughput. |
| `warmup_ms` | Local Models only; recorded but excluded from task latency. |
| `p50` / `p95` | Use across all cases and repetitions. |

Recommended live reasoning thresholds:

- good: p50 full latency <= 2500 ms and p95 <= 8000 ms;
- acceptable: p50 <= 5000 ms and p95 <= 12000 ms;
- reject for live reasoning: p50 > 8000 ms or repeated timeouts, even if quality is high.

Minimum production candidate:

- no hard-fail cases;
- quality avg >= 90;
- protected terms score >= 28/30;
- p50 full latency <= 5000 ms after Local Models warmup is excluded.

## 6. Runner Contract

No tools are exposed to the model. Each request is one chat completion:

- system: fixed Claude system prompt from §2;
- user: translation-only task prompt from §2 with `<TERMS>` and `<TEXT>`;
- temperature: `0.3`;
- top_p: `0.8`;
- OpenRouter reasoning controls: send `reasoning: { enabled: false, exclude: true }` and `reasoning_effort: "none"` where the endpoint allows it. If the endpoint requires reasoning, as observed for `openai/gpt-oss-*`, omit those disable flags and rely on the translation-only prompt.
- Local Models reasoning controls: Qwen-family model keys receive `/no_think` before the translation prompt; other local models rely on the translation-only prompt unless LM Studio exposes a model-specific non-thinking switch.
- streaming: enabled when provider supports it;
- max output tokens: enough for full translation, default `2048`;
- source language: English;
- target language: Russian.

The runner should execute each case 3 times per model. The first non-measured provider/model health check is allowed, but it must not use any benchmark case text.

Report table:

| Provider | Model | Cases | Hard fails | Quality avg | Protected avg | p50 latency | p95 latency | tok/s | Warmup | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| OpenRouter | `TODO_OPENROUTER_MODEL` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | n/a | TBD |
| Local Models | `lmstudio:TODO_MODEL_KEY` | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## 7. Local Models Warmup

Local Models benchmark must measure translation latency, not model load latency.

Required sequence:

1. Confirm LM Studio server is reachable.
2. Resolve the model key from the exact `lmstudio:<modelKey>` candidate or a documented alias.
3. Run `lms ps --json`.
4. If a matching loaded model has enough context, reuse it.
5. Otherwise run `lms load <modelKey> --identifier codeaihub-translation-bench-<slug> --context-length 8192 --yes`.
6. Wait until `/v1/models` exposes the selected identifier.
7. Send one excluded health-check request: `Translate "Ready." to Russian.`
8. Start measured benchmark requests only after the health check succeeds.

`warmup_ms` includes steps 1-7 and is reported separately. It does not count toward `full_latency_ms`, `p50`, or `p95`.

Do not unload the selected model between cases. Do not unload user-loaded LM Studio workers. If the candidate cannot be loaded, record `load_failed` and skip measured translation for that model.

## 8. OpenRouter Notes

OpenRouter candidates are compared through direct Chat Completions-compatible calls, not through CodeAI Hub workflow tools.

Record:

- exact model slug;
- endpoint/provider route if OpenRouter exposes multiple routes;
- prompt hash;
- temperature/top_p;
- timeout;
- whether streaming was available;
- request/output token counts when returned by the API.

## 9. Current Candidate Slots

| Provider | Candidate |
| --- | --- |
| OpenRouter | `openai/gpt-oss-120b:free` |
| OpenRouter | `nvidia/nemotron-3-super-120b-a12b:free` |
| OpenRouter | `meta-llama/llama-3.1-8b-instruct@groq` |
| OpenRouter | `google/gemma-4-26b-a4b-it@parasail` |
| OpenRouter | `google/gemini-2.5-flash-lite-preview-09-2025` |
| OpenRouter | `openai/gpt-oss-20b@groq` |
| Local Models | `lmstudio:llama-3.3-8b-instruct-128k_abliterated-mlx` |
| Local Models | `lmstudio:meta-llama-3-8b-instruct` |
| Local Models | `lmstudio:google/gemma-3-12b` |
| Local Models | `lmstudio:hy-mt2-30b-a3b-oq2-mlx` |
| Local Models | `lmstudio:hy-mt2-1.8b` |
| Local Models | `lmstudio:qwen/qwen3.5-9b` |

Runner aliases accepted for the user-facing names originally selected for this run:

| Requested name | LM Studio `modelKey` |
| --- | --- |
| `Llama-3.3-8B-Instruct-128K_Abliterated-mlx-4Bit` | `llama-3.3-8b-instruct-128k_abliterated-mlx` |
| `Meta-Llama-3-8B-Instruct-4bit` | `meta-llama-3-8b-instruct` |
| `gemma-3-12b` | `google/gemma-3-12b` |
| `Hy-MT2-30B-A3B-oQ2-MLX` | `hy-mt2-30b-a3b-oq2-mlx` |
| `Hy-MT2-1.8B-4bit` | `hy-mt2-1.8b` |
| `qwen3.5-9b` | `qwen/qwen3.5-9b` |

## 10. Expected Output Shape

Good translation example for `term-preservation-basic`:

```text
Project Manager — это только projection. Он может показывать shell-like командную поверхность, но Core владеет workflow state и следующим user gate.
```

This example is intentionally not the only accepted wording. The important properties are:

- `Project Manager`, `shell`, `Core`, `workflow state`, `user gate` remain protected;
- Russian prose is readable;
- no explanation is added;
- the ownership meaning is preserved.

## 11. Practical Conclusion Before First Run

This benchmark should answer three questions:

1. Which OpenRouter model preserves CodeAI Hub terminology while producing readable Russian fast enough for live reasoning overlays?
2. Which LM Studio local model is fast enough after warmup is excluded?
3. Does the custom prompt remove the recurring failure mode where models translate terms such as `Project Manager`, `shell`, `runtime`, `workflow`, and `fallback` into Russian product-breaking words?
