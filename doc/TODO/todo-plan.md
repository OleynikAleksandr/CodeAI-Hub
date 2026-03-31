# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- Required reading перед каждым фиксом: `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Новый scope открыт через `doc/SolidWorks-WorkFlow/Plans/Codex_Reasoning_Translation_And_Thinking_Display_Sync_Architecture.md`
- Каждая микрозадача должна затрагивать не более `3` файлов/пакетов
- После каждой микрозадачи в Stream обязателен отдельный пункт `Git Commit: ...`
- Любые изменения архитектуры/логики должны синхронно обновлять `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и связанные SSOT-документы до коммита
- Phase завершается только после таргетных сборок затронутых пакетов/клиентов и чистого дерева
- Финальный release stream обязан завершаться `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`

## Current state
- Active scope: Codex reasoning translation to Russian через shared translation module
- Secondary scope: future thinking display sync toggle for Codex and Gemini
- Phase 1 completed; Phase 2 is next.
- Release stream включён в конец плана
- Phase 2 now has the first settings-state microtask implemented in code.
- Core applied-config now carries presentation-only thinking display sync flags for Codex/Gemini.
- Provider-side thinking display sync gate is now implemented for Codex and Gemini.
- Provider settings UI now exposes the thinking display sync toggle for Codex and Gemini.

## Phase 1 — Codex Reasoning Translation Parity (owner: Oleksandr + Codex, updated: 2026-03-31)

### Stream: Codex Thinking Adapter
1. [DONE] Добавить Codex-local adapter поверх shared translation facade и перевести reasoning stream deltas в русское visible output без зависимости от provider-only helper. Scope: `packages/Codex_Module/src/messaging/codex-thought-translation-adapter.ts`, `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(codex): add translated reasoning adapter`
2. [DONE] Git Commit: `refactor(codex): add translated reasoning adapter` (hash: `85e3c36e`)
3. [DONE] Переключить Codex dialog emission на `role: "assistant"` + `tag: "thinking"` и убрать user-facing placeholder `role: "thinking"` с turn-start path. Scope: `packages/Codex_Module/src/messaging/`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`. Expected commit: `refactor(codex): emit assistant thinking messages`
4. [DONE] Git Commit: `refactor(codex): emit assistant thinking messages` (hash: `b59fbbd2`)

### Stream: UI and SSOT Parity
1. [DONE] Держать `assistant + tag: "thinking"` на стандартной visible bubble path и оставить collapsible thinking card только как legacy compatibility fallback для archived raw role-thinking history. Scope: `src/client/ui/src/session/dialog-panel-message-utils.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `fix(ui): render tagged thinking as assistant bubble`
2. [DONE] Git Commit: `fix(ui): render tagged thinking as assistant bubble` (hash: `e3ba5153`)
3. [DONE] Синхронизировать SSOT-документы под новый Codex thinking contract и shared translation boundary. Scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`. Expected commit: `docs(architecture): sync codex thinking translation`
4. [DONE] Git Commit: `docs(architecture): sync codex thinking translation` (hash: `e94594fd`)

## Phase 2 — Thinking Display Sync Control (owner: Oleksandr + Codex, updated: 2026-03-31)

### Stream: Settings and Bridge Contract
1. [DONE] Добавить per-provider thinking display-sync flags в settings state и raw snapshot mapping. Scope: `src/client/ui/src/components/settings/settings-state-raw.ts`, `src/client/ui/src/components/settings/settings-state-model.ts`, `src/client/ui/src/components/settings/settings-state-helpers.ts`, `src/client/ui/src/components/settings/use-settings-state.ts`, `src/client/ui/src/components/settings/use-settings-state-support.ts`, `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`. Expected commit: `feat(settings): add thinking display sync flags`
2. [DONE] Git Commit: `feat(settings): add thinking display sync flags` (hash: `a5613eea`)
3. [DONE] Протянуть display-sync flag через Core applied turn config, не смешивая его с effective model identity. Scope: `packages/core/src/config/provider-settings-snapshot.ts`, `packages/core/src/config/provider-turn-config-resolver.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`, `packages/core/src/remote-bridge/types.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `feat(core): carry thinking display sync flags`
4. [DONE] Git Commit: `feat(core): carry thinking display sync flags` (hash: `1fd6d485`)

### Stream: Provider Gating and UI Surface
1. [DONE] Заблокировать visible thinking emit в Codex и Gemini по display-sync flag, сохранив reasoning processing и translation internals. Scope: `packages/Codex_Module/src/session/types.ts`, `packages/Codex_Module/src/messaging/codex-applied-turn-config.ts`, `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`, `packages/Gemini_Module/src/session/types.ts`, `packages/Gemini_Module/src/provider/gemini-applied-turn-config.ts`, `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`, `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `feat(provider): gate thinking display sync`
2. [DONE] Git Commit: `feat(provider): gate thinking display sync` (hash: `40e45885`)
3. [DONE] Показать toggle для Codex и Gemini в provider settings UI. Scope: `src/client/ui/src/components/settings/codex-default-model/codex-default-model-card.tsx`, `src/client/ui/src/components/settings/gemini-default-model/gemini-default-model-card.tsx`, `src/client/ui/src/components/settings-view.tsx`. Expected commit: `feat(ui): expose thinking display sync toggle`
4. [DONE] Git Commit: `feat(ui): expose thinking display sync toggle` (hash: `1d76a169`)

## Phase 3 — Release Stream (owner: Oleksandr + Codex, updated: 2026-03-31)

### Stream: Docs and Release Prep
1. [TODO] Синхронизировать release-facing docs и changelog перед version bump. Scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `docs(release): prep codex thinking release`
2. [TODO] Git Commit: `docs(release): prep codex thinking release` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, перенести свежие tarball-ы в `doc/tmp/releases/` и зафиксировать результат в session report. Scope: `./scripts/build-all.sh`, `./scripts/build-release.sh`, `doc/tmp/releases/`, `doc/Sessions/Session004.md`. Expected commit: `build(release): assemble codex thinking release`
4. [TODO] Git Commit: `build(release): assemble codex thinking release` (hash: TBD)
