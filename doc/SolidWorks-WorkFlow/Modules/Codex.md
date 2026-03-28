# Codex Provider Module — Module (SSOT)

## Назначение
Провайдерный модуль Codex для Core: threaded conversations (resume), one-shot turns, provider-home rollouts, usage limits.

## Где живёт код
- `packages/Codex_Module/`

## Provider-home (канон)
- `CODEX_HOME=~/.codeai-hub/providers/codex/home`
- Rollouts/sessions: `~/.codeai-hub/providers/codex/home/sessions/**/rollout-*.jsonl`

## Messaging cluster
- `packages/Codex_Module/src/messaging/message-processor.ts` — thin façade: queue, prompt preparation, `runStreamed()` orchestration.
- `packages/Codex_Module/src/messaging/codex-event-stream-consumer.ts` — startup lock, idle-pulse waiting, terminal event cancellation of SDK generators.
- `packages/Codex_Module/src/messaging/codex-stream-event-router.ts` — `thread.started`, reasoning items, assistant chunks, structured-output and stream-error normalization.
- `packages/Codex_Module/src/messaging/codex-message-finish-handler.ts` — user-turn lifecycle signals плюс cleanup structured-output/reasoning state.
- `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts` — focused façade над structured-output prompt/schema preparation и finalize path.
- `packages/Codex_Module/src/messaging/structured-output-parser.ts`, `structured-output-state.ts` — JSON/parsing rules, passthrough delta/output hash, extractor/session state storage.
- `packages/Codex_Module/src/messaging/codex-usage-sync.ts`, `codex-token-usage-sync.ts` — usage-limits/token usage refresh; runtime `token_count` signals мержатся в shared usage-limits stream payload.

## Инварианты
- UI история диалога ведётся отдельно (unified-session JSONL по `dialogId`), не смешивать с provider rollouts.
- Lifecycle обязателен: `turn_started` → `turn_completed|turn_failed`.
- Internal turns не должны эмитить user-facing `assistant` / `stream_event` / lifecycle events; suppression централизован в messaging emitter helper.
- Commentary-phase `agent_message` для structured output остаётся скрытым, чтобы финальный ответ не дублировался в UI.
- Structured-output passthrough (`hybrid` / `debug_raw`) обязан переживать `sessionId` promotion без потери accumulated state.
- User-facing Codex settings в baseline line экспонируют только две модели: `gpt-5.3-codex` и `gpt-5.4`.
- Persisted `settings.json` для Codex не должен разрастаться устаревшими model ids; `reasoningByModel` хранит только active user-facing keys этой линии.
- `Settings -> General -> Response Mode` управляет turn shaping policy:
  - `hybrid` — baseline default для workflow;
  - `strict` — включает editable schema/instruction contract;
  - `debug_raw` — убирает baseline default schema pressure с обычных turn-ов ради диагностики новых моделей.
- Raw provider rollout JSONL остаётся диагностическим SSOT; user-facing dialog/history является уже нормализованным display-слоем.
- SDK diagnostics пишутся в `~/.codeai-hub/logs/codex/sdk-codex-*.jsonl` и больше не должны затираться при `resume` на том же `thread_id`.

## Связанные контракты
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Response modes + diagnostics: `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
