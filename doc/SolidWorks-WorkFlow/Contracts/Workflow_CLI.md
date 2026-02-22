# Workflow CLI Steps & Watcher — Contract (SSOT)

## Назначение
Контракт шагов workflow (Description/Virtual Simulation/Diagrams) и watcher-событий, которые соединяют файловые артефакты и runtime.

## Инварианты
- Канонические пути артефактов без “runs” (слоты).
- Watcher отвечает за обнаружение появления/изменения артефактов и уведомление Core/PM.

## Связанные контракты
- Workspace runtime: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Session UI laws: `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- Input lock SSOT/state machine: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
