# SolidWorks-WorkFlow — Docs Index (SSOT навигация)

## 0) Start here (восстановление контекста)

1. `System/SystemArchitecture.md`
2. `WorkflowSteps_Overview.md`
3. `Clusters/Project_Manager.md`
4. `Clusters/CoreOrchestrator.md`
5. `Modules/Claude.md`, `Modules/Codex.md`, `Modules/Gemini.md`, `Modules/Shared_RuntimeTranslation_Module.md`, `Modules/Localization.md`, `Modules/Launcher_CEF.md`, `Modules/UI_Bundles.md`
6. `Contracts/` (только по ссылкам из документов выше)
7. `Contracts/Codex_ResponseMode_Settings_Architecture.md`
8. `Plans/` (только при запуске нового scope, deferred work или design intake перед `todo-plan.md`)

## 1) Канонические документы (этот каталог)

### Workflow Overview
- `WorkflowSteps_Overview.md` — SSOT шагов workflow (1→6), артефактов, OUTDATED propagation.

### System
- `System/SystemArchitecture.md` — SSOT всей системы и глобальных инвариантов.
- `System/Workflow_NewStep_Rollout_Guardrails.md` — SSOT protocol for adding a new workflow step by cloning a mature reference-step contract end-to-end, including localization ownership, PM parity, continuity paths, cold-start persistence, tests, and packaged release validation.

### Clusters
- `Clusters/Project_Manager.md` — SSOT подсистемы Project Manager.
- `Clusters/CoreOrchestrator.md` — SSOT подсистемы Core Orchestrator.

### Modules
- `Modules/Claude.md` — SSOT Claude provider module, including provider-home runtime isolation and SDK isolation-mode rules for CodeAI Hub-managed turns.
- `Modules/Codex.md` — SSOT Codex provider module, including reasoning summary settings and provider-home config policy.
- `Modules/Gemini.md` — SSOT Gemini provider module.
- `Modules/Shared_RuntimeTranslation_Module.md` — SSOT shared runtime translation module.
- `Modules/Localization.md` — SSOT persistent UI localization module, including the four user-facing categories and the English-only internal-instructions boundary.
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
- `Contracts/EffectiveModelIdentity_And_Settings_SSOT.md` — canonical effective model identity and next-turn settings SSOT.
- `Contracts/Gemini_ThoughtTranslation.md` — реализованный контракт перевода Gemini `Thought` событий в видимые tagged assistant messages.
- `Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md` — deferred SSOT для provider failure classification, recovery и provider-neutral switch transfer.
- `Contracts/UserFacing_Text_Localization_Boundary.md` — SSOT text-ownership contract for `UI Labels`, `UI Helper Text`, `Messages for the User`, `Artifacts for the User`, and English-only `Internal Agent Instructions`.
- `Contracts/FacadeClassDiagram_DesignAndMaintenance.md` — process: фасады/границы/диаграммы (required reading).

### Contracts (compat / legacy filenames)
- `Contracts/DescriptionNode_ReviewSession.md` — legacy filename; redirect/compat note для узла `description`, без restart/reviewer semantics как активной возможности продукта.
- Остальные legacy-path redirect notes в `Contracts/` сохранены только ради старых ссылок из session reports / archived TODO и не используются как source of truth.

### Plans (pre-implementation / non-SSOT)
- `Plans/README.md` — правила жизненного цикла planning-доков.
- `Plans/Codex_EmptyTerminalAnswer_Recovery_Architecture.md` — hotfix intake for Codex turns that end with an empty terminal assistant after long reasoning/thinking tails; formalizes a narrow fallback that preserves the last substantive assistant candidate instead of leaving the turn thinking-only.
- `Plans/Application_Foundation_Envelope_Architecture.md` — design intake для нового лёгкого шага сразу после `Diagram Modules`; формализует `Application Root`, `Shared Zones`, `Integration Seams`, intended technologies per `Product Part` и user-facing visual envelope.
- `Plans/Implementation_Foundation_Architecture.md` — design intake для позднего branch-level шага после `Application Foundation Envelope` и approved specs/contracts выбранной wave; описывает subtree scaffold, stack-specific environments, quality gates, scripts и knowledge artifacts перед кодом.
- `Plans/MultiProvider_Orchestration_Scenarios.md` — deferred orchestration scope, ещё не начатый в реализации.
- `Plans/Runtime_GodModules_Decomposition_Architecture.md` — active structural decomposition wave для runtime hotspots и warning-zone governance.
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
