# Session 019 — UI Localization Planning And Handoff

**Date:** 2026-04-01 16:00 CEST
**Branch:** main
**Version:** 1.1.864

---

# 1. Work Done in This Session

## Work summary
- Cleaned the active `Plans/` root by promoting the provider-failure recovery document into a live contract and moving completed planning scopes out of the active root.
- Corrected the over-aggressive archive decision for `MultiProvider_Orchestration_Scenarios.md` and restored it to active `Plans/` after validating that it is still a deferred, not-yet-implemented design scope.
- Designed the new UI localization architecture around English canonical source copy, persisted user-owned locale bundles under `~/.codeai-hub/localization/`, and a local glossary/protected-terms layer on top of the existing shared translation module.
- Added a separate glossary planning companion document and fixed the product requirement that users must be able to add their own English `do-not-translate` terms.
- Replaced the placeholder `doc/TODO/todo-plan.md` with a full execution plan for the localization rollout, including source normalization, settings contract, new `@codeai-hub/localization` package, glossary/user overrides, UI wiring, SSOT sync, and final release stream.

## Git commits
- `564d0aa1 docs(architecture): archive retired plans and promote provider failure contract`
- `c1ca55f7 docs(plans): restore multiprovider orchestration scope`
- `a4d542ca docs(plan): define ui localization scope`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session019.md` (THIS REPORT)
6. `doc/SolidWorks-WorkFlow/Plans/UI_Localization_And_Local_Glossary_Architecture.md`
7. `doc/SolidWorks-WorkFlow/Plans/UI_Localization_Glossary_Baseline.md`
8. `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
9. `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

> After the documents above, open the concrete Phase 1 source surfaces from `todo-plan.md` before editing code.

## Plans for next session
- Start `Phase 1 / Stream: Settings And Session Source Copy`.
- Do not begin the localization package or glossary implementation before the canonical English source baseline is normalized for UI/help/template surfaces.
- Keep the invariant fixed in planning: product-owned source copy becomes English first, localized bundles come later.
- Preserve the chosen storage boundary: mutable user localization data belongs under `~/.codeai-hub/localization/`, not inside the extension bundle.
- Keep the glossary contract aligned with the planning docs: bundled base glossary, language glossary, category policy, then user overrides from `user-overrides.json`.
