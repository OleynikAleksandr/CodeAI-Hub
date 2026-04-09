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
- Остальные compat-redirect stubs из `Contracts/` (`Description_LegacyCleanup_Architecture`, `ProjectManager_VirtualSimulation_ColdStartRecovery`, `ProviderSessionHome_IsolationAndRecovery`, `ProviderSessionHome_SnapshotEngine_Design`, `StandaloneReviewer_Module`) удалены в рамках Phase 2 cleanup (Session025, 2026-04-09); исторические planning-доки, где они существуют, лежат в `Plans/Archive/`.

### Plans (pre-implementation / non-SSOT)
- `Plans/Archive/DiagramModules_LiveMeasurement_Rollback_Rebuild_Architecture.md` — completed rollback scope after release `1.1.915`; restored `Diagram Modules` measurement bridge behavior to the stable `1.1.914` baseline, removed the live-measurement stabilization contract from active SSOT, and shipped rollback rebuild release `1.1.916`.
- `Plans/Archive/DiagramModules_LiveMeasurement_Stabilization_Architecture.md` — completed corrective scope after release `1.1.914`; stabilized the first-open `Diagram Modules` measurement bridge with post-render re-measure triggers (`requestAnimationFrame`, `document.fonts.ready`, `ResizeObserver`) and shipped release `1.1.915`.
- `Plans/Archive/DiagramModules_ModuleShadowVisualBottom_Architecture.md` — completed corrective scope after release `1.1.913`; tightened shared module visual-bottom bounds to include the real lower card shadow in both autolayout and manual owner-resize math, then shipped release `1.1.914`.
- `Plans/Archive/ProjectManager_ReleaseRebuild_1.1.913_Architecture.md` — completed release-only scope that rebuilt Project Manager and the full bundle under version `1.1.913` after the user reported that local update did not pick up release `1.1.912`.
- `Plans/README.md` — правила жизненного цикла planning-доков.
- `Plans/DiagramModules_Sidecar_v2_LayoutParams_Architecture.md` — completed planning-doc для release `1.1.922`; описывает sidecar schema v2 с секцией `layoutParams` (per-ProductPart `columns`/`targetAspectRatio`, per-Cluster `moduleColumns`), backwards compat с v1, load path `applyFlowSidecarLayoutParams`, persist path через shell `onNodesChange`. Итоговые инварианты уже синхронизированы в `SystemArchitecture.md §6.2/§6.4` и `Clusters/Project_Manager.md §3`; сам planning-doc остаётся в active `Plans/` до phase closeout следующей сессии.
- `Plans/DevelopmentTree_BranchWorkflow_Architecture.md` — design intake для branch-level workflow сразу после `Diagram Modules`; формализует `Product Part Specification`, единые design-step'ы `Cluster Design` / `Module Design` с парой артефактов `specification + facade contract`, standalone-module path, wave-level contracts и readiness gate в `Implementation Foundation`.
- `Plans/Implementation_Foundation_Architecture.md` — design intake для позднего branch-level шага после `Diagram Modules` и approved specs/contracts выбранной wave; описывает subtree scaffold, stack-specific environments, quality gates, scripts и knowledge artifacts перед кодом.
- `Plans/MultiProvider_Orchestration_Scenarios.md` — deferred orchestration scope, ещё не начатый в реализации.
- `Plans/Archive/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md` — перенесён из `System/` в Phase 2 cleanup (Session025, 2026-04-09); historical trace autolayout итераций §11.1–§11.12 по релизам `1.1.766–1.1.915`, settled контракт уже в `SystemArchitecture.md §6.2/§6.4`.
- `Plans/Archive/Diagram_UserFacing_Layout_And_Format_Architecture.md` — перенесён из `System/` в Phase 2 cleanup; `Discussion baseline` с open questions, settled контракт в `SystemArchitecture.md §6.2` и `Clusters/Project_Manager.md §3`.
- `Plans/Archive/Diagram_Modules_StepByStep_Workflow_And_UX_Refactor.md` — перенесён из `System/` в Phase 2 cleanup; содержал React Flow references (актуально до 1.1.921), выводы интегрированы в active SSOT.
- `Plans/Archive/Diagram_Modules_ProductPart_Hierarchy_DSL_Architecture.md` — перенесён из `Contracts/` в Phase 2 cleanup; построен end-to-end на React Flow projection pipeline, удалённой в 1.1.921.
- `Plans/Archive/Greenfield_Architecture_Polygon.md` — перенесён из `System/` в Phase 2 cleanup; статус `Draft`, не являлся approved SSOT.
- `Plans/Archive/DiagramModules_InitialAutolayout_OverlapAwarePacking_Architecture.md` — completed corrective scope after release `1.1.911`; added zoom-safe ownership `bodyStartY` measurement plus overlap-aware initial packing for wide clusters and standalone modules, then shipped release `1.1.912`.
- `Plans/Archive/DiagramModules_InitialAutolayout_HierarchicalPacker_Architecture.md` — completed corrective scope after release `1.1.910`; separated seed autolayout from persisted sidecar mode, replaced repair-style first-open layout with a measured-first hierarchical packer, and shipped release `1.1.911`.
- `Plans/Archive/DiagramModules_SharedVisualBounds_And_ManualAutolayout_Architecture.md` — completed corrective scope after release `1.1.909`; replaced duplicated auto/manual boundary math with one shared visual-bounds contract, aligned measured autolayout and manual drag on the same visual-bounds engine, and shipped release `1.1.910`.
- `Plans/Archive/DiagramModules_MeasuredOwnershipReflow_Architecture.md` — completed corrective scope after release `1.1.908`; replaced repair-style measured normalization with measured-first ownership reflow so `Cluster` and `Product Part` geometry now derives from real rendered module cards plus measured ownership header boundaries, then shipped release `1.1.909`.
- `Plans/Archive/DiagramModules_MeasuredAutolayout_MinGap_Architecture.md` — completed corrective scope for `Diagram Modules` first-open overlaps after release `1.1.907`; introduced measured post-render normalization, enforced a hard `4px` minimum safe gap between rendered ownership boxes, invalidated stale sidecar geometry again, and shipped release `1.1.908`.
- `Plans/Archive/DiagramModules_Autolayout_HeightMetrics_And_SidecarFingerprint_Architecture.md` — completed corrective scope for dense/localized `Diagram Modules`; hardened initial height metrics, introduced sidecar layout fingerprinting, added regression evidence for cluster/product-part boundary safety, and shipped release `1.1.907`.
- `Plans/Archive/Remove_Foundation_Envelope_Workflow_Architecture.md` — completed corrective scope that removed `Foundation Envelope` from the active workflow and shipped the cleanup release `1.1.906`.
- `Plans/Archive/Foundation_Envelope_Architecture.md` — retired historical planning path for the removed `Foundation Envelope`; preserved only as postmortem evidence for why the step was abandoned.
- `Plans/Archive/Foundation_Envelope_VisualProjection_Architecture.md` — historical visual wave for the now-removed `Foundation Envelope`; kept only for release/postmortem traceability around `1.1.905`.
- `Plans/Archive/ProjectManager_DialogFileLinks_LauncherQueryDecode_Hotfix.md` — completed standalone PM hotfix that repaired launcher-side query decoding for `%2F`-encoded filesystem paths, shipped release `1.1.904` for user validation, and intentionally deferred the broader method/knowledge documentation pass until after validation.
- `Plans/Archive/ProjectManager_DialogFileLinks_PathEncoding_Hotfix.md` — completed standalone PM path-encoding hotfix that decodes percent-encoded dialog file paths, preserves real separators in launcher-generated `vscode://file/...` URIs, accepts the VS Code trust prompt as platform behavior, and shipped the `1.1.903` test release.
- `Plans/Archive/ProjectManager_DialogFileLinks_StandaloneFallback_Fix.md` — completed standalone PM hotfix scope that replaced the broken Chromium `vscode://file/...` navigation with launcher-host handoff and shipped the `1.1.902` test release.
- `Plans/Archive/ProjectManager_DialogFileLinks_OpenInVSCode_Architecture.md` — completed PM dialog file-link scope that routed absolute local file links into the VS Code editor, added standalone `vscode://file` fallback, synced targeted regression coverage, and shipped the `1.1.901` test release.
- `Plans/Archive/ProjectManager_WorkspaceStartup_Reset_Architecture.md` — completed startup-reset scope that fixed workspace-open routing to `Description`, removed recency-based startup heuristics, aligned session/artifact startup behavior, and shipped the `1.1.899` test release.
- `Plans/Archive/ProjectManager_LeftSidebar_ActiveStageSync_Architecture.md` — completed left-sidebar sync scope that made the workflow tree follow the canonical `activeStage`, limited expansion to the active stage branch, and shipped the `1.1.900` test release.
- `Plans/Archive/Workflow_Step_Symmetry_Architecture.md` — historical retrofit scope that aligned the then-released trunk steps on one canonical startup truth, one step-passport model, formal regression coverage, and packaged release validation before `Foundation Envelope` was retired.
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
