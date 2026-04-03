# Session 025 — Four-Category Localization Execution Planning

**Date:** 2026-04-03 08:58 CEST
**Branch:** main
**Version:** 1.1.869

---

# 1. Work Done in This Session

## Work summary
- Restored full context from `Session024`, the release hotfix commit chain, the current `1.1.869` state, and the uncommitted localization planning work.
- Rewrote `doc/SolidWorks-WorkFlow/Plans/Localization_Category_Current_Semantics_And_Authoring_Boundary.md` from a long discussion log into an approved execution-ready decision document.
- Finalized the product-facing localization model around 4 explicit user-facing text categories:
  - `UI Labels`
  - `UI Helper Text`
  - `Messages for the User`
  - `Artifacts for the User`
- Removed `Default language` and `Workflow Terms Policy` from the intended user-facing Settings model and replaced them with independent category selectors where English is the default/reset state.
- Recorded the required UI behavior that clearing any selected category language must restore `Default Language (English)` in the selector cell.
- Recorded the hard architectural boundary that all non-user-facing prompts/contracts/templates must be classified as `Internal Agent Instructions` and remain English-only.
- Recorded the mandatory authoring rule that every text produced or shown by the application must receive an explicit category marker rather than being classified heuristically.
- Recorded that the future execution plan must contain a dedicated migration phase for all existing text already present in the app, runtime bundle, prompts, templates, and VSIX-shipped assets.
- Created a detailed execution-ready `doc/TODO/todo-plan.md` that breaks the work into phases covering:
  - Settings/domain/runtime contract refactor
  - source dictionaries and lookup runtime updates
  - mandatory migration of existing text
  - internal agent instruction classification
  - artifact-language prompt-pack propagation
  - verification, release build, and closure
- No code implementation, build, or release packaging was performed in this session; the repository now contains updated planning docs and an execution-ready TODO plan for the next session.

## Git commits
- No commits were created in this session.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Modules/Localization.md`
5. `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Session024.md`
8. `doc/Sessions/Session025.md` (THIS REPORT)
9. `doc/SolidWorks-WorkFlow/Plans/Localization_Category_Current_Semantics_And_Authoring_Boundary.md`

## Plans for next session
- Start execution from `doc/TODO/todo-plan.md`, Phase 0 / Phase 1, without redefining the category model again.
- First implementation target: introduce the four-category text taxonomy and the English-only `Internal Agent Instructions` marker in the localization contract/runtime bridge.
- Then move into persisted settings and browser settings-state changes so the user-facing Settings UI matches the approved model:
  - `UI Labels`
  - `UI Helper Text`
  - `Messages for the User`
  - `Artifacts for the User`
- Preserve backward readability of existing saved snapshots while removing `Default language` / `Workflow Terms Policy` from the intended user-facing Settings flow.
- Keep the migration requirement explicit: every touched legacy string must be given a category marker, not left as raw text.
- Do not start the release phase before the mandatory migration phase for existing text is materially underway and the prompt-pack path for `Artifacts for the User` is implemented.

## First code files to open after document review
1. `packages/localization/src/localization-contract.ts`
2. `packages/localization/src/source-dictionary-registry.ts`
3. `packages/localization/src/localization-facade.ts`
4. `src/extension-module/settings/general-settings.ts`
5. `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`
6. `src/client/ui/src/components/settings/settings-state-model.ts`
7. `src/client/ui/src/components/settings/use-settings-state-support.ts`
8. `src/client/ui/src/components/settings/localization-settings-card.tsx`

## Execution note
- The next session should begin implementation immediately from the approved plan; no additional planning placeholder remains in `doc/TODO/todo-plan.md`.
