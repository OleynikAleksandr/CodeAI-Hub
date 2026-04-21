# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Provider_StaleBinding_AutoRecovery_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 Invariant 1 (snapshot-first lock contract, paper-binding через materializer), §3 Invariant 10 (Provider failure classification before teardown)
  - `doc/SolidWorks-WorkFlow/Plans/Archive/SessionInputLock_RuntimeMaterialization_Architecture.md` (precedent 1.2.39 — откуда появился paper-binding)
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Gemini_Stop_Abort_And_Resume_1.2.7.md` + `doc/SolidWorks-WorkFlow/Plans/Archive/Gemini_Real_Resume_And_PM_StaleSeed_Guard_1.2.8.md` (precedent auto-rebind retry для Gemini)
  - `packages/Gemini_Module/src/provider/gemini-session-stale-binding-error.ts` (reference error class)
  - `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` (existing detector + retry-ветка)
  - `packages/Claude_Module/src/sdk/claude-sdk-manager.ts` (throw location, line ~157)
  - `packages/Claude_Module/src/provider/claude-provider-adapter.ts` (sendMessage pass-through)
  - `packages/Claude_Module/src/session/session-manager.ts` (`createResumedSession` — resume seam)
  - `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts` (Codex send path)
  - `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts` (`facade.sessions` Map, очищается при Core restart)
  - `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts` (child process lifecycle)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Phase завершается на чистом дереве: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`, tarball'ы в `doc/tmp/releases/`, итог в `doc/Sessions/`.

## Phase 1 — Claude stale-binding auto-recovery (owner: claude, updated: 2026-04-21)

### Stream: Claude detector + throw
1. [TODO] Новый `claude-session-stale-binding-error.ts` (класс + `code` + `providerSessionId` + pattern-matcher `extractStaleProviderSessionId`) + замена `throw new Error("Session <id> not found")` на `throw new ClaudeSessionStaleBindingError(sessionId)` в `claude-sdk-manager.ts:~157` (scope: `packages/Claude_Module/src/provider/claude-session-stale-binding-error.ts` — NEW, `packages/Claude_Module/src/sdk/claude-sdk-manager.ts` — MODIFY; 2 файла).
2. [TODO] Git Commit: `feat: surface claude stale-binding as recognizable error` (hash: TBD)
3. [TODO] Расширить detector в `dispatchUserMessage` на `CLAUDE_SESSION_STALE_BINDING` code + unit-тест на Claude retry-ветку симметрично Gemini (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` — MODIFY, `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.test.ts` — MODIFY; 2 файла).
4. [TODO] Git Commit: `feat: one-shot rebind retry on claude stale-binding send failure` (hash: TBD)

**Phase 1 closure:** `npm run build --workspace packages/core` + `npm run build --workspace packages/Claude_Module` зелёные; regression тест на retry-ветку проходит.

## Phase 2 — Codex stale-binding auto-recovery (owner: claude, updated: 2026-04-21)

### Stream: Codex detector + throw
1. [TODO] Прочитать актуальный error shape из Codex app-server при send на несуществующий thread (после Core restart) через чтение `codex-app-server-facade.ts` и JSON-RPC flow; зафиксировать в комментарии планируемого error class (scope: research-only, коммита нет).
2. [TODO] Новый `codex-session-stale-binding-error.ts` + детекция точки, где app-server возвращает "thread not found"-эквивалент, + wrap его в `CodexSessionStaleBindingError` (scope: `packages/Codex_AppServer_Module/src/provider/codex-session-stale-binding-error.ts` — NEW, `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts` — MODIFY, возможно `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts` — MODIFY; ≤3 файла).
3. [TODO] Git Commit: `feat: surface codex stale-binding as recognizable error` (hash: TBD)
4. [TODO] Расширить detector в `dispatchUserMessage` на `CODEX_SESSION_STALE_BINDING` code + unit-тест на Codex retry-ветку (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` — MODIFY, `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.test.ts` — MODIFY; 2 файла).
5. [TODO] Git Commit: `feat: one-shot rebind retry on codex stale-binding send failure` (hash: TBD)

**Phase 2 closure:** `npm run build --workspace packages/Codex_AppServer_Module` зелёный; regression тест проходит.

## Phase 3 — SSOT sync + BugRegistry

### Stream: Docs
1. [TODO] Расширить `SystemArchitecture.md` §3 Invariant 1 и/или §3 Invariant 10 — зафиксировать stale-binding auto-recovery invariant для всех трёх providers (Gemini precedent 1.2.8 + Claude/Codex в 1.2.42). Добавить `BUG-2026-04-21-04` в `BugRegistry.md` с forensics / root cause / fix / commits / guards (scope: 2 файла).
2. [TODO] Git Commit: `docs: record provider stale-binding auto-recovery invariant` (hash: TBD)

## Phase 4 — Release 1.2.42

### Stream: Release
1. [TODO] README.md + CHANGELOG.md под 1.2.42 ДО запуска build-all.sh (scope: 2 файла).
2. [TODO] Git Commit: `docs: prepare release notes for provider stale-binding auto-recovery (1.2.42)` (hash: TBD)
3. [TODO] `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`; tarball + VSIX в `doc/tmp/releases/`.
4. [TODO] Git Commit: `build: release 1.2.42` (hash: TBD)
5. [TODO] User acceptance: workspace `CodeAI-Hub claude`, stage `diagram_modules` — после Core restart первый user message в reopened dialog проходит без silent drop (для Claude); тот же тест для Codex workspace (`CodeAI-Hub codex 5.4` или аналогичный).
