# Shared Runtime Translation Module Architecture

**Status:** Approved for execution  
**Date:** 2026-03-31  
**Owner:** Oleksandr + Codex

---

## 1. Context

The current Russian translation path for model reasoning exists only inside the Gemini provider pipeline:

- `packages/Gemini_Module/src/messaging/thought-translator-service.ts`
- `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`
- `packages/Gemini_Module/src/session/gemini-turn-runner.ts`
- `packages/Gemini_Module/src/session/gemini-session-manager.ts`

Current Gemini behavior is already product-relevant and must not regress:

1. Gemini `Thought` summaries are translated from English to Russian through the free Google Translate endpoint `translate.googleapis.com`.
2. Translation failure is non-blocking and falls back to the original English text.
3. Translated text is emitted as `role: "assistant"` with `tag: "thinking"`.
4. Pending translation promises are drained before the final assistant segment of the same finished leg is emitted.
5. Core persistence and UI already rely on this contract.

Codex has a different reasoning path and currently stays untranslated:

- `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`
- `packages/Codex_Module/src/messaging/codex-reasoning-streams.ts`
- `packages/Codex_Module/src/messaging/codex-session-event-emitter.ts`
- `packages/core/src/unified-session/storage.ts`

The live Codex path proves that English reasoning is persisted and displayed today:

- raw rollout logs under `~/.codeai-hub/providers/codex/home/sessions/.../rollout-*.jsonl`
- SDK logs under `~/.codeai-hub/logs/codex/sdk-codex-*.jsonl`
- unified session history under `~/.codeai-hub/sessions/.../codex-*.jsonl`

Recent session history shows stored `role: "thinking"` messages such as:

- `**Clarifying user instructions**`
- `**Evaluating project setup**`
- `**Finalizing response plan**`

So the next architecture step is not "improve Gemini only". It is to extract the translation capability into a shared runtime module that can be reused by Gemini now and by Codex next, without coupling providers to each other and without moving provider-specific message semantics into one generic service.

---

## 2. Problem Statement

The current implementation has three hard limits:

1. The translator API is Gemini-specific (`translateThought({ subject, description })`), so it cannot be reused by other providers without leaking Gemini event shape.
2. The translator lives inside `packages/Gemini_Module`, while `@codeai-hub/core` depends on provider modules rather than the reverse, so putting a shared translator inside Core would create the wrong dependency direction.
3. Codex reasoning is streamed as cumulative item snapshots and emitted as `role: "thinking"`, which is operationally different from Gemini's one-shot translated `assistant + tag` path.

Because of this, a direct copy of `ThoughtTranslatorService` into Codex would either:

- duplicate translation infrastructure, or
- incorrectly force Codex into Gemini-specific message/output semantics.

---

## 3. Goals

This architecture scope must deliver the following design outcome:

1. A dedicated shared translation module with its own facade class and provider-neutral public API contract.
2. Safe Gemini migration onto that shared module without changing the user-visible Gemini behavior.
3. A Codex-ready reuse path that keeps Codex-specific stream semantics outside the shared module.
4. No new dependency cycle between provider packages and `@codeai-hub/core`.
5. A module boundary that can be reused later from other runtime locations if another provider or subsystem needs translation.
6. Backend pluggability: the facade contract must not hardcode Google Translate as the only forever-engine.
7. Locale extensibility: the contract must be able to target a user-selected language later without redesigning the public API.

---

## 4. Non-Goals

This scope explicitly does **not** introduce:

- a full localization subsystem for arbitrary UI strings;
- multi-locale negotiation;
- persistent translation cache;
- batching or retry queue;
- provider-specific translation models or paid translation services;
- a forced unification of Gemini and Codex message roles;
- browser-only translation initiated by UI bundles as the new canonical path.

The active baseline remains:

- Google Translate free endpoint;
- English -> Russian;
- non-blocking fallback to original text.

But the module contract must be designed so that a later migration to:

- a cheaper AI translation model;
- a higher-quality provider-backed translator;
- a user-selected target locale at app startup

does not require a second architecture rewrite.

---

## 5. Boundary Decision

The shared translator should live in a new standalone package:

- package directory: `packages/translation/`
- package name: `@codeai-hub/translation`

Why this boundary is correct:

1. Gemini and Codex modules can both depend on it directly.
2. Core can also depend on it later if a runtime-side translation use case appears.
3. The package stays independent from provider event shapes, Core orchestration, and UI rendering.
4. We avoid the wrong dependency direction of "providers import Core utilities".

The shared module must stay transport-only and text-only.

It must **not** own:

- provider event buffering;
- pending flush orchestration;
- role/tag decisions;
- session history persistence;
- UI rendering choices.

Those behaviors stay in provider/runtime adapters.

---

## 6. Target Module Shape

Planned package structure:

- `packages/translation/src/index.ts`
- `packages/translation/src/translation-facade.ts`
- `packages/translation/src/translation-contract.ts`
- `packages/translation/src/translation-engine.ts`
- `packages/translation/src/translation-engine-registry.ts`
- `packages/translation/src/google-translate-client.ts`
- `packages/translation/src/translation-request-normalizer.ts`
- `packages/translation/src/translation-response-parser.ts`

Responsibility split:

### 6.1. `translation-facade.ts`

Thin facade and only public entrypoint for runtime consumers.

Owns:

- public `translate(...)` method;
- constructor wiring;
- high-level fallback handling;
- no provider-specific formatting rules.

### 6.2. `translation-contract.ts`

Public provider-neutral types only.

Must define:

- request shape;
- result shape;
- supported engine id(s);
- optional reporter/transport abstractions.

### 6.3. `google-translate-client.ts`

Owns only the HTTP request to `translate.googleapis.com` and timeout handling.

### 6.4. `translation-engine.ts`

