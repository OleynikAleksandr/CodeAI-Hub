# Shared Runtime Translation Module - Module (SSOT)

**Status:** Implemented on `main`
**Updated:** 2026-06-25
**Owner:** Oleksandr + Codex
**Last metadata audit:** 2026-05-01 on `main` (`v1.2.121`; original validation: `v1.1.854`)

---

## 1. Purpose

`@codeai-hub/translation` is the shared runtime translation capability for CodeAI Hub.
It translates short runtime text fragments through an engine-neutral facade and keeps provider-specific message semantics outside the package.

Current production use:

- live provider thinking/reasoning is emitted source-first and stored in canonical session history without rewriting the native transcript; for Claude this stream is incremental (live readable segments materialized from `thinking_delta` fragments via `ClaudeThinkingLiveBuffer`), and Codex now emits reasoning summary paragraphs sequentially from `CodexReasoningSummaryStreamBuffer`, so the overlay pipeline must be ready to translate multiple append-only thinking bubbles per turn, each carrying its own stable `messageId`, instead of waiting for one monolithic final block;
- Core owns the runtime translation overlay pipeline for persisted thinking messages and broadcasts async `session:message_translation` / `dialog:message_translation` patches when translation completes; one overlay record per emitted bubble — earlier live bubbles are never re-translated when later bubbles arrive;
- translated text is stored as per-session sidecar overlay records (`*.translations.jsonl`) and is merged into history reads as `localizedContent`, while the source text remains the only canonical transcript;
- translation failure is non-blocking and falls back to the original text in the visible UI.
- long user-facing fragments are now planned into engine-aware safe chunks before dispatch, so one timeout no longer forces whole-string fallback by default, but live `reasoning` overlays now keep provider-emitted thinking blocks intact unless a caller explicitly opts back into chunking.

Planned reuse boundary:

- Document and artifact translation adapters.
- Startup locale bootstrap translation.

---

## 2. Package Boundary

Package root:

- `packages/translation/`

Package responsibilities:

- transport-only translation requests;
- request normalization;
- engine-aware chunk policy resolution;
- safe chunk planning and assembly;
- engine selection;
- response parsing;
- facade-level fallback handling.

The package must not own:

- provider event buffering;
- turn lifecycle;
- session persistence;
- UI rendering;
- role or tag decisions;
- locale negotiation;
- session-finalization semantics.

---

## 3. Package Shape

Current source files:

- `packages/translation/src/index.ts` - package entrypoint and public exports.
- `packages/translation/src/translation-facade.ts` - thin public facade.
- `packages/translation/src/translation-contract.ts` - provider-neutral request/result types.
- `packages/translation/src/translation-engine.ts` - engine abstraction used by the facade.
- `packages/translation/src/translation-engine-registry.ts` - engine resolution and default-engine selection.
- `packages/translation/src/translation-engine-profile-registry.ts` - engine-specific chunk budget registry.
- `packages/translation/src/translation-request-normalizer.ts` - trims and normalizes input and options.
- `packages/translation/src/translation-chunk-boundary-resolver.ts` - safe split-point selection outside protected Markdown/code/glossary regions.
- `packages/translation/src/translation-chunk-planner.ts` - chunk planning for long translation requests with round-trip safety fallback.
- `packages/translation/src/translation-response-parser.ts` - parses raw Google payloads into text.
- `packages/translation/src/google-translate-client.ts` - HTTP client for `translate.googleapis.com`.
- `packages/translation/src/codex-cli-path-resolver.ts` - resolves the production Codex CLI executable for translation-backed engines.
- `packages/translation/src/codex-translation-runtime-home-facade.ts` - builds isolated provider-owned Codex homes for translation-only runs.
- `packages/translation/src/codex-cli-translation-engine.ts` - shared Codex `codex exec` translation fallback for `gpt-5.4-mini` and `gpt-5.3-codex-spark`.
- `packages/translation/src/apple-native-translation-engine.ts` - optional macOS on-device translation engine; talks to the Swift helper through JSON stdin/stdout and fail-closes with actionable `apple_native_*` error codes.
- `native/apple-translation-helper/` - SwiftPM helper boundary around Apple `Translation` framework (`preflight`, `availability`, `translate`, `translateBatch`).

Current bundled engines:

- `google-gtx`
- `apple-native` (macOS on-device; requires macOS 26+, Xcode 26+, helper binary, and installed Translation Languages packs)
- `codex-gpt-5.4-mini`
- `codex-gpt-5.3-codex-spark`

