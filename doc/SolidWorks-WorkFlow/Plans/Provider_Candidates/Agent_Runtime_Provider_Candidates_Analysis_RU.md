# Provider Candidates: agent runtime and subscription analysis

**Status:** Draft planning analysis  
**Created:** 2026-05-18  
**Scope:** кандидаты на подключение новых coding providers в CodeAI Hub после Claude/Codex/Gemini baseline.  
**Decision level:** анализ возможностей и рисков; не является implementation plan.

## 1. Цель анализа

CodeAI Hub уже построен вокруг managed one-turn orchestration:

- Core формирует полный task prompt и системный contract;
- provider выполняет terminal turn;
- Core валидирует результат, принимает/отклоняет/ремонтирует или возвращает управление пользователю;
- resume/summary/session binding остаются под контролем Core.

Нужны провайдеры, которые могут помогать GPT-5.5 в coding workflow без зависимости от Claude subscription policy. Приоритет не только в качестве модели, но и в наличии controllable runtime surface: CLI, SDK, session/resume, low-level protocol, tools, system prompt/profile configuration.

## 2. Классификация кандидатов

| Кандидат | Runtime класс | Интеграционный вывод |
|---|---|---|
| Kimi K2.6 / Kimi Code | Native agent runtime provider | Кандидат #1: CLI + Agent SDK + `kimi --wire` дают ближайший аналог Claude/Codex module architecture. |
| Qwen Code / Qwen3.6 | Native/open agent runtime provider | Кандидат #2 по архитектуре: open-source terminal agent, SDKs, local HTTP daemon + SSE, tools/skills/subagents. |
| GLM-5.1 / Z.AI | Model platform + coding subscription | Сильная модель и coding plan, но runtime лучше строить через Core-owned loop или через поддерживаемые external tools. |
| DeepSeek V4 Pro/Flash | Model backend provider | Очень полезен как дешевый high-context API backend, но официального Claude/Codex/Kimi-like runtime не найдено. |
| MiniMax M2.7 | Model backend + coding-tool integrations | Есть subscription Token Plan и интеграции с coding tools; собственного управляемого runtime уровня Kimi/Qwen не видно. |

## 3. Kimi K2.6 / Kimi Code

### Доступные интеграционные поверхности

- `kimi-cli` с interactive/print/wire режимами.
- `@moonshot-ai/kimi-agent-sdk`, который оборачивает `kimi --wire`.
- `kimi --wire`: JSON-RPC-like low-level protocol поверх stdin/stdout.
- Session/resume через CLI/SDK session id.
- Agent file для system prompt, tool allow/exclude, subagents.
- Skills, built-in tools, MCP config, workdir/add-dir, yolo/approval behavior, thinking/no-thinking flags.
- Kimi API совместим с OpenAI API; Kimi Code FAQ также разделяет Kimi Code subscription endpoints и pay-as-you-go platform endpoints.

### Подписка или токены

**Да, есть subscription-style вариант для Kimi Code.**  
Kimi Code FAQ указывает разные base URL и billing model:

- Kimi Code OpenAI-compatible: `https://api.kimi.com/coding/v1`
- Kimi Code Anthropic-compatible: `https://api.kimi.com/coding/`
- billing: Kimi membership subscription with quota
- Kimi Platform: `https://api.moonshot.cn/v1`, pay-as-you-go

