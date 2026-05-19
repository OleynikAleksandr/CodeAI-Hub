# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-claude-code-provider-planning-2026-05-19",
  "branch": "main",
  "baseHead": "5902a324f",
  "lastRecordedCommit": "853d698b3",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Kimi_Claude_Code_Provider_Planning_RU.md",
  "currentTaskId": "phase9-kimi-claude-code-usage-context-state",
  "expectedCommitMessage": "feat: surface kimi claude code telemetry state",
  "debt": {
    "expectedCommitMessage": "feat: surface kimi claude code telemetry state",
    "preCommitHead": "853d698b3",
    "stage": "commit_pending",
    "taskId": "phase9-kimi-claude-code-usage-context-state"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Kimi_Claude_Code_Provider_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading перед каждым фиксом:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Каждая подзадача должна затрагивать не более 3 файлов/пакетов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Гейты через Husky не обходить.
- Новый эксперимент называется `kimi-claude-code`: Kimi 2.6 / Kimi Code работает через Claude Code-compatible runtime/protocol, а не через Codex App Server.
- Текущий Codex-based spike уже откатан коммитом `5902a324f`; не восстанавливать `kimi-codex` код без отдельного нового решения.
- Перед product integration сначала доказать live compatibility Claude Code CLI/SDK с Kimi Code Anthropic-compatible endpoint.
- **Release Build Confirmation Gate:** после targeted verification остановиться и отдельно спросить пользователя, собирать ли release.
- `Scope Closeout` выполняется только после явного acceptance пользователя.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-05-19)
### Stream: Kimi-Claude-Code Planning Source
1. [DONE] `phase0-kimi-claude-code-planning-intake` Создать planning-документ для экспериментального провайдера `kimi-claude-code`, который использует Claude Code-compatible runtime/protocol и Kimi Code Anthropic-compatible endpoint для `kimi-for-coding`, и добавить его в Docs Index — scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Kimi_Claude_Code_Provider_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan kimi claude code provider experiment`.
2. [DONE] Git Commit: `docs: plan kimi claude code provider experiment` (hash: 7cd05e195)

## Phase 1 — User Planning Acceptance (owner: User, updated: 2026-05-19)
### Stream: Planning Review
1. [DONE] `phase1-kimi-claude-code-planning-review` Пользователь проверяет planning-документ и подтверждает, начинать ли implementation scope или скорректировать архитектуру до нарезки задач — scope: без изменения файлов; expected commit: none. Result: User accepted direction: replace Codex-client experiment with Claude Code-compatible Kimi provider and proceed to implementation slicing.

## Phase 2 — Implementation Plan Slicing (owner: Codex, updated: 2026-05-19)
### Stream: Implementation Slicing
1. [DONE] `phase2-kimi-claude-code-implementation-slicing` Нарезать implementation scope по принятому planning-документу на микрозадачи ≤3 файлов/пакетов, включая feasibility probe, runtime shell, Core/UI integration, targeted verification, release gate, user acceptance и closeout — scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Kimi_Claude_Code_Provider_Planning_RU.md`; expected commit: `docs: slice kimi claude code implementation plan`.
2. [DONE] Git Commit: `docs: slice kimi claude code implementation plan` (hash: 41499205b)

## Phase 3 — Feasibility Spike (owner: Codex, updated: 2026-05-19)
### Stream: Claude Code Runtime Probe
1. [DONE] `phase3-kimi-claude-code-probe-profile` Добавить минимальные runtime/auth profile helpers для Kimi-Claude-Code без подключения UI: isolated home, Kimi API key resolution из env или `~/.kimi/config.toml`, sanitized diagnostic metadata and package entry export — scope: `packages/Claude_Module/src/kimi-claude-code, packages/Claude_Module/src/index.ts, doc/TODO/todo-plan.md`; expected commit: `feat: add kimi claude code runtime probe profile`.
2. [DONE] Git Commit: `feat: add kimi claude code runtime probe profile` (hash: 17311c6fa)
3. [DONE] `phase3-kimi-claude-code-diagnostic-runner` Добавить диагностический runner для live probe через Claude Code-compatible SDK/CLI path: short answer, workflow-style prompt, minimal tools, categorized failure output, no secret logging — scope: `packages/Claude_Module/src/diagnostics, packages/Claude_Module/src/index.ts, doc/TODO/todo-plan.md`; expected commit: `feat: probe kimi through claude code runtime`.
4. [DONE] Git Commit: `feat: probe kimi through claude code runtime` (hash: 25916925a)
5. [DONE] `phase3-kimi-claude-code-live-evidence` Запустить live probe, зафиксировать evidence/decision по HTTP/runtime, workflow prompt, tool loop, lifecycle и isolation gates; если gate failed — остановить product integration и оформить blocker — scope: `doc/SolidWorks-WorkFlow/Plans/Kimi_Claude_Code_Provider_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: record kimi claude code feasibility result`.
6. [DONE] Git Commit: `docs: record kimi claude code feasibility result` (hash: eb522a746)

