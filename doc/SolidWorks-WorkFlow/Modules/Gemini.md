# Gemini Provider Module — Module (SSOT)

## Назначение
Провайдерный модуль Gemini для Core: запуск CLI/SDK, one-shot turns, базовая интеграция с workflow.

## Где живёт код
- `packages/Gemini_Module/`

## Инварианты
- Lifecycle обязателен: `turn_started` → `turn_completed|turn_failed`.
- Любые auth/quota ошибки не должны оставлять UI в stuck working.

## Связанные контракты
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
