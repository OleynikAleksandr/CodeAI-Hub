# Claude Provider Module — Module (SSOT)

## Назначение
Провайдерный модуль Claude для Core: создание/резюм сессий, one-shot turns, чтение token usage/limits, provider-home auth bootstrap.

## Где живёт код
- `packages/Claude_Module/`

## Messaging cluster
- `src/messaging/message-processor.ts` — thin façade для queue/processResponses orchestration.
- `src/messaging/claude-stream-event-router.ts` — routing assistant/result events, translated thinking chunks, and structured output emission.
- `src/messaging/claude-thought-translation-adapter.ts` — Claude-local adapter over the shared translation facade for visible reasoning bubbles.
- `src/messaging/claude-readable-text-chunker.ts` — Claude-specific chunking helper for translation-safe reasoning splits and readable dialog chunk emission.
- `src/messaging/claude-message-finish-handler.ts` — lifecycle completion façade (`turn_started` / `turn_completed` / `turn_failed`).
- `src/messaging/claude-usage-sync.ts`, `src/messaging/claude-token-usage-sync.ts` — usage limits + `/context` token usage synchronization.
- `src/messaging/claude-stream-event-router.ts` emits Claude thinking into session history as tagged thinking messages; `thinkingDisplaySyncEnabled` only decides whether the shared Session UI renders them as visible Thinking bubbles or filters them out.
- Visible Claude thinking now follows Core-threaded `messagesForTheUserLanguage` from `~/.codeai-hub/settings/settings.json`; translation failure is non-blocking and falls back to the upstream provider wording.
- Long Claude reasoning is translated in smaller transport-safe chunks before being reassembled, so oversized Google GTX requests no longer force English fallback for big visible thinking blocks.
- Claude visible thinking is re-split into readable dialog chunks after translation, so the Session UI receives several smaller `tag: "thinking"` assistant bubbles instead of one oversized block.
- Short assistant progress text that belongs to a Claude message ending in `stop_reason = "tool_use"` is localized on the user-facing path; ordinary final assistant replies ending in `end_turn` remain untouched.
- Claude thinking settings are now `thinking.enabled/effort`, not `maxTokens`. Legacy snapshots with `maxTokens` are migrated to the nearest effort tier during normalization.
- Core threads explicit Claude `thinkingEnabled` + `reasoningEffort` through applied turn config; the Claude SDK path now uses `thinking: { type: "adaptive" | "disabled" }` plus `effort`, instead of deprecated `maxThinkingTokens`.
- Effective runtime model identity for Claude is now `thinking:off` when reasoning is disabled and `reasoning:<effort>` when it is enabled, so the client can see Claude effort changes through the normal `session:model:update` path.

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
- Claude visible thinking must follow the selected `Messages for the User` language, but current thought-summary verbosity is still ultimately owned by the upstream Claude SDK / model even after CodeAI Hub starts sending explicit `effort`.
- Claude pre-tool assistant text can be identified safely by the provider-native boundary `message_delta.delta.stop_reason = "tool_use"`; this path is distinct from final assistant output (`end_turn`) and must not be filtered by text heuristics.

## Связанные контракты
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