## Phase 4 — Runtime Profile Extraction (owner: Codex, updated: 2026-05-19)
### Stream: Claude Runtime Profiles
1. [DONE] `phase4-claude-runtime-profile-contract` Выделить контракт runtime profile, разделяющий обычный `claudeCode` subscription profile и будущий `kimiClaudeCode` API-key/base-url profile, без изменения поведения Claude по умолчанию — scope: `packages/Claude_Module/src/sdk, packages/Claude_Module/src/auth, doc/TODO/todo-plan.md`; expected commit: `refactor: define claude code runtime profiles`.
2. [DONE] Git Commit: `refactor: define claude code runtime profiles` (hash: 2694afc09)
3. [DONE] `phase4-kimi-claude-code-auth-profile` Реализовать Kimi-Claude-Code auth profile: `HOME=~/.codeai-hub/providers/kimi-claude-code/home`, proven base URL, API key resolution, secret-safe logging — scope: `packages/Claude_Module/src/kimi-claude-code, packages/Claude_Module/src/auth, doc/SolidWorks-WorkFlow/Plans/Kimi_Claude_Code_Provider_Planning_RU.md`; expected commit: `feat: add kimi claude code auth profile`.
4. [DONE] Git Commit: `feat: add kimi claude code auth profile` (hash: 83d993f6c)
5. [DONE] `phase4-claude-sdk-profile-wiring` Подключить profile selection в Claude SDK manager/factory так, чтобы обычный Claude путь продолжал использовать subscription auth, а Kimi-Claude-Code путь использовал отдельный profile — scope: `packages/Claude_Module/src/sdk, packages/Claude_Module/src/provider, doc/TODO/todo-plan.md`; expected commit: `refactor: support kimi claude code runtime profile`.
6. [DONE] Git Commit: `refactor: support kimi claude code runtime profile` (hash: 13c9c973e)

## Phase 5 — Provider Facade And Model Contract (owner: Codex, updated: 2026-05-19)
### Stream: Kimi-Claude-Code Facade
1. [DONE] `phase5-kimi-claude-code-facade` Добавить самостоятельный Core-facing facade/adapter `KimiClaudeCodeProviderAdapter`, который делегирует в Claude Code runtime profile и не открывает Core внутренние helper-классы — scope: `packages/Claude_Module/src/kimi-claude-code, packages/Claude_Module/src/sdk, packages/Claude_Module/src/index.ts`; expected commit: `feat: add kimi claude code provider facade`.
2. [DONE] Git Commit: `feat: add kimi claude code provider facade` (hash: 8f7cf9557)
3. [DONE] `phase5-kimi-claude-code-model-capabilities` Добавить model/capabilities contract для `kimi-for-coding`: single default model, honest unsupported reasoning controls, token/context telemetry unknown until proven — scope: `packages/Claude_Module/src/kimi-claude-code, packages/Claude_Module/src/types, packages/Claude_Module/src/index.ts`; expected commit: `feat: add kimi claude code model capabilities`.
4. [DONE] Git Commit: `feat: add kimi claude code model capabilities` (hash: a331244e8)
5. [DONE] `phase5-kimi-claude-code-lifecycle` Подключить lifecycle classification для turn start, assistant progress/final, failure, stop and stale binding states без влияния на native Kimi/Claude — scope: `packages/Claude_Module/src/kimi-claude-code, packages/Claude_Module/src/messaging, packages/Claude_Module/src/session`; expected commit: `feat: support kimi claude code session lifecycle`.
6. [DONE] Git Commit: `feat: support kimi claude code session lifecycle` (hash: e1cde7c69)

