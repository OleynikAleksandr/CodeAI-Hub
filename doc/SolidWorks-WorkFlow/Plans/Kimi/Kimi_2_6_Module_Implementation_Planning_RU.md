# Kimi 2.6 Provider Module — implementation planning

**Status:** Draft planning source  
**Created:** 2026-05-18  
**Scope:** план реализации нового provider module для Kimi Code / Kimi K2.6 в CodeAI Hub.  
**Decision level:** implementation architecture and execution slicing; не является уже выполненным кодом.

## 1. Цель

Добавить Kimi как четвертый coding provider после Claude, Codex и Gemini так, чтобы Core сохранил текущий managed one-turn contract:

- Core формирует полный workflow/task prompt и provider-neutral applied turn config.
- Kimi выполняет один terminal turn поверх собственного agent runtime.
- Core получает нормализованные provider events: `turn_started`, assistant/thinking/progress messages, tool/approval diagnostics, usage snapshots где доступны, `turn_completed | turn_failed`.
- Session/resume, provider binding, stale-binding recovery, Stop/Continue и diagnostic artifacts остаются под контролем Core, а не UI.

Первый продуктовый target — Kimi Code subscription/runtime path, а не generic Kimi Platform backend adapter.

## 2. Актуальная внешняя база

Официальные Kimi документы на 2026-05-18 фиксируют два разных access path:

| Path | Назначение | Интеграционный вывод |
|---|---|---|
| Kimi Code | Terminal/IDE coding agents, Kimi membership subscription, shared quota. | Primary path для CodeAI Hub provider module. |
| Kimi Platform | Product/API integration, pay-as-you-go, OpenAI-compatible API. | Future backend-provider path, не первый native runtime module. |

Kimi Code docs указывают:

- CLI умеет читать/редактировать код, запускать команды и работать как terminal agent.
- `KIMI_SHARE_DIR` меняет runtime data root; default `~/.kimi`.
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

## 3. Product boundary

### Provider identity

Recommended provider id: `kimiCode`.

Reasoning:

- It distinguishes Kimi Code subscription/runtime from possible future `kimiPlatform` pay-as-you-go backend.
- It keeps the user-facing provider label simple: `Kimi`.
- It avoids overpromising that the provider can always select a concrete `kimi-k2.6` model slug; Kimi Code official contract says third-party coding tools should use `kimi-for-coding`.

### Package and artifact

Recommended package: `packages/Kimi_Module/`.

Recommended release artifact: `kimi-module-<version>.tar.bz2`.

Recommended provider slot:

```text
~/.codeai-hub/providers/kimi/
├── latest/                 # installed CodeAI adapter bundle
├── cli/                    # installed or resolved Kimi Code CLI, if bundled later
└── home/                   # KIMI_SHARE_DIR runtime data root
```

`KIMI_SHARE_DIR` should point to `~/.codeai-hub/providers/kimi/home`, not the real user `~/.kimi`.

## 4. Transport decision

Primary implementation target: direct `kimi --wire` bridge owned by CodeAI Hub.

Rationale:

- Wire is the lowest-level official local runtime protocol and exposes replay, prompt completion, cancellation, requests and events.
- CodeAI Hub already needs raw provider diagnostics and deterministic event normalization; direct Wire avoids losing semantic boundaries through an SDK wrapper.
- `wire.jsonl` is also Kimi-owned session evidence, so it can become a provider-native diagnostic layer.

Implementation must keep an escape hatch:

- If `@moonshot-ai/kimi-agent-sdk` exposes all Wire events/lifecycle without loss, it may wrap process management later.
- If `kimi-agent-rs` matures beyond experimental status, it can replace Python CLI startup for Wire-only service, but not in the first implementation wave.

## 5. Required module contracts

### Runtime facade

`KimiProviderAdapter` must satisfy the same Core-facing ProviderAdapter surface as existing providers:

- `createSession`
- `resumeSession`
- `sendMessage`
- `stopSession` / active-turn cancel
- `closeSession`
- optional `refreshUsageLimits`
- optional `captureNativeRequest`

The module must expose a single facade entrypoint. Internal classes stay small and split by responsibility.

### Process and session ownership

Kimi process/session layer should own:

- CLI discovery and version probe.
- provider-home bootstrap with `KIMI_SHARE_DIR`.
- config materialization for Kimi Code subscription path.
- Wire process lifecycle.
- session id capture and restore.
- replay on resume before accepting a user send when Core needs to hydrate UI/session state.
- cancellation through Wire `cancel`.

### Event normalization

Wire messages must be normalized into CodeAI provider events:

- `prompt` start -> `turn_started`
- `PromptResult.status = "finished"` -> `turn_completed`
- `cancelled` -> controlled stop/cancel completion
- `max_steps_reached` -> recoverable failure unless Core explicitly treats it as a terminal answer
- Wire `event` text/content -> assistant or thinking messages after classification
- Wire `request` approval/tool/question -> Core-visible request envelope, never direct UI authority

Any provider-native `ApprovalRequest` must be bridged through Core policy. The first Kimi implementation should run with conservative approval mode; no auto-approve broad shell/file operations until CodeAI-owned tool/profile boundaries are validated.

### Provider-home isolation

Kimi module must not use real `~/.kimi` as runtime state.

Required environment:

```text
KIMI_SHARE_DIR=~/.codeai-hub/providers/kimi/home
KIMI_CLI_NO_AUTO_UPDATE=1
```

Optional per-turn or per-session config must be materialized under provider-home, not project root, unless Kimi Wire requires project-local files. If project-local `.kimi` files become necessary, the implementation must document exactly which files are written and keep them CodeAI-owned.

### Model identity

