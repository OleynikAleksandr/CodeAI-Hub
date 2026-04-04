# Session 020 — UI Localization Release 1.1.865

**Date:** 2026-04-01 20:19 CEST
**Branch:** main
**Version:** 1.1.865

---

# 1. Work Done in This Session

## Work summary
- Completed the full UI localization rollout from English source normalization through settings/session/help surface localization, including the new `@codeai-hub/localization` package, persisted bundle materialization, glossary protection, and user-managed do-not-translate overrides.
- Synced live SSOT and release-facing documentation for the localization architecture, including the current documented limitation that browser runtime lookup still uses bundled English source catalogs until persisted localized bundles are bridged into the webview runtime.
- Ran targeted verification successfully: `npm run build --workspace @codeai-hub/localization`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`, `npm run lint`, `npm run check:links`.
- Completed `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`; produced `codeai-hub-1.1.865.vsix` plus fresh provider/core/UI/launcher tarballs in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.

## Git commits
- `ebb2dc54 refactor(copy): normalize settings source copy to english`
- `b5732d54 refactor(copy): normalize session source copy to english`
- `7a1e4ec4 refactor(copy): normalize workflow help to english`
- `04cdbc40 refactor(copy): normalize questionnaire source to english`
- `00392b09 refactor(copy): normalize continuity templates to english`
- `decea16c feat(settings): add localization settings snapshot`
- `b915ce7c refactor(settings): map localization state`
- `78b9dde0 refactor(settings): wire localization settings flow`
- `1d8e5f0b feat(ui): add localization category controls`
- `cc8a2bf6 feat(ui): add glossary override editor`
- `23dea825 feat(localization): scaffold package`
- `3443f910 feat(localization): add facade and contract`
- `6f729247 feat(localization): add bundle persistence primitives`
- `9f8b2258 feat(localization): add language catalog`
- `c4e713c0 feat(localization): materialize localized bundles`
- `bde32902 feat(localization): add glossary core`
- `bf08d15b feat(localization): seed bundled glossary baseline`
- `753b6f1d feat(localization): add user glossary overrides`
- `5ea158e8 refactor(localization): apply glossary protection during materialization`
- `1be03c7c feat(localization): seed english ui catalogs`
- `9fabdff9 feat(localization): seed english workflow catalogs`
- `1cef28ba feat(ui): load localized bundles into settings host`
- `83a19782 refactor(ui): localize settings surfaces`
- `4fcb9cbc refactor(ui): localize session system surfaces`
- `d9aaf7f5 refactor(pm): localize workflow help surfaces`
- `e33c6255 refactor(pm): localize shell navigation surfaces`
- `6434adbf docs(architecture): sync localization ssot`
- `8a06528c docs(release): prepare ui localization release notes`
- `1b0f779b build(release): assemble ui localization release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session020.md` (THIS REPORT)
6. `doc/TODO/Archive/todo-plan-up-to-phase6-ui-localization-release-1.1.865-2026-04-01.md`
7. `doc/SolidWorks-WorkFlow/Modules/Localization.md`
8. `doc/SolidWorks-WorkFlow/Plans/Archive/UI_Localization_And_Local_Glossary_Architecture.md`
9. `doc/SolidWorks-WorkFlow/Plans/Archive/UI_Localization_Glossary_Baseline.md`

> There is no active implementation scope left after this release. Start the next session by approving a new planning document or by explicitly choosing the next deferred localization/runtime follow-up scope.

## Plans for next session
- Validate/install `codeai-hub-1.1.865.vsix` locally if release smoke-check is still pending.
- If localization work continues, decide whether the next scope is persisted-bundle hydration inside the browser runtime or a separate deferred stream.
- Otherwise create and approve the next planning document first, then replace the placeholder `doc/TODO/todo-plan.md` with a new execution plan.
