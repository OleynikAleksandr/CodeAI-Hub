# Persistent Localization Bootstrap Architecture

**Status:** Proposed for execution (2026-04-04)
**Created:** 2026-04-04
**Owner:** Oleksandr + Codex
**Scope:** Remove the cold-start English flash from Project Manager and settings webview by bootstrapping browser localization from persistent user-space runtime snapshots instead of waiting for the first async settings payload.

---

## 1. Problem

Release `1.1.881` finished the visible localization rollout, but the startup architecture still violates the intended user experience.

Current live behavior:

- localized bundles are already materialized and persisted under `~/.codeai-hub/localization/catalogs/...`;
- glossary overrides are already persisted under `~/.codeai-hub/localization/glossary/do-not-translate-terms.txt`;
- browser roots still mount before the localized runtime payload arrives from host/core;
- `use-localization.ts` falls back to inline English component strings while payload is `null`;
- after a full restart, the user briefly sees English Help/UI before the selected language arrives.

Result: the product behaves as if localization were a runtime repaint, even though the translated dictionaries already exist on disk.

---

## 2. Product Goal

Once the user has chosen a non-English language and the corresponding bundles have been materialized, the next cold start must open directly in that language.

Target behavior:

1. Browser surfaces start from a persistent localization snapshot generated from user-space localization files.
2. Settings/webview and Project Manager no longer depend on the first async `settings:loaded` cycle for their first localized paint.
3. The startup path reuses the last successful resolved runtime payload and treats later host/core loads as background revalidation.
4. Re-materialization happens only when localization inputs change:
   - selected language;
   - engine id;
   - glossary file;
   - bundled English source dictionaries;
   - runtime payload schema version.
5. If no snapshot exists yet, the product may fall back to source copy, but that must be the first-run exception rather than the normal restart behavior.

---

## 3. Non-Goals

This refactor does not include:

- translating provider/model outputs or visible reasoning streams;
- moving bundled English source dictionaries out of the repository;
- letting browser bundles read arbitrary filesystem paths directly;
- changing localization category ownership or glossary semantics;
- introducing a compile-time-only localization pipeline.

---

## 4. Core Decisions

### 4.1. Persist one startup-ready browser snapshot

`packages/localization/` will own one canonical browser bootstrap snapshot in user-space:

- `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json`

This snapshot is not a replacement for per-category bundle files. It is a startup-ready assembled view built from them.

Recommended contents:

- normalized localization settings subset used for runtime resolution;
- resolved browser runtime payload (`activeEngineId`, `availableEngines`, `resolvedBundlesByCategory`);
- snapshot schema/version marker;
- cache key or hash proving which localization inputs produced the snapshot;
- timestamp / generation metadata for diagnostics.

### 4.2. User-space snapshot is the startup source of truth

At startup, browser surfaces must consume the persisted snapshot first.

Implications:

- inline English fallback strings remain only as a last-resort safety path;
- the startup language should come from the last valid persisted snapshot, not from browser-memory cache;
- the first async settings response becomes revalidation and refresh, not the primary source of visible copy.

### 4.3. Transport differs by surface, snapshot shape stays shared

The snapshot format must stay shared across browser surfaces, but transport may differ:

- VS Code settings webview:
  - extension host injects the persisted snapshot into the HTML bootstrap before JS starts;
- Project Manager:
  - core exposes a read-only HTTP bootstrap endpoint backed by the same persisted snapshot;
  - PM loads that snapshot before `root.render(...)`.

This keeps the startup source canonical while respecting the current runtime boundaries of each surface.

### 4.4. `settings:loaded` becomes background revalidation

After first paint, the existing settings load/save flows remain in place, but their role changes:

- if the fetched payload matches the bootstrap snapshot, no visible localization swap should occur;
- if settings/glossary/source dictionaries changed, host/core returns the refreshed payload and the browser updates once;
- bootstrap consumers must tolerate missing or stale snapshots without breaking the UI.

### 4.5. Snapshot invalidation is explicit

The bootstrap snapshot must be regenerated when any of these inputs change:

- localization settings relevant to runtime payload resolution;
- bundled source dictionary content;
- glossary baseline or user glossary file;
- translation engine selection;
- bootstrap payload schema version.

The snapshot must not be regenerated on every browser load when the inputs are unchanged.

### 4.6. First-run fallback is acceptable; repeat English flash is not

