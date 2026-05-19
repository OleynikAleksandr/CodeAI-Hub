# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-context-and-usage-indicators-2026-05-19",
  "branch": "main",
  "baseHead": "37448d20d",
  "lastRecordedCommit": "37b993697",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Session_Context_And_Usage_Indicators_Planning_RU.md",
  "currentTaskId": "phase6-session-indicators-release-notes",
  "expectedCommitMessage": "docs: prepare session indicators release notes",
  "debt": {
    "expectedCommitMessage": "docs: prepare session indicators release notes",
    "preCommitHead": "37b993697",
    "stage": "commit_pending",
    "taskId": "phase6-session-indicators-release-notes"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Session_Context_And_Usage_Indicators_Planning_RU.md`
- **User acceptance source:** Kimi provider module scope accepted after release `1.2.314`; Kimi prompt-level reasoning-summary behavior is deferred and not part of this scope.
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionIdUsageBar.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading перед каждым фиксом:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Каждая подзадача должна затрагивать не более 3 файлов/пакетов. Если фактический scope шире — сначала разбить задачу и обновить план отдельной microtask.
- Каждый Stream должен сохранять Core/provider telemetry authority: UI форматирует snapshot, но не добывает и не угадывает provider usage state.
- Для context-window percentage сначала фиксируется user-facing semantics (`remaining%` vs `used%`), затем меняется UI/text/tests.
- Для usage limits нельзя показывать фиктивные проценты. Если provider source не подтвержден, surface обязан показывать честное `unavailable`/diagnostic state.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Гейты через Husky не обходить: `git commit` запускает `.husky/pre-commit`, `commit-msg`, `post-commit`; `--no-verify` запрещён.
- Таргетные сборки выполняются вручную перед закрытием соответствующего Stream/Phase: `npm run build:webview`, `npm run typecheck:webview`, `npm run build --workspace <package>` по затронутому scope.
- **Release Build Confirmation Gate:** после завершения фиксов и targeted verification остановиться и отдельно спросить пользователя, собирать ли release. Не запускать `./scripts/build-all.sh` / `./scripts/build-release.sh --use-current-version` и не готовить release notes без явного подтверждения.
- `Scope Closeout` выполняется только после явного acceptance пользователя.

## Phase 0 — Plan Activation (owner: Codex, updated: 2026-05-19)
### Stream: Session Indicators Plan Activation
1. [DONE] `phase0-session-indicators-plan` Создать planning source и active todo-plan для scope индикатора контекстного окна и provider usage limits — scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Session_Context_And_Usage_Indicators_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: open session context and limits plan`.
2. [DONE] Git Commit: `docs: open session context and limits plan` (hash: a584dd433)

## Phase 1 — Telemetry Contract Audit (owner: Codex, updated: 2026-05-19)
### Stream: Context Window Token Usage Audit
1. [DONE] `phase1-context-window-audit` Проследить путь `tokenUsage` от provider events/Core stream до `SessionStatusPanel`, зафиксировать фактическую semantics процента и gaps по Kimi — scope: `src/client/ui/src/session/status-panel.tsx, src/client/project-manager/components/sessions/token-usage-stream.ts, doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`; expected commit: `docs: audit session context percentage contract`.
2. [DONE] Git Commit: `docs: audit session context percentage contract` (hash: c232428cd)

### Stream: Usage Limits Audit
1. [DONE] `phase1-usage-limits-audit` Проследить путь `usageLimits` от provider adapters/Core usage-limits bridge до `SessionIdBar`, включая найденный Kimi `coding/v1/usages` endpoint и planning-source correction — scope: `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionIdUsageBar.md, doc/SolidWorks-WorkFlow/Plans/Session_Context_And_Usage_Indicators_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: audit provider usage limits contract`.
2. [DONE] Git Commit: `docs: audit provider usage limits contract` (hash: 89cf0ceec)

## Phase 2 — Context Window Status Panel (owner: Codex, updated: 2026-05-19)
### Stream: Percentage Formatter Contract
1. [DONE] `phase2-context-percentage-formatter` Выделить/уточнить formatter для context-window percentage, чтобы label явно показывал согласованную semantics и корректно работал при нулевом/неизвестном limit — scope: `src/client/ui/src/session/status-panel.tsx, src/client/ui/src/session/status-panel.test.tsx, doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`; expected commit: `fix: clarify session context percentage display`.
2. [DONE] Git Commit: `fix: clarify session context percentage display` (hash: 0d89f871b)

### Stream: Context Percentage Projection Tests
1. [DONE] `phase2-context-percentage-stream-tests` Добавить regression coverage для применения token usage stream snapshots к status panel projection без изменения lock/turn state — scope: `src/client/project-manager/components/sessions/token-usage-stream.ts, src/client/project-manager/components/sessions/token-usage-stream.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover session context percentage updates`.
2. [DONE] Git Commit: `test: cover session context percentage updates` (hash: 24d737af2)

## Phase 3 — Provider Usage Limits Bar (owner: Codex, updated: 2026-05-19)
### Stream: Usage Limit Label Semantics
1. [DONE] `phase3-usage-limit-labels` Уточнить labels для 5-часового и weekly provider usage rows без fake values; Kimi остается unavailable, если source не подтвержден — scope: `src/client/ui/src/session/session-id-bar.tsx, src/client/ui/src/session/session-id-bar.test.tsx, doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionIdUsageBar.md`; expected commit: `fix: clarify provider usage limit labels`.
2. [DONE] Git Commit: `fix: clarify provider usage limit labels` (hash: 06777e3eb)

### Stream: Provider Limit Normalization Tests
1. [DONE] `phase3-provider-limit-normalization-tests` Добавить/уточнить provider-specific tests для 5-hour/weekly semantics в usage-limits payloads и reset labels — scope: `packages/core/src/provider-usage-limits, packages/core/src/remote-bridge/handlers/session-request-handler.usage-limits.test.ts, doc/TODO/todo-plan.md`; expected commit: `test: cover provider usage limit semantics`.
2. [DONE] Git Commit: `test: cover provider usage limit semantics` (hash: 135cf95d4)

## Phase 4 — Kimi Provider Telemetry (owner: Codex, updated: 2026-05-19)
### Stream: Kimi Telemetry Plan Extension
1. [DONE] `phase4-kimi-telemetry-plan-extension` Расширить active plan отдельными microtasks для Kimi context-window telemetry и Kimi usage limits endpoint до targeted verification — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: extend session indicators plan for kimi telemetry`.
2. [DONE] Git Commit: `docs: extend session indicators plan for kimi telemetry` (hash: 989d41fa8)

### Stream: Kimi Context Window Telemetry
1. [DONE] `phase4-kimi-context-token-usage` Нормализовать `StatusUpdate.context_tokens/max_context_tokens/context_usage` в Kimi Wire stream как provider-neutral `tokenUsage` для status panel и зарегистрировать Kimi source tests в quality gates — scope: `packages/Kimi_Module/src/messaging, knip.json, doc/TODO/todo-plan.md`; expected commit: `feat: normalize kimi context usage telemetry`.
2. [DONE] Git Commit: `feat: normalize kimi context usage telemetry` (hash: e26949324)

### Stream: Kimi Usage Limits Endpoint
1. [DONE] `phase4-kimi-usage-limits-reader` Добавить Kimi usage limits reader для `https://api.kimi.com/coding/v1/usages`, читающий API key из user config без логирования секрета — scope: `packages/Kimi_Module/src/provider/kimi-usage-limits-reader.ts, packages/Kimi_Module/src/provider/kimi-usage-limits-reader.test.ts, doc/TODO/todo-plan.md`; expected commit: `feat: read kimi usage limits`.
2. [DONE] Git Commit: `feat: read kimi usage limits` (hash: 71c5767fe)
3. [DONE] `phase4-kimi-usage-limits-adapter` Подключить Kimi usage limits reader к `KimiProviderAdapter.refreshUsageLimits` и отдавать labels `5h`/`Weekly` через существующий Core stream contract — scope: `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts, packages/Kimi_Module/src/provider/kimi-usage-limits-reader.ts, doc/SolidWorks-WorkFlow/Modules/Kimi.md`; expected commit: `feat: broadcast kimi usage limits`.
4. [DONE] Git Commit: `feat: broadcast kimi usage limits` (hash: 32b9e9ad9)

## Phase 5 — Targeted Verification (owner: Codex, updated: 2026-05-19)
### Stream: UI And Core Verification
1. [DONE] `phase5-session-indicators-verification` Выполнить targeted verification по затронутым UI/Core/provider surfaces и зафиксировать результаты в плане — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: record session indicators verification`.
2. [DONE] Git Commit: `docs: record session indicators verification` (hash: 37b993697)

Verification log:
- `npx tsx --test packages/Kimi_Module/src/messaging/kimi-event-normalizer.test.ts packages/Kimi_Module/src/provider/kimi-usage-limits-reader.test.ts src/client/ui/src/session/status-panel.test.tsx src/client/ui/src/session/session-id-bar.test.tsx src/client/project-manager/components/sessions/token-usage-stream.test.ts packages/core/src/provider-usage-limits/provider-usage-limits-stream-event.test.ts` — PASS (30 tests).
- `npm run build --workspace @codeai-hub/kimi-module` — PASS.
- `npm run build --workspace @codeai-hub/core` — PASS.
- `npm run build:webview` — PASS.
- `npm run typecheck:webview` — PASS.
- Live Kimi usage probe via `KimiUsageLimitsReader` and local `~/.kimi/config.toml` — PASS; returned `kimi:global`, `5h=9%`, `Weekly=13%`, source `kimi_usage_api` without exposing the API key.

## Phase 6 — Release Build (owner: Codex, updated: 2026-05-19)
### Stream: Release Build Confirmation Gate
1. [DONE] `phase6-session-indicators-release-confirmation` Остановиться после targeted verification и запросить отдельное подтверждение пользователя на release build; не готовить release notes/version bump и не запускать release scripts до подтверждения — scope: без изменения файлов; expected commit: none. Result: release build confirmed by user request: execute the plan through building a new release

### Stream: Release Build
1. [DONE] `phase6-session-indicators-release-notes` После подтверждения подготовить README/CHANGELOG под будущую версию до запуска release scripts — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare session indicators release notes`.
2. [PENDING] Git Commit: `docs: prepare session indicators release notes` (hash: TBD)
3. [TODO] `phase6-session-indicators-release-build-start` Зафиксировать post-commit advancement перед release scripts — scope: `doc/TODO/todo-plan.md`; expected commit: `docs: mark session indicators release build started`.
4. [TODO] Git Commit: `docs: mark session indicators release build started` (hash: TBD)
5. [TODO] `phase6-session-indicators-release-build` Выполнить release checklist: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, release artifacts handoff — scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, media/react-chat.js, README.md, CHANGELOG.md, doc/TODO/todo-plan.md, doc/tmp/releases/**`; expected commit: `chore: release session indicators build`.
6. [TODO] Git Commit: `chore: release session indicators build` (hash: TBD)

## Phase 7 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-19)
### Stream: User Retest
1. [TODO] `phase7-session-indicators-user-retest` Пользователь устанавливает релиз и проверяет context-window percentage в status panel и 5-hour/weekly usage limits в session ID usage bar — scope: без изменения файлов; expected commit: none.

## Phase 8 — Scope Closeout (owner: Codex, updated: 2026-05-19)
### Stream: Scope Closeout
1. [TODO] `phase8-session-indicators-closeout` После явного acceptance закрыть scope: архивировать active plan, определить disposition planning source, обновить `Docs_Index.md` и связанные ссылки — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans`; expected commit: `docs: close session indicators scope`.
2. [TODO] Git Commit: `docs: close session indicators scope` (hash: TBD)
