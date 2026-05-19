# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-codex-provider-experiment-planning-2026-05-19",
  "branch": "main",
  "baseHead": "ddebe437a",
  "lastRecordedCommit": "6e83c7a0f",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Kimi_Codex_Provider_Experiment_Planning_RU.md",
  "currentTaskId": "phase2-kimi-codex-implementation-slicing",
  "expectedCommitMessage": "docs: slice kimi codex implementation plan",
  "debt": {
    "expectedCommitMessage": "docs: slice kimi codex implementation plan",
    "preCommitHead": "6e83c7a0f",
    "stage": "commit_pending",
    "taskId": "phase2-kimi-codex-implementation-slicing"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Kimi_Codex_Provider_Experiment_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading перед каждым фиксом:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Каждая подзадача должна затрагивать не более 3 файлов/пакетов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Гейты через Husky не обходить.
- `kimi-codex` использует Codex App Server / GPT 5.5 instruction profile, но остается отдельным provider id `kimiCodex` для Core/UI/session artifacts.
- Settings не должен дублировать весь Codex раздел: `Kimi-Codex` defaults размещаются в Codex-family settings surface, но persisted provider defaults остаются отдельными от `codexCli`.
- Для реализации `kimi-codex` сначала доказать Codex App Server compatibility с Kimi OpenAI-compatible endpoint; без evidence нельзя добавлять полноценный provider surface.
- **Release Build Confirmation Gate:** после targeted verification остановиться и отдельно спросить пользователя, собирать ли release.
- `Scope Closeout` выполняется только после явного acceptance пользователя.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-05-19)
### Stream: Kimi-Codex Planning Source
1. [DONE] `phase0-kimi-codex-planning-intake` Создать planning-документ для экспериментального провайдера `kimi-codex`, который использует Codex App Server и GPT 5.5 instruction/flag profile для Kimi 2.6, и добавить его в Docs Index — scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Kimi_Codex_Provider_Experiment_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan kimi codex provider experiment`.
2. [DONE] Git Commit: `docs: plan kimi codex provider experiment` (hash: 6e83c7a0f)

## Phase 1 — User Planning Acceptance (owner: User, updated: 2026-05-19)
### Stream: Planning Review
1. [DONE] `phase1-kimi-codex-planning-review` Пользователь проверяет planning-документ и подтверждает, начинать ли implementation scope или скорректировать архитектуру до нарезки задач — scope: без изменения файлов; expected commit: none. Result: user requested implementation slicing and raised settings-surface decision for kimi-codex

## Phase 2 — Implementation Plan Slicing (owner: Codex, updated: 2026-05-19)
### Stream: Implementation Slicing
1. [DONE] `phase2-kimi-codex-implementation-slicing` Нарезать implementation scope по planning-документу, зафиксировать Settings decision: Codex-family settings reuse без потери отдельного provider id `kimiCodex` — scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Kimi_Codex_Provider_Experiment_Planning_RU.md`; expected commit: `docs: slice kimi codex implementation plan`.
2. [PENDING] Git Commit: `docs: slice kimi codex implementation plan` (hash: TBD)

