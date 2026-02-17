# Workspace Runtime — Contract (SSOT)

## Назначение
Единый контракт wire-протокола и snapshot-first состояния для multi-workspace режима.

## Канонические ключи
- `workspacePath` / `workspaceSlug`
- `dialogId` — логический диалог агента (история UI)
- `sessionId` — текущий runtime сегмент Core (live status/usage/lock)
- `providerSessionId` — native id провайдера (resume)

## Lock / Unlock (канон)
- Source-of-truth для input lock — только snapshot (`workspace:snapshot`), а не stream сообщения.
- Core обязан эмитить `turn_state=running` сразу после принятия user submit.
- При send failure Core обязан сделать rollback: `turn_state=idle` + `turn_failed`.

## Связанные контракты
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`

## Legacy snapshot
- `doc/SolidWorks-WorkFlow/Archive/legacy/WorkspaceRuntime-legacy-2026-02-17.md`
