# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_StatusPanel_ModelSwitch_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Codex_StatusPanel_ModelSwitch_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
  - `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html`
  - `src/types/codex-model-registry.ts`
  - `packages/Codex_AppServer_Module/src/` (payload builder + dispatch path)
  - `packages/core/src/remote-bridge/session-stream-contracts.ts`
  - `packages/core/src/remote-bridge/remote-bridge-message-router.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts`
  - `src/client/project-manager/api.ts`
  - `src/client/ui/src/session/status-panel.tsx`
  - `src/client/ui/src/session/model-switcher/session-model-picker-card.tsx`
  - `src/client/ui/src/session/model-switcher/session-model-switcher-facade.ts`
  - `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase. В каждой Phase — Stream'ы, в каждом Stream'е — подзадачи.
- Каждая подзадача затрагивает ≤3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация, (2) `Git Commit: ...`.
- Если задача затрагивает >3 файлов — split на более мелкие.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`, `npm run build:project-manager`.
- **Real-time документация:** любое изменение архитектуры/логики → синхронное обновление SSOT и `todo-plan.md` ДО коммита.
- Phase 2 завершается на чистом дереве через `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.
- **Phase 3 — user verification — обязательная.** Без явного «ОК / закрываем» от пользователя scope не архивируется.
- `todo-plan.md` обновляется в риалтайме после каждого коммита (статус + hash).

## Phase 1 — Codex status panel model switch (owner: UI / Codex provider, updated: 2026-04-30)

### Stream A — Scope opening

1. [DONE] Создать `doc/SolidWorks-WorkFlow/Plans/Codex_StatusPanel_ModelSwitch_Architecture.md` + этот todo-plan. Scope: 2 файла; commit message: `docs: open codex status panel model switch scope`.
2. [DONE] Git Commit: `docs: open codex status panel model switch scope` (hash: c9931048b)

### Stream B — Codex capability flags + model registry

1. [TODO] Расширить `src/types/codex-model-registry.ts` per-model полями: `supportsReasoningSummary`, `supportsVerbosity`, `reasoningEffortOptions`, `contextWindow`, `autoCompactTokenLimit`. Spark получает `supportsReasoningSummary: false` и `reasoningEffortOptions` по результатам провайдер-experiment (если empty — UI hide reasoning chip для Spark). Добавить unit-тест registry. Scope: 2 файла; commit message: `feat(codex): add per-model capability flags`.
2. [TODO] Git Commit: `feat(codex): add per-model capability flags` (hash: TBD)

### Stream C — Codex payload builder gating

1. [TODO] В Codex App Server payload builder gate `reasoning.summary` / `summary` / `verbosity` на `currentInvocationProfile.capabilities`. Никакого in-place transform — pure rebuild. Добавить unit-тест: Spark turn payload не содержит `reasoning.summary`; non-Spark содержит. Scope: ≤3 файла (builder + test + maybe small helper); commit message: `fix(codex): gate payload fields on per-model capability flags`.
2. [TODO] Git Commit: `fix(codex): gate payload fields on per-model capability flags` (hash: TBD)

### Stream D — Switch transport + Core handler

1. [TODO] `session-stream-contracts.ts` + `remote-bridge-message-router.ts` + `session-request-handler-session-actions.ts` (или новый sibling handler): добавить `session:codex:model-switch` transport. Core handler: validate target → mutate `Session.modelBinding` → set `pendingModelSwitchInjection = true` → broadcast `session:model:update`. НЕ trigger'ит provider call. Scope: 3 файла; commit message: `feat(core): add codex model switch transport handler`.
2. [TODO] Git Commit: `feat(core): add codex model switch transport handler` (hash: TBD)
3. [TODO] Unit-тест: handler validates target, mutates binding, sets flag, broadcasts. Scope: 1 файл; commit message: `test(core): cover codex model switch handler state mutation`.
4. [TODO] Git Commit: `test(core): cover codex model switch handler state mutation` (hash: TBD)

### Stream E — `<model_switch>` developer message injection

1. [TODO] В Codex App Server dispatch path: при `pendingModelSwitchInjection === true` embed `<model_switch>` developer message в начало `turn/start.input` (по образцу Codex CLI), затем сбросить flag. Snapshot-test первого turn after switch. Scope: ≤3 файла; commit message: `feat(codex): inject model switch developer message on first turn after switch`.
2. [TODO] Git Commit: `feat(codex): inject model switch developer message on first turn after switch` (hash: TBD)

### Stream F — Status panel UI wiring (Codex-only)

1. [TODO] `status-panel.tsx` + `session-model-picker-card.tsx` + (`use-project-manager-dialog-session-controller.ts` или runtime view equivalent): wire model + reasoning chips. Codex sessions → picker open + dispatch `session:codex:model-switch`. Non-Codex → chips disabled / no-op + tooltip. Default reasoning при выборе model: previous-if-supported, else first из options. Scope: 3 файла; commit message: `feat(pm-status-panel): wire codex model and reasoning switch buttons`.
2. [TODO] Git Commit: `feat(pm-status-panel): wire codex model and reasoning switch buttons` (hash: TBD)
3. [TODO] Component-тест: click chip → picker open; selection → correct dispatch; non-Codex no-op. Scope: 1 файл; commit message: `test(pm-status-panel): cover codex switch wiring`.
4. [TODO] Git Commit: `test(pm-status-panel): cover codex switch wiring` (hash: TBD)

### Stream G — End-to-end native request capture

1. [TODO] Добавить native-capture integration test: switch `gpt-5.2` → `gpt-5.3-codex-spark` с reasoning low → send turn → assert raw native request не содержит `reasoning.summary`, содержит `<model_switch>` в input array. Scope: ≤2 файла; commit message: `test(codex): cover model switch end-to-end via native request capture`.
2. [TODO] Git Commit: `test(codex): cover model switch end-to-end via native request capture` (hash: TBD)

### Stream H — SSOT docs sync

1. [TODO] Обновить `Modules/Codex.md` (capability flags + switch behaviour), `Modules/Codex_ProviderInvocationFlags.md` (per-model flags table), `Modules/Session_UI/SessionStatusPanel.md` (switch UI semantic). Scope: 3 файла; commit message: `docs(ssot): document codex model switch architecture`.
2. [TODO] Git Commit: `docs(ssot): document codex model switch architecture` (hash: TBD)
3. [TODO] Если по результатам review требуется new SystemArchitecture invariant — добавить. Scope: 1 файл; commit message: `docs(ssot): add system invariant for codex capability-gated payload`.
4. [TODO] Git Commit: `docs(ssot): add system invariant for codex capability-gated payload` (hash: TBD, may be skipped)

## Phase 2 — Release 1.2.111 (owner: Build, updated: 2026-04-30)

### Stream I — Pre-build version sync

1. [TODO] Обновить `README.md` («Current Release — v1.2.111») и `CHANGELOG.md` (новая секция `## [1.2.111]`) с описанием Codex switch. Scope: 2 файла; commit message: `docs: prepare release 1.2.111`.
2. [TODO] Git Commit: `docs: prepare release 1.2.111` (hash: TBD)

