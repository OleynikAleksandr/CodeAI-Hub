# Session 006 — Codex Startup Hotfix Release 1.1.856

**Date:** 2026-03-31 19:09 CEST
**Branch:** main
**Version:** 1.1.856

---

# 1. Work Done in This Session

## Work summary
- Investigated the startup failure `Core did not become healthy via /api/v1/health` and traced it to a Codex provider packaging regression in the installed `1.1.855` runtime.
- Confirmed the root cause from logs: Core failed while loading the Codex override because `@codeai-hub/translation` was missing from `~/.codeai-hub/providers/codex/1.1.855/node_modules`.
- Applied a local hotfix to the installed Codex runtime so the current machine can restart without waiting for a new package.
- Fixed the repository build pipeline so `scripts/build-codex-module.sh` now vendors `@codeai-hub/translation` exactly like Gemini, and `scripts/build-release.sh` now validates both Codex and Gemini installed bundles before VSIX packaging.
- Built hotfix release `1.1.856` with `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version`.
- Verified the final artifacts: `codeai-hub-1.1.856.vsix` and the tarballs in `doc/tmp/releases/`.

## Git commits
- `6803fcd4 fix(build): bundle shared translation with Codex`
- `e16ebdbb docs(release): prep codex startup hotfix release`
- `0c3e6e27 build(release): assemble codex startup hotfix release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session006.md` (THIS REPORT)

> Далее: в зависимости от задачи открыть нужные документы из `doc/SolidWorks-WorkFlow/Clusters/`, `doc/SolidWorks-WorkFlow/Modules/`, `doc/SolidWorks-WorkFlow/Contracts/`.

## Plans for next session
- Validate `1.1.856` in the installed extension runtime after restarting VS Code / restarting Core.
- If documentation hygiene becomes a separate scope, clean the advisory broken markdown links reported from archived session documents during release builds.
