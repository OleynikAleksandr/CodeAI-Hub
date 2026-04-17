# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Gemini_Stop_Abort_And_Resume_1.2.7.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (Invariant 24, 28)
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`
  - `packages/Gemini_Module/src/session/gemini-session-manager.ts`
  - `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-stop-rebind.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-stop-action.ts`
  - `packages/core/src/remote-bridge/handlers/session-provider-session-resolver.ts`
  - `packages/core/src/remote-bridge/handlers/session-provider-binding-service.ts`
  - `packages/core/src/provider-registry/provider-descriptor-factory.ts`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) изменения, (2) `Git Commit: ...`.
- Gates автоматически через Husky (`.husky/pre-commit`, `.husky/pre-push`). Таргетные сборки — перед закрытием Stream.
- Real-time документация: обновляем doc/SolidWorks-WorkFlow/* в том же коммите.
- Phase завершается на чистом дереве через `./scripts/build-all.sh` (последний Stream).

## Phase 1 — Gemini Stop Abort + Resume 1.2.7 (owner: Claude, updated: 2026-04-17)

### Stream 1: README/CHANGELOG pre-bump
1. [DONE] Обновить README.md и CHANGELOG.md на будущую версию 1.2.7 — scope: 2 файла; ожидаемый commit: `docs: prepare 1.2.7 release notes for Gemini Stop abort + resume`
2. [DONE] Git Commit: `docs: prepare 1.2.7 release notes for Gemini Stop abort + resume` (hash: 09be911fc)

### Stream 2: Gemini module — remove resetChat on Stop
1. [DONE] Удалить `session.client.resetChat()` из `gemini-session-lifecycle.ts` `closeSession`; оставить только abort + removeSession (дополнительно: убрать async у синхронизированного closeSession в lifecycle/manager, adapter сохранил Promise<void>) — scope: 3 файла; ожидаемый commit: `fix: drop resetChat on Gemini Stop to preserve provider chat history`
2. [DONE] Git Commit: `fix: drop resetChat on Gemini Stop to preserve provider chat history` (hash: 133d3ff0a)

### Stream 3: Core — preserve pre-stop providerSessionId + resume capability
1. [DONE] Добавить capability `requiresPostStopResume` в `provider-descriptor-factory.ts` (geminiCli=true); расширить `ProviderCapabilities` — scope: 2 файла; ожидаемый commit: `feat(core): add requiresPostStopResume provider capability`
2. [DONE] Git Commit: `feat(core): add requiresPostStopResume provider capability` (hash: 89278cdb1)
3. [DONE] В `session-provider-binding-service.ts` перед `invalidateProviderBinding` запомнить pre-stop `providerSessionId` в Map; expose `getPreStopProviderSessionId(sessionId)` + `clearPreStopProviderSessionId(sessionId)` — scope: 1 файл; ожидаемый commit: `feat(core): remember pre-stop providerSessionId on binding invalidate`
4. [DONE] Git Commit: `feat(core): remember pre-stop providerSessionId on binding invalidate` (hash: b8855858b)
5. [DONE] В `session-request-handler-stop-rebind.ts` передавать pre-stop providerSessionId в `resolveProviderSessionId` для провайдеров с `requiresPostStopResume`; добавить `ProviderRegistry.getDescriptor`; очистить preStop map после rebind — scope: 3 файла; ожидаемый commit: `fix(core): resume provider session on post-stop rebind for Gemini`
6. [DONE] Git Commit: `fix(core): resume provider session on post-stop rebind for Gemini` (hash: ce7e677b7)

### Stream 4: Tests
1. [DONE] Добавить self-contained test `gemini-session-manager.stop-resume.test.ts`: (a) closeSession не зовёт resetChat, (b) resumeSession прокидывает providerSessionId в argv.resume — scope: 1 файл; ожидаемый commit: `test: verify Gemini Stop preserves chat and rebind resumes`
2. [DONE] Git Commit: `test: verify Gemini Stop preserves chat and rebind resumes` (hash: b67652dec)

### Stream 5: SSOT docs + planning archive
1. [DONE] Обновить Invariant 24 в `SystemArchitecture.md` (добавить абзац про Gemini и requiresPostStopResume); обновить `Modules/Gemini.md` (Stop Abort + Resume) — scope: 2 файла; ожидаемый commit: `docs: promote Gemini post-stop resume contract`
2. [DONE] Git Commit: `docs: promote Gemini post-stop resume contract` (hash: 70711cc6e)
3. [DONE] Архивировать planning-doc в `doc/SolidWorks-WorkFlow/Plans/Archive/`; обновить `Docs_Index.md` — scope: 2 файла; ожидаемый commit: `docs: archive 1.2.7 Gemini Stop planning doc`
4. [DONE] Git Commit: `docs: archive 1.2.7 Gemini Stop planning doc` (hash: 0c28124ae)

### Stream 6: Release build 1.2.7
1. [TODO] Verify чистое дерево, запустить `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`; скопировать tarballs в `doc/tmp/releases/`.
2. [TODO] Git Commit: авто от `build-all.sh` (bump `package.json` + манифесты до 1.2.7) (hash: TBD)

