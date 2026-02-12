# Session 026 — Reviewer Auto-Start Fix + Release 1.1.572

**Date:** 2026-02-12 15:04 (Europe/Warsaw)
**Branch:** main
**Version:** 1.1.572

---

# 1. Work Done in This Session

## Work summary
- Диагностирована проблема после теста Description: collector-сессия Claude в provider-home завершалась успешно и записывала `description.md`, но reviewer-сессия не создавалась автоматически.
- Найдена причина: в websocket-пути `session:create` Core не гарантировал bind workflow watcher для `workspacePath + initiativeSlug`, поэтому событие записи `description.md` не всегда попадало в workflow runtime.
- Внесён фикс в `RemoteBridge`: при `session:create` с workflow-контекстом выполняется `workflowRuntime.connectWorkspace(...)` (best-effort, с warning-логом при ошибке).
- Добавлен test-guard в `packages/core/src/remote-bridge/index.test.ts` на наличие нового bind-пути.
- Выполнен релизный цикл: `./scripts/build-all.sh` (bump до `1.1.572`) и `./scripts/build-release.sh --use-current-version`.
- Обновлены release-документы (`CHANGELOG.md`, `README.md`, `SystemArchitecture.md`, `Stacks/Claude.md`) под `1.1.572`.
- Собран VSIX: `codeai-hub-1.1.572.vsix`.

## Git commits
- `c62e2fa8 fix(core): bind workflow watcher on session create`
- `bc9b34b5 chore(release): run build-all for v1.1.572`
- `e84afb61 docs(release): sync docs for v1.1.572`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session026.md` (THIS REPORT)

## Plans for next session
- Проверить в UI end-to-end сценарий: `questionnaire.md -> description.md -> reviewer auto-start -> Final_Description.md` без ручных workaround.
- Отдельно проверить визуализацию `usage_limits` в `Session ID Bar` после завершения reviewer (5h/weekly).
- При необходимости добавить integration/regression тест на автопереход `description -> reviewer` через watcher-событие `description.md`.
