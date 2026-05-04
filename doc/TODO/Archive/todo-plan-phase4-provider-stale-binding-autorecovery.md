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
- Phase завершается на чистом дереве: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`, tarball'ы в `doc/tmp/releases/`, итог в legacy session-report archive (removed).

## Phase 1 — Claude stale-binding auto-recovery (owner: claude, updated: 2026-04-21)

### Stream: Claude detector + throw
1. [DONE] Новый `claude-session-stale-binding-error.ts` (класс + `code` + `providerSessionId`) + замена `throw new Error("Session <id> not found")` на `throw new ClaudeSessionStaleBindingError(sessionId)` в `claude-sdk-manager.ts` + dispatch detector обобщён на set кодов провайдеров (scope: 3 файла; объединено в один commit т.к. knip требует, чтобы новый symbol сразу был использован).
2. [DONE] Git Commit: `feat: auto-recover claude session binding on stale-send failure` (hash: `783deba31`)
3. [DONE] Contract test на error shape (code / providerSessionId / message / name / Error prototype) — covers throw-site ↔ catch-site handshake (scope: 1 файл).
4. [DONE] Git Commit: `test: pin claude stale-binding error contract` (hash: `e4e117e6e`)

**Phase 1 closure:** `npm run build --workspace packages/core` + `npm run build --workspace packages/Claude_Module` зелёные; regression тест на retry-ветку проходит.

## Phase 2 — Codex stale-binding auto-recovery (owner: claude, updated: 2026-04-21)

### Stream: Codex detector + throw
1. [DONE] Research: Codex app-server child process умирает вместе с Core, `facade.sessions` Map пустой после рестарта. Решение — не детектить error content от app-server, а гарантировать handshake на Core-facade уровне: новый Set `handshakedThreadIds` заполняется в `createSession`/`resumeSession` и проверяется в `sendMessage`; отсутствие membership бросает typed error до `turn/start`.
2. [DONE] Новый `codex-session-stale-binding-error.ts` + guard в `codex-app-server-facade.ts` (`handshakedThreadIds` Set) + dispatch detector расширен `CODEX_SESSION_STALE_BINDING` (scope: 3 файла).
3. [DONE] Git Commit: `feat: auto-recover codex session binding on stale-send failure` (hash: `c65e5172f`)
4. [DONE] Contract test на error shape симметрично Claude (scope: 1 файл).
5. [DONE] Git Commit: `test: pin codex stale-binding error contract` (hash: `e588dda80`)

**Phase 2 closure:** `npm run build --workspace packages/Codex_AppServer_Module` зелёный; regression тест проходит.

## Phase 3 — SSOT sync + BugRegistry

### Stream: Docs
1. [IN_PROGRESS] Расширить `SystemArchitecture.md` §3 Invariant 1 про stale-binding auto-recovery invariant для всех трёх providers + добавить `BUG-2026-04-21-04` в `BugRegistry.md` (scope: 2 файла).
2. [TODO] Git Commit: `docs: record provider stale-binding auto-recovery invariant` (hash: TBD)

## Phase 4 — Release 1.2.42

### Stream: Release
1. [TODO] README.md + CHANGELOG.md под 1.2.42 ДО запуска build-all.sh (scope: 2 файла).
2. [TODO] Git Commit: `docs: prepare release notes for provider stale-binding auto-recovery (1.2.42)` (hash: TBD)
3. [TODO] `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`; tarball + VSIX в `doc/tmp/releases/`.
4. [TODO] Git Commit: `build: release 1.2.42` (hash: TBD)
5. [TODO] User acceptance: workspace `CodeAI-Hub claude`, stage `diagram_modules` — после Core restart первый user message в reopened dialog проходит без silent drop (для Claude); тот же тест для Codex workspace (`CodeAI-Hub codex 5.4` или аналогичный).
