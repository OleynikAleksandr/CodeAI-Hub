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

## Связанные контракты
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
