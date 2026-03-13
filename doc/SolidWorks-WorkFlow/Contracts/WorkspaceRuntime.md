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
- Канонические session-поля в snapshot (минимум):
  - `turnState: "idle" | "running"`
  - `continuityLockActive: boolean`
  - `continuityLockReason?: string` (UX-hint; может отсутствовать и не является условием unlock)
  - `resumeMode?: "no_resume" | "resume_in_place" | "resume_via_rollover"`
- Нормативная формула блокировки ввода (без queued-message слоя):
  - `inputLocked = resumeMode==="no_resume" || turnState!=="idle" || continuityLockActive===true`
- UI не имеет права удерживать input locked, если snapshot сообщает `turnState="idle"` и `continuityLockActive=false` (даже при отсутствующем `continuityLockReason`).
- Core обязан эмитить `turnState="running"` сразу после принятия user submit.
- При send failure Core обязан сделать rollback: `turnState="idle"` + `turn_failed`.
- Normalization (release `1.1.646`): для `resume_in_place` idle/unlocked-сессий Core эмитит явный unlock-reason `no_rollover_needed` вместо `undefined`.

## Связанные контракты
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
