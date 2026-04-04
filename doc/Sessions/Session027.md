# Session 027 — Gemini CLI 0.36 Runtime Compatibility Release

**Date:** 2026-04-04 08:47 CEST
**Branch:** main
**Version:** 1.1.877

---

# 1. Work Done in This Session

## Work summary
- Restored context from the live `1.1.876` baseline, `Session026`, the active `todo-plan`, and the Gemini runtime/module surfaces that still owned CLI bridge compatibility.
- Reproduced the packaged Gemini provider failure against the real global `@google/gemini-cli@0.36.0` / `@google/gemini-cli-core@0.36.0` installation and confirmed that the old bridge expected legacy `dist/src/config/*` modules plus `core/coreToolScheduler.js`.
- Implemented a Gemini runtime compatibility layer in `cli-bridge-module-loader.ts`:
  - legacy module paths still load first;
  - bundle-only CLI installs now receive a local `loadCliConfig()` built on top of the exported `Config` class from `@google/gemini-cli-core`;
  - compatibility settings loading now reads `~/.gemini/settings.json` and `<workspace>/.gemini/settings.json` directly instead of importing Gemini CLI bundle chunks;
  - modern `scheduler/scheduler.js` exports are adapted back to the legacy `CoreToolScheduler` contract expected by the existing session layer.
- Added regression coverage for the bundle-only Gemini CLI layout and updated the Gemini SSOT so future work keeps the safe file-based settings bootstrap and avoids bundle-import side effects.
- Ran focused Gemini validation:
  - `npm run build --workspace @codeai-hub/gemini-module`;
  - compiled Gemini runtime/session tests via `node --test packages/Gemini_Module/dist/runtime/cli-bridge.test.js packages/Gemini_Module/dist/session/gemini-session-bootstrapper.test.js packages/Gemini_Module/dist/session/gemini-tool-executor-facade.test.js packages/Gemini_Module/dist/session/gemini-turn-runner.test.js packages/Gemini_Module/dist/session/gemini-session-manager.test.js packages/Gemini_Module/dist/session/gemini-session-manager.post-tool.test.js`.
- Ran live global-install smoke validation against the actual user environment:
  - `loadCliBridgeFromGlobal()` resolved the global `@google/gemini-cli@0.36.0` install under `~/.npm-global/lib/node_modules`;
  - compatibility settings loading preserved the stored auth selection (`oauth-personal`);
  - `loadCliConfig()`, `refreshAuth()`, and `initialize()` completed successfully and produced a live Gemini client.
- Prepared release-facing docs for the patch release and updated the active `todo-plan`/planning doc for the Gemini compatibility hotfix stream.
- Ran the full release cycle:
  - `./scripts/build-all.sh` bumped the unified workspace version from `1.1.876` to `1.1.877` and rebuilt providers, core, UI bundles, and the CEF launcher;
  - committed the generated version/manifest updates;
  - `./scripts/build-release.sh --use-current-version` passed cleanly with the expected markers (`Step 7: Verifying SDK exclusions`, dev-dependency pruning, `✅ Package created`, VSIX runtime verification, restored dev dependencies).
- Final packaged artifact for this session is `codeai-hub-1.1.877.vsix` in the repo root.

## Git commits
- `fe21d8f7 docs(plan): define gemini cli compatibility hotfix scope`
- `5543f798 fix(gemini): restore cli 0.36 runtime compatibility`
- `a6d6dcc6 docs(release): prepare gemini cli compatibility release notes`
- `57eb642e build(release): assemble gemini cli compatibility release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session026.md`
5. `doc/Sessions/Session027.md` (THIS REPORT)
6. `doc/SolidWorks-WorkFlow/Plans/Gemini_CLI_0.36_Runtime_Compatibility_Fix.md`
7. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
8. `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
9. `doc/SolidWorks-WorkFlow/Modules/Localization.md`

## Plans for next session
- Treat `1.1.877` as the current packaged baseline: Gemini provider selection should stay available with global `@google/gemini-cli@0.36.x`, and the VSIX artifact to validate is `codeai-hub-1.1.877.vsix`.
- First confirm the packaged UI flow end-to-end in VS Code/Project Manager using the rebuilt release, especially the Gemini provider picker surface and the first live Gemini turn after provider selection.
- If the Gemini regression is closed, return to the still-open user-facing localization backlog from `todo-plan` instead of reopening the finished Gemini compatibility scope.