## Phase 3 — Feasibility Spike (owner: Codex, updated: 2026-05-19)
### Stream: Kimi-Codex Provider-Home Probe
1. [TODO] `phase3-kimi-codex-home-config-probe` Добавить локальный Kimi-Codex provider-home materializer/probe config для `~/.codeai-hub/providers/kimi-codex/home` без изменения normal Codex home — scope: `packages/Codex_AppServer_Module/src/app-server/process, doc/SolidWorks-WorkFlow/Plans/Kimi_Codex_Provider_Experiment_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `feat: add kimi codex home config probe`.
2. [TODO] Git Commit: `feat: add kimi codex home config probe` (hash: TBD)
3. [TODO] `phase3-kimi-codex-app-server-probe` Добавить минимальный diagnostic runner для `codex app-server` с `model_provider=kimi`, `thread/start`, `turn/start` и categorized failure output — scope: `packages/Codex_AppServer_Module/src/diagnostics, packages/Codex_AppServer_Module/src/app-server, doc/TODO/todo-plan.md`; expected commit: `feat: probe kimi through codex app server`.
4. [TODO] Git Commit: `feat: probe kimi through codex app server` (hash: TBD)
5. [TODO] `phase3-kimi-codex-wire-api-decision` Зафиксировать evidence и выбрать `wire_api=chat` или `wire_api=responses`; если spike fails, оформить blocker вместо product integration — scope: `doc/SolidWorks-WorkFlow/Plans/Kimi_Codex_Provider_Experiment_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: record kimi codex feasibility result`.
6. [TODO] Git Commit: `docs: record kimi codex feasibility result` (hash: TBD)

## Phase 4 — Shared Codex App Server Runtime Extraction (owner: Codex, updated: 2026-05-19)
### Stream: Runtime Profile Boundary
1. [TODO] `phase4-codex-runtime-profile-types` Выделить provider-neutral Codex App Server runtime profile contract для `codexCli` и `kimiCodex` без изменения behavior normal Codex — scope: `packages/Codex_AppServer_Module/src/app-server/process, packages/Codex_AppServer_Module/src/app-server/codex-workflow-instruction-profile.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: define codex app server runtime profiles`.
2. [TODO] Git Commit: `refactor: define codex app server runtime profiles` (hash: TBD)
3. [TODO] `phase4-codex-runtime-profile-home` Подключить runtime profile к process startup/provider-home resolution, чтобы `kimiCodex` мог использовать отдельный `CODEX_HOME` и те же disabled flags — scope: `packages/Codex_AppServer_Module/src/app-server/process, packages/Codex_AppServer_Module/src/provider, doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`; expected commit: `refactor: support codex app server provider homes`.
4. [TODO] Git Commit: `refactor: support codex app server provider homes` (hash: TBD)

## Phase 5 — Kimi-Codex Provider Runtime Shell (owner: Codex, updated: 2026-05-19)
### Stream: Provider Facade And Adapter
1. [TODO] `phase5-kimi-codex-provider-facade` Создать `KimiCodex` provider facade/adapter shell that delegates to Codex App Server runtime profile with provider id `kimiCodex` — scope: `packages/Codex_AppServer_Module/src/provider, packages/Codex_AppServer_Module/src/kimi-codex, doc/TODO/todo-plan.md`; expected commit: `feat: add kimi codex provider facade`.
2. [TODO] Git Commit: `feat: add kimi codex provider facade` (hash: TBD)
3. [TODO] `phase5-kimi-codex-model-capabilities` Добавить Kimi-Codex model capability registry with conservative reasoning/summary compatibility and default Kimi 2.6 model id — scope: `packages/Codex_AppServer_Module/src/types, packages/Codex_AppServer_Module/src/kimi-codex, doc/TODO/todo-plan.md`; expected commit: `feat: add kimi codex model capabilities`.
4. [TODO] Git Commit: `feat: add kimi codex model capabilities` (hash: TBD)
5. [TODO] `phase5-kimi-codex-session-lifecycle` Добавить stale-binding/session lifecycle parity для `kimiCodex` или explicit no-op adapter behavior if Codex profile reuse already covers it — scope: `packages/Codex_AppServer_Module/src/provider, packages/Codex_AppServer_Module/src/kimi-codex, packages/Codex_AppServer_Module/src/app-server`; expected commit: `feat: support kimi codex session lifecycle`.
6. [TODO] Git Commit: `feat: support kimi codex session lifecycle` (hash: TBD)

## Phase 6 — Core Registry And Packaging (owner: Codex, updated: 2026-05-19)
### Stream: Provider Registration
1. [TODO] `phase6-kimi-codex-provider-types` Добавить provider id/type `kimiCodex` в shared/Core provider contracts without changing native `kimi` or `codexCli` ids — scope: `src/types/provider.ts, packages/core/src/provider-registry, doc/TODO/todo-plan.md`; expected commit: `feat: register kimi codex provider type`.
2. [TODO] Git Commit: `feat: register kimi codex provider type` (hash: TBD)
3. [TODO] `phase6-kimi-codex-loader-descriptor` Подключить descriptor/loader/install path для `kimiCodex` и bundled artifact resolution, переиспользуя Codex package where possible — scope: `packages/core/src/provider-registry, scripts/build-*.sh, doc/TODO/todo-plan.md`; expected commit: `feat: load kimi codex provider bundle`.
4. [TODO] Git Commit: `feat: load kimi codex provider bundle` (hash: TBD)
5. [TODO] `phase6-kimi-codex-packaging` Добавить release packaging/install verification for Kimi-Codex runtime surface without duplicating Codex bundle unnecessarily — scope: `package.json, packages/Codex_AppServer_Module/package.json, scripts/build-release.sh`; expected commit: `feat: package kimi codex provider runtime`.
6. [TODO] Git Commit: `feat: package kimi codex provider runtime` (hash: TBD)

## Phase 7 — Settings And Effective Model Identity (owner: Codex, updated: 2026-05-19)
### Stream: Settings Contract
1. [TODO] `phase7-kimi-codex-settings-schema` Добавить persisted settings schema/defaults for `providers.kimiCodex` while rendering it through Codex-family settings surface — scope: `packages/core/src/config, src/client/ui/src/components/settings, doc/TODO/todo-plan.md`; expected commit: `feat: add kimi codex settings schema`.
2. [TODO] Git Commit: `feat: add kimi codex settings schema` (hash: TBD)
3. [TODO] `phase7-kimi-codex-settings-ui` Добавить в раздел Codex UI subsection/model row `Kimi-Codex`, переиспользующий Codex reasoning/summary controls без отдельной полноценной settings tab — scope: `src/client/ui/src/components/settings, src/client/project-manager/components/settings, doc/TODO/todo-plan.md`; expected commit: `feat: add kimi codex codex-family settings`.
4. [TODO] Git Commit: `feat: add kimi codex codex-family settings` (hash: TBD)
5. [TODO] `phase7-kimi-codex-turn-config` Подключить `kimiCodex` к Core applied turn config resolver with Codex-compatible instruction/profile semantics and separate provider identity — scope: `packages/core/src/config/provider-turn-config-resolver.ts, packages/core/src/config/provider-defaults-resolver.ts, doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`; expected commit: `feat: resolve kimi codex turn config`.
6. [TODO] Git Commit: `feat: resolve kimi codex turn config` (hash: TBD)

## Phase 8 — Provider Selection And Session UI (owner: Codex, updated: 2026-05-19)
### Stream: Start Cards And Provider Inheritance
1. [TODO] `phase8-kimi-codex-start-card-provider` Добавить `Kimi-Codex` в provider descriptors/start cards for Description, Virtual Simulation, managed technical steps and Development Tree node starts — scope: `src/client/project-manager/services/provider-snapshot.ts, src/client/project-manager/components/shared, doc/TODO/todo-plan.md`; expected commit: `feat: show kimi codex in provider start cards`.
2. [TODO] Git Commit: `feat: show kimi codex in provider start cards` (hash: TBD)
3. [TODO] `phase8-kimi-codex-provider-inheritance` Обеспечить inheritance `kimiCodex` into next workflow step defaults without falling back to Claude/Codex/native Kimi — scope: `packages/core/src/remote-bridge/handlers, src/client/project-manager/services/workflow-step-start-service.ts, doc/TODO/todo-plan.md`; expected commit: `feat: preserve kimi codex provider inheritance`.
4. [TODO] Git Commit: `feat: preserve kimi codex provider inheritance` (hash: TBD)

### Stream: Status Identity
1. [TODO] `phase8-kimi-codex-status-line` Добавить user-facing `Kimi-Codex` label/tint/status panel identity while keeping runtime source distinct from `codexCli` — scope: `src/client/ui/src/session/status-panel.tsx, src/client/ui/src/session/session-id-bar.tsx, doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`; expected commit: `feat: show kimi codex session identity`.
2. [TODO] Git Commit: `feat: show kimi codex session identity` (hash: TBD)
3. [TODO] `phase8-kimi-codex-sidebar-tint` Добавить Project Manager provider tint/title mapping for `kimiCodex` in workflow tree and session surfaces — scope: `src/client/project-manager/components/layout, src/client/project-manager/services/provider-snapshot.ts, doc/TODO/todo-plan.md`; expected commit: `feat: tint kimi codex provider surfaces`.
4. [TODO] Git Commit: `feat: tint kimi codex provider surfaces` (hash: TBD)

## Phase 9 — Diagnostics And Telemetry (owner: Codex, updated: 2026-05-19)
### Stream: Native Capture
1. [TODO] `phase9-kimi-codex-native-capture` Добавить diagnostic capture provider option for `kimiCodex`, proving Codex baseInstructions and `project_doc_max_bytes=0` in provider diagnostic context — scope: `packages/core/src/provider-network-capture, packages/Codex_AppServer_Module/src/diagnostics, src/client/project-manager/components/settings`; expected commit: `feat: capture kimi codex native requests`.
2. [TODO] Git Commit: `feat: capture kimi codex native requests` (hash: TBD)
3. [TODO] `phase9-kimi-codex-session-artifacts` Сохранить normalized session artifacts under `kimiCodex` provider family and ensure labels do not appear as plain Codex — scope: `packages/core/src/unified-session, packages/Codex_AppServer_Module/src/provider, doc/TODO/todo-plan.md`; expected commit: `feat: persist kimi codex session artifacts`.
4. [TODO] Git Commit: `feat: persist kimi codex session artifacts` (hash: TBD)
5. [TODO] `phase9-kimi-codex-usage-telemetry` Подключить context/token usage only if Codex/Kimi evidence is reliable; 5-hour/weekly rows show honest unavailable state until Kimi usage source exists — scope: `packages/core/src/provider-usage-limits, src/client/ui/src/session/session-id-bar.tsx, doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionIdUsageBar.md`; expected commit: `feat: surface kimi codex telemetry state`.
6. [TODO] Git Commit: `feat: surface kimi codex telemetry state` (hash: TBD)

## Phase 10 — Documentation Sync (owner: Codex, updated: 2026-05-19)
### Stream: Module SSOT
1. [TODO] `phase10-kimi-codex-module-doc` Создать canonical module SSOT `Kimi_Codex.md` and record provider-home, Codex profile reuse, Settings decision and limitations — scope: `doc/SolidWorks-WorkFlow/Modules/Kimi_Codex.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: document kimi codex module`.
2. [TODO] Git Commit: `docs: document kimi codex module` (hash: TBD)
3. [TODO] `phase10-codex-kimi-doc-sync` Обновить Codex/Kimi docs so native Kimi and Kimi-Codex boundaries are explicit and not confused — scope: `doc/SolidWorks-WorkFlow/Modules/Codex.md, doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md, doc/SolidWorks-WorkFlow/Modules/Kimi.md`; expected commit: `docs: sync codex and kimi provider boundaries`.
4. [TODO] Git Commit: `docs: sync codex and kimi provider boundaries` (hash: TBD)

## Phase 11 — Targeted Verification (owner: Codex, updated: 2026-05-19)
### Stream: Tests And Builds
1. [TODO] `phase11-kimi-codex-targeted-tests` Run focused tests for provider descriptors, settings schema/UI, Codex App Server profile routing, native capture and provider inheritance; update plan with evidence — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record kimi codex targeted verification`.
2. [TODO] Git Commit: `docs: record kimi codex targeted verification` (hash: TBD)
3. [TODO] `phase11-kimi-codex-targeted-builds` Run targeted builds: `npm run build --workspace @codeai-hub/codex-app-server-module`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`; record results — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record kimi codex build verification`.
4. [TODO] Git Commit: `docs: record kimi codex build verification` (hash: TBD)
5. [TODO] `phase11-kimi-codex-live-smoke` Run live smoke: same Description prompt under native `Kimi` and `Kimi-Codex`; capture first-turn evidence and user-visible progress behavior — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record kimi codex live smoke`.
6. [TODO] Git Commit: `docs: record kimi codex live smoke` (hash: TBD)

## Phase 12 — Release Build (owner: Codex, updated: 2026-05-19)
### Stream: Release Build Confirmation Gate
1. [TODO] `phase12-kimi-codex-release-confirmation` Остановиться после targeted verification и запросить отдельное подтверждение пользователя на release build; не готовить release notes/version bump и не запускать release scripts до подтверждения — scope: без изменения файлов; expected commit: none.

### Stream: Release Build
1. [TODO] `phase12-kimi-codex-release-notes` После подтверждения подготовить README/CHANGELOG под будущую версию до запуска release scripts — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare kimi codex release notes`.
2. [TODO] Git Commit: `docs: prepare kimi codex release notes` (hash: TBD)
3. [TODO] `phase12-kimi-codex-release-build-start` Зафиксировать post-commit advancement перед release scripts — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: mark kimi codex release build started`.
4. [TODO] Git Commit: `docs: mark kimi codex release build started` (hash: TBD)
5. [TODO] `phase12-kimi-codex-release-build` Выполнить release checklist: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, release artifacts handoff — scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: release kimi codex provider build`.
6. [TODO] Git Commit: `chore: release kimi codex provider build` (hash: TBD)

## Phase 13 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-19)
### Stream: Native Kimi vs Kimi-Codex Retest
1. [TODO] `phase13-kimi-codex-user-retest` Пользователь устанавливает релиз и сравнивает native `Kimi` vs `Kimi-Codex` на одинаковом workflow step: progress messages, reasoning visibility, response timing, artifact quality, provider inheritance — scope: без изменения файлов; expected commit: none.

## Phase 14 — Scope Closeout (owner: Codex, updated: 2026-05-19)
### Stream: Scope Closeout
1. [TODO] `phase14-kimi-codex-closeout` После явного acceptance архивировать active plan, disposition planning source, обновить Docs Index и связанные ссылки — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive, doc/SolidWorks-WorkFlow/Plans, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close kimi codex provider experiment scope`.
2. [TODO] Git Commit: `docs: close kimi codex provider experiment scope` (hash: TBD)
3. [TODO] `phase14-kimi-codex-post-closeout-anchor` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle. Scope: handoff only; expected commit: none.
