# Session 033 — Persistent Localization Bootstrap Refactor

**Date:** 2026-04-04 11:56 (CEST)
**Branch:** main
**Version:** 1.1.881

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

## Verification
- `npm run build --workspace @codeai-hub/localization`
- `node --test packages/localization/dist/localization-runtime-bootstrap-store.test.js`
- `npm run compile`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npm run build:project-manager`

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

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Plans/Persistent_Localization_Bootstrap_Architecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session033.md` (THIS REPORT)

> Далее: после review этого отчета открыть `README.md`, `CHANGELOG.md` и активный `todo-plan.md`, затем завершить релизный cycle для persistent localization bootstrap.

## Plans for next session
- Update `README.md` and `CHANGELOG.md` for the next patch release that ships persistent localization bootstrap.
- Run `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`, then record the packaged verification outcome and version bump in this session report.
- Hand the VSIX to the user for final cold-start validation in Project Manager and Settings WebView.