If the user has never generated a localized snapshot before, source-copy startup is acceptable.

If a valid snapshot already exists, showing English first is considered a product defect.

---

## 5. Target Architecture

### 5.1. `packages/localization/`

Add a dedicated persistent snapshot boundary on top of the existing bundle store:

- `LocalizationRuntimeBootstrapStore` (or equivalent) owns:
  - snapshot path resolution;
  - read/write/remove operations;
  - schema validation for persisted startup payloads.

`LocalizationFacade` gains helpers for:

- loading the persisted browser bootstrap snapshot;
- resolving a fresh runtime payload and persisting the assembled startup snapshot;
- comparing requested settings against the persisted snapshot cache key.

### 5.2. Extension-host bootstrap

The settings-only webview already has an HTML generation boundary in:

- `src/core/webview-module/webview-html-generator.ts`

That boundary should inject:

- `window.__CODEAI_LOCALIZATION_BOOTSTRAP__`

The injected value must come from persisted user-space snapshot data, not from hardcoded English source catalogs.

### 5.3. Core HTTP bootstrap for Project Manager

Project Manager already depends on the remote bridge HTTP/WS runtime.

Add one read-only endpoint, for example:

- `/api/v1/localization/bootstrap`

Responsibilities:

- load the persisted browser bootstrap snapshot;
- return `404` or a structured empty response when no snapshot exists;
- avoid re-materializing bundles on every request;
- keep startup payload read-only and cheap.

### 5.4. Browser entrypoint hydration

Both browser roots must adopt a pre-render bootstrap step:

- settings webview root:
  - read injected `window.__CODEAI_LOCALIZATION_BOOTSTRAP__`;
- Project Manager root:
  - fetch bootstrap JSON from the core endpoint before mount.

Both roots then seed:

- settings snapshot state;
- localization runtime payload state.

This makes the initial render deterministic and localized when cached data already exists.

### 5.5. Browser runtime behavior

`use-localization.ts` remains the shared runtime lookup boundary, but its practical semantics change:

- persisted bootstrap payload becomes the normal startup value;
- `ready = true` should be reachable before the first async host/core roundtrip when bootstrap data exists;
- inline component fallback strings remain only as a defensive escape hatch for missing snapshot + missing host data.

### 5.6. Relationship to bundled source dictionaries

Bundled English dictionaries stay the canonical authoring source and continue to power materialization.

The new startup snapshot is a derived cache layer:

- source of authoring truth: repository dictionaries;
- source of startup truth: persisted assembled browser snapshot in user-space;
- source of runtime refresh truth: host/core revalidation using the same localization package.

---

## 6. Risks And Mitigations

### 6.1. Stale snapshot risk

Risk:

- browser may render an outdated localized payload before refresh.

Mitigation:

- include an explicit cache key/hash in the snapshot;
- revalidate after startup through existing settings load/save flows;
- overwrite the persisted snapshot only after a successful refreshed resolution.

### 6.2. Split transport paths

Risk:

- webview injection and PM HTTP bootstrap could drift.

Mitigation:

- both transports must emit the same typed payload shape from the same localization snapshot store;
- transport-specific code may differ, but payload construction must stay centralized in `@codeai-hub/localization`.

### 6.3. Core-not-ready PM startup

Risk:

- PM bootstrap fetch could fail if core is temporarily unavailable.

Mitigation:

- load bootstrap before mount with a bounded timeout/failure fallback;
- keep the existing websocket settings refresh path as recovery;
- treat source-copy startup in this case as a degraded fallback, not the primary design.

---

## 7. Execution Outline

Implementation should follow this order:

1. Add the persistent browser bootstrap snapshot store to `packages/localization/`.
2. Extend `LocalizationFacade` so resolving runtime payload also produces reusable startup snapshots.
3. Inject the snapshot into settings webview HTML.
4. Expose the same snapshot through a core HTTP endpoint for Project Manager.
5. Seed browser state from bootstrap before first render.
6. Update SSOT after the runtime behavior is verified.

---

## 8. Verification Target

Target verification surface:

- `npm run build --workspace @codeai-hub/localization`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npm run build:project-manager`

Packaged verification target:

- after implementation, the next release must confirm that previously selected non-English UI/help text appears immediately on cold start without an English flash.

---

## 9. Related Docs

- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Plans/Archive/Localization_Language_Picker_And_Browser_Runtime_Hydration_Architecture.md`