Externally-composed provider-owned engines registered by Core (not bundled inside this package):

- `anthropic-claude-haiku-4-5` — provider-owned wrapper around `ClaudeHaikuTranslationService`; the shared package stays engine-neutral and only carries the chunk profile for this engine, while the runtime adapter lives beside the Claude provider. Core builds the translation facade with this engine through `createCoreTranslationFacade(...)` and passes the shared built-in engines plus the Haiku wrapper together.
- `codex-gpt-5.4-mini` and `codex-gpt-5.3-codex-spark` — Core replaces the shared Codex CLI entries with `CodexAppServerTranslationEngine` wrappers backed by `CodexAppServerTranslationService`. The shared `codex exec` engine stays as each wrapper's internal fallback during migration, so the public engine ids do not change.
- `lmstudio:<modelKey>` — dynamic Core-owned local model engines discovered from LM Studio through `lms ls --json`. Each downloaded LM Studio LLM becomes a selectable translation engine with a stable model-key id. Core loads the selected model through a purpose-aware LM Studio runtime load manager before the first request and calls the local OpenAI-compatible `/v1/chat/completions` endpoint. Qwen-family models receive `/no_think` in the user prompt so translation requests do not spend tokens on visible reasoning.
- explicit selection of a provider-owned engine is fail-closed when the engine is unavailable. If Core or Localization requests an explicit engine id that the active runtime did not register, the shared facade must return a fallback result with `errorCode = "no_engine"` instead of silently substituting the default engine.

Implementation notes:

- The facade depends on the engine contract, not on Google-specific code directly.
- The request/response helpers stay split into small files so no single utility file becomes a new runtime god module.
- `google-gtx` remains the zero-config default; Core-owned Codex engines use provider-owned App Server translation sessions, while the shared package retains the isolated `codex exec` runtime as fallback.
- `apple-native` is explicit-only and never falls back to Apple network translation; helper/platform/language-pack failures return source text with `errorCode` such as `apple_native_helper_unavailable`, `apple_native_requires_xcode`, or `apple_native_language_pack_missing`.
- `apple-native` may retry a bounded transient helper fallback when Apple `Translation` reports `TranslationError.Cause.notInstalled` during the first runtime call even though the language pair has already passed installed availability. This retry is intentionally narrow: missing helper, missing language packs, unsupported pairs, invalid input, empty results, and ordinary request timeouts still fail closed without hidden engine substitution.
- provider-owned Codex App Server translation instructions are translation-only: they instruct the model to translate only supplied text, return only translated text, avoid workflow-agent behavior, and not use tools, shell commands, files, patches, web search, planning, or user-input requests.
- LM Studio local translation instructions follow the same translation-only boundary. The local prompt preserves localization markers, placeholders, Markdown/code spans, JSON keys, API routes, CLI commands, model ids, provider names, and product names; the engine returns only translated text and fail-closes to the source string on load/API/empty-response errors.
- When `general.localization.reasoningEngineId` is `lmstudio:<modelKey>`, Core preloads that model during Project Manager settings startup/settings save with purpose `translation-reasoning`. The selected reasoning-translation load is persistent and omits `--ttl`, but this is only a warmup optimization: the translation facade still owns request/response semantics, and the local engine remains translation-only with no workflow artifact tools.
- LM Studio local translation uses Core runtime profiles instead of a single fixed context window. Live reasoning translation keeps the small `8192` context profile for warm, fast short blocks; generic translation uses `16384`; localization bundle materialization estimates the request size and rounds up to `8192`, `16384`, or `32768` while clamping to the model's advertised maximum. Workflow-agent turns use a separate `16384` default: native turns use LM Studio `/api/v1/chat`, while workspace-bound artifact-write turns use OpenAI-compatible `/v1/chat/completions` with the minimal `write_workflow_artifact` tool. Reasoning-only outputs fail explicitly instead of being treated as workflow artifacts. The legacy `CODEAI_LMSTUDIO_CONTEXT_LENGTH` override still forces all profiles, while purpose-specific overrides are available for diagnostics.
- LM Studio HTTP transport is streaming for workflow-agent native turns (`POST /api/v1/chat`, `stream: true`), workflow artifact tool turns (`POST /v1/chat/completions`, `stream: true`), and translation (`POST /v1/chat/completions`, `stream: true`). Streaming is the root-cause fix for `Headers Timeout Error` on heavy local models (e.g. Qwen3 27B MLX): non-streaming LM Studio chat does not emit HTTP response headers until the full response is generated, which exceeds Node's default undici `headersTimeout` for slow models. With `stream: true`, LM Studio emits response headers immediately and sends incremental SSE frames; the provider adapter reassembles the final assistant text from the terminal `chat.end.result` event (native) or accumulated `delta.content` frames plus the `[DONE]` sentinel (OpenAI-compatible), keeping the existing `turn_started → assistant → turn_completed` and translation fallback contracts unchanged. The request `AbortController` (workflow-agent `REQUEST_TIMEOUT_MS`, translation `request.timeoutMs`) now bounds whole-generation time instead of only header-wait time.
- Before loading a local model, Core checks `lms ps --json`. If a matching loaded model already has enough context, Core reuses that identifier for the API call. If idle duplicate clones exist for the same LM Studio model, Core unloads CodeAI-owned identifiers, the base `modelKey` identifier, and LM Studio `modelKey:N` clones that are not the selected instance. Ordinary translation requests do not unload workers for other model keys. Project Manager startup/settings-save warmup reconciles the selected reasoning-translation model together with the selected Local Models workflow-agent model, keeps those selected workers loaded without TTL, and then unloads only idle stale `codeaihub-*` workers whose model keys are no longer selected; generating workers and user/manual LM Studio identifiers are left alone.
- provider-owned Codex App Server and Claude Haiku translation sessions are transient implementation detail, not resumable workflow history. After a successful translation call, the provider adapter deletes the native session file(s) it created under the workspace provider home; only finalized localization/runtime translation artifacts remain. Failed translation attempts may leave provider-native files for diagnostic evidence.
- long requests are no longer sent as one monolithic string by default for generic/document translation; `TranslationFacade` resolves an engine-specific chunk policy, plans safe boundaries, and dispatches chunks sequentially through the same engine contract, while `reasoning` defaults to one translate call per provider-emitted block.
- safe boundary priority is paragraph break -> list boundary -> sentence boundary -> clause boundary -> hard split outside protected regions.
- protected regions currently include fenced code, inline code, Markdown links, `{placeholders}`, and glossary markers such as `[[CAIHUB_TERM_n]]`.
- initial conservative chunk budgets are engine-specific:
  - `google-gtx` = `soft 360 / hard 520`
  - `codex-gpt-5.4-mini` = `soft 260 / hard 380`
  - `codex-gpt-5.3-codex-spark` = `soft 180 / hard 260`
  - `anthropic-claude-haiku-4-5` = `soft 400 / hard 600` (registry placeholder — live localization/reasoning paths currently dispatch without chunking)
