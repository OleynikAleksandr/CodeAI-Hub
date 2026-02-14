# Session 047 — PM: восстановление диалога после рестарта Core при открытом UI

**Date:** 2026-02-14 12:05 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.593

---

# 1. Work Done in This Session

## Symptom (User Report)
- Если перезапустить Core при открытом Project Manager, UI остаётся, но панель диалога становится пустой (`No messages yet`).
- Дальнейшие клики по `Reviewer Codex` могут открывать “пустую” сессию, потому что клиент держит старые sessionId, которые больше не существуют на новом Core процессе.
- Если перезагрузить сам PM (или закрыть таб/сессию и заново открыть при удачной гидрации), всё восстанавливается.

## Root Cause
- В PM гидрация сессий выполнялась **однократно** через `GET /api/v1/status` в `useProjectManagerCoreStatusHydrator`.
- При рестарте Core WebSocket переподключается и Core отправляет свежий `core:state`, но PM **не реагировал** и не делал повторную гидрацию.
- Итог: UI продолжал оперировать устаревшим списком сессий и историей, а запросы истории на Core либо не выполнялись, либо шли по несуществующим sessionId.

## Fix
- `useProjectManagerCoreStatusHydrator` теперь подписывается на WS событие `core:state` и использует его как сигнал “Core переподключился/перезапустился”.
- На этот сигнал PM повторно делает `GET /api/v1/status`, обновляет список сессий и подгружает `session:history`.
- Это делает сценарий “Core restart while PM open” устойчивым: диалог после переподключения должен восстанавливаться автоматически.

## Release
- Собран patch релиз 1.1.593.

## Git commits
- `0f1db8f2 fix(pm): rehydrate sessions on ws core:state (survive core restart)`
- `5cc0129d chore(release): build-all for next patch`
- `cfbba3d1 chore(release): refresh provider manifest checksums`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session047.md` (THIS REPORT)

## Plans for next session
- Прогнать 2 ключевых сценария:
  - A) PM открыт -> перезапуск Core -> диалог восстанавливается без ручного reload PM.
  - B) PM запускает Core (core был остановлен) -> после старта Core PM гидрирует сессии и позволяет открыть `Reviewer Codex`.
- Если появятся остаточные кейсы “узел в дереве есть, но диалог пустой”:
  - добавить минимальную диагностическую телеметрию в PM (hydration attempts + status/response),
  - проверить, что на `workspace-activate` Core реально создаёт session:created для refs из `description-step.json`.
