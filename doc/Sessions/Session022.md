# Session 022 — Localization Hydration Release 1.1.866

**Date:** 2026-04-02 11:39 CEST
**Branch:** main
**Version:** 1.1.866

---

# 1. Work Done in This Session

## Work summary
- Closed the approved `Localization Language Picker + Browser Runtime Hydration` execution plan end to end.
- Added runtime payload contracts and facade helpers in `@codeai-hub/localization`, so the package now resolves browser-ready bundle snapshots instead of exposing only source-dictionary lookup primitives.
- Added extension-host and Project Manager bridge materialization for `localizationRuntime`, then wired both browser entrypoints to one shared `LocalizationProvider`.
- Switched localized Project Manager help/questionnaire/navigation surfaces from per-leaf settings reads to the shared provider.
- Added the searchable localization language combobox, catalog-backed engine selector, and visible `English` source semantics in Settings.
- Synced SSOT docs (`Localization.md`, `SystemArchitecture.md`), refreshed the tracked shipped webview bundle, and updated release-facing docs (`README.md`, `CHANGELOG.md`) for `v1.1.866`.
- Ran targeted verification for `@codeai-hub/localization`, `@codeai-hub/core`, `build:webview`, `typecheck:webview`, and `build:project-manager`.
- Ran `./scripts/build-all.sh`, produced `1.1.866` tarballs in `doc/tmp/releases/`, built `codeai-hub-1.1.866.vsix`, then fixed `.vscodeignore` so repo-only `.github/**` and `.nvmrc` no longer leak into the VSIX package.

## Release verification
- `./scripts/build-release.sh --use-current-version` passed twice on `1.1.866`; the second pass confirmed the clean package surface after the `.vscodeignore` fix.
- Required release markers were present in the successful run: `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`.
- Final artefacts available after this session:
  - `codeai-hub-1.1.866.vsix`
  - `doc/tmp/releases/claude-module-1.1.866.tar.bz2`
  - `doc/tmp/releases/codex-module-1.1.866.tar.bz2`
  - `doc/tmp/releases/gemini-module-1.1.866.tar.bz2`
  - `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.1.866.tar.bz2`
  - `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.1.866.tar.bz2`
  - `doc/tmp/releases/vscode-webview-1.1.866.tar.bz2`
  - `doc/tmp/releases/project-manager-1.1.866.tar.bz2`

## Git commits
- `e7862110 docs(plan): define localization hydration scope`
- `579011f6 feat(localization): add runtime snapshot contract`
- `759675a4 feat(settings): materialize localization runtime payload`
- `17055ca7 feat(pm): bridge localization runtime payload`
- `1c578e0d refactor(ui): hydrate browser localization runtime`
- `8f5f4442 refactor(ui): wire settings localization runtime`
- `ceedb9ee refactor(pm): provide shared localization runtime`
- `125de9c0 refactor(pm): use shared localization provider for help surfaces`
- `0f774ee7 refactor(pm): use shared localization provider for navigation`
- `b7eab063 feat(ui): add localization language combobox`
- `2676222f refactor(ui): clarify localization selector semantics`
- `e54cb41a docs(localization): sync picker hydration ssot`
- `a7e15ddc build(webview): refresh localization settings bundle`
- `fca35f53 docs(release): prepare localization hydration release notes`
- `9cf48ab1 build(release): assemble localization hydration release`
- `dfa694e1 fix(release): exclude repo workflow files from vsix`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session022.md`
6. `doc/TODO/Archive/todo-plan-up-to-phase4-localization-hydration-release-1.1.866-2026-04-02.md`
7. `doc/SolidWorks-WorkFlow/Modules/Localization.md`
8. `doc/SolidWorks-WorkFlow/Plans/Archive/Localization_Language_Picker_And_Browser_Runtime_Hydration_Architecture.md`

## Plans for next session
- Do not start implementation from the placeholder `doc/TODO/todo-plan.md`; open the next scope only after a new approved planning document exists in `doc/SolidWorks-WorkFlow/Plans/`.
- If the next scope touches localization again, use this release plus the archived plan as the baseline for all follow-up work.
- If product validation is requested, start from the packaged `codeai-hub-1.1.866.vsix` and the tarballs in `doc/tmp/releases/` rather than rebuilding the same release again.