For Kimi Code:

- base model id: `kimi-for-coding`
- user-facing label: `Kimi 2.6 / Kimi Code`
- effective identity should include thinking mode once runtime evidence confirms the exact Wire/config switch.

For Kimi Platform:

- base model id: `kimi-k2.6`
- separate future backend adapter; no tool/runtime assumptions from Kimi Code should leak into it.

### Usage limits

Kimi Code quota is subscription/shared-account quota with rolling windows. First implementation can ship without a live usage widget only if UI clearly marks usage as unavailable for Kimi and provider failure messages are good.

Preferred follow-up:

- implement Core-side `provider-usage-limits/providers/kimi/` facade;
- read quota through official CLI/API if an authenticated endpoint is stable;
- normalize to the same `usage_limits` stream contract as Claude/Codex/Gemini.

### Native request capture

Kimi must get a diagnostic capture story before release:

- Wire capture: copy raw Wire request/event/request stream into Core-owned `~/.codeai-hub/logs/native-request-capture/`.
- Provider-home evidence: include relevant `wire.jsonl` / `context.jsonl` paths in the Markdown artifact.
- Network capture is optional for the first Kimi Code module because OAuth/subscription runtime may not expose a simple public HTTP request equivalent. If added, it must be no-upstream and redacted like Claude/Codex.

## 6. Implementation phases

### Phase A — Runtime proof spike

Goal: prove terminal one-turn semantics before production code.

Tasks:

- Install/probe `kimi` CLI from a controlled environment.
- Start `kimi --wire` with isolated `KIMI_SHARE_DIR`.
- Send `initialize`/required handshake if Wire requires it, then `prompt`.
- Confirm terminal statuses, event shapes, request/approval flow, session id storage, replay and cancel behavior.
- Record exact CLI flags and environment in a temporary research note or directly in the planning doc before implementation.

Exit criteria:

- We know how to start a new session.
- We know how to resume a session by id.
- We know how to cancel an active turn.
- We have raw examples for assistant content, approval request and failure.

### Phase B — Module scaffold

Scope target:

- `packages/Kimi_Module/package.json`
- `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`
- `packages/Kimi_Module/src/index.ts`

Expected result:

- package builds;
- provider adapter facade exports compile;
- no Core registry integration yet.

### Phase C — Wire runtime

Scope target:

- process class for `kimi --wire`;
- JSON-RPC request/response router;
- session lifecycle store;
- raw Wire artifact writer.

Expected result:

- unit tests cover prompt completion, cancel, request response and malformed JSON-RPC frames;
- runtime class emits provider-neutral internal events.

### Phase D — Messaging normalization

Scope target:

- Kimi event router;
- assistant/thinking/progress segmentation;
- lifecycle finish handler;
- stale-binding error class.

Expected result:

- Core sees standard lifecycle events;
- provider-native request/approval messages cannot bypass Core;
- stale session id becomes typed `KIMI_SESSION_STALE_BINDING`.

### Phase E — Core registry and settings

Scope target:

- provider descriptor registration;
- installer path resolution;
- settings/default model support;
- effective model identity resolver.

Expected result:

- Project Manager can show Kimi as a provider only when installed/auth-ready;
- Settings defaults can select Kimi without rewriting existing sessions;
- applied turn config reaches Kimi send path.

### Phase F — Stop/resume/recovery hardening

Scope target:

- Stop -> cancel active Wire turn.
- Continue -> resume same provider session.
- Core stale-binding retry support.
- failure classification for auth/quota/LLM service/unsupported model.

Expected result:

- no stuck `working`;
- no silent message drop after Core restart;
- provider failure can offer user-visible recovery.

### Phase G — Diagnostics and packaging

Scope target:

- native request / Wire capture;
- release build script inclusion;
- installed bundle self-containment;
- module SSOT doc `doc/SolidWorks-WorkFlow/Modules/Kimi.md`.

Expected result:

- Kimi module is shipped as release artifact;
- diagnostics are sufficient to audit prompt/model/tool/profile boundaries;
- docs index points to the new module SSOT.

## 7. First implementation TODO-plan shape

The implementation `todo-plan.md` should not be one large provider task. Recommended streams:

1. Runtime proof spike and captured evidence.
2. Package scaffold.
3. Wire process and JSON-RPC router.
4. Session lifecycle and provider-home bootstrap.
5. Event normalization.
6. Core provider registry integration.
7. Settings/effective identity integration.
8. Stop/resume/stale-binding recovery.
9. Diagnostics/native capture.
10. Targeted builds and release build confirmation gate.
11. User workflow acceptance testing.
12. Scope closeout.

Each microtask must stay within three files/packages and have a paired `Git Commit` line.

## 8. Open questions

1. Does Kimi Wire require an explicit `initialize` method before `prompt`, and what capability flags should CodeAI Hub declare?
2. Can Kimi Code expose usage/quota through stable CLI/API without scraping UI output?
3. Does Kimi Code support a provider-owned thinking visibility switch that maps cleanly to CodeAI Hub `Reasoning in dialog`, or should first release keep thinking display as provider-native only?
4. Can `kimi --wire` run fully without project-local `.kimi` files when `KIMI_SHARE_DIR` is isolated?
5. Does Kimi Code OAuth membership allow CodeAI Hub-managed Wire sessions under its terms, or should first auth path be API-key-only for third-party tool compliance?

## 9. Non-goals for first release

- Generic Kimi Platform OpenAI-compatible backend adapter.
- Multi-agent/subagent orchestration in CodeAI Hub.
- Kimi VS Code extension integration.
- Automatic broad shell/file auto-approval.
- User-facing usage widget if no stable official usage endpoint is available.
