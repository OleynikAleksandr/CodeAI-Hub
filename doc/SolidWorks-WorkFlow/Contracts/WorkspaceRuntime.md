# Workspace Runtime — Contract (SSOT)

## Назначение
Единый контракт wire-протокола и snapshot-first состояния для multi-workspace режима.

## Канонические ключи
- `workspacePath` / `workspaceSlug`
- `dialogId` — логический диалог агента (история UI)
- `sessionId` — текущий runtime сегмент Core (live status/usage/lock)
- `providerSessionId` — native id провайдера (resume)

## Workspace Runtime Capsule

Active workspace-owned mutable runtime lives under `.codeai-hub/<workspaceSlug>/runtime/**` inside the selected workspace. Core/PM must scope behavior-changing settings and localization to that capsule once a workspace is active:

- `runtime/settings/settings.json` — live workspace Settings truth for Project Manager/workflow defaults;
- `runtime/localization/**` — live workspace localization catalogs, metadata, glossary overrides and browser bootstrap cache;
- `runtime/providers/**/home/**` — provider native homes/session logs/config for workflow runtime;
- `runtime/sessions/unified/**` — Core logical session history that participates in workflow recovery/accepted-step commits.

Settings, localization runtime and provider homes are rollback-ignored live state and must be preserved across workflow Clear/Undo. Core logical sessions, accepted artifacts and applied model/config evidence remain the rollback/recovery proof.

## Wire Boundary / Diagnostics (runtime stability)
- PM/Core WebSocket frames проходят owner-layer validators до dispatch. PM валидирует входящий Core stream на своей границе, Core валидирует входящие PM commands на remote-bridge границе; invalid frame не должен попадать в downstream handlers.
- `ProjectManagerApi.connect()` обязан быть idempotent для состояний `OPEN` и `CONNECTING`; повторный `connect` не создаёт параллельный socket. `disconnect()` является intentional cleanup boundary and clears pending reconnect/retry state.
- Core Bridge browser-side status/history/supervisor calls are best-effort hydration paths. Failure to fetch status snapshot, dialog history, or supervisor bridge result must be logged as sanitized diagnostics and must not block Session UI from recovering through live stream or later snapshot hydration.
- Code map:
  - `src/client/project-manager/services/core-stream-message-validator.ts`
  - `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts`
  - `src/client/ui/src/core-bridge/core-bridge-logger.ts`

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
- `SessionRuntime.dispose()` является lifecycle boundary: он обязан остановить watchdog timer и очистить per-session runtime entries, чтобы новый runtime owner не наследовал stale turn/lock/final-turn state.

## Связанные контракты
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
