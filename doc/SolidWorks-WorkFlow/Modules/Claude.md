# Claude Provider Module — Module (SSOT)

## Назначение
Провайдерный модуль Claude для Core: создание/резюм сессий, one-shot turns, чтение token usage/limits, provider-home auth bootstrap.

## Где живёт код
- `packages/Claude_Module/`

## Messaging cluster
- `src/messaging/message-processor.ts` — thin façade для queue/processResponses orchestration.
- `src/messaging/claude-stream-event-router.ts` — routing assistant/result events, source-first thinking emission, tool-use preamble translation, and structured output emission.
- `src/messaging/claude-thought-translation-adapter.ts` — Claude-local adapter over the shared translation facade for short pre-tool assistant text shown before `tool_use`.
- `src/messaging/claude-readable-text-chunker.ts` — Claude-specific chunking helper used by the local pre-tool translation adapter.
- `src/messaging/claude-message-finish-handler.ts` — lifecycle completion façade (`turn_started` / `turn_completed` / `turn_failed`).
- `src/messaging/claude-usage-sync.ts`, `src/messaging/claude-token-usage-sync.ts` — usage limits + `/context` token usage synchronization.
- `src/messaging/claude-stream-event-router.ts` emits Claude thinking into session history as tagged thinking messages; `thinkingDisplaySyncEnabled` only decides whether the shared Session UI renders them as visible Thinking bubbles or filters them out.
- Visible Claude thinking is now source-first: the provider emits the native upstream wording immediately, and Core owns the asynchronous translation overlay that later patches `localizedContent` for the same `messageId`.
- Persisted localized thinking for Claude lives in the Core-owned per-session sidecar `*.translations.jsonl`; the canonical Claude/session transcript remains native-only.
- Short assistant progress text that belongs to a Claude message ending in `stop_reason = "tool_use"` is still localized on the provider-local user-facing path; ordinary final assistant replies ending in `end_turn` remain untouched.
- Claude thinking settings are now `thinking.enabled/effort`, not `maxTokens`. Legacy snapshots with `maxTokens` are migrated to the nearest effort tier during normalization.
- Core threads explicit Claude `thinkingEnabled` + `reasoningEffort` through applied turn config; the Claude SDK path now uses `thinking: { type: "adaptive" | "disabled" }` plus `effort`, instead of deprecated `maxThinkingTokens`.
- Effective runtime model identity for Claude is now `thinking:off` when reasoning is disabled and `reasoning:<effort>` when it is enabled, so the client can see Claude effort changes through the normal `session:model:update` path.
- Release packaging must vendor `@codeai-hub/translation` into the Claude installed bundle because the provider-local pre-tool translation adapter still depends on it at runtime.

## Usage-limits cluster (lives in Core, not in Claude_Module)
- `packages/core/src/provider-usage-limits/providers/claude/claude-usage-limits-facade.ts` — facade for header/runtime usage-limit normalization and stream payload shaping.
- `packages/core/src/provider-usage-limits/providers/claude/claude-usage-token-resolver.ts` — platform/env/credential OAuth token resolution helper for the usage-limits facade.
- All three providers (Claude, Codex, Gemini) share this Core cluster — see `packages/core/src/provider-usage-limits/` for the shared facade and per-provider adapters.

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
- Visibility is decided at emission time and persisted on the `SessionMessage` as `visibilityAtEmission`. Hidden Claude thinking never enters the Core overlay translation queue, and re-enabling `Thinking in dialog` inside a long-running session is forward-only: only newly emitted thought summaries become visible and eligible for translation; messages that were hidden at emission stay hidden.
- Claude visible thinking localization is eventually consistent: source text must appear immediately, while translation may arrive later as a Core `message_translation` overlay for the same stable `messageId`.
- Claude visible thinking must follow the selected `Messages for the User` language, but current thought-summary verbosity is still ultimately owned by the upstream Claude SDK / model even after CodeAI Hub starts sending explicit `effort`.
- Claude pre-tool assistant text can be identified safely by the provider-native boundary `message_delta.delta.stop_reason = "tool_use"`; this path is distinct from final assistant output (`end_turn`) and must not be filtered by text heuristics.

## Translation-only query profile (Claude Haiku 4.5)
- `engineId: "anthropic-claude-haiku-4-5"` is exposed as a localization translation engine, and the runtime adapter lives next to the Claude provider: `packages/Claude_Module/src/translation/claude-haiku-translation-service.ts` and `claude-haiku-translator-instruction.ts`.
- The service reuses the same `SDKInstaller` + `SDKAuthManager` path as regular Claude turns, running `ensureInstalled()` → `ensureSubscriptionAuth()` → `ensureProviderHomeSessionBootstrap(...)` before each translation query.
- Translation-only query profile: `model: "claude-haiku-4-5-20251001"`, `tools: []`, `maxTurns: 1`, `persistSession: true`, `thinking: { type: "disabled" }`, `permissionMode: "bypassPermissions"`, `allowDangerouslySkipPermissions: true`, `includePartialMessages: false`, `settingSources: []`.
- Translation turns must use an explicit translate-only wrapper prompt (`Translate the source text into ...`, `Return only the translation.`, `Source text:`). For `localization_bundle`, the prompt must also repeat the `__CODEAI_HUB_LOCALIZATION_ENTRY__` marker-preservation rule so whole-bundle materialization cannot degrade into an unconstrained free-form answer.
- Dedicated translation project slug is `translation-runtime-haiku`. The query `cwd` / project path resolves to that dedicated project directory, so native Claude session JSONL for translation turns persist under `~/.codeai-hub/providers/claude/home/.claude/projects/translation-runtime-haiku/`; auth/bootstrap state still comes from the shared provider-home.
- Core wires the provider-owned service into the shared `TranslationFacade` via `packages/core/src/translation/core-translation-facade-factory.ts` and `packages/core/src/translation/claude-haiku-translation-engine.ts`, which adapts `ClaudeHaikuTranslationService` to the engine-neutral `TranslationEngine` contract.
- Both Core-owned live thinking translation and Core-owned localization materialization must reuse that provider-owned service. Extension-host code must not create a local Claude runtime for Haiku; it reads authoritative Core localization bootstrap instead.

## Связанные контракты
- Workspace/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
