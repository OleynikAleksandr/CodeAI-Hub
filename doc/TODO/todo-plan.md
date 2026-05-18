# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-provider-module-implementation-2026-05-18",
  "branch": "main",
  "baseHead": "cb93c430b",
  "lastRecordedCommit": "03f6e0c70",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_2_6_Module_Implementation_Planning_RU.md",
  "currentTaskId": "phase8-kimi-workspace-hotfix-release-build-start",
  "expectedCommitMessage": "docs: mark kimi workspace hotfix release build started",
  "debt": {
    "expectedCommitMessage": "docs: mark kimi workspace hotfix release build started",
    "preCommitHead": "03f6e0c70",
    "stage": "commit_pending",
    "taskId": "phase8-kimi-workspace-hotfix-release-build-start"
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
4. [DONE] Git Commit: `docs: detail kimi ui integration surfaces` (hash: bcf3ab1f9)

## Phase 1 — Runtime Proof And Module Scaffold (owner: Codex, updated: 2026-05-18)
### Stream: Kimi Wire Runtime Proof
1. [DONE] `phase1-kimi-wire-runtime-proof` Проверить установленный `kimi` CLI в isolated provider-home: `KIMI_SHARE_DIR=~/.codeai-hub/providers/kimi/home`, выполнить минимальный `kimi --wire` prompt/resume/cancel probe и сохранить raw evidence в ignored scratch или tracked planning note при необходимости — scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_2_6_Module_Implementation_Planning_RU.md, doc/tmp`; expected commit: `docs: capture kimi wire runtime proof`.
2. [DONE] Git Commit: `docs: capture kimi wire runtime proof` (hash: faa5f193c)

#### Runtime proof evidence (2026-05-18)
- Local CLI identity: `kimi info --json` reports `kimi_cli_version=1.44.0` and `wire_protocol_version=1.10`.
- Probe A, isolated runtime only: `KIMI_SHARE_DIR=~/.codeai-hub/providers/kimi/home kimi --wire --work-dir <repo>` completed `initialize`, then `prompt` returned JSON-RPC error `-32001` / `LLM is not set`.
- Probe B, isolated runtime plus authorized user config: `KIMI_SHARE_DIR=~/.codeai-hub/providers/kimi/home kimi --wire --config-file ~/.kimi/config.toml --work-dir <repo>` completed `initialize`, emitted `TurnBegin`, `StepBegin`, streamed `ContentPart` tokens for `2 + 2 будет 4.`, emitted `StatusUpdate` and `TurnEnd`, then returned `prompt.result.status=finished`.
- Implementation implication: Kimi bootstrap must explicitly import or reference the already authorized Kimi config/model-provider mapping while keeping runtime/session writes under `~/.codeai-hub/providers/kimi/home`; `KIMI_SHARE_DIR` alone is not enough to pick up an existing `~/.kimi` login/config.

### Stream: Kimi Module Package Scaffold
1. [DONE] `phase1-kimi-package-scaffold` Создать `packages/Kimi_Module` с package metadata, public facade export и минимальным provider adapter skeleton без Core registry integration; `KimiProviderAdapter` является самостоятельным facade class — scope: `packages/Kimi_Module/package.json, packages/Kimi_Module/src/index.ts, packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`; expected commit: `feat: scaffold kimi provider module`.
2. [DONE] Git Commit: `feat: scaffold kimi provider module` (hash: 97728b30f)

### Stream: Kimi Runtime Home Contract
1. [DONE] `phase1-kimi-runtime-home` Реализовать provider-home resolver/bootstrap для `~/.codeai-hub/providers/kimi/home` и env builder с `KIMI_SHARE_DIR` / `KIMI_CLI_NO_AUTO_UPDATE`; добавить unit tests — scope: `packages/Kimi_Module`; expected commit: `feat: add kimi provider home bootstrap`.
2. [DONE] Git Commit: `feat: add kimi provider home bootstrap` (hash: 72cefbef1)

## Phase 2 — Wire Transport And Session Lifecycle (owner: Codex, updated: 2026-05-18)
### Stream: Wire Process Bridge
1. [DONE] `phase2-kimi-wire-process` Реализовать process bridge для `kimi --wire`: spawn/env/stdin/stdout framing, startup failure normalization и shutdown cleanup — scope: `packages/Kimi_Module`; expected commit: `feat: add kimi wire process bridge`.
2. [DONE] Git Commit: `feat: add kimi wire process bridge` (hash: e500a17c5)

### Stream: Wire Protocol Router
1. [DONE] `phase2-kimi-wire-router` Реализовать JSON-RPC/Wire request-response router, event/request dispatch и malformed-frame handling с unit tests — scope: `packages/Kimi_Module`; expected commit: `feat: add kimi wire protocol router`.
2. [DONE] Git Commit: `feat: add kimi wire protocol router` (hash: eeaecfff7)

### Stream: Session Lifecycle
1. [DONE] `phase2-kimi-session-lifecycle` Реализовать create/resume/send/cancel/close lifecycle поверх Wire, capture/restore providerSessionId и typed stale-binding error `KIMI_SESSION_STALE_BINDING` — scope: `packages/Kimi_Module`; expected commit: `feat: add kimi session lifecycle`.
2. [DONE] Git Commit: `feat: add kimi session lifecycle` (hash: 5ce3201ac)

## Phase 3 — Provider Event Normalization (owner: Codex, updated: 2026-05-18)
### Stream: Lifecycle And Message Events
1. [DONE] `phase3-kimi-event-normalization` Нормализовать Wire prompt lifecycle и assistant/progress/thinking messages в Core provider event surface без UI authority leaks — scope: `packages/Kimi_Module`; expected commit: `feat: normalize kimi provider events`.
2. [DONE] Git Commit: `feat: normalize kimi provider events` (hash: 60e4beae9)

### Stream: Provider Requests And Failure Classification
1. [DONE] `phase3-kimi-requests-failures` Нормализовать Wire `request`/approval/tool/question envelopes и auth/quota/service/unsupported-model failures в provider-neutral recovery surface — scope: `packages/Kimi_Module, packages/core/src/remote-bridge/handlers`; expected commit: `feat: classify kimi provider requests and failures`.
2. [DONE] Git Commit: `feat: classify kimi provider requests and failures` (hash: d3e8933e5)

## Phase 4 — Core Provider Registry Integration (owner: Codex, updated: 2026-05-18)
### Stream: Provider Registry And Installer Paths
1. [DONE] `phase4-kimi-provider-registry` Добавить Kimi provider descriptor, module loader/installer path metadata и installed/auth-ready detection без включения provider для UI до готовности — scope: `packages/core/src/provider-registry, packages/Kimi_Module`; expected commit: `feat: register kimi provider module`.
2. [DONE] Git Commit: `feat: register kimi provider module` (hash: 690657037)

### Stream: Effective Model Identity
1. [DONE] `phase4-kimi-model-identity` Добавить Kimi default model identity (`kimi-for-coding`) и settings/applied-turn-config path без перезаписи существующих sessions — scope: `packages/core/src/config, packages/core/src/session-model-binding, src/types`; expected commit: `feat: add kimi model identity settings`.
2. [DONE] Git Commit: `feat: add kimi model identity settings` (hash: 246468527)

### Stream: Core Stale-Binding Recovery
1. [DONE] `phase4-kimi-stale-binding-core` Подключить `KIMI_SESSION_STALE_BINDING` к Core one-shot stale-binding recovery path и post-rebind lifecycle без silent drop — scope: `packages/core/src/remote-bridge/handlers, packages/Kimi_Module`; expected commit: `feat: add kimi stale binding recovery`.
2. [DONE] Git Commit: `feat: add kimi stale binding recovery` (hash: 265cb98b2)

## Phase 5 — Project Manager And Settings Integration (owner: Codex, updated: 2026-05-18)
### Stream: Shared Provider Catalog
1. [DONE] `phase5-kimi-provider-types` Добавить `kimiCode` в shared provider type/catalog и Session UI provider allowlist, чтобы Kimi records/provider catalog не отбрасывались клиентом — scope: `src/types/provider.ts, src/client/ui/src/session/session-candidates.ts, src/client/ui/src/session/model-info-builder.ts`; expected commit: `feat: add kimi shared provider catalog`.
2. [DONE] Git Commit: `feat: add kimi shared provider catalog` (hash: 888b2e432)

### Stream: Kimi Model Registry
1. [DONE] `phase5-kimi-model-registry` Создать shared Kimi model registry для UI/settings/start cards/status display (`kimi-for-coding`, label `Kimi 2.6 / Kimi Code`) — scope: `src/types/kimi-model-registry.ts, src/client/project-manager/services/kimi-model-registry-alignment.test.ts, packages/Kimi_Module/src/types/kimi-model-capabilities.ts`; expected commit: `feat: add kimi model registry`.
2. [DONE] Git Commit: `feat: add kimi model registry` (hash: 24bba8665)

### Stream: Settings State And Persistence
1. [DONE] `phase5-kimi-settings-state` Добавить Kimi в settings schema/default mapping/raw snapshot без ломки существующих Claude/Codex/Gemini settings — scope: `src/client/ui/src/components/settings/settings-state-model.ts, src/client/ui/src/components/settings/settings-state-raw.ts, src/client/ui/src/components/settings/settings-state-helpers.ts`; expected commit: `feat: add kimi settings state`.
2. [DONE] Git Commit: `feat: add kimi settings state` (hash: d4625d96d)

### Stream: Settings UI Card
1. [DONE] `phase5-kimi-settings-card` Добавить отдельную Kimi settings card/tab для default model, provider-home note и availability/update controls — scope: `src/client/ui/src/components/settings/kimi-default-model-card.tsx, src/client/ui/src/components/settings-view.tsx, src/client/project-manager/components/settings/use-project-manager-settings-state.ts`; expected commit: `feat: add kimi settings card`.
2. [DONE] Git Commit: `feat: add kimi settings card` (hash: bcb060f4d)

### Stream: Description Submit Provider Picker
1. [DONE] `phase5-kimi-description-submit-picker` Убедиться, что Description submit provider picker принимает `kimiCode`, показывает Kimi label/model и передаёт providerId в Core без отдельной client authority — scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx, src/client/project-manager/components/description/description-provider-picker.tsx, src/client/project-manager/services/provider-snapshot.ts`; expected commit: `feat: add kimi description provider picker`.
2. [DONE] Git Commit: `feat: add kimi description provider picker` (hash: 7add207a5)

### Stream: Workflow Start Cards Model Selection
1. [DONE] `phase5-kimi-start-card-models` Добавить Kimi model/reasoning options в workflow start cards и settings persistence barrier для Virtual Simulation, Diagram Modules, Application Skeleton, Quality Gates — scope: `src/client/project-manager/components/shared/stage-start-model-selection.ts, src/client/project-manager/services/workflow-step-start-service.ts, src/client/project-manager/services/workflow-step-start-service.settings-barrier.test.ts`; expected commit: `feat: add kimi workflow start model selection`.
2. [DONE] Git Commit: `feat: add kimi workflow start model selection` (hash: 1e1002db5)

### Stream: Workflow Start Cards Provider UI
1. [DONE] `phase5-kimi-start-card-provider-ui` Добавить Kimi tint/disabled/selected rendering в common workflow start/fix cards, включая Development Tree start/fix surfaces через общий provider picker path — scope: `src/client/project-manager/components/shared/stage-confirmation-card.tsx, src/client/project-manager/components/shared/stage-confirmation-card-provider-tint.ts, src/client/project-manager/components/shared/stage-artifact-fix-button.tsx`; expected commit: `feat: add kimi workflow provider card ui`.
2. [DONE] Git Commit: `feat: add kimi workflow provider card ui` (hash: 6de4a3142)

### Stream: Status Line Model Display
1. [DONE] `phase5-kimi-status-line-display` Добавить Kimi provider button class, model display name и `kimi-for-coding` status-line rendering в Session UI — scope: `src/client/ui/src/session/status-panel.tsx, src/client/ui/src/session/status-panel-model-picker.tsx, src/client/ui/src/session/status-panel.test.tsx`; expected commit: `feat: add kimi session status line`.
2. [DONE] Git Commit: `feat: add kimi session status line` (hash: ec33d4b99)

### Stream: Runtime Model Sync And Switch Callbacks
1. [DONE] `phase5-kimi-runtime-model-sync` Подключить Kimi model update/switch callback path для runtime/dialog session views; если Kimi model switch не поддержан в first release, status chip остаётся display-only с явным no-op contract — scope: `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx, src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx, src/client/project-manager/services/switch-api.ts`; expected commit: `feat: add kimi runtime model sync hooks`.
2. [DONE] Git Commit: `feat: add kimi runtime model sync hooks` (hash: 20676c652)

### Stream: Provider Design Tokens
1. [DONE] `phase5-kimi-provider-design-tokens` Добавить Kimi provider color tokens для Session UI/Project Manager tree/cards/status chips без изменения существующих Claude/Codex/Gemini цветов — scope: `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html, packages/ui/project-manager/styles.css, media/session-view.css`; expected commit: `feat: add kimi provider design tokens`.
2. [DONE] Git Commit: `feat: add kimi provider design tokens` (hash: e0bcf5176)

### Stream: Provider Theme Mapping
1. [DONE] `phase5-kimi-provider-theme-mapping` Подключить Kimi provider theme mapping для Project Manager tree, Session tabs и assistant message bubbles, чтобы новые design tokens реально применялись на всех runtime surfaces — scope: `src/client/project-manager/components/layout/use-step-provider-resolver.ts, src/client/project-manager/components/layout/use-step-provider-resolver.test.ts, src/client/ui/src/session/helpers.ts`; expected commit: `feat: map kimi provider theme across ui`.
2. [DONE] Git Commit: `feat: map kimi provider theme across ui` (hash: dab778f78)

## Phase 6 — Diagnostics, Usage And Documentation (owner: Codex, updated: 2026-05-18)
### Stream: Native Wire Capture
1. [DONE] `phase6-kimi-wire-capture` Реализовать Kimi native diagnostic capture на Wire evidence: Core-owned `.jsonl`/`.md` artifacts, provider-home `wire.jsonl` provenance и redaction policy — scope: `packages/Kimi_Module, packages/core/src/provider-network-capture, src/client/project-manager/components/settings`; expected commit: `feat: add kimi wire diagnostic capture`.
2. [DONE] Git Commit: `feat: add kimi wire diagnostic capture` (hash: 1b00386db)

### Stream: Usage Limits Boundary
1. [DONE] `phase6-kimi-usage-boundary` Добавить Kimi usage-limits facade stub или real reader только при стабильном official endpoint; UI должен показывать unavailable state без stuck loading — scope: `packages/core/src/provider-usage-limits, src/client/ui/src/session, packages/Kimi_Module`; expected commit: `feat: add kimi usage limits boundary`.
2. [DONE] Git Commit: `feat: add kimi usage limits boundary` (hash: 65fe00aa9)

### Stream: Module SSOT Documentation
1. [DONE] `phase6-kimi-module-docs` Создать `doc/SolidWorks-WorkFlow/Modules/Kimi.md`, обновить `Docs_Index.md` и синхронизировать SystemArchitecture provider list/invariants — scope: `doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs: add kimi provider module ssot`.
2. [DONE] Git Commit: `docs: add kimi provider module ssot` (hash: c0f2d34ea)

## Phase 7 — Packaging And Targeted Verification (owner: Codex, updated: 2026-05-18)
### Stream: Build And Packaging Integration
1. [DONE] `phase7-kimi-packaging` Добавить Kimi provider artifact builder, release cleanup keep-pattern и tracked provider manifest без изменения версий вручную — scope: `scripts/build-kimi-module.sh, scripts/release-utils.sh, assets/providers/kimi/manifest.json`; expected commit: `feat: package kimi provider module`.
2. [DONE] Git Commit: `feat: package kimi provider module` (hash: 9279e74f3)
3. [DONE] `phase7-kimi-core-packaging` Подключить Kimi module к unified build/core runtime packaging и Core runtime dependency rewrite — scope: `scripts/build-all.sh, scripts/build-core.sh, packages/core/package.json, packages/core/src/provider-registry/provider-descriptor-factory.ts, package-lock.json`; expected commit: `feat: bundle kimi provider in core runtime`.
4. [DONE] Git Commit: `feat: bundle kimi provider in core runtime` (hash: 2a3070737)
5. [DONE] `phase7-kimi-release-validation` Подключить Kimi provider artifact к release validation, VSIX exclusions и manifest version checks — scope: `scripts/build-release.sh, .vscodeignore`; expected commit: `feat: validate kimi release packaging`.
6. [DONE] Git Commit: `feat: validate kimi release packaging` (hash: 6a760bf59)

### Stream: Targeted Builds
1. [DONE] `phase7-kimi-targeted-builds` Выполнить targeted verification для затронутых пакетов/клиентов (`packages/Kimi_Module`, `packages/core`, UI/PM если затронуты) и зафиксировать результаты в плане — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record kimi targeted verification`.
2. [DONE] Git Commit: `docs: record kimi targeted verification` (hash: 258e93401)

#### Targeted verification evidence (2026-05-18)
- `npm run build --workspace=@codeai-hub/kimi-module` — passed.
- `npm run test --workspace=@codeai-hub/kimi-module` — passed.
- `npm run build --workspace=@codeai-hub/core` — passed after serializing behind Kimi build; an earlier parallel run raced against Kimi `dist` cleanup and was not a code failure.
- `bash -n scripts/build-kimi-module.sh` — passed.
- `bash -n scripts/build-all.sh` — passed.
- `bash -n scripts/build-release.sh` — passed.
- `npm run build:webview` — passed; generated `media/react-chat.js` diff was intentionally left for release-build commit because this stream is doc-only.
- `npm run typecheck:webview` — passed.

### Stream: Release Build Confirmation Gate
1. [DONE] `phase7-kimi-release-confirmation` Остановиться после targeted verification и запросить у пользователя отдельное подтверждение на release build; не готовить release notes/version bump и не запускать release scripts до подтверждения — scope: без изменения файлов; expected commit: none. Result: подтверждение получено в сообщении пользователя от 2026-05-18: «Продолжаем вплоть до сборки нового релиза».

### Stream: Release Build
1. [DONE] `phase7-kimi-release-notes` Подготовить README/CHANGELOG под будущую версию 1.2.305 до запуска release scripts — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare kimi release notes`.
2. [DONE] Git Commit: `docs: prepare kimi release notes` (hash: 8ff02a0d0)
3. [DONE] `phase7-kimi-release-build-start` Зафиксировать post-commit advancement перед clean-tree release scripts — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: mark kimi release build started`.
4. [DONE] Git Commit: `docs: mark kimi release build started` (hash: c708aef45)
5. [DONE] `phase7-kimi-release-build` После явного подтверждения пользователя выполнить release checklist: clean tree, `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, release artifacts handoff — scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: release kimi provider module build`.
   - Result: `./scripts/build-all.sh --allow-dirty` passed for version `1.2.305`; `--allow-dirty` used because the only pre-build dirty file was machine-managed `doc/TODO/todo-plan.md` after post-commit advancement to the active release task.
   - Result: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; VSIX created at `codeai-hub-1.2.305.vsix`, package size `49M`.
   - Result: release tarballs copied to `doc/tmp/releases/`: `kimi-module-1.2.305.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.305.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.305.tar.bz2`, provider/UI tarballs.
   - Result: release validation confirmed Kimi provider bundle loads, Core runtime includes Kimi provider module, SDK/provider module exclusions verified, markdown links OK, duplication check within threshold, VSIX runtime package surface verified.
6. [DONE] Git Commit: `chore: release kimi provider module build` (hash: 5f5b7d3d3)

## Phase 8 — User Workflow Acceptance And Closeout (owner: Codex, updated: 2026-05-18)
### Stream: Acceptance Bug Fix — Kimi CLI Resolution
1. [DONE] `phase8-kimi-cli-path-fix` Исправить отказ старта Kimi Description session в установленном релизе: Core launcher PATH не содержит `~/.local/bin`, а Kimi Wire требует строковые JSON-RPC request id; adapter должен резолвить CLI binary из CodeAI runtime env/user-local путей и не зависать на unmatched `id:null` error response — scope: `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts, packages/Kimi_Module/src/wire/kimi-wire-router.ts, doc/TODO/todo-plan.md`; expected commit: `fix: resolve kimi cli from provider runtime path`.
   - Log diagnosis: installed launcher starts Core with PATH `node/bin:/usr/bin:/bin:/usr/sbin:/sbin`; local `kimi` is `/Users/oleksandroliinyk/.local/bin/kimi`, so Core could not resolve `kimi` from PATH.
   - Wire diagnosis: Kimi Wire requires string JSON-RPC request ids; numeric ids receive `Invalid request` with `id:null`, leaving the router pending request unresolved.
   - Verification: `npm run build --workspace=@codeai-hub/kimi-module` passed.
   - Verification: `npm run test --workspace=@codeai-hub/kimi-module` passed.
   - Verification: restricted-PATH runtime smoke passed: adapter resolved `/Users/oleksandroliinyk/.local/bin/kimi`, `createSession()` returned `kimi:*`, and a short `prompt` emitted `turn_started`, `step_started`, `assistant_delta`, `status_update`, `turn_completed`.
2. [DONE] Git Commit: `fix: resolve kimi cli from provider runtime path` (hash: 70d2927ca)

### Stream: Acceptance Bug Fix — Kimi Provider Subscribe Contract
1. [DONE] `phase8-kimi-subscribe-contract-fix` Исправить отказ старта Kimi Description session в установленном релизе 1.2.306: Core binding вызывает обязательный `ProviderAdapter.subscribe(...)`, а Kimi facade предоставил только legacy `onSessionEvent(...)`; добавить `subscribe` без изменения Core contract и закрепить smoke-test — scope: `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts, packages/Kimi_Module/package.json, doc/TODO/todo-plan.md`; expected commit: `fix: add kimi provider subscribe contract`.
   - Log diagnosis: Core `core.log` shows `TypeError: options.options.adapter.subscribe is not a function` during `SessionShellFactory.attachBoundProviderSession`; Kimi CLI/Wire already starts and creates provider session before this failure.
   - Verification: `npm run build --workspace=@codeai-hub/kimi-module` passed.
   - Verification: `npm run test --workspace=@codeai-hub/kimi-module` passed and asserts that `KimiProviderAdapter.subscribe` exists and returns an unsubscribe function.
   - Verification: restricted-PATH runtime smoke passed: adapter resolved `/Users/oleksandroliinyk/.local/bin/kimi`, `createSession()` returned `kimi:*`, subscribed via Core-compatible `subscribe(...)`, and a short prompt emitted `turn_started`, `step_started`, `assistant_delta`, `status_update`, `turn_completed`.
2. [DONE] Git Commit: `fix: add kimi provider subscribe contract` (hash: 5f4903552)

### Stream: User Workflow Acceptance Testing
1. [BLOCKED] `phase8-kimi-user-acceptance` Передать пользователю release/working build для установки и проверки Kimi provider workflow; дождаться явного acceptance или bug report — scope: без изменения файлов; expected commit: none. Retest build `codeai-hub-1.2.307.vsix` blocked by installed-runtime bug: Kimi starts and answers, but the dialog remains locked because provider messages/tool approvals are not aligned with Core workflow contracts.

### Stream: Acceptance Bug Fix — Kimi Managed Workflow Runtime
1. [DONE] `phase8-kimi-workdir-approval-fix` Исправить Kimi runtime alignment для managed workflow: запускать Wire с workspace `--work-dir`, managed auto-approval для artifact-writing turns, и протокольно корректный approval rejection literal `reject` вместо `deny` — scope: `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts, packages/Kimi_Module/package.json, doc/TODO/todo-plan.md`; expected commit: `fix: align kimi managed workflow runtime`.
   - Log diagnosis: Kimi context reports working directory `/` despite Core workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub kimi`; the agent then calls `mkdir -p .codeai-hub/...` relative to `/`.
   - Log diagnosis: Kimi Wire rejects our approval response: `ApprovalResponse.response` must be `approve`, `approve_for_session`, or `reject`, but adapter returns `deny`.
   - Implementation note: Kimi Wire startup now includes `--work-dir <workspace>` and `--yolo`, while fallback approval responses use protocol literal `reject`.
   - Verification: `npm run build --workspace=@codeai-hub/kimi-module` passed.
   - Verification: `npm run test --workspace=@codeai-hub/kimi-module` passed and asserts Kimi CLI args include `--yolo --work-dir <workspace>`.
2. [DONE] Git Commit: `fix: align kimi managed workflow runtime` (hash: d83d2d0b4)
3. [DONE] `phase8-kimi-message-normalization-fix` Исправить Kimi event normalization: Core должен получать `assistant`/`thinking` events instead of ignored `assistant_delta`, so provider text appears in dialog history and message flush can complete before turn completion — scope: `packages/Kimi_Module/src/messaging/kimi-event-normalizer.ts, packages/Kimi_Module/package.json, doc/TODO/todo-plan.md`; expected commit: `fix: materialize kimi assistant messages`.
   - Log diagnosis: Kimi Wire emitted `ContentPart` records with `payload.type="think"` / `payload.think` and `payload.type="text"` / `payload.text`, but the adapter normalized visible text to unsupported `assistant_delta`; `SessionProviderEventRouter` ignores that event type.
   - Core contract diagnosis: Core `appendProviderMessage(...)` extracts display text from top-level `event.content`, not nested `event.payload.content`, so Kimi assistant/thinking events must expose `content` at the event root.
   - Implementation note: Kimi text content now emits `assistant` with root `content`; Kimi think content now emits `thinking` with root `content` and `tag="thinking"`.
   - Verification: `npm run plan:validate` passed.
   - Verification: `npm run build --workspace=@codeai-hub/kimi-module` passed.
   - Verification: `npm run test --workspace=@codeai-hub/kimi-module` passed and asserts Core-compatible Kimi assistant/thinking event materialization.
4. [DONE] Git Commit: `fix: materialize kimi assistant messages` (hash: 30d19b106)

### Stream: Acceptance Bug Fix — Kimi Content Part Aggregation
1. [DONE] `phase8-kimi-content-part-aggregation-fix` Исправить Kimi Wire chunk aggregation: адаптер не должен превращать каждый `ContentPart` token в отдельное dialog message; он должен буферизовать `think`/`text` chunks и отдавать Core один `thinking` и один `assistant` перед `turn_completed` — scope: `packages/Kimi_Module/src/messaging/kimi-event-normalizer.ts, packages/Kimi_Module/src/provider/kimi-provider-adapter.ts, doc/TODO/todo-plan.md`; expected commit: `fix: aggregate kimi wire content parts`.
   - Runtime diagnosis: source-runtime smoke showed Kimi emits many small `ContentPart` chunks (`"С"`, `"в"`, `"яз"` ...); immediate materialization would unblock Core but pollute dialog history with many tiny assistant messages.
   - Implementation note: Kimi adapter now uses stateful `KimiWireEventNormalizer`; per-turn chunks are reset on `TurnBegin`, buffered during `ContentPart`, flushed as Core-compatible root-content messages before `turn_completed`.
   - Verification: `npm run plan:validate` passed.
   - Verification: `npm run build --workspace=@codeai-hub/kimi-module` passed.
   - Verification: `npm run test --workspace=@codeai-hub/kimi-module` passed.
   - Verification: source-runtime Kimi smoke passed; a live short prompt emitted one aggregated `thinking`, one aggregated `assistant`, then `turn_completed`.
2. [DONE] Git Commit: `fix: aggregate kimi wire content parts` (hash: cdebcef13)

### Stream: Message Hotfix Release Confirmation Gate
1. [DONE] `phase8-kimi-message-hotfix-release-confirmation` Остановиться после фиксов Kimi managed runtime/message materialization/content aggregation и запросить у пользователя отдельное подтверждение на следующий hotfix release build; не готовить release notes/version bump и не запускать release scripts до подтверждения — scope: без изменения файлов; expected commit: none. Result: подтверждение получено в сообщении пользователя от 2026-05-18: «И собери новый релиз».

### Stream: Message Hotfix Release Build
1. [DONE] `phase8-kimi-message-hotfix-release-notes` Подготовить README/CHANGELOG под будущую версию 1.2.308 до запуска release scripts — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare kimi message hotfix release notes`.
2. [DONE] Git Commit: `docs: prepare kimi message hotfix release notes` (hash: 8f4e933cb)
3. [DONE] `phase8-kimi-message-hotfix-release-build-start` Зафиксировать post-commit advancement перед release scripts — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: mark kimi message hotfix release build started`.
4. [DONE] Git Commit: `docs: mark kimi message hotfix release build started` (hash: cda5b8c8c)
5. [DONE] `phase8-kimi-message-hotfix-release-build` Выполнить hotfix release checklist: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, release artifacts handoff — scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: release kimi message hotfix build`.
   - Result: `./scripts/build-all.sh --allow-dirty` passed for version `1.2.308`; `--allow-dirty` used because the only pre-build dirty file was machine-managed `doc/TODO/todo-plan.md` after post-commit advancement to the active release task.
   - Result: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; VSIX created at `codeai-hub-1.2.308.vsix`, package size `49M`.
   - Result: release tarballs copied to `doc/tmp/releases/`: `kimi-module-1.2.308.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.308.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.308.tar.bz2`, provider/UI tarballs.
   - Result: release validation confirmed Kimi provider bundle loads, Core runtime includes Kimi provider module, SDK/provider module exclusions verified, markdown links OK, duplication check within threshold, VSIX runtime package surface verified.
6. [DONE] Git Commit: `chore: release kimi message hotfix build` (hash: 4cac3da6c)

### Stream: Acceptance Bug Fix — Kimi Session Workspace Override
1. [DONE] `phase8-kimi-create-session-workspace-fix` Исправить installed-runtime regression 1.2.308: Core передает фактический workspace в `adapter.createSession(workspacePath)`, но Kimi adapter строит Wire CLI args во время `initialize()` из раннего `process.cwd()` и только логирует override; перед первым Wire start нужно применить override к `--work-dir` и process cwd — scope: `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts, packages/Kimi_Module/src/provider/kimi-workspace-override-state.ts, doc/TODO/todo-plan.md`; expected commit: `fix: apply kimi session workspace override`.
   - Log diagnosis: installed Core logs `[kimi] Kimi session workspace override`, then Kimi Wire stderr, but no Core session file is created; the installed Kimi adapter works when invoked manually with explicit workspace options.
   - Root cause: Core constructs the Kimi provider at startup with `process.cwd()`, while the real workspace arrives later through `createSession(workspacePath)`; adapter ignored that argument for runtime configuration.
   - Implementation note: Kimi adapter now rebuilds Wire runtime configuration before the first Wire start when `createSession(workspacePath)` supplies a different workspace, so both `--work-dir` and process cwd use the Core-provided workspace.
   - Verification: `npm run plan:validate` passed.
   - Verification: `npm run build --workspace=@codeai-hub/kimi-module` passed.
   - Verification: `npm run test --workspace=@codeai-hub/kimi-module` passed.
   - Verification: architecture line limit repaired by extracting `KimiWorkspaceOverrideState`; `kimi-provider-adapter.ts` is 488 lines.
   - Verification: source-runtime override smoke passed: adapter initialized with a wrong workspace, `createSession(actualWorkspace)` rebuilt Kimi CLI args to `--work-dir /Users/oleksandroliinyk/VSCODE/CodeAI-Hub kimi`.
   - Verification: source-runtime Kimi turn smoke passed after workspace override: emitted `turn_started`, aggregated `thinking`, aggregated `assistant`, `turn_completed`.
2. [DONE] Git Commit: `fix: apply kimi session workspace override` (hash: 1dccfc65b)

### Stream: Workspace Override Hotfix Release Confirmation Gate
1. [DONE] `phase8-kimi-workspace-hotfix-release-confirmation` Остановиться после фикса Kimi session workspace override и запросить у пользователя отдельное подтверждение на следующий hotfix release build; не готовить release notes/version bump и не запускать release scripts до подтверждения — scope: без изменения файлов; expected commit: none. Result: подтверждение получено в сообщении пользователя от 2026-05-18: «После фикса собери новый релиз».

### Stream: Workspace Override Hotfix Release Build
1. [DONE] `phase8-kimi-workspace-hotfix-release-notes` Подготовить README/CHANGELOG под будущую версию 1.2.309 до запуска release scripts — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare kimi workspace hotfix release notes`.
2. [DONE] Git Commit: `docs: prepare kimi workspace hotfix release notes` (hash: 03f6e0c70)
3. [DONE] `phase8-kimi-workspace-hotfix-release-build-start` Зафиксировать post-commit advancement перед release scripts — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: mark kimi workspace hotfix release build started`.
4. [PENDING] Git Commit: `docs: mark kimi workspace hotfix release build started` (hash: TBD)
5. [TODO] `phase8-kimi-workspace-hotfix-release-build` Выполнить hotfix release checklist: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, release artifacts handoff — scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: release kimi workspace hotfix build`.
6. [TODO] Git Commit: `chore: release kimi workspace hotfix build` (hash: TBD)

### Stream: Subscribe Contract Hotfix Release Confirmation Gate
1. [DONE] `phase8-kimi-subscribe-hotfix-release-confirmation` Остановиться после фикса Kimi `subscribe(...)` contract bug и запросить у пользователя отдельное подтверждение на следующий hotfix release build; не готовить release notes/version bump и не запускать release scripts до подтверждения — scope: без изменения файлов; expected commit: none. Result: подтверждение получено в сообщении пользователя от 2026-05-18: «Собери новый релиз».

### Stream: Subscribe Contract Hotfix Release Build
1. [DONE] `phase8-kimi-subscribe-hotfix-release-notes` После явного подтверждения подготовить README/CHANGELOG под будущую версию 1.2.307 до запуска release scripts — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare kimi subscribe hotfix release notes`.
2. [DONE] Git Commit: `docs: prepare kimi subscribe hotfix release notes` (hash: 142983f48)
3. [DONE] `phase8-kimi-subscribe-hotfix-release-build-start` Зафиксировать post-commit advancement перед release scripts — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: mark kimi subscribe hotfix release build started`.
4. [DONE] Git Commit: `docs: mark kimi subscribe hotfix release build started` (hash: fb71d920a)
5. [DONE] `phase8-kimi-subscribe-hotfix-release-build` После явного подтверждения выполнить hotfix release checklist: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, release artifacts handoff — scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: release kimi subscribe hotfix build`.
   - Result: `./scripts/build-all.sh --allow-dirty` passed for version `1.2.307`; `--allow-dirty` used because the only pre-build dirty file was machine-managed `doc/TODO/todo-plan.md` after post-commit advancement to the active release task.
   - Result: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; VSIX created at `codeai-hub-1.2.307.vsix`, package size `49M`.
   - Result: release tarballs copied to `doc/tmp/releases/`: `kimi-module-1.2.307.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.307.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.307.tar.bz2`, provider/UI tarballs.
   - Result: release validation confirmed Kimi provider bundle loads, Core runtime includes Kimi provider module, SDK/provider module exclusions verified, markdown links OK, duplication check within threshold, VSIX runtime package surface verified.
6. [DONE] Git Commit: `chore: release kimi subscribe hotfix build` (hash: 6f8b7e8ca)

### Stream: Hotfix Release Confirmation Gate
1. [DONE] `phase8-kimi-hotfix-release-confirmation` Остановиться после фикса Kimi startup bug и запросить у пользователя отдельное подтверждение на hotfix release build; не готовить release notes/version bump и не запускать release scripts до подтверждения — scope: без изменения файлов; expected commit: none. Result: подтверждение получено в сообщении пользователя от 2026-05-18: «Собери новый релиз».

### Stream: Hotfix Release Build
1. [DONE] `phase8-kimi-hotfix-release-notes` Подготовить README/CHANGELOG под будущую версию 1.2.306 до запуска release scripts — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare kimi hotfix release notes`.
2. [DONE] Git Commit: `docs: prepare kimi hotfix release notes` (hash: 19c5a2f2b)
3. [DONE] `phase8-kimi-hotfix-release-build-start` Зафиксировать post-commit advancement перед release scripts — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: mark kimi hotfix release build started`.
4. [DONE] Git Commit: `docs: mark kimi hotfix release build started` (hash: 31d758a5d)
5. [DONE] `phase8-kimi-hotfix-release-build` Выполнить hotfix release checklist: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, release artifacts handoff — scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: release kimi provider hotfix build`.
   - Result: `./scripts/build-all.sh --allow-dirty` passed for version `1.2.306`; `--allow-dirty` used because the only pre-build dirty file was machine-managed `doc/TODO/todo-plan.md` after post-commit advancement to the active release task.
   - Result: `./scripts/build-release.sh --use-current-version --allow-dirty` passed; VSIX created at `codeai-hub-1.2.306.vsix`, package size `49M`.
   - Result: release tarballs copied to `doc/tmp/releases/`: `kimi-module-1.2.306.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.306.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.306.tar.bz2`, provider/UI tarballs.
   - Result: release validation confirmed Kimi provider bundle loads, Core runtime includes Kimi provider module, SDK/provider module exclusions verified, markdown links OK, duplication check within threshold, VSIX runtime package surface verified.
6. [DONE] Git Commit: `chore: release kimi provider hotfix build` (hash: 469735675)

### Stream: Scope Closeout
1. [TODO] `phase8-kimi-closeout` После явного acceptance закрыть scope: архивировать active plan, определить disposition implementation planning source, обновить `Docs_Index.md` и связанные ссылки — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans`; expected commit: `docs: close kimi provider implementation scope`.
2. [TODO] Git Commit: `docs: close kimi provider implementation scope` (hash: TBD)
3. [TODO] `phase8-kimi-post-closeout-handoff` Reserved post-closeout handoff anchor — scope: `doc/TODO/todo-plan.md`; expected commit: none.