- the shared isolated Codex `codex exec` fallback resolves authentication artifacts from provider home first and falls back to legacy `~/.codex` artifacts when the provider-owned home has not been materialized yet; missing `models_cache.json` is tolerated, but missing auth is still a hard failure.
- The package stays engine-pluggable so a different backend can be added later without changing consumer contracts.
- Downloading, deleting, and deep per-model tuning of local models is intentionally outside the shared translation package and currently remains a LM Studio responsibility. The application consumes the downloaded model catalog and persists selected `lmstudio:*` engine ids; a future local-model management UI may wrap LM Studio/MLX lifecycle commands without changing the translation facade contract.

---

## 4. Public API Contract

The shared facade exposes a provider-neutral translation API.

```ts
export interface TranslationRequest {
  readonly text: string;
  readonly sourceLanguage: "en";
  readonly targetLanguage: string;
  readonly category?: "reasoning" | "generic";
  readonly chunkingMode?: "auto" | "disabled";
  readonly providerId?: string;
  readonly timeoutMs?: number;
}

export interface TranslationResult {
  readonly status: "translated" | "fallback" | "skipped";
  readonly originalText: string;
  readonly translatedText: string | null;
  readonly finalText: string;
  readonly sourceLanguage: "en";
  readonly targetLanguage: string;
  readonly engine: string;
  readonly errorCode?: string;
}

export class TranslationFacade {
  translate(request: TranslationRequest): Promise<TranslationResult>;
}
```

Contract rules:

