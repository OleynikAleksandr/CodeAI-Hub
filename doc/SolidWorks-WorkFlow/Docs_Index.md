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
- `Plans/Archive/Localization_TranslationEngine_AnthropicHaiku_Architecture.md` — archived Anthropic Claude Haiku 4.5 translation engine architecture (closed by release `1.1.986`; canonical SSOT lives in `Modules/Claude.md`, `Modules/Shared_RuntimeTranslation_Module.md`, and `Modules/Localization.md`).
- `Modules/Launcher_CEF.md` — SSOT CEF Launcher module.
- `Modules/UI_Bundles.md` — SSOT UI bundles (Webview + Project Manager).
- `Modules/Session_UI/README.md` — factual inventory of the five Session UI panels inside Project Manager, including truth-paths, update channels, outputs, side effects, and code ownership.

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

### Checklists (periodic workflows)
- `Checklists/PeriodicAudit.md` — чек-лист периодического аудита кодовой базы (раз в 3-5 релизов): dead code + broken docs links через параллельных sub-agent'ов, jscpd классификация top-20 клонов по 6 категориям (LEGIT-PROVIDER / LEGIT-BOUNDARY / LEGIT-SIMILAR-BUT-DIVERGING / EXTRACT-EASY / EXTRACT-COMPLEX / WITHIN-FILE-BUG), trzy-проход grep для локализационных ключей перед deletion, execution через отдельный cycle с planning-doc + todo-plan. Precedent: 1.2.10 Audit Cleanup.

### Contracts (compat / legacy filenames)
- `Contracts/DescriptionNode_ReviewSession.md` — legacy filename; redirect/compat note для узла `description`, без restart/reviewer semantics как активной возможности продукта.
- Остальные compat-redirect stubs из `Contracts/` (`Description_LegacyCleanup_Architecture`, `ProjectManager_VirtualSimulation_ColdStartRecovery`, `ProviderSessionHome_IsolationAndRecovery`, `ProviderSessionHome_SnapshotEngine_Design`, `StandaloneReviewer_Module`) удалены в рамках Phase 2 cleanup (Session025, 2026-04-09); исторические planning-доки, где они существуют, лежат в `Plans/Archive/`.

