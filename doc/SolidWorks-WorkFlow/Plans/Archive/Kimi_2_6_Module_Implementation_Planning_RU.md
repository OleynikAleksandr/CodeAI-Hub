# Модуль провайдера Kimi 2.6 — план реализации

**Статус:** черновой плановый источник  
**Создан:** 2026-05-18  
**Область:** план реализации нового модуля провайдера для Kimi Code / Kimi K2.6 в CodeAI Hub.  
**Уровень решения:** архитектура реализации и нарезка scope выполнения; это ещё не выполненный код.

## 1. Цель

Добавить Kimi как четвертого coding-провайдера после Claude, Codex и Gemini так, чтобы Core сохранил текущий управляемый контракт одного turn:

- Core формирует полный workflow/task prompt и provider-neutral applied turn config.
- Kimi выполняет один terminal turn поверх собственного agent runtime.
- Core получает нормализованные provider events: `turn_started`, assistant/thinking/progress messages, tool/approval diagnostics, usage snapshots где доступны, `turn_completed | turn_failed`.
- Session/resume, provider binding, stale-binding recovery, Stop/Continue и diagnostic artifacts остаются под контролем Core, а не UI.

Первый продуктовый target — путь Kimi Code subscription/runtime, а не generic backend adapter для Kimi Platform.

## 2. Актуальная внешняя база

Официальные Kimi документы на 2026-05-18 фиксируют два разных access path:

| Путь | Назначение | Интеграционный вывод |
|---|---|---|
| Kimi Code | Терминальные/IDE coding agents, Kimi membership subscription, общий quota. | Основной путь для модуля провайдера CodeAI Hub. |
| Kimi Platform | Product/API integration, pay-as-you-go, OpenAI-compatible API. | Будущий backend-provider path, не первый native runtime module. |

Документация Kimi Code указывает:

- CLI умеет читать/редактировать код, запускать команды и работать как terminal agent.
- `KIMI_SHARE_DIR` меняет runtime data root; default — `~/.kimi`.
- Session data включает `context.jsonl`, `wire.jsonl`, `state.json`; session restore использует `--continue` / `--session` / `--resume`.
- Wire protocol поддерживает `prompt`, `replay`, `steer`, `set_plan_mode`, `cancel`, agent-to-client `event` и `request`.
- Kimi Code API для third-party tools использует stable model id `kimi-for-coding`; backend сам обновляет mapping на новый model display name.
- Kimi Platform model id `kimi-k2.6` существует отдельно и поддерживает 256K context, thinking/non-thinking modes и multimodal input.

Источники:

