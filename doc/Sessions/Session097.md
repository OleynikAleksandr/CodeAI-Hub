# Session 097 — BUG-2026-02-22-01: вечный lock Reviewer после cold start

**Date:** 2026-02-22 08:26 (CET)
**Branch:** main
**Version:** 1.1.644

---

# 1. Work Done in This Session

## Work summary
- Выполнен форензик-разбор инцидента по workspace `CodeAI-Hub-claude`: после cold start PM показывает `Agent is working... Please wait.` при фактически завершённой reviewer-сессии.
- Подтверждено, что provider-сегмент завершён корректно (в `providerSessionId=6b4b0d25-24b4-406e-8294-522fa69ae00f` есть bootstrap `Ready to continue working.` и состояние не in-flight).
- Выявлена ключевая причина: рассинхрон `sessionId` между dialog-layer (`latestSessionId` из continuity index/chain) и runtime-layer (`SessionManager` после гидратации), из-за чего `workspace:snapshot` не применяется к активному dialog snapshot PM.
- Баг зарегистрирован в реестре как `BUG-2026-02-22-01` (OPEN) с симптомом, подтверждённым root cause и направлением фикса.
- Подготовлен новый рабочий `doc/TODO/todo-plan.md` под реализацию фикса (Core identity reconciliation + PM fallback + guards).

## Build / verification
- Выполнена форензик-проверка артефактов:
  - continuity chain/index,
  - provider JSONL,
  - `core.log`, `extension.log`,
  - `GET /api/v1/status`,
  - прямой `workspace:snapshot:request` по WebSocket.
- Кодовые изменения не выполнялись; сборка/тесты в этой сессии не запускались.

## Created/updated docs
- `doc/BugRegistry.md` (добавлен `BUG-2026-02-22-01`)
- `doc/Sessions/Session097.md` (этот отчёт)
- `doc/TODO/todo-plan.md` (новый план под фикс)

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- Коммиты в этой сессии не выполнялись.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/BugRegistry.md`
6. `doc/Sessions/Session097.md` (THIS REPORT)

> Далее: открыть `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md` и профильные файлы PM/Core из `src/client/project-manager/components/sessions/` и `packages/core/src/remote-bridge/handlers/`.

## Plans for next session
- Реализовать reconciliation `latestSessionId` в Core `dialog:list` (runtime-first для активного `providerSessionId`).
- Добавить PM fallback-применение snapshot state по `providerSessionId`/`dialogId`, если `sessionId` не совпал.
- Добавить guard-тесты на cold start mismatch (`dialog latestSessionId != runtime sessionId`) и проверить unlock (`idle`) без ручного вмешательства.