- `sourceLanguage` and `targetLanguage` are explicit on every request.
- callers may leave `chunkingMode` unset and accept the engine-default chunk policy for `generic` / `document` translation, while `reasoning` now defaults to `"disabled"` unless the caller explicitly opts back into `"auto"`.
- The facade returns translation outcome data only.
- The facade does not emit session messages or mutate provider state.
- The facade does not infer message roles, tags, or UI placement.
- when at least one chunk translates successfully, the facade returns one assembled `translated` result for the whole request and uses `errorCode = "partial_fallback"` if some chunks had to stay in source English.
- when callers explicitly request an unavailable engine, the facade returns a fail-closed fallback result with `errorCode = "no_engine"`; default-engine substitution is allowed only when the caller did not pin `engineId`.

This keeps the module reusable for Claude, Codex, Core overlays, and non-provider runtime consumers.

---

## 5. Current Consumers and Adapter Boundary

### 5.1 Core-owned live translation overlays

Runtime thinking translation is now consumed by Core instead of provider-local visible adapters:

- `packages/core/src/session-translation/session-translation-facade.ts`
- `packages/core/src/session-translation/session-message-localization-projector.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`
- `packages/core/src/unified-session/storage.ts`
- `packages/unified-session/src/session-translation-overlay-store.ts`

Current live overlay rules:

- providers emit native/source thinking text immediately with stable per-emission `messageId`;
- Core decides whether that message should be translated and calls `TranslationFacade.translate(...)` asynchronously;
- reasoning overlays now translate each provider-emitted thinking message as one block by default instead of re-planning it through the shared chunk planner;
- live reasoning overlay translation uses a 15-second base timeout plus the existing per-character allowance, capped at 30 seconds; this avoids premature fallback for short Codex reasoning paragraphs while keeping translation failure non-blocking;
- reasoning overlay translation is routed through the dedicated `reasoningEngineId` and the fifth user-facing `Reasoning` category target language (`reasoningLanguage`); the UI translation engine (`uiEngineId`) and the `Messages for the User` category language no longer control reasoning overlays after the UI/Reasoning translation split;
- the Core translation gate still requires the persisted localization bootstrap snapshot under `.codeai-hub/<workspaceSlug>/runtime/localization/cache/browser-runtime-bootstrap.json` to match the active UI localization settings and to report `system_feedback.source = "materialized"`; the gate is driven by UI bootstrap integrity only and is not gated on reasoning engine/language state — reasoning engine or reasoning language changes never pend/block this gate;
- successful translations are appended to `*.translations.jsonl` sidecars and never rewrite the native JSONL transcript;
- history reads merge `localizedContent` from the sidecar only when `messageId + sourceHash` still match, so stale translations are ignored;
- if a second pending translation resolves to the same `engineId + targetLanguage + sourceHash`, Core must reuse the in-flight promise instead of queueing a duplicate provider call; caller-specific `messageId` stays unique, but the translated text payload is shared;
- Core carries `translationState` through live events and history replay. Session UI projections must preserve that state when converting Core messages into visible dialog messages, otherwise a reread of dialog history can briefly expose the source text.
- non-reasoning messages may render `localizedContent ?? content` and upgrade already-rendered messages in place when a translation patch arrives later.
- live reasoning messages with `translationState = "pending"` must not render source `content` as the visible buffer. The UI renders a local pending label, waits for `localizedContent`, then reveals the translated text progressively.
- when a reasoning translation patch extends the visible transcript with additional translated blocks, the UI keeps the longest already-visible translated prefix and streams only the suffix. Earlier translated reasoning blocks must not disappear and replay from the beginning.
- runtime diagnostics for session translation must log both requested and resolved engine metadata. For `anthropic-claude-haiku-4-5`, that metadata includes provider `claude`, model `claude-haiku-4-5-20251001`, project slug `translation-runtime-haiku`, `persistSession: true`, and `runtimePath: "provider-owned"`.
- Apple Native readiness failures must preserve the actionable error code in translation results and session translation warning logs; the session layer also records a `readinessAction` such as `download_translation_languages`, `install_xcode_26`, or `build_or_install_apple_translation_helper`.
- providers that stream one reasoning item across multiple visible paragraph/block messages must not reuse the same `messageId` for every emitted block; overlay/replay stores are keyed by `messageId`, so later translations would otherwise overwrite earlier thinking fragments from the same provider item. Codex uses `<itemId>::summary-block::<index>` for this identity.

### 5.2 Provider boundary

Provider modules still own provider-specific text extraction and message identity, but they no longer block visible thinking on translation completion.