### Plans (pre-implementation / non-SSOT)
- `Plans/README.md` — правила жизненного цикла planning-доков.
- `Plans/DevelopmentTree_BranchWorkflow_Architecture.md` — design intake для branch-level workflow сразу после `Diagram Modules`; формализует `Product Part Specification`, единые design-step'ы `Cluster Design` / `Module Design` с парой артефактов `specification + facade contract`, standalone-module path, wave-level contracts и readiness gate в `Implementation Foundation`.
- `Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md` — design draft для визуализации Development Tree в левом сайдбаре PM (Product Part → Cluster → Module без artifact leaves); фиксирует PP frame, cluster connector lines, `PP`/`CL`/`M` type badges, удаление дубликата workspace root, перенос Part/Cluster/Module artifacts в tabs Artifacts panel, tooltip-on-hover requirement и открытые вопросы (Documentation Tree, custom tooltip delay, accordion mode); содержит ссылку на интерактивный prototype `doc/tmp/prototypes/development-tree-sidebar.html`.
- `Plans/Implementation_Foundation_Architecture.md` — design intake для позднего branch-level шага после `Diagram Modules` и approved specs/contracts выбранной wave; описывает subtree scaffold, stack-specific environments, quality gates, scripts и knowledge artifacts перед кодом.
- `Plans/MultiProvider_Orchestration_Scenarios.md` — deferred orchestration scope, ещё не начатый в реализации.
- `Plans/Archive/HaikuTranslation_PostReleaseBugfixes_Architecture.md` — archived planning-doc закрытого bugfix scope релиза `1.1.987`; фиксирует расследование и repair-решения по Claude Haiku translation (fail-closed engine wiring, Core-only localization path, provider-native JSONL persistence, runtime diagnostics).
- `Plans/Archive/Gemini_Stop_Abort_And_Resume_1.2.7.md` — archived planning-doc закрытого scope релиза `1.2.7`; фиксирует root cause (destructive `resetChat` на Stop + `null` requestedProviderSessionId на rebind) и решение (удалить `resetChat`, ввести provider capability `requiresPostStopResume`, сохранять pre-stop providerSessionId в `SessionProviderBindingService`, прокидывать его в `resolveProviderSessionId` → `argv.resume`).
- `Plans/Archive/Gemini_Real_Resume_And_PM_StaleSeed_Guard_1.2.8.md` — archived planning-doc закрытого scope релиза `1.2.8`; фиксирует retest-findings после 1.2.7 (argv.resume no-op, PM stale-seed `providerSessionStatus=ready` с мёртвым id, legacy SwitchRecoveryBanner toolbar) и решение (real resume pipeline через `client.resumeChat` в `gemini-session-bootstrapper.ts`, `GeminiSessionStaleBindingError` + one-shot rebind retry в `SessionRequestHandlerMessageDispatch`, удаление SwitchRecoveryBanner, nested install layout через правку `GEMINI_INSTALLER_PATHS`).
- `Plans/Archive/Gemini_InlineThoughtSplit_And_PreToolEnglishText_1.2.9.md` — archived planning-doc закрытого scope релиза `1.2.9`; фиксирует discovery после 1.2.8 retest (inline `[Thought: true]` token между english thought-summary и target-language финалом в одном `content`-потоке без `ptype: "thought"` events + english pre-tool progress-text перед первым `tool_call_request` на старте сессии с Cyrillic target) и решение (regex-splitter `/\[Thought:\s*(true|false)\]/` в `gemini-assistant-event-normalizer.ts` с routing pre-marker через `thought-translator-service` + `preToolAssistantSegment` snapshot в `TurnAccumulator` на первом `tool_call_request` с эвристикой `shouldReclassifyAsThinking` по Cyrillic-family target и U+0400..U+052F detection).
- `Plans/Archive/Audit_Cleanup_1.2.10.md` — archived planning-doc закрытого audit-cycle `1.2.10` (первый формальный периодический аудит); фиксирует 4 направления (A docs+config / B localization keys / C duplication / D process formalization), результаты (7 loc keys deleted + 3 extract refactors: `useBootstrapSettings` hook, `createWorkspaceFileHandler` factory, schema-utils consolidation через `agents/shared`; `check:dup` 2.06% → 1.97%) и новый SSOT invariant 29 об acceptable parallel-scaffolding duplication.
- `Plans/Archive/Audit_Cleanup_1.2.10_DryRun_LocKeys.md` — appendix к archived 1.2.10 cycle; полный three-pass grep-отчёт по 278 keys из 4 approved dicts (204 alive / 67 suspicious / 7 certainly-dead) с подробной breakdown'ной методологией для будущих audit cycles.
- `Plans/Archive/Gemini_InitialWatchdog_Bump_1.2.11.md` — archived planning-doc закрытого scope релиза `1.2.11`; фиксирует regression выявленную на 1.2.10 retest (Gemini 3.1 Pro + thinkingLevel=high на Description step падал через 60с с `Gemini stream stalled after 60s without progress` — deep-reasoning phase на больших prompt'ах превышает старый watchdog) и решение (bump `DEFAULT_STALLED_TURN_WATCHDOG_MS` 60_000 → 240_000 в `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`; post-tool 120_000 без изменений). Adaptive-per-thinking-level deferred на follow-up cycle если 240с окажется неподходящим.
- `Plans/Archive/Gemini_AbortCrash_And_MisroutedThinking_1.2.12.md` — archived planning-doc закрытого scope релиза `1.2.12`; фиксирует два бага, выявленных на 1.2.11 retest: (a) Core daemon crash от uncaughtException `AbortError` из `@google/gemini-cli-core` `GeminiClient.processTurn` когда cli-core сам вызывает `controller.abort()` на внутреннем loop detection (решение: `process.on("uncaughtException")` handler в `packages/core/src/index.ts` с selective suppression для `@google/gemini-cli-core` stacks); (b) mis-routed thinking content от Gemini 3.1 Pro при thinkingLevel=high — internal meta-prompt (`sthought`, `CRITICAL INSTRUCTION`, etc.) через `Content` events вместо `Thought` events (решение: `hasMisroutedThinkingPrefix` detector в `gemini-assistant-event-normalizer.ts` + reroute через существующий `emitInlineThoughtAsThinking` overlay path). Новый SSOT Invariant 30 (Provider uncaughtException safety); Invariant 7 расширен.
- `Plans/Archive/ModelLabel_FlickerFix_1.2.13.md` — archived planning-doc закрытого scope релиза `1.2.13`; фиксирует cosmetic bug, выявленный на 1.2.12 retest — UI label в session status panel мерцал между `Gemini 3.1 Pro Preview (thinking high)` и `Gemini 3.1 Pro Preview (high)` внутри одного turn'а. Root cause: два broadcast-пути `session:model:update` (raw SDK `model_info` vs applied-turn-config dispatch) отправляли modelId в разных формах (`gemini-3.1-pro-preview` vs `gemini-3.1-pro-preview thinking:high`), UI renderer парсил их по-разному. Решение: обогатить SDK-путь через новый `SessionRequestHandlerAppliedTurnConfig.resolveEffectiveModelId(providerId, targetModelId)` — оба пути теперь эмитят одну effective identity. Invariant 14 (Effective model identity SSOT) расширен broadcast-contract'ом.
- `Plans/Archive.zip` + `Plans/Archive.README.md` — сжатый архив исторических planning-документов (Session023+ rollback волны Diagram Modules autolayout, Foundation Envelope история, локализационные волны, PM hotfixes `1.1.899–1.1.916`, рефакторинг рантайма, Sidecar v2 и projection rename из Session025, закрытый provider-override scope `StageConfirmationCard_Architecture.md` из релиза `1.1.972`, закрытый thinking-translation overlay scope `ThinkingTranslationOverlay_Architecture.md` из релиза `1.1.973`, закрытый translation-engine selector scope `Localization_TranslationEngine_CodexModels_Architecture.md` из релиза `1.1.975`, закрытый Codex release-hotfix scope `Codex_TranslationEngine_ReleaseHotfix_Architecture.md` из релиза `1.1.976`, закрытый post-release regression scope `Codex_PostRelease_TranslationRegression_Architecture.md` из релиза `1.1.977`, закрытый universal chunked translation scope `Universal_ChunkedTranslation_Architecture.md` из релиза `1.1.979`, закрытый localization recovery scope `Localization_Settings_RestartHydration_Architecture.md` из релиза `1.1.980`, закрытый interface-localization batching / PM blank-screen hotfix scope `Localization_InterfaceBatching_And_PMBlankScreen_Architecture.md` из релиза `1.1.981`, закрытый Codex thinking bootstrap-path hotfix scope `Codex_ThinkingTranslation_BootstrapPath_Hotfix_Architecture.md` из релиза `1.1.983`, а также закрытый reasoning no-chunking scope `Reasoning_NoChunking_Architecture.md` из релиза `1.1.984`, закрытый incremental localization sync + emission-time thinking visibility scope `Localization_IncrementalSync_And_ThinkingVisibility_Architecture.md` из релиза `1.1.985`), изначально compressed в Phase 3 cleanup (Session025, 2026-04-09) и пополняется при закрытии каждого execution cycle. Для доступа к конкретному плану — см. инструкции в `Archive.README.md`. Git history для каждого архивного документа сохранена и доступна через `git log --all --follow`.

## 2) Runtime templates (Description)

Каноничные bundled-шаблоны для шага `Description` (source-пути внутри `BUNDLED_TEMPLATE_SOURCES` в `packages/core/src/templates/bundled-templates.ts`; материализуются `template-sync-service` в `~/.codeai-hub/templates/description/` при старте):
- `.codeai-hub/templates/description/questionnaire-template.md` — анкета pre-submit.
- `.codeai-hub/templates/description/description-template.md` — user-facing Help (pre-submit и post-submit).
- `.codeai-hub/templates/description/description-collector-prompt.md` — инструкции Description Agent (file-first).

Per-workspace instances шага `Description` (создаются при открытии workflow, не bundled):
- `.codeai-hub/codeai-hub/description/questionnaire.md` — копия анкеты для конкретного workspace.
- `.codeai-hub/codeai-hub/description/description-step.json` — state шага (paths, timestamps, workspaceSlug).

## 3) Правило миграции

- Новые правки делаем только в SSOT-файлах этого каталога.
- Новый scope сначала описываем в `Plans/`, и только после реализации переносим итоговый SSOT в `System/`, `Clusters/`, `Modules/` или `Contracts/`.
- Legacy документы используем как редиректы/compat notes, но не описываем в них поддерживаемые product-возможности, уже снятые из живого кода.
