# Claude Provider Module — Module (SSOT)

## Назначение
Провайдерный модуль Claude для Core: создание/резюм сессий, one-shot turns, чтение token usage/limits, provider-home auth bootstrap.

## Где живёт код
- `packages/Claude_Module/`

## Messaging cluster
- `src/messaging/message-processor.ts` — thin façade для queue/processResponses orchestration.
- `src/messaging/claude-stream-event-router.ts` — routing assistant/result events, translated thinking chunks, and structured output emission.
- `src/messaging/claude-thought-translation-adapter.ts` — Claude-local adapter over the shared translation facade for visible reasoning bubbles.
- `src/messaging/claude-message-finish-handler.ts` — lifecycle completion façade (`turn_started` / `turn_completed` / `turn_failed`).
- `src/messaging/claude-usage-sync.ts`, `src/messaging/claude-token-usage-sync.ts` — usage limits + `/context` token usage synchronization.
- `src/messaging/claude-stream-event-router.ts` emits Claude thinking into session history as tagged thinking messages; `thinkingDisplaySyncEnabled` only decides whether the shared Session UI renders them as visible Thinking bubbles or filters them out.
- Visible Claude thinking now follows Core-threaded `messagesForTheUserLanguage` from `~/.codeai-hub/settings/settings.json`; translation failure is non-blocking and falls back to the upstream provider wording.
- `thinking.enabled/maxTokens` remains the separate upstream-thinking control. On modern Claude SDK + `claude-opus-4-6`, `maxThinkingTokens` is effectively an on/off switch for adaptive thinking, so visible thought-summary length remains provider-owned unless an explicit `effort` setting is threaded separately.

## Usage-limits cluster
- `src/provider-usage-limits/providers/claude/claude-usage-limits-facade.ts` — facade for header/runtime usage-limit normalization and stream payload shaping.
- `src/provider-usage-limits/providers/claude/claude-usage-token-resolver.ts` — platform/env/credential OAuth token resolution helper for the usage-limits facade.

## Provider-home (канон)
- `HOME=~/.codeai-hub/providers/claude/home`
- Claude sessions (provider-home): `~/.codeai-hub/providers/claude/home/.claude/projects/<workspaceSlug>/<sessionId>.jsonl`
- Auth state: `~/.codeai-hub/providers/claude/home/.claude.json` (на macOS/Linux — symlink на `~/.claude.json`; Windows — best-effort copy)
- Provider-driven Claude turns run in SDK isolation mode: filesystem setting sources stay empty, so Claude does not auto-load user/project/local settings or any `CLAUDE.md` memory files from the active workspace, its parent directories, or the real user home.
- Tool/file access may still point at the active workspace through `cwd` and `additionalDirectories`, but that must not re-enable filesystem `CLAUDE.md` discovery; global user settings and global `~/.claude/CLAUDE.md` must never leak into provider-home sessions.

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
- Claude thinking display is a presentation-only toggle: when enabled, reasoning is rendered in the dialog as a standard assistant bubble with `Thinking`; when disabled, the stored thinking history remains intact but the Session UI filters it out.
- Claude visible thinking must follow the selected `Messages for the User` language, but current thought-summary verbosity is still owned by the upstream Claude SDK / model rather than by the Session UI renderer.

## Связанные контракты
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
