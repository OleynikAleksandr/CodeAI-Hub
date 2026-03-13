# Codex Provider Module — Module (SSOT)

## Назначение
Провайдерный модуль Codex для Core: threaded conversations (resume), one-shot turns, provider-home rollouts, usage limits.

## Где живёт код
- `packages/Codex_Module/`

## Provider-home (канон)
- `CODEX_HOME=~/.codeai-hub/providers/codex/home`
- Rollouts/sessions: `~/.codeai-hub/providers/codex/home/sessions/**/rollout-*.jsonl`

## Инварианты
- UI история диалога ведётся отдельно (unified-session JSONL по `dialogId`), не смешивать с provider rollouts.
- Lifecycle обязателен: `turn_started` → `turn_completed|turn_failed`.
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
