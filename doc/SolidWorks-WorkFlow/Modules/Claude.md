# Claude Provider Module — Module (SSOT)

## Назначение
Провайдерный модуль Claude для Core: создание/резюм сессий, one-shot turns, чтение token usage/limits, provider-home auth bootstrap.

## Где живёт код
- `packages/Claude_Module/`

## Messaging cluster
- `src/messaging/message-processor.ts` — thin façade для queue/processResponses orchestration.
- `src/messaging/claude-stream-event-router.ts` — routing assistant/result events, thinking chunks и structured output emission.
- `src/messaging/claude-message-finish-handler.ts` — lifecycle completion façade (`turn_started` / `turn_completed` / `turn_failed`).
- `src/messaging/claude-usage-sync.ts`, `src/messaging/claude-token-usage-sync.ts` — usage limits + `/context` token usage synchronization.
- `src/messaging/claude-stream-event-router.ts` now emits live thinking as a normal assistant bubble with `tag: "thinking"` when `thinkingDisplaySyncEnabled` is on; the old hidden collapsible thinking panel survives only for archived `role: "thinking"` history, while `thinking.enabled/maxTokens` remains the separate upstream-thinking control.

## Usage-limits cluster
- `src/provider-usage-limits/providers/claude/claude-usage-limits-facade.ts` — facade for header/runtime usage-limit normalization and stream payload shaping.
- `src/provider-usage-limits/providers/claude/claude-usage-token-resolver.ts` — platform/env/credential OAuth token resolution helper for the usage-limits facade.

## Provider-home (канон)
- `HOME=~/.codeai-hub/providers/claude/home`
- Claude sessions (provider-home): `~/.codeai-hub/providers/claude/home/.claude/projects/<workspaceSlug>/<sessionId>.jsonl`
- Auth state: `~/.codeai-hub/providers/claude/home/.claude.json` (на macOS/Linux — symlink на `~/.claude.json`; Windows — best-effort copy)

## Auth cluster
- `src/auth/sdk-auth-manager.ts` — façade/coordinator for Claude auth bootstrap, provider-home preflight и auth runtime checks.
- `src/auth/claude-auth-home-bridge.ts` — provider-home/macOS Keychain bridge, legacy `.claude.json` link/copy flow и migration of legacy `~/.claude/.credentials.json`.
- `src/auth/claude-auth-runtime.ts` — OAuth bootstrap/cache refresh, auth environment assembly, `npx @anthropic-ai/claude-code` preflight probe и final auth check.

## Auth bootstrap (критично)
- Core/модуль пытаются резолвить OAuth токен (env/credentials/platform store) и инжектить `CLAUDE_CODE_OAUTH_TOKEN` в runtime env.
- Если токен истёк/401 — система должна завершить turn как failure и предоставить recovery hint (см. Phase 211).

## Инварианты
- Один user/internal turn = один `query(...)` запуск (one-shot), FIFO.
- Lifecycle обязателен: `turn_started` → `turn_completed|turn_failed`.
- Rate-limit и `/context` token usage остаются post-message synchronization concern и не должны смешиваться с assistant/result routing в одном giant file.
- `sdk-claude-*.jsonl` остаётся диагностическим SDK логом; exact provider-applied model/thinking при аудите нужно подтверждать по provider-home Claude JSONL, а не по отдельным normalized `provider_feedback` записям.
- Claude thinking display is a presentation-only toggle: when enabled, live reasoning is shown in the dialog as a standard assistant bubble with `Thinking`; when disabled, the upstream thinking channel may still exist but the visible bubble path is suppressed.

## Связанные контракты
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