### Stream J — Build new release

1. [TODO] `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version` → копирование 7 tarballs в `doc/tmp/releases/`. Артефакт: `codeai-hub-1.2.111.vsix`. Scope: scripts; commit message: `chore: build release 1.2.111`.
2. [TODO] Git Commit: `chore: build release 1.2.111` (hash: TBD)

## Phase 3 — User acceptance (owner: User retest, updated: 2026-04-30)

### Stream K — Hand off for user verification

1. [BLOCKED on user] Передать VSIX `codeai-hub-1.2.111.vsix` пользователю. Scope **не закрывается**, пока пользователь явно не подтвердит:
   - Switch на Codex session работает (`gpt-5.2` → `gpt-5.3-codex-spark` с reasoning low → следующий user message processes без error / без `400 unsupported_parameter`).
   - Chips correctly disabled / no-op для Claude и Gemini sessions.
   - UI behaviour satisfying (picker UX, reasoning options derivation, default selection logic).
   - SSOT documentation accurate (user reviews и подтверждает).
2. [BLOCKED on user] Stream K статус IN_PROGRESS до явного «ОК / закрываем».

### Stream L — Closeout (только после user OK)

1. [TODO] После явного user approval: архивировать `doc/TODO/todo-plan.md` в `doc/TODO/Archive/todo-plan-phase3-codex-status-panel-model-switch.md`; перенести planning-doc в `doc/SolidWorks-WorkFlow/Plans/Archive/`; обновить `doc/SolidWorks-WorkFlow/Docs_Index.md`; reset активного `doc/TODO/todo-plan.md` в no-active-scope shell. Scope: 4 файла + дельта; commit message: `docs: archive codex status panel model switch scope`.
2. [TODO] Git Commit: `docs: archive codex status panel model switch scope` (hash: TBD)
3. [TODO] Создать `doc/Sessions/SessionXXX.md` (Type A — Completion Report). Scope: 1 файл (uncommitted per CLAUDE.md convention).
4. [TODO] Push на GitHub.
