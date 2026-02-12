# Session 027 — Claude работает, но usage limits (session/weekly) пустые

**Date:** 2026-02-12 15:12 (Europe/Warsaw)
**Branch:** main
**Version:** 1.1.572

---

# 1. Work Done in This Session

## Work summary
- Подтверждён рабочий запуск Claude через provider-home (`/Users/oleksandroliinyk/.codeai-hub/providers/claude/home`).
- Исправлен критичный баг workflow: reviewer-сессия не создавалась автоматически после `description.md`.
  - Root cause: в websocket пути `session:create` Core не гарантировал bind workflow watcher при наличии `workspacePath + initiativeSlug`.
  - Fix: добавлен явный вызов `workflowRuntime.connectWorkspace(...)` в `RemoteBridge` для `session:create`.
- Собран релиз `1.1.572`:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
  - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.572.vsix`
- Обновлены release-документы под `1.1.572`.

## Confirmed status
- ✅ Claude provider доступен и сессии создаются.
- ✅ Reviewer auto-start восстановлен (автопереход `description -> reviewer` снова работает).
- ⚠️ Нерешённый вопрос: в UI блок usage limits показывает пустые значения `session` и `weekly` (нужно разбирать в следующей сессии).

## Known open issue for next session
**Симптом:** в `Session ID Bar` лимиты (`session`, `weekly`) остаются пустыми.

**Важно:** это отдельная проблема от авторизации Claude. Авторизация и runtime Claude уже исправлены и подтверждены.

## Evidence / context snapshots
- Рабочая collector-сессия: `fadfd1d5-84b8-4a09-ab27-aa55c7951623`.
- Автосозданная reviewer-сессия после фикса: `5c264d34-5321-4dbc-af82-48f6518d235d`.
- Workflow state endpoint (для проверки `description.sessionKind` и `continuity`):
  - `GET /api/v1/orchestrator/workflow-state?workspaceSlug=codeai-hub&workspacePath=/Users/oleksandroliinyk/VSCODE/CodeAI-Hub`
- Логи для анализа usage limits:
  - `/Users/oleksandroliinyk/.codeai-hub/logs/claude/`
  - `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub/claudeCodeCli/`

## Git commits
- `c62e2fa8 fix(core): bind workflow watcher on session create`
- `bc9b34b5 chore(release): run build-all for v1.1.572`
- `e84afb61 docs(release): sync docs for v1.1.572`
- `c460648e docs(session): add session026 report`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Sessions/Session026.md`
2. `doc/Sessions/Session027.md` (THIS REPORT)
3. `doc/TODO/todo-plan.md`
4. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
5. `doc/SolidWorks-Flow/Stacks/Claude.md`
6. `CHANGELOG.md`
7. `README.md`

## Required code areas to restore context
1. `packages/Claude_Module/src/sdk/claude-usage-limits-reader.ts`
2. `packages/Claude_Module/src/sdk/claude-usage-limits-snapshot.ts`
3. `packages/Claude_Module/src/messaging/message-processor.ts`
4. `src/client/project-manager/components/sessions/usage-limits-stream.test.ts`
5. `src/client/project-manager/components/sessions/session-id-bar.tsx` (и соседние компоненты рендера usage)
6. `packages/core/src/remote-bridge/handlers/session-request-handler.ts` (контур stream/событий)

## Concrete debugging plan (next session)
1. Воспроизвести проблему на свежей Claude-сессии и зафиксировать `sessionId`.
2. Проверить, эмитится ли `usage_limits` в provider stream:
   - файл `sdk-claude-<sessionId>.jsonl`
   - unified session jsonl в `~/.codeai-hub/sessions/...`
3. Проверить, есть ли warning `usage limits probe failed` и его причина (HTTP статус/headers).
4. Проверить путь нормализации payload в `message-processor.ts`:
   - нет ли принудительного обнуления полей,
   - совпадает ли контракт с UI (`currentSession`, `currentWeekAllModels`).
5. Проверить UI normalizer/selector:
   - приходят ли значения в store,
   - не теряются ли при маппинге в PM state.
6. После фикса: добавить/обновить targeted тест (stream -> UI render).

## Acceptance criteria for next session
- `Session ID Bar` показывает непустые `session` и `weekly` при активной Claude-сессии.
- В логах нет постоянных `usage limits probe failed` для успешного кейса.
- Есть тест, покрывающий найденный regression path.
