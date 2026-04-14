# Shared Runtime Translation Module - Module (SSOT)

**Status:** Implemented on `main`
**Updated:** 2026-04-14
**Owner:** Oleksandr + Codex
**Validated on:** `main` (`v1.1.854`)

---

## 1. Purpose

`@codeai-hub/translation` is the shared runtime translation capability for CodeAI Hub.
It translates short runtime text fragments through an engine-neutral facade and keeps provider-specific message semantics outside the package.

Current production use:

- live provider thinking/reasoning is emitted source-first and stored in canonical session history without rewriting the native transcript;
- Core owns the runtime translation overlay pipeline for persisted thinking messages and broadcasts async `session:message_translation` / `dialog:message_translation` patches when translation completes;
- translated text is stored as per-session sidecar overlay records (`*.translations.jsonl`) and is merged into history reads as `localizedContent`, while the source text remains the only canonical transcript;
- translation failure is non-blocking and falls back to the original text in the visible UI.
- long user-facing fragments are now planned into engine-aware safe chunks before dispatch, so one timeout no longer forces whole-string fallback by default.

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
- `packages/translation/src/codex-cli-translation-engine.ts` - Codex-backed translation engine for `gpt-5.4-mini` and `gpt-5.3-codex-spark`.

Current bundled engines:

- `google-gtx`
- `codex-gpt-5.4-mini`
- `codex-gpt-5.3-codex-spark`

Implementation notes:

- The facade depends on the engine contract, not on Google-specific code directly.
- The request/response helpers stay split into small files so no single utility file becomes a new runtime god module.
- `google-gtx` remains the zero-config default; the two Codex-backed engines reuse an isolated translation-only Codex runtime instead of the full workspace agent surface.
- long requests are no longer sent as one monolithic string by default; `TranslationFacade` resolves an engine-specific chunk policy, plans safe boundaries, and dispatches chunks sequentially through the same engine contract.
- safe boundary priority is paragraph break -> list boundary -> sentence boundary -> clause boundary -> hard split outside protected regions.
- protected regions currently include fenced code, inline code, Markdown links, `{placeholders}`, and glossary markers such as `[[CAIHUB_TERM_n]]`.
- initial conservative chunk budgets are engine-specific:
  - `google-gtx` = `soft 360 / hard 520`
  - `codex-gpt-5.4-mini` = `soft 260 / hard 380`
  - `codex-gpt-5.3-codex-spark` = `soft 180 / hard 260`
- the isolated Codex translation runtime resolves authentication artifacts from provider home first and falls back to legacy `~/.codex` artifacts when the provider-owned home has not been materialized yet; missing `models_cache.json` is tolerated, but missing auth is still a hard failure.
- The package stays engine-pluggable so a different backend can be added later without changing consumer contracts.

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
- callers may leave `chunkingMode` unset and accept the engine-default chunk policy; `"disabled"` is an explicit opt-out, not the baseline.
- The facade returns translation outcome data only.
- The facade does not emit session messages or mutate provider state.
- The facade does not infer message roles, tags, or UI placement.
- when at least one chunk translates successfully, the facade returns one assembled `translated` result for the whole request and uses `errorCode = "partial_fallback"` if some chunks had to stay in source English.

This keeps the module reusable for Gemini, Codex, and non-provider runtime consumers.

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
- successful translations are appended to `*.translations.jsonl` sidecars and never rewrite the native JSONL transcript;
- history reads merge `localizedContent` from the sidecar only when `messageId + sourceHash` still match, so stale translations are ignored;
- UI renders `localizedContent ?? content` and can upgrade already-rendered messages in place when the translation patch arrives later.
- providers that stream one reasoning item across multiple visible delta messages must not reuse the same `messageId` for every delta chunk; overlay/replay stores are keyed by `messageId`, so later translations would otherwise overwrite earlier thinking fragments from the same provider item.

### 5.2 Provider boundary

Provider modules still own provider-specific text extraction and message identity, but they no longer block visible thinking on translation completion.

Current provider boundary:

- Gemini and Codex now emit source-first thinking text directly into the dialog/runtime stream;
- Claude keeps provider-local translation only for generic assistant progress/pre-tool text that is not part of the Core-owned thinking overlay path;
- provider-local live adapters that still translate visible assistant progress now read the persisted `translationEngineId` selected in Localization settings instead of hardcoding `google-gtx`;
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

- `scripts/build-claude-module.sh`, `scripts/build-codex-module.sh`, and `scripts/build-gemini-module.sh` vendor `@codeai-hub/translation` into the installed provider runtime root.
- `scripts/build-release.sh` verifies that the installed Claude, Codex, and Gemini bundles can load with the bundled translation package present.
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
   Translation-only isolated homes must be able to bootstrap from legacy `~/.codex` authentication artifacts so cold-start and freshly migrated installs do not fail before the first translation request.
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
- `npm run build --workspace=@codeai-hub/gemini-module`
- `npm run build --workspace=@codeai-hub/claude-module`
- `npm run build --workspace=@codeai-hub/codex-module`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

The current chunked-translation baseline validates:

- engine-aware chunk planning and protected-boundary resolution through dedicated translation package tests;
- per-chunk fallback assembly into one request-level `translated` result with `errorCode = "partial_fallback"` when at least one chunk succeeds;
- `@codeai-hub/core` still compiling against the shared reporter-based chunk diagnostics path;
- installed Claude, Codex, and Gemini provider bundles continuing to load with the bundled shared translation package while Core-owned translation overlays stay replay-safe through JSONL sidecars.

---

## 9. Related Docs

- `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`
- `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
