# Session 033 — Persistent Localization Bootstrap Refactor

**Date:** 2026-04-04 12:48 (CEST)
**Branch:** main
**Version:** 1.1.882

---

# 1. Work Done in This Session

## Work summary
- Started a new refactor scope to remove the cold-start English flash from Settings WebView and Project Manager by moving startup hydration to persistent user-space localization snapshots.
- Created the dedicated planning doc `Persistent_Localization_Bootstrap_Architecture.md` and rewrote the active `todo-plan.md` into phased execution streams for snapshot persistence, host/core delivery, browser first-paint hydration, and SSOT sync.
- Approved the planning baseline and recorded the first planning commit so implementation can continue from a stable architecture reference.
- Added the first runtime implementation layer in `packages/localization/`: a canonical browser bootstrap snapshot path, a persistent `LocalizationRuntimeBootstrapStore`, and direct regression tests for save/load and invalid-snapshot fallback behavior.
- Threaded the bootstrap snapshot into `LocalizationFacade`, so runtime payload resolution can now persist and reuse startup-ready browser snapshots instead of rebuilding them unconditionally.
- Injected the persisted localization bootstrap snapshot into VS Code webview HTML before JS boot and exposed the same persisted snapshot through a new core HTTP endpoint for Project Manager bootstrap.
- Wired the settings-only webview browser runtime to start from the injected bootstrap snapshot, so localized copy can render before the first async `settings:loaded` roundtrip.
- Finished the Project Manager bootstrap path: PM now fetches `/api/v1/localization/bootstrap` before `root.render(...)` and seeds both settings state and Help/UI localization from the persisted startup snapshot.
- Synced the localization SSOT so the Modules/System docs describe browser bootstrap snapshots, injected Settings hydration, and PM pre-mount startup localization.
- Refreshed the shipped webview bundle and completed the targeted verification pass required before the next packaged patch release.
- Prepared release notes for `1.1.882`, ran `./scripts/build-all.sh`, and committed the unified version/manifests surface for the persistent localization bootstrap patch.
- Built and verified the packaged VSIX with `./scripts/build-release.sh --use-current-version`; the resulting artefact is `codeai-hub-1.1.882.vsix`.
- Archived the completed persistent-localization-bootstrap planning doc and execution TODO, then restored a clean placeholder `doc/TODO/todo-plan.md` for the next scope.

## Verification
- `npm run build --workspace @codeai-hub/localization`
- `node --test packages/localization/dist/localization-runtime-bootstrap-store.test.js`
- `npm run compile`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npm run build:project-manager`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## Git commits
- `d7c921d8 docs(plan): define persistent localization bootstrap scope`
- `7a1acf30 feat(localization): add browser bootstrap snapshot store`
- `b41911fc feat(localization): persist runtime bootstrap snapshots`
- `29b42703 feat(localization-bootstrap): inject webview startup payload`
- `158b6cf4 feat(localization-bootstrap): expose pm bootstrap endpoint`
- `a5e9ca06 fix(localization-bootstrap): hydrate settings webview from startup payload`
- `87021691 fix(localization-bootstrap): hydrate project manager before mount`
- `783e9f4e docs(architecture): sync persistent localization bootstrap ssot`
- `ac939b58 build(webview): refresh localization bootstrap bundle`
- `ad63ff0b docs(session): record persistent localization bootstrap verification`
- `c04034d3 docs(release): prepare persistent localization bootstrap release notes`
- `ea018c87 build(release): assemble persistent localization bootstrap release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session033.md` (THIS REPORT)

> Дополнительно: если потребуется вернуться к этому scope, открыть архивные `doc/SolidWorks-WorkFlow/Plans/Archive/Persistent_Localization_Bootstrap_Architecture.md` и `doc/TODO/Archive/todo-plan-up-to-phase4-persistent-localization-bootstrap-release-1.1.882-2026-04-04.md`.

## Plans for next session
- Start the next scope from a newly approved planning doc; there are no active execution streams left in `doc/TODO/todo-plan.md`.
- Use `1.1.882` field feedback as input for any follow-up fixes around startup localization, packaging, or UX polish.
