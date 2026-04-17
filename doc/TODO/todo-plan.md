# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Gemini_Real_Resume_And_PM_StaleSeed_Guard_1.2.8.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (Invariant 24)
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
  - `packages/Gemini_Module/src/runtime/cli-bridge-module-loader.ts`
  - `packages/Gemini_Module/src/runtime/cli-types.ts`
  - `packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts`
  - `packages/Gemini_Module/src/session/gemini-session-manager.stop-resume.test.ts`
  - `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-provider-send.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-stop-rebind.ts`
  - `packages/core/src/remote-bridge/handlers/session-provider-binding-service.ts`
  - `src/client/ui/src/session/switch-recovery-banner.tsx`
  - `src/client/project-manager/components/sessions/use-dialog-switch-offer.ts`
  - `src/client/project-manager/dialog-switch-types.ts`
  - `src/client/ui/src/session/session-view.tsx`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой: (1) изменения, (2) `Git Commit: ...`.
- Gates автоматически через Husky. Таргетные сборки — перед закрытием Stream.
- Real-time документация — в том же коммите.
- Phase завершается на чистом дереве через `./scripts/build-all.sh` (последний Stream).

## Phase 1 — Gemini Real Resume + PM Stale-Seed Guard 1.2.8 (owner: Claude, updated: 2026-04-17)

### Stream 1: README/CHANGELOG pre-bump + planning doc
1. [DONE] Обновить README.md и CHANGELOG.md на будущую версию 1.2.8; planning-doc `Gemini_Real_Resume_And_PM_StaleSeed_Guard_1.2.8.md` в `Plans/` — scope: 3 файла; ожидаемый commit: `docs: prepare 1.2.8 release notes for Gemini real resume + stale-seed guard`
2. [DONE] Git Commit: `docs: prepare 1.2.8 release notes for Gemini real resume + stale-seed guard` (hash: TBD)

### Stream 2: Real Gemini resume wiring
1. [TODO] Расширить `GeminiCliModules` + cli-bridge-module-loader для динамического import `@google/gemini-cli-core/dist/src/utils/sessionUtils.js` → `convertSessionToClientHistory` — scope: 2 файла; ожидаемый commit: `feat(gemini): expose convertSessionToClientHistory via cli-bridge module loader`
2. [TODO] Git Commit: `feat(gemini): expose convertSessionToClientHistory via cli-bridge module loader` (hash: TBD)
3. [TODO] В `gemini-session-bootstrapper.ts` реализовать full resume pipeline (scan chats dir → read JSON → pick full-sessionId match → setSessionId → convert → client.resumeChat); graceful degrade на missing file — scope: 1 файл; ожидаемый commit: `fix(gemini): wire real resume via client.resumeChat in bootstrapper`
4. [TODO] Git Commit: `fix(gemini): wire real resume via client.resumeChat in bootstrapper` (hash: TBD)

### Stream 3: Tests for real resume wiring
1. [TODO] Extend `gemini-session-manager.stop-resume.test.ts`: mock modules.sessionUtils + spy on `client.resumeChat`; verify resumeChat invoked with expected resumedSessionData shape and `argv.resume` still forwarded — scope: 1 файл; ожидаемый commit: `test: verify real resume pipeline invokes client.resumeChat with hydrated history`
2. [TODO] Git Commit: `test: verify real resume pipeline invokes client.resumeChat with hydrated history` (hash: TBD)

### Stream 4: PM stale-seed guard
1. [TODO] В `GeminiProviderAdapter.sendMessage` catch `Gemini session … not found. Available:` → throw `SessionStaleBindingError` с providerSessionId; экспортировать класс из провайдерного модуля — scope: 2 файла; ожидаемый commit: `feat(gemini): throw SessionStaleBindingError on stale provider session`
2. [TODO] Git Commit: `feat(gemini): throw SessionStaleBindingError on stale provider session` (hash: TBD)
3. [TODO] В `session-request-handler-provider-send.ts` (или message-dispatch) catch `SessionStaleBindingError` → seed preStop map + `invalidateProviderBinding` + re-run `ensureSessionReadyForSend` + retry send once; guard против двойного retry — scope: 2 файла; ожидаемый commit: `fix(core): auto-recover from provider stale-seed binding with one-shot rebind retry`
4. [TODO] Git Commit: `fix(core): auto-recover from provider stale-seed binding with one-shot rebind retry` (hash: TBD)

### Stream 5: Remove SwitchRecoveryBanner
1. [TODO] Удалить `switch-recovery-banner.tsx`, `use-dialog-switch-offer.ts`, `dialog-switch-types.ts` и соответствующие CSS/i18n; убрать imports из `session-view.tsx` — scope: 3 файла + cleanup import; ожидаемый commit: `chore: remove legacy SwitchRecoveryBanner and dialog-switch-offer hook`
2. [TODO] Git Commit: `chore: remove legacy SwitchRecoveryBanner and dialog-switch-offer hook` (hash: TBD)

### Stream 6: SSOT docs + planning archive
1. [TODO] Invariant 24 в SystemArchitecture.md дополнить требованием "providers must publish recognizable stale-binding surface"; `Modules/Gemini.md` — bullet про real resume wiring и SessionStaleBindingError — scope: 2 файла; ожидаемый commit: `docs: promote Gemini real resume + stale-seed guard contract`
2. [TODO] Git Commit: `docs: promote Gemini real resume + stale-seed guard contract` (hash: TBD)
3. [TODO] Planning-doc → `Plans/Archive/`; обновить `Docs_Index.md` — scope: 2 файла; ожидаемый commit: `docs: archive 1.2.8 Gemini real resume planning doc`
4. [TODO] Git Commit: `docs: archive 1.2.8 Gemini real resume planning doc` (hash: TBD)

### Stream 7: Release build 1.2.8
1. [TODO] Verify чистое дерево, запустить `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.
2. [TODO] Git Commit: `chore: bump version to 1.2.8 for Gemini real resume + stale-seed guard release` (hash: TBD)
