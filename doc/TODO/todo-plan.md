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
2. [DONE] Git Commit: `docs: prepare 1.2.8 release notes for Gemini real resume + stale-seed guard` (hash: 960fc03f6)

### Stream 2: Real Gemini resume wiring
1. [DONE] Расширить `GeminiCliModules` + cli-bridge-module-loader для динамического import `@google/gemini-cli-core/dist/src/utils/sessionUtils.js` → `convertSessionToClientHistory` (nullable, локальный subset-type чтобы не падать на workspace cli-core@0.16) — scope: 2 файла; ожидаемый commit: `feat(gemini): expose convertSessionToClientHistory via cli-bridge module loader`
2. [DONE] Git Commit: `feat(gemini): expose convertSessionToClientHistory via cli-bridge module loader` (hash: 94903dfd0)
3. [DONE] В `gemini-session-bootstrapper.ts` реализовать full resume pipeline (scan chats dir → read JSON → pick full-sessionId match → setSessionId → convert → client.resumeChat); graceful degrade — scope: 1 файл; ожидаемый commit: `fix(gemini): wire real resume via client.resumeChat in bootstrapper`
4. [DONE] Git Commit: `fix(gemini): wire real resume via client.resumeChat in bootstrapper` (hash: 4c148c69f)

### Stream 3: Tests for real resume wiring
1. [DONE] Extend `gemini-session-manager.stop-resume.test.ts`: 4 сценария — resetChat не зовётся, argv.resume пробрасывается, `client.resumeChat` invoked с правильным resumedSessionData на реальном tmpdir с двумя chat-файлами, missing file → degrade graceful — scope: 1 файл; ожидаемый commit: `test: verify real resume pipeline invokes client.resumeChat with hydrated history`
2. [DONE] Git Commit: `test: verify real resume pipeline invokes client.resumeChat with hydrated history` (hash: 7500864c9)

### Stream 4: PM stale-seed guard
1. [DONE] Новый `gemini-session-stale-binding-error.ts` + catch `... not found. Available:` в `GeminiProviderAdapter.sendMessage` → throw `SessionStaleBindingError`; экспортировать из index — scope: 3 файла; ожидаемый commit: `feat(gemini): throw SessionStaleBindingError on stale provider session`
2. [DONE] Git Commit: `feat(gemini): throw SessionStaleBindingError on stale provider session` (hash: 5dd879c69)
3. [DONE] В `SessionRequestHandlerMessageDispatch.dispatchUserMessage` catch error.code=GEMINI_SESSION_STALE_BINDING → `invalidateProviderBinding` (captures preStop) → `ensureSessionReadyForSend` → re-resolve → retry send one-shot; hooks wired post-construction из `session-request-handler.ts` — scope: 2 файла; ожидаемый commit: `fix(core): auto-recover from provider stale-seed binding with one-shot rebind retry`
4. [DONE] Git Commit: `fix(core): auto-recover from provider stale-seed binding with one-shot rebind retry` (hash: 2ba939b5c)

### Stream 5: Remove SwitchRecoveryBanner
1. [DONE] Удалить `switch-recovery-banner.tsx`, `use-dialog-switch-offer.ts`, `dialog-switch-types.ts`; cleanup в `session-view.tsx`, `project-manager-dialog-session-view.tsx`, `core-stream-message-types.ts`, `dialog-api.ts` — scope: 7 файлов (3 delete + 4 edit); ожидаемый commit: `chore: remove legacy SwitchRecoveryBanner and dialog-switch-offer hook`
2. [DONE] Git Commit: `chore: remove legacy SwitchRecoveryBanner and dialog-switch-offer hook` (hash: 56438bbfa)

(также committed: `chore(gemini-tests): annotate convertSessionToClientHistory mock parameter for strict build` hash: 641f11ebf — тест-type fix из Stream 3)

### Stream 6: Nest Gemini CLI install under providers/gemini/cli
1. [DONE] Изменить `GEMINI_INSTALLER_PATHS.macOS/linux/windows` в `provider-installer-paths.ts` на full-module-path, чтобы `computePrefix` через существующий marker-based stripping резолвился в `~/.codeai-hub/providers/gemini/cli` — scope: 1 файл; ожидаемый commit: `fix(core): nest Gemini CLI install under providers/gemini/cli`
2. [DONE] Git Commit: `fix(core): nest Gemini CLI install under providers/gemini/cli` (hash: 9f4283f61)

### Stream 7: SSOT docs + planning archive
1. [DONE] Invariant 24 в SystemArchitecture.md дополнить тремя абзацами (real resume, stale-seed, install layout); `Modules/Gemini.md` — три дополнительных bullet'а поверх 1.2.7 — scope: 2 файла; ожидаемый commit: `docs: promote Gemini real resume + stale-seed guard + install layout contract`
2. [DONE] Git Commit: `docs: promote Gemini real resume + stale-seed guard + install layout contract` (hash: e37a724b6)
3. [DONE] Planning-doc → `Plans/Archive/`; обновить `Docs_Index.md` — scope: 2 файла; ожидаемый commit: `docs: archive 1.2.8 Gemini real resume planning doc`
4. [DONE] Git Commit: `docs: archive 1.2.8 Gemini real resume planning doc` (hash: d8a9138ba)

### Stream 8: Release build 1.2.8
1. [TODO] User manually wipes `~/.codeai-hub/` before build; verify чистое дерево, запустить `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.
2. [TODO] Git Commit: `chore: bump version to 1.2.8 for Gemini real resume + stale-seed guard + install layout release` (hash: TBD)
