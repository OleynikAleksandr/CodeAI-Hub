# Reasoning No-Chunking Architecture

**Status:** Approved for implementation
**Date:** 2026-04-14
**Owner:** Oleksandr + Codex
**Target release:** `1.1.984`

---

## 1. Problem

Live reasoning translation is currently routed through the shared chunk planner even when providers already emit moderate-size thinking blocks.

Observed runtime behavior across `Codex`, `Gemini`, and `Claude` in the 2026-04-14 live logs:

- provider-emitted reasoning blocks usually arrive as complete visible fragments, not as one huge monolith that must be split for the UI;
- the shared translation facade still splits most reasoning blocks into `2-5` sequential chunk requests because `reasoning` currently inherits the engine-default `chunkingMode = auto`;
- the Core session translation dispatcher is single-worker (`maxConcurrentJobs = 1`), so each extra chunked request extends queue occupancy for all later reasoning messages;
- UI translation patches are broadcast only after full chunk assembly, so chunking does **not** provide progressive Russian replacement of the visible reasoning bubble;
- the current pipeline therefore pays the latency cost of chunking without the intended UX benefit.

Resulting symptom:

- reasoning translation is functionally correct again after the bootstrap-path hotfix, but it is too slow in real sessions and can leave users waiting tens of seconds before Russian overlays appear.

---

## 2. Decision

For `TranslationRequest.category = "reasoning"`:

- default runtime translation must use the provider-emitted reasoning block **as-is**;
- shared translation chunking must be disabled by default;
- the visible overlay must continue to translate one persisted reasoning message into one translated overlay record.

For non-reasoning categories:

- existing chunk planner behavior remains unchanged;
- document, artifact, and generic long-text translation may still use engine-aware chunking.

This scope does **not** add progressive per-chunk UI patches.
That would be a separate architecture change. The current scope only removes the unnecessary chunk planner from the reasoning path.

---

## 3. Intended Contract

Shared translation contract after this scope:

- if `category === "reasoning"` and the caller does not explicitly override `chunkingMode`, normalization resolves `chunkingMode = "disabled"`;
- if a future caller explicitly passes `chunkingMode = "auto"` for reasoning, that remains an intentional opt-in;
- `generic` and `document` categories keep the current engine-profile defaults.

Core / provider boundary after this scope:

- providers keep emitting source-first reasoning messages exactly as today;
- Core keeps owning persistence, translation dispatch, overlay storage, and patch broadcasting;
- only the shared request normalization rule changes for reasoning.

---

## 4. Implementation Shape

Primary code boundary:

- `packages/translation/src/translation-request-normalizer.ts`

Required regression coverage:

- add/update translation-package tests proving that reasoning requests no longer create a chunk plan by default, while generic requests still do;
- preserve existing fallback/chunk behavior for non-reasoning categories.

Required SSOT sync:

- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`

---

## 5. Risks And Non-Goals

Accepted risk in this scope:

- a future unusually large reasoning block may now translate as one request and can fall back as one block if the engine fails.

Why this is acceptable now:

- live evidence shows the current latency problem is dominated by sequential chunking plus single-worker queueing, not by oversized reasoning messages;
- earlier mixed-language holes were likely caused by a different regression and must not force permanent chunking on all reasoning traffic.

Non-goals:

- no queue concurrency change in this first pass;
- no provider-specific custom reasoning translation path;
- no partial overlay broadcasting per chunk.

---

## 6. Verification

Target verification for this scope:

- `npm run build --workspace=@codeai-hub/translation`
- `node --test packages/translation/dist/translation-facade.test.js`
- `npm run build --workspace=@codeai-hub/core`
- release wave: `./scripts/build-all.sh`
- final packaging: `./scripts/build-release.sh --use-current-version`

Runtime success criteria after release:

- reasoning translation logs no longer emit `Translation chunk plan created` for ordinary live reasoning messages;
- live overlays still appear for `Codex`, `Gemini`, and `Claude`;
- reasoning translation latency materially decreases because one reasoning message produces one translation request instead of `2-5` sequential chunk calls.
