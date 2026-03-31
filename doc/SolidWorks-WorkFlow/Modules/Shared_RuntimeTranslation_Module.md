# Shared Runtime Translation Module - Module (SSOT)

**Status:** Implemented on `main`
**Updated:** 2026-03-31
**Owner:** Oleksandr + Codex
**Validated on:** `main` (`v1.1.854`)

---

## 1. Purpose

`@codeai-hub/translation` is the shared runtime translation capability for CodeAI Hub.
It translates short runtime text fragments through an engine-neutral facade and keeps provider-specific message semantics outside the package.

Current production use:

- Gemini thoughts are translated from English to Russian through the free Google Translate endpoint.
- Codex reasoning deltas are translated from English to Russian through the same shared facade and are emitted as visible assistant-thinking bubbles by the provider-local adapter.
- Translation failure is non-blocking and falls back to the original text.
- Gemini emits translated output as `role: "assistant"` with `tag: "thinking"`.
- Codex emits translated reasoning output as `role: "assistant"` with `tag: "thinking"` as well.

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
- `packages/translation/src/translation-request-normalizer.ts` - trims and normalizes input and options.
- `packages/translation/src/translation-response-parser.ts` - parses raw Google payloads into text.
- `packages/translation/src/google-translate-client.ts` - HTTP client for `translate.googleapis.com`.

Current default engine:

- `google-gtx`

Implementation notes:

- The facade depends on the engine contract, not on Google-specific code directly.
- The request/response helpers stay split into small files so no single utility file becomes a new runtime god module.
- The first engine is intentionally the free Google Translate path; the package is engine-pluggable so a different backend can be added later without changing consumer contracts.

---

## 4. Public API Contract

The shared facade exposes a provider-neutral translation API.

```ts
export interface TranslationRequest {
  readonly text: string;
  readonly sourceLanguage: "en";
  readonly targetLanguage: string;
  readonly category?: "reasoning" | "generic";
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
- The facade returns translation outcome data only.
- The facade does not emit session messages or mutate provider state.
- The facade does not infer message roles, tags, or UI placement.

This keeps the module reusable for Gemini, Codex, and non-provider runtime consumers.

---

## 5. Current Consumers and Adapter Boundary

### 5.1 Gemini

Gemini consumes the shared module through a provider-local adapter:

- `packages/Gemini_Module/src/messaging/gemini-thought-translation-adapter.ts`
- `packages/Gemini_Module/src/messaging/thought-translator-service.ts` (compatibility re-export only)

Current Gemini rules:

- `ThoughtSummary` is converted into plain text using `subject: description` when a subject exists, otherwise `description`.
- The adapter calls `TranslationFacade.translate(...)` with the current reasoning translation request shape.
- The message processor keeps `pendingTranslations` and drains them before the final assistant segment of the same finished leg is emitted.
- The visible contract remains `role: "assistant"` with `tag: "thinking"`.
- Translation failure still falls back to the original English text.

### 5.2 Codex boundary

Codex reasoning translation must use a separate provider-local adapter when that stream is enabled.
The shared module must not know about Codex stream snapshots, placeholder markers, or the Codex-specific choice between `role: "thinking"` and any tagged assistant presentation.

That logic belongs in the Codex integration layer, not in `@codeai-hub/translation`.

### 5.3 Future document and artifact adapters

The same facade can later be consumed by runtime adapters such as:

- document translation adapters;
- artifact translation adapters;
- startup locale bootstrap adapters.

Those adapters may translate provider-generated Markdown artifacts, agent-authored documents, or user-facing startup text.
The shared module still stays translation-only.

---

## 6. Runtime Packaging Invariant

Installed Gemini provider bundles are self-contained at runtime.

Build and release rules:

- `scripts/build-gemini-module.sh` vendors `@codeai-hub/translation` into the installed Gemini runtime root.
- `scripts/build-release.sh` verifies that the installed Gemini bundle can load with the bundled translation package present.
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

6. Installed Gemini bundles must remain runnable without the repo workspace dependency tree.
   Required shared runtime dependencies are copied into the provider bundle root by the build pipeline.

---

## 8. Verification Notes

Current validation surface:

- `npm run build --workspace=@codeai-hub/translation`
- `node --test --import tsx packages/Gemini_Module/src/messaging/message-processor.test.ts`
- `node --test --import tsx packages/Gemini_Module/src/session/gemini-session-manager.test.ts`
- `npm run build --workspace=@codeai-hub/gemini-module`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

The `1.1.854` release validates that the installed Gemini provider bundle loads successfully with the bundled shared translation package.

---

## 9. Related Docs

- `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`
- `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
