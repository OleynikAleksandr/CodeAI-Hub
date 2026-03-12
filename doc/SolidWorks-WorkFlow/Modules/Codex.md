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
- Для активного workflow workspace MVP-источником правды является не текущий global Settings snapshot, а locked workspace execution profile; Codex workflow resume не имеет права создавать новый thread только потому, что в глобальных Settings сейчас выбран другой default model.

## Инварианты
- UI история диалога ведётся отдельно (unified-session JSONL по `dialogId`), не смешивать с provider rollouts.
- Lifecycle обязателен: `turn_started` → `turn_completed|turn_failed`.

## Workflow turn contract
- Workflow turns Project Manager для Codex по умолчанию идут в raw conversational mode.
- `outputSchema` для workflow разрешён только по явному opt-in через Core turn-options contract; внутренний marker `allowStructuredOutput` не должен утекать в provider layer.
- Raw workflow turns не должны получать implicit JSON-only prompt или неявный `--output-schema` в `codex exec`.
- Промежуточные `agent_message/commentary` для raw workflow turns должны доходить до stream pipeline и unified dialog history; suppress commentary допустим только для explicit structured turns.
- Bundled workflow prompts (`Description`, `Virtual Simulation`) обязаны требовать короткие progress commentary updates и запрещают только публикацию полного markdown-артефакта в чат.
- Для user submit в workflow `thread.started` не считается provider ACK; delivered user message попадает в unified dialog history только после подтверждения provider-side turn, а pending/failed outbound submit должны поддерживать явный resend без повторного набора текста.
- Runtime truth source для provider ACK в Codex только один: `sdk:turn.started`; rollout JSONL и diagnostics trail не участвуют в verdict delivered/failed и используются только для расследований.
- Для диагностики stalled submit каждый outbound user turn должен иметь `outboundAttemptId`; PM/Core trace пишется в `~/.codeai-hub/logs/core/dialog-send-trace.jsonl`, transport trace Codex — в `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl`.
- Транспортная диагностика Codex обязана покрывать два слоя:
  - processor breadcrumbs: `processor.enqueue`, `processor.dequeue`, `processor.turn.begin`, `processor.run_streamed.begin`, `processor.first_event`;
  - child-process boundaries: `outbound.child.spawned`, `outbound.child.stdin_write_started`, `outbound.child.stdin_write_finished`, `outbound.child.stdout_first_line`, `outbound.child.exit`, `outbound.child.killed`.
- PM lifecycle trace (`pm.dialog_send.clicked/ws_dispatched/ack_received/history_refresh_requested/history_refresh_result`) должен писаться не в browser storage, а в тот же Core JSONL через bridge message `dialog:trace`.

## Связанные контракты
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Workflow commentary restore: `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Commentary_Restore.md`
- Workflow turn-start ACK: `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_TurnStarted_ACK.md`
- Workflow submit diagnostics: `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md`
