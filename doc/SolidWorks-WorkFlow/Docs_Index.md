# SolidWorks-WorkFlow — Docs Index (SSOT навигация)

## 0) Start here (восстановление контекста)

1. `System/SystemArchitecture.md`
2. `WorkflowSteps_Overview.md`
3. `Clusters/Project_Manager.md`
4. `Clusters/CoreOrchestrator.md`
5. `Modules/Claude.md`, `Modules/Codex.md`, `Modules/Gemini.md`, `Modules/Launcher_CEF.md`, `Modules/UI_Bundles.md`
6. `Contracts/` (только по ссылкам из документов выше)
7. `Contracts/Codex_ResponseMode_Settings_Architecture.md`
8. `Plans/` (только при запуске нового scope, deferred work или design intake перед `todo-plan.md`)

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
- `Contracts/Codex_ResponseMode_Settings_Architecture.md` — response modes (`Strict` / `Hybrid` / `Debug/Raw`) + raw provider diagnostics contract для Codex.
- `Contracts/FacadeClassDiagram_DesignAndMaintenance.md` — process: фасады/границы/диаграммы (required reading).

### Contracts (compat / legacy filenames)
- `Contracts/DescriptionNode_ReviewSession.md` — legacy filename; redirect/compat note для узла `description`, без restart/reviewer semantics как активной возможности продукта.
- Остальные legacy-path redirect notes в `Contracts/` сохранены только ради старых ссылок из session reports / archived TODO и не используются как source of truth.

### Plans (pre-implementation / non-SSOT)
- `Plans/README.md` — правила жизненного цикла planning-доков.
- `Plans/StandaloneReviewer_Module.md` — draft deferred-модуля standalone reviewer (manual-only, вне базового chain 1→6).
- `Plans/ProviderSessionHome_IsolationAndRecovery.md` — deferred target-architecture для per-session provider HOME + resume/snapshot recovery.
- `Plans/ProviderSessionHome_SnapshotEngine_Design.md` — draft implementation design для deferred session-home architecture.
- `Plans/SessionInputLock_TargetState_Architecture.md` — target-state design для явной snapshot-модели `inputLock.*`.
- `Plans/Archive/` — завершённые или снятые planning-доки, сохраняемые только как история.

## 2) Runtime templates (Description)

Каноничные bundled-шаблоны для шага `Description`:
- `.codeai-hub/templates/description/questionnaire-template.md` — анкета pre-submit.
- `.codeai-hub/templates/description/description-template.md` — user-facing Help (pre-submit и post-submit).
- `.codeai-hub/templates/description/description-collector-prompt.md` — инструкции Description Agent (file-first).

## 3) Правило миграции

- Новые правки делаем только в SSOT-файлах этого каталога.
- Новый scope сначала описываем в `Plans/`, и только после реализации переносим итоговый SSOT в `System/`, `Clusters/`, `Modules/` или `Contracts/`.
- Legacy документы используем как редиректы/compat notes, но не описываем в них поддерживаемые product-возможности, уже снятые из живого кода.