## Phase 6 — Core Provider Registry And Packaging (owner: Codex, updated: 2026-05-19)
### Stream: Core Registration
1. [DONE] `phase6-kimi-claude-code-provider-type` Добавить provider id/type `kimiClaudeCode` в shared/Core contracts и registry descriptors, не смешивая его с `kimiCode` или `claudeCode` — scope: `packages/core, src/types, doc/TODO/todo-plan.md`; expected commit: `feat: register kimi claude code provider type`.
2. [DONE] Git Commit: `feat: register kimi claude code provider type` (hash: c6eba1b28)
3. [DONE] `phase6-kimi-claude-code-runtime-loader` Добавить loader/descriptor/install path для Kimi-Claude-Code, переиспользуя Claude runtime artifact только если это сохраняет отдельный provider namespace — scope: `packages/core, packages/Claude_Module, doc/TODO/todo-plan.md`; expected commit: `feat: load kimi claude code provider runtime`.
4. [DONE] Git Commit: `feat: load kimi claude code provider runtime` (hash: 58456d15c)
5. [DONE] `phase6-kimi-claude-code-package-mapping` Обновить package/build mapping только если отдельный provider artifact или manifest entry реально нужен после loader implementation; зафиксировать no-extra-artifact decision, если runtime живет внутри Claude module — scope: `scripts, doc/SolidWorks-WorkFlow/Plans/Kimi_Claude_Code_Provider_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `feat: package kimi claude code provider runtime`.
6. [DONE] Git Commit: `feat: package kimi claude code provider runtime` (hash: 067943ad7)

## Phase 7 — Settings And Effective Model Identity (owner: Codex, updated: 2026-05-19)
### Stream: Settings Defaults
1. [DONE] `phase7-kimi-claude-code-settings-schema` Добавить settings schema/defaults под `providers.kimiClaudeCode` с отдельным хранением от Claude и native Kimi — scope: `packages/core, src/client, doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`; expected commit: `feat: add kimi claude code settings schema`.
2. [DONE] Git Commit: `feat: add kimi claude code settings schema` (hash: e019b7888)
3. [DONE] `phase7-kimi-claude-code-settings-ui` Добавить Kimi-Claude-Code subsection в Claude-family Settings surface без отдельного лишнего tab, если текущая UI-архитектура это поддерживает — scope: `src/client/ui, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `feat: add kimi claude code claude-family settings`.
4. [DONE] Git Commit: `feat: add kimi claude code claude-family settings` (hash: 0da27981b)
5. [DONE] `phase7-kimi-claude-code-turn-config` Подключить applied turn config/effective model identity resolver для `kimiClaudeCode`, включая provider inheritance into next steps — scope: `packages/core, src/client, doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`; expected commit: `feat: resolve kimi claude code turn config`.
6. [DONE] Git Commit: `feat: resolve kimi claude code turn config` (hash: 7e597bba2)

## Phase 8 — Project Manager And Session UI (owner: Codex, updated: 2026-05-19)
### Stream: Provider Surfaces
1. [DONE] `phase8-kimi-claude-code-start-cards` Добавить Kimi-Claude-Code в provider descriptors/cards для Description questionnaire submit, workflow start cards, Development Tree start/fix cards — scope: `src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `feat: show kimi claude code in provider start cards`.
2. [DONE] Git Commit: `feat: show kimi claude code in provider start cards` (hash: 3d98066c7)
3. [DONE] `phase8-kimi-claude-code-next-step-default` Проверить и исправить inheritance выбранного `kimiClaudeCode` при переходе между managed workflow steps, чтобы следующий шаг не падал в Claude — scope: `src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `feat: preserve kimi claude code provider inheritance`.
4. [DONE] Git Commit: `feat: preserve kimi claude code provider inheritance` (hash: 993be3cb3)
5. [DONE] `phase8-kimi-claude-code-status-identity` Добавить status line/model chip/session title/provider tint mapping для `kimiClaudeCode` — scope: `src/client/ui, packages/core, doc/TODO/todo-plan.md`; expected commit: `feat: show kimi claude code session identity`.
6. [DONE] Git Commit: `feat: show kimi claude code session identity` (hash: 232eb7de6)

## Phase 9 — Diagnostics, Capture, Usage Telemetry (owner: Codex, updated: 2026-05-19)
### Stream: Observability
1. [DONE] `phase9-kimi-claude-code-native-capture` Подключить native capture/workbench support для Kimi-Claude-Code: provider-visible system prompt, model, tool list, base URL class and first user prompt, без secret leakage — scope: `packages/core, packages/Claude_Module, src/client/ui, src/client/project-manager, doc/TODO/todo-plan.md`; expected commit: `feat: capture kimi claude code native requests`.
2. [DONE] Git Commit: `feat: capture kimi claude code native requests` (hash: c178acea7)
3. [DONE] `phase9-kimi-claude-code-session-artifacts` Обеспечить отдельный artifact/session namespace под `~/.codeai-hub/providers/kimi-claude-code/home` и CodeAI sessions, не смешивая с `kimiCode` — scope: `packages/core, packages/Claude_Module, doc/TODO/todo-plan.md`; expected commit: `feat: persist kimi claude code session artifacts`.
4. [DONE] Git Commit: `feat: persist kimi claude code session artifacts` (hash: 853d698b3)
5. [DONE] `phase9-kimi-claude-code-usage-context-state` Показать usage/context telemetry как unavailable либо подключить native Kimi usage endpoint только если доказано совпадение account/API key source — scope: `packages/core, src/client/ui, doc/SolidWorks-WorkFlow/Plans/Kimi_Claude_Code_Provider_Planning_RU.md`; expected commit: `feat: surface kimi claude code telemetry state`.
6. [PENDING] Git Commit: `feat: surface kimi claude code telemetry state` (hash: TBD)

