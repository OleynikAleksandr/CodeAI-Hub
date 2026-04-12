# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionUsageLimitsRefresh_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/SessionUsageLimitsRefresh_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionIdUsageBar.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, staged formatting by Ultracite
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: Любое изменение архитектуры/логики требует синхронного обновления `todo-plan.md` и связанных документов из `doc/` до коммита.

## Phase 1 — Session-scoped usage limits refresh (owner: Codex, updated: 2026-04-12)
### Stream: Implemented scope backfill
1. [DONE] Перевести UI/PM refresh request на session-scoped context (`sessionId + providerId + providerSessionId`) и привязать trigger к active session restore/switch; scope: `src/client/ui/src/session/`, `src/client/project-manager/components/sessions/`, `src/client/project-manager/{api.ts,core-stream-message-types.ts}`; ожидаемый commit message: `fix: make usage limits refresh follow active session`
2. [DONE] Git Commit: `fix: make usage limits refresh follow active session` (hash: `66004e872`)
3. [DONE] Перевести Core refresh transport и provider adapters на реальный runtime session + bound provider session id без synthetic provider bucket; scope: `packages/core/src/remote-bridge/`, `packages/core/src/provider-registry/`, `packages/{Claude,Codex,Gemini}_Module/src/provider/`; ожидаемый commit message: `fix: scope usage limits refresh to runtime sessions`
4. [DONE] Git Commit: `fix: scope usage limits refresh to runtime sessions` (hash: `a0e5d5adc`)
5. [DONE] Закрыть regression coverage и factual doc sync для session-scoped refresh path; scope: `packages/core/src/remote-bridge/handlers/`, `doc/SolidWorks-WorkFlow/`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `test: cover session-scoped usage limits refresh`
6. [DONE] Git Commit: `test: cover session-scoped usage limits refresh` (hash: `ab7d8f93f`)

### Stream: Release build and closeout
1. [DONE] Подготовить release-документы под будущую версию и синхронизировать связанные `doc/` материалы по этому scope; scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/Session004.md`; ожидаемый commit message: `docs: prepare release notes for session-scoped usage limits refresh`
2. [DONE] Git Commit: `docs: prepare release notes for session-scoped usage limits refresh` (hash: `a9d9523a2`)
3. [DONE] Выполнить `./scripts/build-all.sh`, проверить результаты release bump и чистоту дерева; scope: release tooling + version bump outputs; ожидаемый commit message: `chore: bump version via build-all.sh`
4. [DONE] Git Commit: `chore: bump version via build-all.sh` (hash: `8abfb874f`)
5. [DONE] Устранить release-blocker compile regression после session-scoped `sessionId` contract в `SessionIdBar`; scope: `src/client/ui/src/session/session-id-bar.test.tsx`; ожидаемый commit message: `test: pass session id to session id bar test`
6. [DONE] Git Commit: `test: pass session id to session id bar test` (hash: `9e5f8f56f`)
7. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball outputs и подготовить closeout materials; scope: release verification + session closeout; ожидаемый commit message: `docs: record session-scoped usage limits release validation`
8. [DONE] Git Commit: `docs: record session-scoped usage limits release validation` (hash: `df46fc32e`)

## Phase 2 — Provider-global no-cache correction after release smoke (owner: Codex, updated: 2026-04-12)
### Stream: Remove stale usage-limits paths
1. [DONE] Убрать persistent UI fallback cache для usage limits и нормализовать UI snapshot scope в provider-global contract; scope: `src/client/ui/src/session/`; ожидаемый commit message: `fix: remove persistent usage limits cache`
2. [DONE] Git Commit: `fix: remove persistent usage limits cache` (hash: `385f1feb9`)
3. [DONE] Нормализовать usage-limits propagation/event scope до provider-global contract в PM/Core path; scope: `src/client/project-manager/components/sessions/`, `packages/core/src/provider-usage-limits/`, `packages/core/src/remote-bridge/handlers/`; ожидаемый commit message: `fix: make usage limits provider-global`
4. [DONE] Git Commit: `fix: make usage limits provider-global` (hash: `d72d7c736`)
5. [DONE] Обновить regression coverage под live-only provider-global usage limits contract; scope: `src/client/ui/src/session/`, `src/client/project-manager/components/sessions/`, `packages/core/src/remote-bridge/handlers/`; ожидаемый commit message: `test: cover provider-global usage limits`
6. [DONE] Git Commit: `test: cover provider-global usage limits` (hash: `0ce8374f5`)
7. [DONE] Синхронизировать planning/module docs и active todo-plan под no-cache provider-global contract; scope: `doc/SolidWorks-WorkFlow/Plans/`, `doc/SolidWorks-WorkFlow/Modules/`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: sync provider-global usage limits contract`
8. [DONE] Git Commit: `docs: sync provider-global usage limits contract` (hash: `5a87481cc`)

### Stream: Patched release build and closeout
1. [DONE] Подготовить release-документы под будущую версию `1.1.967` и синхронизировать active todo-plan с patched provider-global contract; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: prepare release notes for provider-global usage limits`
2. [DONE] Git Commit: `docs: prepare release notes for provider-global usage limits` (hash: `9d266f8c2`)
3. [DONE] Выполнить `./scripts/build-all.sh`, проверить результаты release bump и чистоту дерева; scope: release tooling + version bump outputs; ожидаемый commit message: `chore: bump version via build-all.sh`
4. [DONE] Git Commit: `chore: bump version via build-all.sh` (hash: `e2853324a`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball outputs и подготовить closeout materials; scope: release verification + session closeout; ожидаемый commit message: `docs: record provider-global usage limits release validation`
6. [DONE] Git Commit: `docs: record provider-global usage limits release validation` (hash: `d2ed8356f`)

## Phase 3 — Dialog-mode usage-limits refresh restore after release smoke (owner: Codex, updated: 2026-04-12)
### Stream: Restore PM dialog refresh path
1. [DONE] Подключить `Session ID + Usage Limits` refresh callback в Project Manager dialog-mode `SessionView` и закрыть regression guard на source-level wiring; scope: `src/client/project-manager/components/sessions/{project-manager-dialog-session-view.tsx,project-manager-session-view.test.tsx}`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `fix: restore usage limits refresh in dialog session view`
2. [TODO] Git Commit: `fix: restore usage limits refresh in dialog session view` (hash: TBD)

### Stream: Patched release build and closeout
1. [TODO] Подготовить release-документы под будущую версию `1.1.968` и синхронизировать active todo-plan под dialog-mode fix; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: prepare release notes for dialog usage limits refresh`
2. [TODO] Git Commit: `docs: prepare release notes for dialog usage limits refresh` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-all.sh`, проверить результаты release bump и чистоту дерева; scope: release tooling + version bump outputs; ожидаемый commit message: `chore: bump version via build-all.sh`
4. [TODO] Git Commit: `chore: bump version via build-all.sh` (hash: TBD)
5. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball outputs и подготовить closeout materials; scope: release verification + session closeout; ожидаемый commit message: `docs: record dialog usage limits release validation`
6. [TODO] Git Commit: `docs: record dialog usage limits release validation` (hash: TBD)
