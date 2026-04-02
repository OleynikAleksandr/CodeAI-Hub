# Localization Language Picker And Browser Runtime Hydration Architecture

**Status:** Approved for execution (2026-04-02)
**Created:** 2026-04-02
**Owner:** Oleksandr + Codex
**Scope:** Turn `General -> Localization` from a free-form stub into a searchable language picker and hydrate browser/runtime surfaces from persisted localized bundles for the currently cataloged UI copy.

---

## 1. Problem

Release `1.1.865` completed the backend localization foundation, but the user-facing control surface is still a stub.

Current gaps:

- `General -> Localization` renders free-form text inputs for language and engine ids instead of real selectors.
- The default visible value is the raw internal sentinel `source`, which is an implementation detail rather than product UX.
- `packages/localization/` already contains a language catalog, glossary protection, materialization, and metadata reuse, but the browser picker does not consume that catalog.
- Browser surfaces still resolve bundled English source catalogs only, so saving a non-`source` language does not change the visible copy.
- No host-side settings flow currently materializes the active category/language bundle set on load or save.
- Project Manager localized components currently resolve settings ad hoc per component, which is acceptable for a temporary source-only path but not for a real hydrated runtime boundary.

Result: the feature looks present, but the user cannot meaningfully control localization yet.

---

## 2. Product Goal

The Localization section must become an actual working feature.

Target behavior:

1. The default visible language is `English`, not raw `source`.
2. Every language selector is a searchable combobox backed by supported languages for the active engine.
3. Typing filters the list; keyboard navigation works via arrow keys, `Enter`, and `Escape`.
4. The user can choose one default language and per-category overrides.
5. Saving settings materializes missing localized bundles for the active selections.
6. Settings webview and Project Manager consume hydrated bundles from the host and immediately reflect the selected language where source catalogs already exist.
7. If bundle generation fails or a bundle is unavailable, the UI falls back to English source copy without breaking the product surface.

---

## 3. Non-Goals

This wave does not include:

- free-form arbitrary language codes in the primary picker UX;
- translation of provider outputs, reasoning text, or user-authored content;
- onboarding of paid/cloud-only translation engines;
- localization of surfaces that still do not have stable message ids or source catalogs;
- advanced glossary morphology, stemming, or regex matching;
- changing the canonical source language away from English.

---

## 4. Core Decisions

### 4.1. Internal vs visible language semantics

- `source` remains a persisted internal sentinel meaning "use canonical source copy".
- The picker must never display raw `source`.
- The visible label for that sentinel becomes `English`, with helper copy clarifying that it is the canonical source copy.
- The explicit engine code `en` is not surfaced as a second first-class picker option while the canonical source language remains English, so the user does not see two different "English" choices.

### 4.2. Picker UX contract

- Replace free-form `input type="text"` language fields with one reusable combobox.
- The combobox source is the active engine language catalog plus the source-copy option.
- Filtering must work by language code and by human-readable label.
- The active engine control must stop being a free-form text field; it becomes a controlled selector, even if the current release still exposes only one engine (`google-gtx`).

### 4.3. Host materialization contract

- Settings load/save responses must include a localization runtime payload, not just the raw settings snapshot.
- The host resolves the active category-language matrix from settings, materializes missing non-source bundles, and attaches the resolved bundle set to the response payload.
- Materialization work must deduplicate identical `(category, language)` pairs within one response cycle.
- Errors stay non-blocking: the browser receives source fallback data plus runtime status rather than a broken UI surface.

### 4.4. Browser runtime contract

- `src/client/ui/src/app-host/use-localization.ts` must stop importing bundled source catalogs as the only live data path.
- The shared browser localization runtime must consume hydrated bundle payloads from the host.
- Settings-only webview and Project Manager must consume the same runtime snapshot shape.
- Localized Project Manager leaves must stop resolving settings independently and instead read from one shared provider at the app/root boundary.

### 4.5. Release boundary

This scope is considered complete only when:

- picker UX is searchable and keyboard-operable;
- non-source selections actually change currently cataloged browser surfaces;
- live docs are synced;
- a new release is built.

---

## 5. Target Architecture

### 5.1. `packages/localization/`

The package remains the owner of:

- language catalog data;
- source dictionaries;
- glossary / user overrides;
- bundle materialization and metadata reuse.

This wave adds host-facing facade helpers for:

- listing visible language options for the active engine;
- resolving the active runtime bundle set for a settings snapshot;
- batch materialization of missing bundles for active selections.

### 5.2. Host runtime services

Two thin host services are needed:

- VS Code settings-webview side:
  - extension message handler composes `settings + localization runtime payload`;
- Project Manager / remote-bridge side:
  - remote-bridge settings handler composes the same payload for PM websocket clients.

Recommended ownership:

- `LocalizationRuntimeService` (or equivalent thin host helper) owns:
  - reading localization settings from the normalized snapshot;
  - materializing missing active bundles;
  - loading resolved bundles from disk;
  - reading supported languages from the active engine catalog;
  - emitting one browser-ready runtime payload.

### 5.3. Browser runtime payload

Recommended shape:

```ts
interface LocalizationRuntimePayload {
  readonly activeEngineId: string;
  readonly availableEngines: readonly {
    readonly engineId: string;
    readonly languages: readonly {
      readonly code: string;
      readonly label: string;
    }[];
  }[];
  readonly resolvedBundlesByCategory: Readonly<
    Record<
      LocalizationCategoryId,
      {
        readonly language: string;
        readonly source: "materialized" | "source_fallback";
        readonly entries: Readonly<Record<string, string>>;
        readonly error?: string | null;
      }
    >
  >;
}
```

Rules:

- only active resolved bundles are sent to the browser;
- browser lookup reads the resolved bundle first;
- if a category falls back, it still receives English source entries rather than a missing bundle.

### 5.4. Shared browser provider

`LocalizationProvider` becomes the single runtime entry for browser consumers.

Host roots:

- settings-only webview host;
- Project Manager app root.

Leaf consumers use:

- `useLocalization()` only.

`useResolvedLocalization(...)` remains a host-construction helper rather than a leaf-consumer pattern.

### 5.5. Picker component

A reusable `LocalizationLanguageCombobox` (or equivalent) owns:

- open/close state;
- filter text;
- keyboard navigation;
- rendering the source option and supported languages;
- returning a normalized persisted value (`source` or language code).

---

## 6. Execution Risks And Mitigations

### 6.1. Materialization latency

Risk:

- the first selection of a language may require live translation/materialization.

Mitigation:

- hydrate from existing persisted bundles when available;
- materialize only missing active bundles;
- keep source fallback available while materialization finishes or fails.

### 6.2. Duplicate settings loads in Project Manager

Risk:

- current PM localized components each request settings independently.

Mitigation:

- move localization runtime ownership to the PM app/root and consume one provider in leaf components.

### 6.3. Source / English ambiguity

Risk:

- exposing both `source` and `en` as separate visible choices would confuse users.

Mitigation:

- keep `source` internal and surface one visible English/source option only.

---

## 7. Out Of Scope For This Wave

- adding new translation engines beyond the current catalog contract;
- expanding source catalogs to not-yet-cataloged product surfaces;
- translating provider/model output;
- glossary morphology, stemming, or regex matching;
- changing the canonical source language away from English.

---

## 8. Verification And Release Target

Target verification surface:

- `npm run build --workspace @codeai-hub/localization`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npm run build:project-manager`

Release target:

- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

---

## 9. Related Docs

- `doc/SolidWorks-WorkFlow/Plans/UI_Localization_And_Local_Glossary_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/UI_Localization_Glossary_Baseline.md`
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/Sessions/Session020.md`
