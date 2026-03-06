# Claude Provider Module — Module (SSOT)

## Назначение
Провайдерный модуль Claude для Core: создание/резюм сессий, one-shot turns, чтение token usage/limits, provider-home auth bootstrap.

## Где живёт код
- `packages/Claude_Module/`

## Provider-home (канон)
- `HOME=~/.codeai-hub/providers/claude/home`
- Claude sessions (provider-home): `~/.codeai-hub/providers/claude/home/.claude/projects/<workspaceSlug>/<sessionId>.jsonl`
- Auth state: `~/.codeai-hub/providers/claude/home/.claude.json` (на macOS/Linux — symlink на `~/.claude.json`; Windows — best-effort copy)

## Auth bootstrap (критично)
- Core/модуль пытаются резолвить OAuth токен (env/credentials/platform store) и инжектить `CLAUDE_CODE_OAUTH_TOKEN` в runtime env.
- Если токен истёк/401 — система должна завершить turn как failure и предоставить recovery hint (см. Phase 211).

## Инварианты
- Один user/internal turn = один `query(...)` запуск (one-shot), FIFO.
- Lifecycle обязателен: `turn_started` → `turn_completed|turn_failed`.
- Текущий `turn_started` в Claude module — это локальный lifecycle signal, который эмитится при `send()` до первого provider-originated SDK message; его нельзя трактовать как provider ACK доставки user submit.
- В observed resume-path Claude earliest raw provider feedback сейчас выглядит как `sdk:system (subtype=init)`, затем `sdk:stream_event` с `message_start`.
- Runtime truth source для provider ACK в Claude только один: provider-originated `sdk:stream_event(message_start)`; локальный `turn_started`, `sdk:system(init)` и provider-home session JSONL не участвуют в verdict delivered/failed и используются только для расследований.

## Связанные контракты
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Turn-start ACK: `doc/SolidWorks-WorkFlow/Contracts/Claude_Workflow_TurnStarted_ACK.md`