## Phase 10 — Documentation Sync (owner: Codex, updated: 2026-05-19)
### Stream: Module Documentation
1. [TODO] `phase10-kimi-claude-code-module-doc` Создать module doc для Kimi-Claude-Code с финальной архитектурой, supported/unsupported settings, probe evidence summary and recovery notes — scope: `doc/SolidWorks-WorkFlow/Modules/Kimi_Claude_Code.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: document kimi claude code module`.
2. [TODO] Git Commit: `docs: document kimi claude code module` (hash: TBD)
3. [TODO] `phase10-claude-kimi-boundary-docs` Синхронизировать Claude/Kimi docs: явно описать, что Claude provider не мутирован, native Kimi остается Wire-runtime, Kimi-Claude-Code является отдельным experiment/runtime — scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md, doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/TODO/todo-plan.md`; expected commit: `docs: sync claude and kimi claude code boundaries`.
4. [TODO] Git Commit: `docs: sync claude and kimi claude code boundaries` (hash: TBD)

## Phase 11 — Targeted Verification (owner: Codex, updated: 2026-05-19)
### Stream: Focused Checks
1. [TODO] `phase11-kimi-claude-code-tests` Запустить focused unit/integration tests для затронутых provider/profile/config modules и зафиксировать результат; при падениях добавить repair microtasks перед продолжением — scope: `packages/Claude_Module, packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify kimi claude code provider integration`.
2. [TODO] Git Commit: `test: verify kimi claude code provider integration` (hash: TBD)
3. [TODO] `phase11-kimi-claude-code-target-builds` Выполнить targeted builds/typechecks для затронутых пакетов/UI (`npm run build --workspace ...`, `npm run build:webview`, `npm run typecheck:webview` по фактическому scope) и зафиксировать результат — scope: `doc/TODO/todo-plan.md`; expected commit: `chore: verify kimi claude code targeted builds`.
4. [TODO] Git Commit: `chore: verify kimi claude code targeted builds` (hash: TBD)
5. [TODO] `phase11-kimi-claude-code-live-smoke` Выполнить live smoke на одинаковом workflow prompt: native Kimi vs Kimi-Claude-Code, проверить visible progress/final, unlock input, artifacts and stop behavior — scope: `doc/SolidWorks-WorkFlow/Plans/Kimi_Claude_Code_Provider_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: record kimi claude code live smoke result`.
6. [TODO] Git Commit: `docs: record kimi claude code live smoke result` (hash: TBD)

## Phase 12 — Release Build Confirmation Gate (owner: Codex, updated: 2026-05-19)
### Stream: Release Confirmation
1. [TODO] `phase12-kimi-claude-code-release-confirmation` После targeted verification остановиться и запросить отдельное явное подтверждение пользователя на release build; до подтверждения не менять README/CHANGELOG версии и не запускать `build-all.sh`/`build-release.sh` — scope: без изменения файлов; expected commit: none.

## Phase 13 — Release Build (owner: Codex, updated: 2026-05-19)
### Stream: Release Build
1. [TODO] `phase13-kimi-claude-code-release-notes` После явного подтверждения пользователя обновить README/CHANGELOG на будущую версию и связанные docs, если затронуты — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare kimi claude code release notes`.
2. [TODO] Git Commit: `docs: prepare kimi claude code release notes` (hash: TBD)
3. [TODO] `phase13-kimi-claude-code-build-all` Запустить `./scripts/build-all.sh`, затем при необходимости `./scripts/build-release.sh --use-current-version`, перенести/проверить release artifacts and VSIX — scope: `package manifests, release artifacts, doc/TODO/todo-plan.md`; expected commit: `chore: build kimi claude code release`.
4. [TODO] Git Commit: `chore: build kimi claude code release` (hash: TBD)

## Phase 14 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-19)
### Stream: Native Kimi vs Kimi-Claude-Code Retest
1. [TODO] `phase14-kimi-claude-code-user-retest` Пользователь устанавливает релиз и сравнивает native `Kimi` vs `Kimi-Claude-Code` на одинаковом workflow step, включая progress messages, reasoning visibility, file artifacts, status line and next-step provider inheritance — scope: без изменения файлов; expected commit: none.

## Phase 15 — Scope Closeout (owner: Codex, updated: 2026-05-19)
### Stream: Scope Closeout
1. [TODO] `phase15-kimi-claude-code-closeout` После явного acceptance архивировать active plan, disposition planning source, обновить Docs Index и связанные ссылки — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive, doc/SolidWorks-WorkFlow/Plans, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close kimi claude code provider experiment scope`.
2. [TODO] Git Commit: `docs: close kimi claude code provider experiment scope` (hash: TBD)
3. [TODO] `phase15-kimi-claude-code-post-closeout-anchor` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle — scope: handoff only; expected commit: none.
