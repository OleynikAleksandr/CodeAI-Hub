# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-provider-module-implementation-2026-05-18",
  "branch": "main",
  "baseHead": "cb93c430b",
  "lastRecordedCommit": "e62d93710",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_2_6_Module_Implementation_Planning_RU.md",
  "currentTaskId": "phase0-kimi-plan-ui-surface-revision",
  "expectedCommitMessage": "docs: detail kimi ui integration surfaces",
  "debt": {
    "expectedCommitMessage": "docs: detail kimi ui integration surfaces",
    "preCommitHead": "e62d93710",
    "stage": "commit_pending",
    "taskId": "phase0-kimi-plan-ui-surface-revision"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_2_6_Module_Implementation_Planning_RU.md`
- **User-provided runtime prerequisite:** `kimi` CLI уже установлен и авторизован в системе; implementation обязана не использовать реальный `~/.kimi` как CodeAI runtime state.
- **Hard provider-home contract:** Kimi runtime всегда запускается с `KIMI_SHARE_DIR=~/.codeai-hub/providers/kimi/home`; provider-home path не должен зависеть от shell HOME и не должен писать CodeAI-managed state в пользовательский `~/.kimi`.
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_2_6_Module_Implementation_Planning_RU.md`
- **External implementation references:**
  - Kimi Code Overview: `https://www.kimi.com/code/docs/en/`
  - Kimi Code CLI Quick Start: `https://www.kimi.com/code/docs/en/kimi-code-cli/getting-started.html`
  - Kimi Code Wire Protocol: `https://www.kimi.com/code/docs/en/kimi-code-cli/customization/wire-protocol.html`
  - Kimi Code Environment Variables: `https://www.kimi.com/code/docs/en/kimi-code-cli/configuration/environment-variables.html`
  - Kimi Code Data Locations: `https://www.kimi.com/code/docs/en/kimi-code-cli/configuration/data-locations.html`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading перед каждым фиксом:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Каждая подзадача должна затрагивать не более 3 файлов/пакетов. Если фактический scope шире — сначала разбить задачу и обновить план отдельной microtask.
- Для Kimi module обязательно создать самостоятельный facade class/entrypoint (`KimiProviderAdapter` + public `src/index.ts` export); внешняя интеграция Core не должна обращаться к внутренним Wire/process/session классам напрямую.
- UI/Project Manager integration нельзя считать завершённой, пока Kimi явно не появился во всех provider surfaces: Settings provider tab/card, Description submit provider picker, workflow start cards, Development Tree start/fix cards, Session UI status-line/model chips, provider labels/colors, native capture/workbench where applicable.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Kimi provider-home isolation является blocking requirement: любой runtime/probe/test должен явно использовать `KIMI_SHARE_DIR=~/.codeai-hub/providers/kimi/home` или CodeAI-owned equivalent resolver.
- До production интеграции Kimi Wire сначала должен быть получен runtime proof: старт, terminal prompt, resume, cancel и raw Wire evidence.
- Гейты через Husky не обходить: `git commit` запускает `.husky/pre-commit`, `commit-msg`, `post-commit`; `--no-verify` запрещён.
- Таргетные сборки выполняются вручную перед закрытием соответствующего Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview` по затронутому scope.
- **Release Build Confirmation Gate:** после завершения фиксов и targeted verification остановиться и отдельно спросить пользователя, собирать ли release. Не запускать `./scripts/build-all.sh` / `./scripts/build-release.sh --use-current-version` и не готовить release notes без явного подтверждения.
- `Scope Closeout` выполняется только после явного acceptance пользователя.

## Phase 0 — Plan Activation (owner: Codex, updated: 2026-05-18)
### Stream: Implementation Plan Activation
1. [DONE] `phase0-kimi-implementation-plan` Создать active `doc/TODO/todo-plan.md` под реализацию Kimi provider module и Core/Project Manager integration — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add kimi provider implementation todo plan`.
2. [DONE] Git Commit: `docs: add kimi provider implementation todo plan` (hash: e62d93710)
3. [DONE] `phase0-kimi-plan-ui-surface-revision` Детализировать Kimi UI/PM/settings/status surfaces и facade requirement в active plan до начала runtime implementation — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: detail kimi ui integration surfaces`.
4. [PENDING] Git Commit: `docs: detail kimi ui integration surfaces` (hash: TBD)

## Phase 1 — Runtime Proof And Module Scaffold (owner: Codex, updated: 2026-05-18)
### Stream: Kimi Wire Runtime Proof
1. [TODO] `phase1-kimi-wire-runtime-proof` Проверить установленный `kimi` CLI в isolated provider-home: `KIMI_SHARE_DIR=~/.codeai-hub/providers/kimi/home`, выполнить минимальный `kimi --wire` prompt/resume/cancel probe и сохранить raw evidence в ignored scratch или tracked planning note при необходимости — scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_2_6_Module_Implementation_Planning_RU.md, doc/tmp`; expected commit: `docs: capture kimi wire runtime proof`.
2. [TODO] Git Commit: `docs: capture kimi wire runtime proof` (hash: TBD)

### Stream: Kimi Module Package Scaffold
1. [TODO] `phase1-kimi-package-scaffold` Создать `packages/Kimi_Module` с package metadata, public facade export и минимальным provider adapter skeleton без Core registry integration; `KimiProviderAdapter` является самостоятельным facade class — scope: `packages/Kimi_Module/package.json, packages/Kimi_Module/src/index.ts, packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`; expected commit: `feat: scaffold kimi provider module`.
2. [TODO] Git Commit: `feat: scaffold kimi provider module` (hash: TBD)

### Stream: Kimi Runtime Home Contract
1. [TODO] `phase1-kimi-runtime-home` Реализовать provider-home resolver/bootstrap для `~/.codeai-hub/providers/kimi/home` и env builder с `KIMI_SHARE_DIR` / `KIMI_CLI_NO_AUTO_UPDATE`; добавить unit tests — scope: `packages/Kimi_Module`; expected commit: `feat: add kimi provider home bootstrap`.
2. [TODO] Git Commit: `feat: add kimi provider home bootstrap` (hash: TBD)

## Phase 2 — Wire Transport And Session Lifecycle (owner: Codex, updated: 2026-05-18)
### Stream: Wire Process Bridge
1. [TODO] `phase2-kimi-wire-process` Реализовать process bridge для `kimi --wire`: spawn/env/stdin/stdout framing, startup failure normalization и shutdown cleanup — scope: `packages/Kimi_Module`; expected commit: `feat: add kimi wire process bridge`.
2. [TODO] Git Commit: `feat: add kimi wire process bridge` (hash: TBD)

### Stream: Wire Protocol Router
1. [TODO] `phase2-kimi-wire-router` Реализовать JSON-RPC/Wire request-response router, event/request dispatch и malformed-frame handling с unit tests — scope: `packages/Kimi_Module`; expected commit: `feat: add kimi wire protocol router`.
2. [TODO] Git Commit: `feat: add kimi wire protocol router` (hash: TBD)

### Stream: Session Lifecycle
1. [TODO] `phase2-kimi-session-lifecycle` Реализовать create/resume/send/cancel/close lifecycle поверх Wire, capture/restore providerSessionId и typed stale-binding error `KIMI_SESSION_STALE_BINDING` — scope: `packages/Kimi_Module`; expected commit: `feat: add kimi session lifecycle`.
2. [TODO] Git Commit: `feat: add kimi session lifecycle` (hash: TBD)

## Phase 3 — Provider Event Normalization (owner: Codex, updated: 2026-05-18)
### Stream: Lifecycle And Message Events
1. [TODO] `phase3-kimi-event-normalization` Нормализовать Wire prompt lifecycle и assistant/progress/thinking messages в Core provider event surface без UI authority leaks — scope: `packages/Kimi_Module`; expected commit: `feat: normalize kimi provider events`.
2. [TODO] Git Commit: `feat: normalize kimi provider events` (hash: TBD)

### Stream: Provider Requests And Failure Classification
1. [TODO] `phase3-kimi-requests-failures` Нормализовать Wire `request`/approval/tool/question envelopes и auth/quota/service/unsupported-model failures в provider-neutral recovery surface — scope: `packages/Kimi_Module, packages/core/src/remote-bridge/handlers`; expected commit: `feat: classify kimi provider requests and failures`.
2. [TODO] Git Commit: `feat: classify kimi provider requests and failures` (hash: TBD)

## Phase 4 — Core Provider Registry Integration (owner: Codex, updated: 2026-05-18)
### Stream: Provider Registry And Installer Paths
1. [TODO] `phase4-kimi-provider-registry` Добавить Kimi provider descriptor, module loader/installer path metadata и installed/auth-ready detection без включения provider для UI до готовности — scope: `packages/core/src/provider-registry, packages/Kimi_Module`; expected commit: `feat: register kimi provider module`.
2. [TODO] Git Commit: `feat: register kimi provider module` (hash: TBD)

### Stream: Effective Model Identity
1. [TODO] `phase4-kimi-model-identity` Добавить Kimi default model identity (`kimi-for-coding`) и settings/applied-turn-config path без перезаписи существующих sessions — scope: `packages/core/src/config, packages/core/src/session-model-binding, src/types`; expected commit: `feat: add kimi model identity settings`.
2. [TODO] Git Commit: `feat: add kimi model identity settings` (hash: TBD)

### Stream: Core Stale-Binding Recovery
1. [TODO] `phase4-kimi-stale-binding-core` Подключить `KIMI_SESSION_STALE_BINDING` к Core one-shot stale-binding recovery path и post-rebind lifecycle без silent drop — scope: `packages/core/src/remote-bridge/handlers, packages/Kimi_Module`; expected commit: `feat: add kimi stale binding recovery`.
2. [TODO] Git Commit: `feat: add kimi stale binding recovery` (hash: TBD)

## Phase 5 — Project Manager And Settings Integration (owner: Codex, updated: 2026-05-18)
### Stream: Shared Provider Catalog
1. [TODO] `phase5-kimi-provider-types` Добавить `kimiCode` в shared provider type/catalog и Session UI provider allowlist, чтобы Kimi records/provider catalog не отбрасывались клиентом — scope: `src/types/provider.ts, src/client/ui/src/session/session-candidates.ts, src/client/ui/src/session/model-info-builder.ts`; expected commit: `feat: add kimi shared provider catalog`.
2. [TODO] Git Commit: `feat: add kimi shared provider catalog` (hash: TBD)

### Stream: Kimi Model Registry
1. [TODO] `phase5-kimi-model-registry` Создать shared Kimi model registry для UI/settings/start cards/status display (`kimi-for-coding`, label `Kimi 2.6 / Kimi Code`) — scope: `src/types/kimi-model-registry.ts, src/client/project-manager/services/kimi-model-registry-alignment.test.ts, packages/Kimi_Module/src/types/kimi-model-capabilities.ts`; expected commit: `feat: add kimi model registry`.
2. [TODO] Git Commit: `feat: add kimi model registry` (hash: TBD)

### Stream: Settings State And Persistence
1. [TODO] `phase5-kimi-settings-state` Добавить Kimi в settings schema/default mapping/raw snapshot без ломки существующих Claude/Codex/Gemini settings — scope: `src/client/ui/src/components/settings/settings-state-model.ts, src/client/ui/src/components/settings/settings-state-raw.ts, src/client/ui/src/components/settings/settings-state-helpers.ts`; expected commit: `feat: add kimi settings state`.
2. [TODO] Git Commit: `feat: add kimi settings state` (hash: TBD)

### Stream: Settings UI Card
1. [TODO] `phase5-kimi-settings-card` Добавить отдельную Kimi settings card/tab для default model, provider-home note и availability/update controls — scope: `src/client/ui/src/components/settings/kimi-default-model-card.tsx, src/client/ui/src/components/settings/settings-view.tsx, src/client/project-manager/components/settings/use-project-manager-settings-state.ts`; expected commit: `feat: add kimi settings card`.
2. [TODO] Git Commit: `feat: add kimi settings card` (hash: TBD)

### Stream: Description Submit Provider Picker
1. [TODO] `phase5-kimi-description-submit-picker` Убедиться, что Description submit provider picker принимает `kimiCode`, показывает Kimi label/model и передаёт providerId в Core без отдельной client authority — scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx, src/client/project-manager/components/description/description-provider-picker.tsx, src/client/project-manager/services/description-submit-service.ts`; expected commit: `feat: add kimi description provider picker`.
2. [TODO] Git Commit: `feat: add kimi description provider picker` (hash: TBD)

### Stream: Workflow Start Cards Model Selection
1. [TODO] `phase5-kimi-start-card-models` Добавить Kimi model/reasoning options в workflow start cards и settings persistence barrier для Virtual Simulation, Diagram Modules, Application Skeleton, Quality Gates — scope: `src/client/project-manager/components/shared/stage-start-model-selection.ts, src/client/project-manager/services/workflow-step-start-service.ts, src/client/project-manager/services/workflow-step-start-service.settings-barrier.test.ts`; expected commit: `feat: add kimi workflow start model selection`.
2. [TODO] Git Commit: `feat: add kimi workflow start model selection` (hash: TBD)

### Stream: Workflow Start Cards Provider UI
1. [TODO] `phase5-kimi-start-card-provider-ui` Добавить Kimi tint/disabled/selected rendering в common workflow start/fix cards, включая Development Tree start/fix surfaces через общий provider picker path — scope: `src/client/project-manager/components/shared/stage-confirmation-card.tsx, src/client/project-manager/components/shared/stage-confirmation-card-provider-tint.ts, src/client/project-manager/components/shared/stage-artifact-fix-button.tsx`; expected commit: `feat: add kimi workflow provider card ui`.
2. [TODO] Git Commit: `feat: add kimi workflow provider card ui` (hash: TBD)

### Stream: Status Line Model Display
1. [TODO] `phase5-kimi-status-line-display` Добавить Kimi provider button class, model display name и `kimi-for-coding` status-line rendering в Session UI — scope: `src/client/ui/src/session/status-panel.tsx, src/client/ui/src/session/status-panel-model-picker.tsx, src/client/ui/src/session/status-panel.test.tsx`; expected commit: `feat: add kimi session status line`.
2. [TODO] Git Commit: `feat: add kimi session status line` (hash: TBD)

### Stream: Runtime Model Sync And Switch Callbacks
1. [TODO] `phase5-kimi-runtime-model-sync` Подключить Kimi model update/switch callback path для runtime/dialog session views; если Kimi model switch не поддержан в first release, status chip остаётся display-only с явным no-op contract — scope: `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx, src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx, src/client/project-manager/services/switch-api.ts`; expected commit: `feat: add kimi runtime model sync hooks`.
2. [TODO] Git Commit: `feat: add kimi runtime model sync hooks` (hash: TBD)

### Stream: Provider Design Tokens
1. [TODO] `phase5-kimi-provider-design-tokens` Добавить Kimi provider color tokens для Session UI/Project Manager tree/cards/status chips без изменения существующих Claude/Codex/Gemini цветов — scope: `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html, packages/ui/project-manager/styles.css, src/client/ui/src/session/session.css`; expected commit: `feat: add kimi provider design tokens`.
2. [TODO] Git Commit: `feat: add kimi provider design tokens` (hash: TBD)

## Phase 6 — Diagnostics, Usage And Documentation (owner: Codex, updated: 2026-05-18)
### Stream: Native Wire Capture
1. [TODO] `phase6-kimi-wire-capture` Реализовать Kimi native diagnostic capture на Wire evidence: Core-owned `.jsonl`/`.md` artifacts, provider-home `wire.jsonl` provenance и redaction policy — scope: `packages/Kimi_Module, packages/core/src/provider-network-capture, src/client/project-manager/components/settings`; expected commit: `feat: add kimi wire diagnostic capture`.
2. [TODO] Git Commit: `feat: add kimi wire diagnostic capture` (hash: TBD)

### Stream: Usage Limits Boundary
1. [TODO] `phase6-kimi-usage-boundary` Добавить Kimi usage-limits facade stub или real reader только при стабильном official endpoint; UI должен показывать unavailable state без stuck loading — scope: `packages/core/src/provider-usage-limits, src/client/ui/src/session, packages/Kimi_Module`; expected commit: `feat: add kimi usage limits boundary`.
2. [TODO] Git Commit: `feat: add kimi usage limits boundary` (hash: TBD)

### Stream: Module SSOT Documentation
1. [TODO] `phase6-kimi-module-docs` Создать `doc/SolidWorks-WorkFlow/Modules/Kimi.md`, обновить `Docs_Index.md` и синхронизировать SystemArchitecture provider list/invariants — scope: `doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs: add kimi provider module ssot`.
2. [TODO] Git Commit: `docs: add kimi provider module ssot` (hash: TBD)

## Phase 7 — Packaging And Targeted Verification (owner: Codex, updated: 2026-05-18)
### Stream: Build And Packaging Integration
1. [TODO] `phase7-kimi-packaging` Добавить Kimi module в build/package scripts и provider artifact flow без изменения версий вручную — scope: `scripts, package.json, packages/Kimi_Module`; expected commit: `feat: package kimi provider module`.
2. [TODO] Git Commit: `feat: package kimi provider module` (hash: TBD)

### Stream: Targeted Builds
1. [TODO] `phase7-kimi-targeted-builds` Выполнить targeted verification для затронутых пакетов/клиентов (`packages/Kimi_Module`, `packages/core`, UI/PM если затронуты) и зафиксировать результаты в плане — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record kimi targeted verification`.
2. [TODO] Git Commit: `docs: record kimi targeted verification` (hash: TBD)

### Stream: Release Build Confirmation Gate
1. [TODO] `phase7-kimi-release-confirmation` Остановиться после targeted verification и запросить у пользователя отдельное подтверждение на release build; не готовить release notes/version bump и не запускать release scripts до подтверждения — scope: без изменения файлов; expected commit: none.

### Stream: Release Build
1. [TODO] `phase7-kimi-release-build` После явного подтверждения пользователя выполнить release checklist: future version docs update, clean tree, `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, release artifacts handoff — scope: `README.md, CHANGELOG.md, package manifests, doc/TODO/todo-plan.md, doc/tmp/releases`; expected commit: `chore: release kimi provider module build`.
2. [TODO] Git Commit: `chore: release kimi provider module build` (hash: TBD)

## Phase 8 — User Workflow Acceptance And Closeout (owner: Codex, updated: 2026-05-18)
### Stream: User Workflow Acceptance Testing
1. [TODO] `phase8-kimi-user-acceptance` Передать пользователю release/working build для установки и проверки Kimi provider workflow; дождаться явного acceptance или bug report — scope: без изменения файлов; expected commit: none.

### Stream: Scope Closeout
1. [TODO] `phase8-kimi-closeout` После явного acceptance закрыть scope: архивировать active plan, определить disposition implementation planning source, обновить `Docs_Index.md` и связанные ссылки — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans`; expected commit: `docs: close kimi provider implementation scope`.
2. [TODO] Git Commit: `docs: close kimi provider implementation scope` (hash: TBD)
3. [TODO] `phase8-kimi-post-closeout-handoff` Reserved post-closeout handoff anchor — scope: `doc/TODO/todo-plan.md`; expected commit: none.