Defines the engine-facing abstraction used by the facade.

The first implementation is Google GTX, but the facade should depend on an engine contract, not on Google-specific code directly.

### 6.5. `translation-engine-registry.ts`

Owns engine selection and default-engine resolution.

The initial baseline can hard-wire `google-gtx` as the default, but the selection seam must already exist so future cheap-model translation does not require re-cutting the package boundary.

### 6.6. `translation-request-normalizer.ts`

Normalizes input text, trims empties, and resolves effective timeout/options.

### 6.7. `translation-response-parser.ts`

Parses raw Google array payload into plain text.

This keeps the current translator logic split into micro-files rather than moving one larger utility file into another place.

---

## 7. Public API Contract

The shared facade should expose a provider-neutral API similar to:

```ts
export interface TranslationRequest {
  readonly text: string;
  readonly sourceLanguage: "en";
  readonly targetLanguage: "ru";
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

Important contract rule:

- the facade returns translation outcome data;
- it does **not** emit session messages by itself.

That separation is required so Gemini and Codex can keep different message semantics above the shared translator.

Additional contract rule:

- the facade must accept explicit `sourceLanguage` and `targetLanguage` on every request, even if the first rollout still calls it only with `en -> ru`.

That keeps the module reusable for:

- future Codex reasoning translation;
- future document/content translation adapters;
- future app-level locale selection at startup.

---

## 8. Provider Adapters Above The Shared Module

The shared module should be consumed through provider-local adapters instead of being called directly from every event handler.

### 8.1. Gemini adapter

Introduce a thin Gemini-focused adapter, for example:

- `packages/Gemini_Module/src/messaging/gemini-thought-translation-adapter.ts`

Responsibilities:

1. Convert `ThoughtSummary` into plain text using the existing Gemini rule:
   - `subject: description` when subject exists;
   - `description` otherwise.
2. Call `TranslationFacade.translate(...)`.
3. Return only text/fallback result to the Gemini normalizer.

What remains unchanged in Gemini:

- `pendingTranslations`;
- drain-before-final-answer ordering;
- emitting `role: "assistant"` + `tag: "thinking"`;
- failure remaining non-blocking.

### 8.2. Codex adapter

Codex needs a different adapter because its reasoning arrives as stream snapshots:

- `packages/Codex_Module/src/messaging/codex-reasoning-translation-adapter.ts`

Responsibilities:

1. Receive cumulative reasoning text for one reasoning item.
2. Decide when translation is requested:
   - on each cumulative snapshot, or
   - only on stable/completed boundaries.
3. Return translated text to the Codex reasoning pipeline without forcing Gemini's `assistant + tag` contract.

Important note:

Codex currently emits real `role: "thinking"` messages and also a placeholder `<!-- -->` marker at turn start. The shared module must not know about that placeholder. Filtering placeholder/noise stays on the Codex/Core side.

### 8.3. Future document/content adapters

The same shared facade should later support adapters such as:

- `document-translation-adapter.ts`
- `artifact-translation-adapter.ts`
- `ui-locale-bootstrap-translation-adapter.ts`

Those future adapters may translate:

- provider-generated Markdown artifacts;
- agent-produced English documents;
- startup-time text destined for the user-selected application locale.

The shared module remains the translation capability provider only. Formatting rules, caching policy, and target placement of translated output stay outside the facade.

---

## 9. Migration Strategy

Recommended order:

### Phase A. Shared package extraction

Create `@codeai-hub/translation` and move the raw Google request/parse/timeout logic there behind an engine abstraction.

### Phase B. Gemini parity migration

Replace direct `ThoughtTranslatorService` logic with a Gemini adapter on top of the shared facade.

Success condition:

- zero user-visible Gemini regression;
- same fallback behavior;
- same ordering guarantees;
- same persisted `assistant + tag: thinking` history shape.

### Phase C. Codex adoption

After Gemini parity is proven, wire a Codex adapter to the shared facade.

This must be a separate execution stream because Codex has different stream semantics and may require an explicit product decision on whether translated Codex reasoning should stay:

- `role: "thinking"`, or
- `role: "assistant"` with `tag: "thinking"`.

That decision belongs to the Codex integration layer, not to the shared translator.

---

## 10. Verification Surface

Implementation work based on this design must verify at least:

1. Shared package unit coverage:
   - empty/whitespace input -> skipped or null-safe fallback;
   - malformed Google payload -> fallback result;
   - timeout/non-200 response -> fallback result.
   - explicit `sourceLanguage` / `targetLanguage` are preserved end-to-end.

2. Gemini regression coverage:
   - translated thinking does not count as terminal answer;
   - delayed translated thinking is flushed before the final assistant answer;
   - `assistant + tag: "thinking"` shape stays unchanged.

3. Codex follow-up coverage:
   - placeholder `<!-- -->` still stays suppressed;
   - translated reasoning does not corrupt cumulative stream assembly;
   - raw provider logs remain provider-native and untranslated.

Relevant existing Gemini tests already protecting the current behavior:

- `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`

---

## 11. Documentation Impact After Implementation

When this plan is implemented, the following SSOT/docs must be updated in the same execution wave:

- `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`
- `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

Reason:

- the current implemented Gemini contract explicitly says there is no shared translation module;
- that statement becomes false after extraction and must not stay in SSOT.

---

## 12. Recommended First Execution Scope

The safest first implementation scope is narrow:

1. create `@codeai-hub/translation`;
2. keep Google GTX as the first engine behind an engine-neutral facade;
3. migrate Gemini onto it with behavior parity;
4. stop there;
5. open Codex translation as the next stream on top of the now-stable shared facade.

This keeps the first wave behavior-preserving and avoids mixing "Gemini extraction" with "Codex stream redesign" in one uncontrolled batch.
