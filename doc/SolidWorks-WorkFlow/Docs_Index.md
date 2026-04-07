# SolidWorks-WorkFlow — Docs Index (SSOT навигация)

## 0) Start here (восстановление контекста)

Использование этого индекса:

- если активный `todo-plan.md` уже существует, список документов для текущего execution cycle нужно брать только из него;
- если предыдущий session report закрыл старый план полностью, то после обсуждения нового задания с пользователем агент использует этот индекс, чтобы выбрать релевантные документы для нового planning scope;
- этот индекс является навигационным каталогом, а не инструкцией читать все документы подряд.

1. `System/SystemArchitecture.md`
2. `System/WorkflowSteps_Overview.md`
3. `Clusters/Project_Manager.md`
4. `Clusters/CoreOrchestrator.md`
5. `Modules/Claude.md`, `Modules/Codex.md`, `Modules/Gemini.md`, `Modules/Shared_RuntimeTranslation_Module.md`, `Modules/Localization.md`, `Modules/Launcher_CEF.md`, `Modules/UI_Bundles.md`
6. `Contracts/` (только по ссылкам из документов выше)
7. `Contracts/Codex_ResponseMode_Settings_Architecture.md`
8. `Plans/` (только при запуске нового scope, deferred work или design intake перед `todo-plan.md`)

## 1) Канонические документы (этот каталог)

### Workflow Overview
- `System/WorkflowSteps_Overview.md` — SSOT шагов workflow (1→6), артефактов, OUTDATED propagation.

### System
- `System/SystemArchitecture.md` — SSOT всей системы и глобальных инвариантов.
- `System/Workflow_NewStep_Rollout_Guardrails.md` — SSOT protocol for adding or retrofitting workflow steps without split truth, startup asymmetry, continuity drift, or release-time regressions.

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
- `Plans/ProjectManager_DialogFileLinks_OpenInVSCode_Architecture.md` — active design intake for opening Project Manager agent-dialog file links in the VS Code editor via the standard editor API when a webview bridge exists, with `vscode://file` fallback for standalone PM.
- `Plans/Foundation_Envelope_Architecture.md` — design intake для нового лёгкого шага сразу после `Diagram Modules`; формализует `Application Root`, `Shared Zones`, `Integration Seams`, intended technologies per `Product Part` и user-facing visual envelope.
- `Plans/Implementation_Foundation_Architecture.md` — design intake для позднего branch-level шага после `Foundation Envelope` и approved specs/contracts выбранной wave; описывает subtree scaffold, stack-specific environments, quality gates, scripts и knowledge artifacts перед кодом.
- `Plans/MultiProvider_Orchestration_Scenarios.md` — deferred orchestration scope, ещё не начатый в реализации.
- `Plans/Archive/ProjectManager_WorkspaceStartup_Reset_Architecture.md` — completed startup-reset scope that fixed workspace-open routing to `Description`, removed recency-based startup heuristics, aligned session/artifact startup behavior, and shipped the `1.1.899` test release.
- `Plans/Archive/ProjectManager_LeftSidebar_ActiveStageSync_Architecture.md` — completed left-sidebar sync scope that made the workflow tree follow the canonical `activeStage`, limited expansion to the active stage branch, and shipped the `1.1.900` test release.
- `Plans/Archive/Workflow_Step_Symmetry_Architecture.md` — completed retrofit scope that aligned all released trunk steps (`Description`, `Virtual Simulation`, `Diagram Modules`, `Foundation Envelope`) on one canonical startup truth, one step-passport model, formal regression coverage, and packaged release validation.
- `Plans/Archive/Runtime_GodModules_Decomposition_Architecture.md` — завершённая structural decomposition wave для runtime hotspots; сохранена как historical closeout после переноса итогов в SSOT.
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
