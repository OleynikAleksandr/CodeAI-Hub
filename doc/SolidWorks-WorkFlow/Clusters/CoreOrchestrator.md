# Core Orchestrator — Cluster (SSOT)

## 0) Start here (контекст + контракты)

- System: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Workspace Runtime (keys + snapshot-first + lock): `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Input lock SSOT/state machine: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Dialog routing (dialogId vs sessionId): `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Session Continuity (handoff/rollover): `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Workflow CLI/Watcher: `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`

## 1) Назначение

Core Orchestrator — автономное ядро, которое:
- принимает команды клиентов (PM/Webview/Launcher) и держит multi-workspace scope;
- управляет lifecycle каждого turn (`turn_started` → `turn_completed|turn_failed`);
- обеспечивает routing сообщений в актуальный provider segment (resume/rollover);
- пишет/читает историю диалогов (unified-session JSONL) и continuity chain;
- публикует snapshot-first состояние для UI (lock/usage/status).

## 2) Где живёт код

- Core: `packages/core/`
- Remote Bridge/API handlers: `packages/core/src/remote-bridge/`
- Session continuity: `packages/core/src/session-continuity/`
- Workflow runtime: `packages/core/src/workflow/`

## 3) Ключевые инварианты (коротко)

- **Никогда не оставлять UI в stuck working/resuming**: любой provider/core failure обязан завершать turn (fail + rollback `turnState="idle"`), иначе UI может остаться locked навсегда.
- **Немедленный lock на submit**: Core обязан эмитить `turnState="running"` до реального provider send.
- **dialogId ≠ sessionId**: история диалога стабильна, live статус/usage привязан к текущему сегменту.
- **Continuity**: handoff создаётся надёжно (delivery/ack/retry), иначе UI получает явный failure, а не вечный lock.
- **Post-turn continuity arbitration**: threshold breach на `token_usage` не имеет права сам по себе запускать flow-node rollover во время активного one-shot turn; до `turn_completed` Core только кеширует usage snapshot.
- **Provider-order tolerance**: `Gemini` может дать `token_usage` раньше `turn_completed`, а `Claude/Codex` наоборот; Core обязан завершать одно и то же continuity-решение независимо от порядка событий.
- **Turn-scoped usage cache**: cached usage snapshot очищается при старте нового outbound turn-а и после финального решения post-turn arbitration, чтобы usage прошлого turn-а не протекал в следующий.

Канон: `doc/SolidWorks-WorkFlow/Contracts/*`.