- [Kimi Code Overview](https://www.kimi.com/code/docs/en/)
- [Kimi Code CLI Quick Start](https://www.kimi.com/code/docs/en/kimi-code-cli/getting-started.html)
- [Kimi Code Wire Protocol](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/wire-protocol.html)
- [Kimi Code Environment Variables](https://www.kimi.com/code/docs/en/kimi-code-cli/configuration/environment-variables.html)
- [Kimi Code Data Locations](https://www.kimi.com/code/docs/en/kimi-code-cli/configuration/data-locations.html)
- [Kimi K2.6 API Platform Quickstart](https://platform.kimi.ai/docs/guide/kimi-k2-6-quickstart)

## 3. Граница продукта

### Идентификатор провайдера

Рекомендуемый идентификатор провайдера: `kimiCode`.

Причины:

- Он отделяет Kimi Code subscription/runtime от возможного будущего `kimiPlatform` pay-as-you-go backend.
- Он оставляет пользовательское имя провайдера простым: `Kimi`.
- Он не обещает, что provider всегда сможет выбрать конкретный model slug `kimi-k2.6`; официальный контракт Kimi Code для third-party coding tools указывает использовать `kimi-for-coding`.

### Package и release artifact

Рекомендуемый package: `packages/Kimi_Module/`.

Рекомендуемый release artifact: `kimi-module-<version>.tar.bz2`.

Рекомендуемый provider slot:

```text
~/.codeai-hub/providers/kimi/
├── latest/                 # установленный CodeAI adapter bundle
├── cli/                    # установленный или найденный Kimi Code CLI, если позже будем bundle-ить CLI
└── home/                   # KIMI_SHARE_DIR runtime data root
```

`KIMI_SHARE_DIR` должен указывать на `~/.codeai-hub/providers/kimi/home`, а не на реальный пользовательский `~/.kimi`.

## 4. Транспортное решение

Первый target реализации: прямой bridge `kimi --wire`, принадлежащий CodeAI Hub.

Причины:

- Wire — самый низкоуровневый официальный local runtime protocol и даёт replay, prompt completion, cancellation, requests и events.
- CodeAI Hub уже требует raw provider diagnostics и deterministic event normalization; прямой Wire уменьшает риск потерять смысловые границы через SDK wrapper.
- `wire.jsonl` является Kimi-owned session evidence, поэтому может стать provider-native diagnostic layer.

Реализация должна сохранить резервный путь:

- Если `@moonshot-ai/kimi-agent-sdk` отдаёт все Wire events/lifecycle без потерь, он может позже обернуть process management.
- Если `kimi-agent-rs` станет достаточно зрелым после experimental status, он может заменить Python CLI startup для Wire-only service, но не в первой implementation wave.

## 5. Обязательные контракты модуля

### Runtime facade

`KimiProviderAdapter` должен удовлетворять тому же Core-facing ProviderAdapter surface, что и существующие провайдеры:

- `createSession`
- `resumeSession`
- `sendMessage`
- `stopSession` / active-turn cancel
- `closeSession`
- optional `refreshUsageLimits`
- optional `captureNativeRequest`

Модуль должен иметь единую facade entrypoint. Внутренние классы должны оставаться маленькими и разделёнными по ответственности.

### Владение процессом и сессией

Kimi process/session layer должен владеть:

- CLI discovery и version probe.
- provider-home bootstrap с `KIMI_SHARE_DIR`.
- config materialization для Kimi Code subscription path.
- Wire process lifecycle.
- capture/restore session id.
- replay on resume перед user send, когда Core должен hydrate UI/session state.
- cancellation через Wire `cancel`.

### Нормализация событий

Wire messages должны нормализоваться в CodeAI provider events:

- старт `prompt` -> `turn_started`
- `PromptResult.status = "finished"` -> `turn_completed`
- `cancelled` -> управляемое stop/cancel completion
- `max_steps_reached` -> recoverable failure, если Core явно не классифицирует это как terminal answer
- Wire `event` text/content -> assistant или thinking messages после classification
- Wire `request` approval/tool/question -> Core-visible request envelope, без прямой UI authority

Любой provider-native `ApprovalRequest` должен идти через Core policy. Первая Kimi implementation должна использовать conservative approval mode; broad shell/file auto-approval нельзя включать до проверки CodeAI-owned tool/profile boundaries.

### Изоляция provider-home

Kimi module не должен использовать реальный `~/.kimi` как runtime state.

Обязательная environment:

```text
KIMI_SHARE_DIR=~/.codeai-hub/providers/kimi/home
KIMI_CLI_NO_AUTO_UPDATE=1
```

Optional per-turn или per-session config должен материализоваться под provider-home, а не в project root, если только Kimi Wire явно не требует project-local files. Если project-local `.kimi` files окажутся необходимыми, реализация должна документировать точный список таких файлов и держать их CodeAI-owned.

### Model identity

Для Kimi Code:

- base model id: `kimi-for-coding`
- user-facing label: `Kimi 2.6 / Kimi Code`
- effective identity должен включить thinking mode после того, как runtime evidence подтвердит точный Wire/config switch.

Для Kimi Platform:

- base model id: `kimi-k2.6`
- отдельный future backend adapter; tool/runtime assumptions от Kimi Code не должны протекать в этот путь.

### Usage limits

Kimi Code quota — subscription/shared-account quota с rolling windows. Первая реализация может выйти без live usage widget только если UI явно показывает, что usage для Kimi недоступен, а provider failure messages дают понятный recovery path.

Предпочтительный follow-up:

- реализовать Core-side `provider-usage-limits/providers/kimi/` facade;
- читать quota через официальный CLI/API, если есть стабильный authenticated endpoint;
- нормализовать результат в тот же `usage_limits` stream contract, что у Claude/Codex/Gemini.

### Native request capture

У Kimi должен появиться diagnostic capture contract до release:

- Wire capture: копировать raw Wire request/event/request stream в Core-owned `~/.codeai-hub/logs/native-request-capture/`.
- Provider-home evidence: включать relevant `wire.jsonl` / `context.jsonl` paths в Markdown artifact.
- Network capture опционален для первого Kimi Code module, потому что OAuth/subscription runtime может не иметь простого public HTTP request equivalent. Если network capture добавляется, он должен быть no-upstream и redacted, как у Claude/Codex.

## 6. Фазы реализации

### Phase A — Проверочный runtime spike

Цель: доказать terminal one-turn semantics до production-кода.

Задачи:

- Установить или проверить `kimi` CLI из controlled environment.
- Запустить `kimi --wire` с isolated `KIMI_SHARE_DIR`.
- Отправить `initialize`/required handshake, если Wire его требует, затем `prompt`.
- Подтвердить terminal statuses, event shapes, request/approval flow, session id storage, replay и cancel behavior.
- Зафиксировать точные CLI flags и environment во временной research note или прямо в planning doc перед реализацией.

Критерии выхода:

- Мы знаем, как стартовать новую session.
- Мы знаем, как resume-ить session по id.
- Мы знаем, как cancel-ить active turn.
- У нас есть raw examples для assistant content, approval request и failure.

### Phase B — Каркас модуля

Целевой scope:

- `packages/Kimi_Module/package.json`
- `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`
- `packages/Kimi_Module/src/index.ts`

Ожидаемый результат:

- package собирается;
- provider adapter facade exports компилируются;
- Core registry integration ещё не выполняется.

### Phase C — Wire runtime

Целевой scope:

- process class for `kimi --wire`;
- JSON-RPC request/response router;
- session lifecycle store;
- raw Wire artifact writer.

Ожидаемый результат:

- unit tests покрывают prompt completion, cancel, request response и malformed JSON-RPC frames;
- runtime class эмитит provider-neutral internal events.

### Phase D — Нормализация сообщений

Целевой scope:

- Kimi event router;
- assistant/thinking/progress segmentation;
- lifecycle finish handler;
- stale-binding error class.

Ожидаемый результат:

- Core видит standard lifecycle events;
- provider-native request/approval messages не могут обходить Core;
- stale session id становится typed `KIMI_SESSION_STALE_BINDING`.

### Phase E — Core registry и settings

Целевой scope:

- provider descriptor registration;
- installer path resolution;
- settings/default model support;
- effective model identity resolver.

Ожидаемый результат:

- Project Manager показывает Kimi как provider только когда он installed/auth-ready;
- Settings defaults могут выбрать Kimi без rewrite существующих sessions;
- applied turn config доходит до Kimi send path.

### Phase F — Усиление Stop/resume/recovery

Целевой scope:

- Stop -> cancel active Wire turn.
- Continue -> resume same provider session.
- Core stale-binding retry support.
- failure classification для auth/quota/LLM service/unsupported model.

Ожидаемый результат:

- нет stuck `working`;
- нет silent message drop после Core restart;
- provider failure может показать user-visible recovery.

### Phase G — Диагностика и packaging

Целевой scope:

- native request / Wire capture;
- release build script inclusion;
- installed bundle self-containment;
- module SSOT doc `doc/SolidWorks-WorkFlow/Modules/Kimi.md`.

Ожидаемый результат:

- Kimi module shipped как release artifact;
- diagnostics достаточны для audit prompt/model/tool/profile boundaries;
- docs index указывает на новый module SSOT.

## 7. Форма первого implementation TODO-plan

Implementation `todo-plan.md` не должен быть одной большой provider task. Рекомендуемые streams:

1. Runtime proof spike и captured evidence.
2. Каркас package.
3. Wire process и JSON-RPC router.
4. Session lifecycle и provider-home bootstrap.
5. Нормализация событий.
6. Интеграция Core provider registry.
7. Интеграция Settings/effective identity.
8. Stop/resume/stale-binding recovery.
9. Diagnostics/native capture.
10. Targeted builds и release build confirmation gate.
11. User workflow acceptance testing.
12. Scope closeout.

Каждая microtask должна оставаться в пределах трёх files/packages и иметь paired `Git Commit` line.

## 8. Открытые вопросы

1. Требует ли Kimi Wire explicit `initialize` method перед `prompt`, и какие capability flags должен declare CodeAI Hub?
2. Может ли Kimi Code отдавать usage/quota через stable CLI/API без scraping UI output?
3. Поддерживает ли Kimi Code provider-owned thinking visibility switch, который cleanly мапится на CodeAI Hub `Reasoning in dialog`, или первая release должна оставить thinking display provider-native only?
4. Может ли `kimi --wire` работать полностью без project-local `.kimi` files при isolated `KIMI_SHARE_DIR`?
5. Позволяет ли Kimi Code OAuth membership CodeAI Hub-managed Wire sessions по terms, или первый auth path должен быть API-key-only for third-party tool compliance?

## 9. Не входит в первый release

- Generic Kimi Platform OpenAI-compatible backend adapter.
- Multi-agent/subagent orchestration в CodeAI Hub.
- Kimi VS Code extension integration.
- Automatic broad shell/file auto-approval.
- User-facing usage widget, если нет stable official usage endpoint.
