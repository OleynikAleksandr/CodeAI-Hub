# System Architecture (SSOT) — SolidWorks-WorkFlow

**Scope:** каноническое описание системы CodeAI Hub целиком (уровень System).

## 0) Start here (восстановление контекста)

1) `doc/SolidWorks-WorkFlow/Docs_Index.md`
2) `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
3) `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
4) `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
5) `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
6) `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
7) `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
8) `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
9) Provider modules: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
10) Workflow steps + watcher: `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
11) Virtual Simulation step: `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`

## 1) Компоненты системы (верхний уровень)

- **Core Orchestrator** (Node.js сервис): бизнес‑логика, turn lifecycle, routing, continuity.
- **Core Supervisor**: управление runtime, запуск/перезапуск и version attach.
- **Project Manager (CEF UI bundle)**: Workflow Tree + Sessions/Artifacts + recovery UX.
- **UI bundles**: `project-manager`, `vscode-webview`.
- **CEF Launcher**: локальный клиент для Project Manager.
- **Providers**: Claude/Codex/Gemini модули (CLI/SDK контуры).

## 2) SSOT уровни (иерархия документов)

- System SSOT (этот файл): глобальные инварианты и карта.
- Cluster SSOT: `doc/SolidWorks-WorkFlow/Clusters/*`.
- Module SSOT: `doc/SolidWorks-WorkFlow/Modules/*`.
- Contract SSOT: `doc/SolidWorks-WorkFlow/Contracts/*` (точечные механизмы).

## 3) Глобальные инварианты (must-not-break)

1) **Snapshot-first lock contract**: состояние input определяется только snapshot‑сигналами (`turnState`, continuity lock flags и т.п.).
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`, `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`, `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`.
2) **Dialogs vs status split**: история/диалог (dialogId) независим от live status/usage (sessionId); routing обязателен после restart/reconnect.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`.
3) **Session continuity**: rollover/handoff обязаны быть надёжны и не залипать UI в working.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`.
4) **Provider-home**: provider state изолирован под `~/.codeai-hub/providers/<id>/home` (где применимо), без смешения с терминальным HOME.
   - Канон: provider docs в `doc/SolidWorks-WorkFlow/Modules/*`.

## 4) Где искать правду в коде (high-signal)

- Extension entry: `src/extension.ts`
- Core: `packages/core/`
- Project Manager UI: `src/client/project-manager/`
- Shared Session UI: `src/client/ui/src/`
- Provider modules: `packages/Claude_Module/`, `packages/Codex_Module/`, `packages/Gemini_Module/`
