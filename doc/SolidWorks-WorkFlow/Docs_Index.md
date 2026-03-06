# SolidWorks-WorkFlow — Docs Index (SSOT навигация)

## 0) Start here (восстановление контекста)

1. `System/SystemArchitecture.md`
2. `WorkflowSteps_Overview.md`
3. `Clusters/Project_Manager.md`
4. `Clusters/CoreOrchestrator.md`
5. `Modules/Claude.md`, `Modules/Codex.md`, `Modules/Gemini.md`, `Modules/Launcher_CEF.md`, `Modules/UI_Bundles.md`
6. `Contracts/` (только по ссылкам из документов выше)

## 1) Канонические документы (этот каталог)

### Workflow Overview
- `WorkflowSteps_Overview.md` — SSOT шагов workflow (1→6), артефактов, OUTDATED propagation.

### System
- `System/SystemArchitecture.md` — SSOT всей системы и глобальных инвариантов.

### Clusters
- `Clusters/Project_Manager.md` — SSOT подсистемы Project Manager.
- `Clusters/CoreOrchestrator.md` — SSOT подсистемы Core Orchestrator.

### Modules
- `Modules/Claude.md` — SSOT Claude provider module.
- `Modules/Codex.md` — SSOT Codex provider module.
- `Modules/Gemini.md` — SSOT Gemini provider module.
- `Modules/Launcher_CEF.md` — SSOT CEF Launcher module.
- `Modules/UI_Bundles.md` — SSOT UI bundles (Webview + Project Manager).

### Contracts (активные)
- `Contracts/DescriptionStep_SingleAgent.md` — канонический контракт шага `Description` (single-agent, file-first).
- `Contracts/VirtualSimulation_Step.md` — контракт шага `Virtual Simulation`.
- `Contracts/Workflow_CLI.md` — state machine шагов + watcher.
- `Contracts/ProjectManager_DescriptionEntry_CopyRefactor.md` — UI-контракт pre-submit/post-submit для Description.
- `Contracts/Dialogs_And_Continuity_Routing.md` — routing диалогов + continuity.
- `Contracts/SessionContinuity.md` — continuity handoff/rollover contract.
- `Contracts/WorkspaceRuntime.md` — multi-workspace + snapshot-first + lock contract.
- `Contracts/SessionUI_Behavior.md` — Session UI laws (happy path) + lock/unlock rules.
- `Contracts/SessionInputLock_SSOT_StateMachine.md` — SSOT/state machine для input lock/unlock.
- `Contracts/ProviderSessionHome_IsolationAndRecovery.md` — session-home isolation + resume-first recovery contract.
- `Contracts/ProviderSessionHome_SnapshotEngine_Design.md` — design: Core module + snapshot engines (FS/Git) для session-home.
- `Contracts/Codex_Workflow_UserTurn_Delivery.md` — delivery/ACK/reconciliation/resend contract для workflow submit в Codex.
- `Contracts/Codex_Workflow_Submit_Diagnostics.md` — сквозной trace contract для PM/Core/Codex submit path, `pm.dialog_send.*`, `outbound.child.*` и SSOT-логов `~/.codeai-hub/logs/core/dialog-send-trace.jsonl` + `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl`.
- `Contracts/FacadeClassDiagram_DesignAndMaintenance.md` — process: фасады/границы/диаграммы (required reading).

### Contracts (legacy/deferred)
- `Contracts/DescriptionNode_ReviewSession.md` — legacy filename; содержит compatibility-контракт узла `description` (без встроенного reviewer).
- `Contracts/StandaloneReviewer_Module.md` — draft deferred-модуля standalone reviewer (manual-only, вне базового chain 1→6).

### Root Drafts/RFC (non-SSOT, keep for history)
- `CodeAI-Hub_Manual_Retry_RFC.md` — исторический RFC (status: Proposed), не канон.
- `QuestionnaireTemplate_Draft.md` — промежуточный черновик анкеты, не runtime SSOT.

## 2) Runtime templates (Description)

Каноничные bundled-шаблоны для шага `Description`:
- `.codeai-hub/templates/description/questionnaire-template.md` — анкета pre-submit.
- `.codeai-hub/templates/description/description-template.md` — user-facing Help (pre-submit и post-submit).
- `.codeai-hub/templates/description/description-collector-prompt.md` — инструкции Description Agent (file-first).

## 3) Правило миграции

- Новые правки делаем только в SSOT-файлах этого каталога.
- Legacy документы используем как редиректы/compat notes, затем удаляем после зелёного `npm run check:links`.
