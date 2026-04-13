# Codex Post-Release Translation Regression Investigation

**Status:** Draft for execution
**Date:** 2026-04-13
**Owner:** Oleksandr + Codex

## 1. Problem statement

Release `1.1.976` fixed the previous Codex rollout regression, but a new post-release defect was reported after switching `Localization -> Translation engine` from `Google GTX Free` to `OpenAI Codex · GPT-5.3 Codex Spark`.

Observed user behavior in workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`:

- with `Google GTX Free`, visible Codex thinking translated quickly enough, the final assistant answer stayed Russian, and the generated artifact stayed Russian;
- with `OpenAI Codex · GPT-5.3 Codex Spark`, only part of visible thinking was translated and translation arrived late;
- the final assistant answer appeared in English;
- the generated artifact also appeared in English.

This violates the current contract:

- translation engine selection may affect only runtime translation surfaces that explicitly opt into `@codeai-hub/translation`;
- Core-owned thinking overlay must be source-first and non-blocking;
- final assistant answers must not be rewritten by the thinking overlay path;
- user-facing artifact language must follow the intended workflow/runtime language contract, not translation-engine side effects.

## 2. Investigation goals

1. Identify the exact failing runtime/session artifacts for the latest reproducible turn in workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`.
2. Prove whether the translation engine changed:
   - only thinking translation behavior;
   - final assistant output language behavior;
   - artifact language instructions or artifact-generation behavior;
   - or several of these at once through one shared runtime path.
3. Reduce the regression to a concrete code path and data contract.
4. If the root cause is localized and low-risk, ship a minimal fix plus regression coverage in the same scope.

## 3. High-probability hypotheses

### H1. Translation overlay eligibility is too broad

A Core-owned translation scheduling path may now select non-thinking assistant messages in addition to `assistant + tag: thinking`, causing ordinary assistant output to flow through the same translation/localization logic.

### H2. Language-routing metadata leaks into provider output generation

`messagesForTheUserLanguage`, `translationEngineId`, or related localization metadata may now influence provider-facing prompt assembly or artifact-language directives instead of staying a presentation-only/runtime-translation concern.

### H3. Codex-backed translation runtime leaks provider state or config

The isolated translation-only Codex runtime may be sharing or mutating state that the main workspace Codex provider later consumes, for example through config or home materialization behavior.

### H4. Partial thinking translation is caused by message selection or message identity mismatch

Thinking overlays may be generated only for some messages because:

- some reasoning chunks are emitted without the expected stable `messageId`;
- replay/live-sync dedupe skips eligible chunks;
- overlay persistence or projector matching by `messageId + sourceHash` drops some completed translations.

## 4. Required evidence

The scope must correlate the following artifacts for the same failing turn:

- `~/.codeai-hub/settings/settings.json`
- `~/.codeai-hub/logs/core/core.log`
- `~/.codeai-hub/logs/codex/sdk-codex-*.jsonl`
- `~/.codeai-hub/providers/codex/home/sessions/**/rollout-*.jsonl`
- `~/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-codex-5-4/**`

## 5. Primary code paths

- `packages/core/src/session-translation/session-translation-facade.ts`
- `packages/core/src/session-translation/session-translation-dispatcher.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`
- `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`
- `packages/Codex_Module/src/rollout/codex-rollout-live-sync.ts`
- `packages/translation/src/codex-cli-translation-engine.ts`
- `packages/translation/src/codex-translation-runtime-home-facade.ts`

## 6. Exit criteria

The scope is complete only when all of the following are true:

1. We can explain, with artifact-backed evidence, why switching to the Codex Spark translation engine changed the observed behavior.
2. The intended boundary is restored:
   - visible thinking stays source-first;
   - translation does not block visible delivery;
   - final assistant output is not routed through the thinking overlay path;
   - artifact language is not accidentally coupled to the translation engine.
3. Targeted regression coverage exists for the fixed path, if code changes are required.
4. SSOT is synchronized with any code-path or contract change introduced by the fix.

## 7. Investigation findings (2026-04-13)

Artifact-backed comparison isolated the regression to two adjacent Description runs in workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`:

- good run: runtime session `a11f34d0-6fa9-4c0e-9150-43198b5bd237`, provider session `019d87ca-4d7c-7692-8a13-f62f6a608612`;
- bad run: runtime session `12171ad8-19ef-443d-b7ab-97044bb9b9d7`, provider session `019d87cb-d308-75f2-b4e6-bad7f3e0e405`.

Confirmed facts:

1. Persisted localization settings stayed Russian for user-facing output after the engine switch:
   - `~/.codeai-hub/settings/settings.json` keeps `messagesForTheUser = ru`, `artifactsForTheUser = ru`, and `engineId = codex-gpt-5.3-codex-spark`;
   - `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json` also keeps `interactive_templates = ru` under the same engine.
2. Core-owned thinking translation still targeted Russian in the bad run:
   - `codex-12171ad8-...description.translations.jsonl` stores `targetLanguage = "ru"` for translated thinking overlays.
3. The bad run already entered the provider with the wrong artifact language:
   - good prompt pack embeds `Artifacts for the User language ... Target language code: ru`;
   - bad prompt pack embeds `Artifacts for the User language ... Target language code: en`.
4. Therefore the English final answer and English artifact were not produced by late overlay translation.
   They were produced because the main workflow prompt explicitly instructed the provider to write user-facing artifact/chat output in English.

Root-cause hypothesis promoted to implementation:

- PM-side workflow prompt assembly resolves artifact language from the volatile `settings:loaded` cache (`api.getLastSettingsPayload()`).
- Under reconnect / cold-start / post-restart timing, that cache can be unavailable or stale when the next workflow session is launched.
- The PM service then falls back to hardcoded default `en`, while Core-owned thinking translation still reads persisted localization state and continues to target `ru`.
- This creates a split-brain failure: prompt-pack artifact language becomes `en`, but thinking overlays remain `ru`.

Fix direction:

- preserve the existing live-settings path when it exists;
- when it does not, resolve `Artifacts for the User` from the already loaded browser localization bootstrap snapshot before falling back to default `en`.
