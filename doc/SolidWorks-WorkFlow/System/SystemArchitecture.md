# System Architecture (SSOT) — SolidWorks-WorkFlow

**Scope:** каноническое описание системы CodeAI Hub целиком (уровень System).

## 0) Start here (восстановление контекста)

1. `doc/SolidWorks-WorkFlow/Docs_Index.md`
2. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
3. `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
4. `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
5. `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
6. `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
7. `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
8. `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
9. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
10. `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
11. `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
12. `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
13. `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
14. `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_UserTurn_Delivery.md`
15. `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md`
16. Provider modules: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`

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

1. **Snapshot-first lock contract**: состояние input определяется только snapshot‑сигналами (`turnState`, continuity lock flags и т.п.).
   - Канон: `WorkspaceRuntime.md`, `SessionUI_Behavior.md`, `SessionInputLock_SSOT_StateMachine.md`.
2. **Dialogs vs status split**: история/диалог (`dialogId`) независим от live status/usage (`sessionId`); routing обязателен после restart/reconnect.
   - Канон: `Dialogs_And_Continuity_Routing.md`.
3. **Session continuity**: rollover/handoff обязаны быть надёжны и не залипать UI в working.
   - Канон: `SessionContinuity.md`.
4. **Workflow navigation SSOT**: любой route в workflow stage (Toolbar/Tree/auto-select/dialog-intent) обязан синхронизировать `activeStage`; подсветка Toolbar, открытая session и header правой панели не могут расходиться.
   - Канон: `ProjectManager_WorkflowNavigation_SSOT.md`.
5. **Provider-home isolation**: provider state изолирован под `~/.codeai-hub/providers/<id>/home` (где применимо), без смешения с терминальным HOME.
   - Канон: provider docs в `doc/SolidWorks-WorkFlow/Modules/*`.
6. **Workflow raw-turn contract**: PM workflow turns для Codex по умолчанию raw; structured output допустим только по явному opt-in, а промежуточные `assistant`/`thinking` сообщения должны сохраняться через dialog history JSONL и быть доступны после replay/reopen.
   - Канон: `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Commentary_Restore.md`.
7. **Outbound user-turn delivery contract**: workflow submit не считается доставленным до provider ACK; `thread.started` недостаточен, pending/failed outbound submit хранятся отдельно от dialog history и должны поддерживать безопасный resend без повторного набора текста.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_UserTurn_Delivery.md`.
8. **Workflow submit diagnostics contract**: для каждого user submit должен существовать сквозной `outboundAttemptId`; PM/Core trace пишется в `~/.codeai-hub/logs/core/dialog-send-trace.jsonl`, а Codex transport trace — в `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl`.
   - PM lifecycle trace обязан покрывать `pm.dialog_send.clicked`, `pm.dialog_send.ws_dispatched`, `pm.dialog_send.ack_received`, `pm.dialog_send.history_refresh_requested`, `pm.dialog_send.history_refresh_result`.
   - Codex transport trace обязан покрывать не только processor breadcrumbs, но и child-process boundaries `outbound.child.spawned/stdin_write_started/stdin_write_finished/stdout_first_line/exit/killed`.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md`.

## 4) Где искать правду в коде (high-signal)

- Extension entry: `src/extension.ts`
- Core: `packages/core/`
- Project Manager UI: `src/client/project-manager/`
- Shared Session UI: `src/client/ui/src/`
- Provider modules: `packages/Claude_Module/`, `packages/Codex_Module/`, `packages/Gemini_Module/`

## 5) Workflow Boundary (Description, 2026-03-01)

- Шаг `description` зафиксирован как single-agent file-first flow:
  - pre-submit: `questionnaire.md` + user Help,
  - post-submit: единая resume-сессия,
  - SSOT-артефакт: `Final_Description.md`.
- `Final_Description.md` должен формироваться сразу после чтения анкеты (первичный черновик), чтобы пользователь обсуждал уже существующий документ.
- `Final_Description.md` должен содержать не только описание идеи, но и базу для следующего шага `virtual_simulation`:
  - 2–4 сценария (актор/цель → действие → ожидаемый результат → критерий успеха),
  - ограничения/допущения,
  - ключевые сущности/термины.
- Legacy `description.md`/reviewer-цепочка поддерживается только для совместимости старых workspace и не является SSOT.
- Standalone Reviewer вынесен в deferred-модуль и не входит в базовый workflow 1→6.

## 6) Runtime Templates Boundary (Description + Virtual Simulation)

Каноничные bundled templates в `.codeai-hub/templates/description/`:
- `questionnaire-template.md` — pre-submit анкета.
- `description-template.md` — user-facing Help для pre-submit и post-submit (`Artifacts/Help`).
- `description-collector-prompt.md` — инструкции Description Agent (file-first, краткий контекст workflow, ограничения, DoD).

Каноничный bundled prompt для `.codeai-hub/templates/virtual_simulation/`:
- `virtual-simulation-prompt.md` — инструкции Virtual Simulation Agent.

Инвариант: `Virtual Simulation` работает в режиме prompt-only. Отдельный artifact template (`virtual-simulation-template.md`) в runtime не поставляется и не отправляется агенту.

Workflow-коммуникация для Codex:
- file-first сохраняется;
- короткие progress commentary в чате обязательны;
- запрет касается только полного markdown-дампа артефакта в чат;
- raw workflow turns не должны получать implicit structured-output contract без явного opt-in.

Канонические документы:
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