Источник: [Kimi Code FAQ](https://www.kimi.com/code/docs/en/kimi-code/faq.html), [Kimi API Platform](https://platform.kimi.ai/).

### Как строить модуль

Рекомендуемый первый transport: `@moonshot-ai/kimi-agent-sdk`.

Provider adapter должен:

- создавать provider-home через `shareDir` / `KIMI_SHARE_DIR`;
- материализовать CodeAI-owned `agentFile`;
- управлять `workDir`, `sessionId`, `model`, `thinking`, `yoloMode`, `skillsDir`;
- сохранять сырые Wire/SDK события как diagnostic SSOT;
- держать escape hatch на прямой `kimi --wire`, если SDK отстанет от Wire protocol.

### Роль в CodeAI Hub

Primary Claude replacement candidate для managed coding turns.

## 4. Qwen Code / Qwen3.6

### Доступные интеграционные поверхности

Qwen имеет две разные поверхности:

1. **Qwen Code**: open-source terminal coding agent.
   - CLI: `qwen`.
   - npm package: `@qwen-code/qwen-code`.
   - Конфигурация через `~/.qwen/settings.json` и project `.qwen/settings.json`.
   - Multi-provider support: OpenAI-compatible, Anthropic, Gemini, Vertex AI, Alibaba Cloud Coding Plan, OpenRouter, Fireworks, BYOK.
   - Skills, SubAgents, built-in tools.
   - Local HTTP daemon + SSE для shared agent session между IDE, CI, web UI и custom clients.
   - SDKs: TypeScript, Python, Java.

2. **Qwen-Agent**: Python framework.
   - Function calling, MCP, Code Interpreter, RAG, browser-oriented examples.
   - Больше подходит для собственного harness, чем для drop-in provider module.

Источники: [Qwen Code GitHub](https://github.com/QwenLM/qwen-code), [Qwen-Agent GitHub](https://github.com/QwenLM/Qwen-Agent).

### Подписка или токены

**Да, через Alibaba Cloud Model Studio Coding Plan.**  
Официальная документация Alibaba Cloud описывает Coding Plan как monthly subscription for AI coding tools, fixed predictable pricing. Актуальная заметка на 2026-03-30:

- Lite больше не принимает новые subscriptions с 2026-03-20;
- Pro: $50/month;
- quota: 6,000 requests / 5 hours, 45,000 / week, 90,000 / month;
- отдельные Coding Plan API key и base URLs:
  - OpenAI-compatible: `https://coding-intl.dashscope.aliyuncs.com/v1`
  - Anthropic-compatible: `https://coding-intl.dashscope.aliyuncs.com/apps/anthropic`
- Usage ограничен coding tools; не для custom application backends или batch scripts.

Источник: [Alibaba Cloud Model Studio Coding Plan](https://www.alibabacloud.com/help/en/model-studio/coding-plan), [Qwen Code GitHub](https://github.com/QwenLM/qwen-code).

### Как строить модуль

Два варианта:

1. **Qwen Code runtime adapter**:
   - использовать `qwen` CLI/SDK;
   - исследовать one-shot режим, session/resume, daemon API, terminal completion semantics;
   - provider-home: `~/.codeai-hub/providers/qwen/home`;
   - project-local `.qwen/settings.json` генерировать из Core settings;
   - Core task prompt остается one-turn contract поверх Qwen Code runtime.

2. **OpenAI/Anthropic-compatible backend adapter**:
   - использовать Alibaba Coding Plan endpoint напрямую;
   - Core сам реализует tool loop, summary/resume, approval, final answer detection.

### Роль в CodeAI Hub

Второй кандидат после Kimi именно по architecture fit. Возможен отдельный research spike: Qwen Code как Codex app-server-like provider через daemon + SSE.

## 5. GLM-5.1 / Z.AI

### Доступные интеграционные поверхности

- Z.AI Chat Completions API.
- Official Python SDK, Java SDK, OpenAI Python SDK examples.
- Thinking mode, streaming, function calling, structured output, context caching.
- GLM Coding Plan для supported coding tools.
- Отдельный coding endpoint в devpack docs: `https://api.z.ai/api/coding/paas/v4`.
- Интеграции с Claude Code, Cline, OpenCode, OpenClaw, Roo Code, Kilo Code, Goose, Crush.

Источники: [GLM-5.1 docs](https://docs.z.ai/guides/llm/glm-5.1), [Z.AI GLM Coding Plan overview](https://docs.z.ai/devpack/overview), [Z.AI Coding Plan quick start](https://docs.z.ai/devpack/quick-start).

### Подписка или токены

**Да, есть GLM Coding Plan subscription.**  
Официальная Z.AI документация говорит:

- GLM Coding Plan is a subscription package designed specifically for AI-powered coding;
- limited to officially supported tools/products;
- starting at 18 USD/month;
- supported models include GLM-5.1, GLM-5-Turbo, GLM-4.7, GLM-4.5-Air;
- limits are plan-tier based with 5-hour and weekly windows;
- unsupported SDK/custom integrations can restrict subscription benefits.

Отдельно существует обычный token-priced Z.AI API: GLM-5.1 listed at $1.4 input / $4.4 output per 1M tokens.

Sources: [Z.AI GLM Coding Plan overview](https://docs.z.ai/devpack/overview), [Z.AI Usage Policy](https://docs.z.ai/devpack/usage-policy), [Z.AI pricing](https://docs.z.ai/guides/overview/pricing).

### Как строить модуль

GLM лучше рассматривать как model-backend provider:

- Core-owned OpenAI-compatible tool loop;
- Core-owned summary/resume;
- Core-owned shell/file tools;
- optional Anthropic-compatible surface for tools that expect Claude-style API;
- strict separation between Coding Plan allowed tool use and CodeAI custom backend use.

### Роль в CodeAI Hub

Сильный coding worker для сложных implementation turns. Но из-за policy ограничения Coding Plan нельзя считать безопасным transport для нашего собственного SDK-based backend без отдельной проверки supported-tools статуса.

## 6. DeepSeek V4 Pro / Flash

### Доступные интеграционные поверхности

- OpenAI-compatible API: `https://api.deepseek.com`.
- Anthropic-compatible API: `https://api.deepseek.com/anthropic`.
- Models: `deepseek-v4-flash`, `deepseek-v4-pro`.
- Thinking/non-thinking modes.
- Tool calls, JSON output, context caching, FIM beta in non-thinking mode.
- 1M context, max output up to 384K.
- Official docs mention integration with popular coding tools.

Источники: [DeepSeek API quick start](https://api-docs.deepseek.com/), [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing/), [DeepSeek tool calls](https://api-docs.deepseek.com/guides/tool_calls).

### Подписка или токены

**Официальный subscription-style coding plan не найден.**  
Официальная DeepSeek pricing page говорит о per-token billing:

- Flash: $0.14 input cache miss / $0.28 output per 1M tokens;
- Pro promo до 2026-05-31 15:59 UTC: $0.435 input cache miss / $0.87 output per 1M tokens;
- после promo listed price: $1.74 input cache miss / $3.48 output;
- cost списывается из topped-up/granted balance.

Можно использовать DeepSeek через сторонние продукты или coding tools, но как официальный провайдерский subscription route для CodeAI Hub это пока не подтверждено.

Source: [DeepSeek Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/).

### Как строить модуль

DeepSeek стоит строить как backend provider:

- общий OpenAI/Anthropic-compatible adapter;
- Core-owned tools and approval loop;
- использовать 1M context для large-codebase analysis, repair, broad refactor context;
- отдельно учитывать требование сохранять `reasoning_content` в conversation history при thinking + tools.

### Роль в CodeAI Hub

Дешевый high-context worker. Отличен для анализа, предварительных repair attempts и больших prompts. Не первый кандидат на native managed provider runtime.

## 7. MiniMax M2.7

### Доступные интеграционные поверхности

- OpenAI-compatible API.
- Anthropic-compatible API recommended in several coding tool guides.
- M2.7 guide for coding tools covers Claude Code, OpenClaw, Hermes Agent, Cursor, TRAE, OpenCode, Kilo Code, Cline, Roo Code, Codex CLI, etc.
- Token Plan key is separate from pay-as-you-go API key.

Источники: [MiniMax M2.7 for AI Coding Tools](https://platform.minimax.io/docs/guides/text-ai-coding-tools), [MiniMax Token Plan](https://platform.minimax.io/docs/token-plan/intro).

### Подписка или токены

**Да, есть Token Plan subscription.**  
Официальная MiniMax документация:

- Token Plan extends former Coding Plan;
- one subscription covers text and other modality quotas;
- M2.7 / M2.7-highspeed measured by requests with 5-hour rolling reset;
- Starter/Plus/Max and highspeed tiers have different M2.7 request quotas;
- Token Plan Key is not interchangeable with pay-as-you-go API keys;
- after quota limit, user can use Credits, upgrade, switch to pay-as-you-go, or wait for reset.

Source: [MiniMax Token Plan](https://platform.minimax.io/docs/token-plan/intro).

### Как строить модуль

MiniMax should be backend-first:

- common OpenAI/Anthropic-compatible adapter;
- Core-owned tool loop;
- careful model-profile tuning because MiniMax docs themselves recommend some tools over others and mark Codex CLI path as not recommended.

### Роль в CodeAI Hub

Useful lower-cost coding worker, but lower priority than Kimi, Qwen, GLM, and DeepSeek for this project.

## 8. Recommended provider roadmap

1. **Kimi provider module**
   - Native SDK first.
   - Preserve direct `kimi --wire` escape hatch.
   - Treat as primary Claude replacement.

2. **Qwen Code research spike**
   - Verify CLI one-shot/session semantics.
   - Verify daemon + SSE contract.
   - Decide whether Qwen Code is runtime provider or Qwen models go through shared backend adapter.

3. **Shared OpenAI/Anthropic-compatible backend layer**
   - One provider-neutral adapter family for GLM, DeepSeek, MiniMax, and possibly direct Qwen/Kimi API modes.
   - Core owns tool loop, summary/resume, approvals, system prompt, final answer detection.

4. **GLM Coding Plan policy check**
   - Before treating GLM Coding Plan as a CodeAI Hub subscription transport, confirm whether CodeAI Hub itself can be an officially supported tool/product.
   - If not, use Z.AI pay-as-you-go API or run GLM through a supported external coding tool only.

5. **DeepSeek backend**
   - Add after shared backend layer.
   - Position as high-context cheap worker, not native agent runtime.

## 9. Subscription verdict

| Provider/model family | Official subscription-style coding access? | Notes |
|---|---|---|
| Kimi Code / Kimi K2.x | Yes | Kimi membership subscription with quota via `api.kimi.com/coding`; Kimi Platform remains pay-as-you-go. |
| Qwen / Alibaba Coding Plan | Yes | Pro plan available as of 2026-03-30; Lite closed to new subscriptions. Strictly for coding tools, not arbitrary backends. |
| GLM / Z.AI Coding Plan | Yes | Subscription exists, but officially limited to supported tools/products; custom SDK/backend use may restrict benefits. |
| DeepSeek V4 | No official coding subscription found | Official path is token/PAYG with balance deduction. |
| MiniMax M2.7 | Yes | Token Plan subscription with request quotas; separate from pay-as-you-go API key. |

## 10. Immediate conclusion

Kimi remains candidate #1 because it combines strong coding benchmarks with a controllable native agent runtime.

Qwen Code is the only other candidate in this set with a comparable native terminal-agent architecture. It deserves the second architecture investigation slot before GLM/DeepSeek, even if GLM and DeepSeek may be stronger or cheaper as raw model backends for specific tasks.

GLM, DeepSeek, and MiniMax should be grouped under a future shared model-backend provider layer unless their providers expose a stable native runtime protocol comparable to `kimi --wire` or Codex app-server.