Current provider boundary:

- Codex emits source-first reasoning text directly into the dialog/runtime stream as sequential reasoning summary blocks, not as token-level deltas, so Core translation sees one normal persisted thinking message per paragraph/block;
- Claude keeps provider-local translation only for generic assistant progress/pre-tool text that is not part of the Core-owned thinking overlay path;
- provider-local live adapters that still translate visible assistant progress prefer the dedicated `reasoningEngineId` and `reasoningLanguage` from the applied provider turn-config envelope; they fall back to the legacy `translationEngineId` / `messagesForTheUserLanguage` aliases only while Core is still forwarding both fields during the UI/Reasoning split migration;
- `@codeai-hub/translation` still must not know about provider stream buffers, placeholder markers, UI roles, or dialog/session storage.

### 5.3 Future document and artifact adapters

The same facade can later be consumed by runtime adapters such as:

- document translation adapters;
- artifact translation adapters;
- startup locale bootstrap adapters.

Those adapters may translate provider-generated Markdown artifacts, agent-authored documents, or user-facing startup text.
The shared module still stays translation-only.

---

## 6. Runtime Packaging Invariant

Installed provider bundles that consume the shared translation package are self-contained at runtime.

Build and release rules:

- `scripts/build-claude-module.sh` and `scripts/build-codex-module.sh` vendor `@codeai-hub/translation` into the installed provider runtime root.
- `scripts/build-release.sh` verifies that the installed Claude and Codex bundles plus the installed Core app can load with the bundled translation package present.
- The installed provider must not depend on workspace `node_modules` to resolve the shared translation package.

This invariant exists because provider bundles are loaded outside the repo workspace tree.

---

## 7. Invariants

1. Translation failure is non-blocking.
   If translation times out, fails, or returns invalid data, the caller still gets a usable fallback text.

2. Every request must carry explicit source and target languages.
   The module does not guess locale direction.

3. The facade returns outcome data only.
   It does not own session events, persistence, or UI side effects.

4. The package is transport-only and text-only.
   Provider roles, tags, and history shapes are handled above the shared module.

5. The engine layer remains pluggable.
   Google GTX is the current default, not a forever-hardcoded implementation detail.

6. Installed provider bundles that use runtime translation must remain runnable without the repo workspace dependency tree.
   Required shared runtime dependencies are copied into the provider bundle root by the build pipeline.
7. Codex-backed translation runtimes must not assume the provider-owned Codex home already exists on disk.
   The active App Server path uses the provider-owned Codex home; the shared `codex exec` fallback must still be able to bootstrap from legacy `~/.codex` authentication artifacts so cold-start and freshly migrated installs do not fail before the first translation request.
8. Long translation requests must degrade per chunk, not per whole string.
   If one chunk times out, neighbouring chunks are still allowed to translate and the final assembled surface must not contain holes.
9. Safe chunking must respect protected text regions.
   The chunk planner is not allowed to split inside fenced/inline code, Markdown links, placeholders, or glossary markers unless a later explicit contract widens that boundary.

---

## 8. Verification Notes

Current validation surface:

- `npm run build --workspace=@codeai-hub/translation`
- `npm run clean --workspace=@codeai-hub/translation`
- `node --test packages/translation/dist/codex-translation-runtime-home-facade.test.js`
- `node --test packages/translation/dist/translation-chunk-boundary-resolver.test.js`
- `node --test packages/translation/dist/translation-chunk-planner.test.js`
- `node --test packages/translation/dist/translation-facade.test.js`
- `npm run build --workspace=@codeai-hub/core`
- `node --test packages/core/dist/session-translation/session-message-localization-projector.test.js`
- `node --test packages/unified-session/dist/session-translation-overlay-store.test.js`
- `npm run build --workspace=@codeai-hub/claude-module`
- `npm run build --workspace=@codeai-hub/codex-app-server-module`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

The current chunked-translation baseline validates:

- engine-aware chunk planning and protected-boundary resolution through dedicated translation package tests;
- per-chunk fallback assembly into one request-level `translated` result with `errorCode = "partial_fallback"` when at least one chunk succeeds;
- `@codeai-hub/core` still compiling against the shared reporter-based chunk diagnostics path;
- installed Claude and Codex provider bundles continuing to load with the bundled shared translation package while Core-owned translation overlays stay replay-safe through JSONL sidecars.

---

## 9. Related Docs

- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
