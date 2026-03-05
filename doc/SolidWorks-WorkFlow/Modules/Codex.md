# Codex Provider Module — Module (SSOT)

## Назначение
Провайдерный модуль Codex для Core: threaded conversations (resume), one-shot turns, provider-home rollouts, usage limits.

## Где живёт код
- `packages/Codex_Module/`

## Provider-home (канон)
- `CODEX_HOME=~/.codeai-hub/providers/codex/home`
- Rollouts/sessions: `~/.codeai-hub/providers/codex/home/sessions/**/rollout-*.jsonl`

## Model selection boundary
- Default coding model в CodeAI Hub остаётся `gpt-5.3-codex`.
- General-purpose модель в Settings/normalization: `gpt-5.4`; legacy `gpt-5.2` при чтении настроек должен мягко нормализоваться в `gpt-5.4`.
- Runtime не должен опираться на неявную provider-side миграцию `gpt-5.2 -> gpt-5.3-codex`; выбор general-модели должен уважаться явно через локальные настройки CodeAI Hub.
- Persisted `~/.codeai-hub/settings/settings.json` — SSOT для Codex default model/reasoning; stale boot-time env (`CODEX_DEFAULT_MODEL`, `CODEX_DEFAULT_REASONING_EFFORT`) не должен перебивать уже сохранённые Settings в long-lived Core/provider runtime.

## Инварианты
- UI история диалога ведётся отдельно (unified-session JSONL по `dialogId`), не смешивать с provider rollouts.
- Lifecycle обязателен: `turn_started` → `turn_completed|turn_failed`.

## Связанные контракты
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
