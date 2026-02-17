# Core Orchestrator — Cluster (SSOT)

## 0) Start here (контекст + контракты)

- System: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Workspace Runtime (keys + snapshot-first + lock): `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
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

- **Никогда не оставлять UI в stuck working**: любой provider/core failure обязан завершать turn (fail + rollback `turn_state=idle`).
- **Немедленный lock на submit**: Core обязан эмитить `turn_state=running` до реального provider send.
- **dialogId ≠ sessionId**: история диалога стабильна, live статус/usage привязан к текущему сегменту.
- **Continuity**: handoff создаётся надёжно (delivery/ack/retry), иначе UI получает явный failure, а не вечный lock.

Канон: `doc/SolidWorks-WorkFlow/Contracts/*`.

## 4) Legacy snapshot (для форензики)

Полный исторический документ “as-is” сохранён здесь:
- `doc/SolidWorks-WorkFlow/Archive/legacy/CoreOrchestrator-legacy-2026-02-17.md`
