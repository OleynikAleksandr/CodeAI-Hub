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
6. [DONE] Git Commit: `test: cover session-scoped usage limits refresh` (hash: TBD; текущий commit этой сессии)

### Stream: Release build and closeout
1. [DONE] Подготовить release-документы под будущую версию и синхронизировать связанные `doc/` материалы по этому scope; scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/Session004.md`; ожидаемый commit message: `docs: prepare release notes for session-scoped usage limits refresh`
2. [DONE] Git Commit: `docs: prepare release notes for session-scoped usage limits refresh` (hash: TBD; текущий commit этой сессии)
3. [TODO] Выполнить `./scripts/build-all.sh`, проверить результаты release bump и чистоту дерева; scope: release tooling + version bump outputs; ожидаемый commit message: `chore: bump version via build-all.sh`
4. [TODO] Git Commit: `chore: bump version via build-all.sh` (hash: TBD)
5. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball outputs и зафиксировать итоги в `doc/Sessions/Session004.md`; scope: release verification + session closeout; ожидаемый commit message: `docs: record session-scoped usage limits release validation`
6. [TODO] Git Commit: `docs: record session-scoped usage limits release validation` (hash: TBD)
