# Session 026 — Post-Release Localization Fix Stream After `1.1.870`

**Date:** 2026-04-03 17:36 CEST
**Branch:** main
**Version:** 1.1.876

---

# 1. Work Done in This Session

## Work summary
- Restored context from `Session025`, the full `1.1.870` release commit chain, and the approved four-category localization architecture.
- Started a dedicated post-release fix stream after packaged testing showed that switching `UI Helper Text` and `Artifacts for the User` to Russian changes too little visible copy in the installed release.
- Confirmed the issue is mixed:
  - some tested surfaces belong to `Messages for the User`, not to `UI Helper Text`;
  - some user-facing surfaces are still hardcoded and never enter localization lookup.
- Created an execution-ready planning document for the post-release fix scope and replaced the completed release TODO with a new fix-oriented `todo-plan`.
- Fixed the remaining `Localization Settings` labels/helper copy and localized the glossary editor so `Settings -> Localization` now visibly reacts to category switching instead of leaving large parts hardcoded.
- Fixed the Description provider picker shell/status copy and the default `Sessions / Artifacts` panel shell in Project Manager so those surfaces now resolve through explicit localization categories instead of embedded literals.
- Fixed the Description questionnaire field titles and inline helper hints so `Artifacts for the User` now localizes the full questionnaire body instead of only the surrounding shell.
- Added a permanent SSOT contract for text ownership in `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md` and linked it from `SystemArchitecture.md`, so every new product-authored text surface must be classified as `UI Labels`, `UI Helper Text`, `Messages for the User`, `Artifacts for the User`, or `Internal Agent Instructions`.
- Expanded `UI Helper Text` coverage across the settings surfaces that the user specifically reported as “barely changing”:
  - `General -> Response Mode`;
  - shared provider/session-continuity helper blocks;
  - `Claude`, `Codex`, and `Gemini` default-model helper copy;
  - `Claude Thinking Settings` helper sections;
  - Codex/Gemini reasoning-thinking modal guidance.
- Closed the next packaged provider-settings tails reported after testing `1.1.872`:
  - the standalone `Settings only` explanatory intro now resolves through `UI Helper Text`;
  - the provider update risk banner now resolves through `Messages for the User`;
  - the explanatory sentences under each `Claude`, `Codex`, and `Gemini` model option now resolve through `UI Helper Text`.
- Ran targeted validation during the follow-up:
  - repeated `npm run build:webview`;
  - `npm run typecheck:webview`;
  - `npm run build:project-manager`.
- Ran `./scripts/build-all.sh`, which bumped the unified workspace version from `1.1.871` to `1.1.872` and rebuilt providers, core, UI bundles, and the CEF launcher.
- First `./scripts/build-release.sh --use-current-version` attempt exposed a real release blocker: `description-questionnaire-panel.tsx` used a dynamic field-id lookup that passed `build:project-manager` but failed `typecheck:webview`. Fixed that with a typed lookup helper and reran the release packaging successfully.
- Ran a second full release pass after the new provider-settings fixes:
  - `./scripts/build-all.sh` bumped the unified workspace version from `1.1.872` to `1.1.873`;
  - `./scripts/build-release.sh --use-current-version` passed cleanly with the expected markers (`Step 7`, dev-dependency pruning, `✅ Package created`, and VSIX runtime verification).
- A later packaged test of `1.1.873` exposed a second-class localization boundary regression:
  - workflow runtime prompt scaffolding and bundled agent prompt/template assets were still partly authored in Russian, so default-English sessions could show Russian internal instructions;
  - Codex/Gemini thought translation adapters still hardcoded `ru` as the target language, so visible reasoning/thinking was forced into Russian regardless of settings.
- Converted the remaining internal workflow instruction sources to English and refreshed the generated template bundle:
  - runtime prompt-pack scaffolding and file-first fallback copy;
  - bundled `Description` prompt/template assets;
  - bundled `Virtual Simulation` prompt asset;
  - bundled `Diagram Modules` prompt/reference/merge-rule assets;
  - generated `packages/core/src/templates/bundled-templates.ts`.
- Refreshed the contract verification layer so bundled template sync and idea-contract tests now assert English internal templates instead of stale Russian snippets.
- Removed the hardcoded Russian thought-translation target from Codex and Gemini, so provider reasoning/thinking now falls back to the original provider language by default.
- Ran targeted validation for the internal-prompt/thinking follow-up:
  - `npm run build --workspace @codeai-hub/core`;
  - `npm run build --workspace @codeai-hub/codex-module`;
  - `npm run build --workspace @codeai-hub/gemini-module`;
  - `npm exec --yes tsx --test packages/core/src/templates/template-sync-service.test.ts`;
  - `npm exec --yes tsx --test packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts`.
- Ran another full release pass for the internal-prompt/thinking fix:
  - `./scripts/build-all.sh` bumped the unified workspace version from `1.1.873` to `1.1.874`;
  - `./scripts/build-release.sh --use-current-version` passed cleanly with the expected markers (`Step 7`, dev-dependency pruning, `✅ Package created`, and VSIX runtime verification).
- Final packaged artifact for the current follow-up is `codeai-hub-1.1.874.vsix` in the repo root.
- Packaged validation of `1.1.874` exposed a Claude-specific provider-home isolation regression: despite English internal workflow prompts, Claude still answered and thought in Russian because provider-native context usage showed `Project | /Users/oleksandroliinyk/.claude/CLAUDE.md`, meaning the provider session was still importing global Claude memory from the real user home.
- Root-caused the leak to Claude query options rather than to the workflow prompt pack:
  - provider auth/runtime env still sandboxes `HOME` under `~/.codeai-hub/providers/claude/home`;
  - but `ClaudeSDKManager` passed the real `homedir()` through `additionalDirectories`, which the upstream Claude CLI treats as an extra `CLAUDE.md` discovery root;
  - and `settingSources` still included `user`, which unnecessarily widened provider-driven filesystem settings beyond the workspace scope.
- Fixed Claude provider-home memory isolation:
  - removed the real user home from Claude `additionalDirectories`;
  - limited provider-driven Claude `settingSources` to workspace `project` / `local`;
  - documented the new invariant in `doc/SolidWorks-WorkFlow/Modules/Claude.md`;
  - added a Claude module regression test that asserts the query options stay inside workspace scope and do not reintroduce global-home discovery.
- Ran focused Claude validation for the isolation fix:
  - `npm run build --workspace @codeai-hub/claude-module`;
  - `npm test --workspace @codeai-hub/claude-module`.
- Ran a full release pass for the Claude provider-home memory-isolation follow-up:
  - `./scripts/build-all.sh` bumped the unified workspace version from `1.1.874` to `1.1.875`;
  - `./scripts/build-release.sh --use-current-version` passed cleanly with the expected markers (`Step 7`, dev-dependency pruning, `✅ Package created`, VSIX runtime verification, and restored dev dependencies).
- Final packaged artifact for the current follow-up is `codeai-hub-1.1.875.vsix` in the repo root.
- Packaged validation of `1.1.875` exposed one more Claude-specific language leak: in provider-native session logs, Claude thinking and the generated `Final_Description.md` were already English, but the visible assistant chat replies still came back in Russian.
- Root-caused the remaining mismatch through the native provider session log and Claude `/context` output:
  - provider-native session context still showed `Project | /Users/oleksandroliinyk/.claude/CLAUDE.md` as a loaded memory file;
  - the previous fix removed the explicit real-home add-dir leak, but `ClaudeSDKManager` still enabled filesystem `settingSources: ["project", "local"]`;
  - upstream Claude SDK keeps `CLAUDE.md` discovery enabled whenever `project` is present, and project-scope discovery walks parent directories from the active `cwd`, so a workspace under `/Users/oleksandroliinyk/...` still inherited the personal `/Users/oleksandroliinyk/.claude/CLAUDE.md` file as `Project` memory.
- Closed the remaining Claude leak by switching CodeAI Hub-managed Claude turns to full SDK isolation mode:
  - `ClaudeSDKManager` now passes empty filesystem `settingSources`;
  - provider turns keep workspace file/tool access through `cwd` and `additionalDirectories`, but no longer auto-load filesystem settings or any `CLAUDE.md` memory from the workspace, its parent directories, or the real user home;
  - refreshed the Claude module regression test to assert SDK isolation mode;
  - corrected the Claude SSOT document so it records full SDK isolation rather than the earlier incorrect `project/local` assumption.
- Ran focused Claude validation for the SDK-isolation follow-up:
  - `npm run build --workspace @codeai-hub/claude-module`;
  - `npm test --workspace @codeai-hub/claude-module`.
- Ran the next full release pass for the Claude SDK-isolation follow-up:
  - `./scripts/build-all.sh` bumped the unified workspace version from `1.1.875` to `1.1.876`;
  - initial `./scripts/build-release.sh --use-current-version` attempt correctly refused to run on the dirty post-`build-all.sh` tree, so the version/manifest bump was committed first;
  - repeated `./scripts/build-release.sh --use-current-version` then passed cleanly with the expected markers (`Step 7`, dev-dependency pruning, `✅ Package created`, VSIX runtime verification, and restored dev dependencies).
- Final packaged artifact for the current follow-up is `codeai-hub-1.1.876.vsix` in the repo root.
- Ran a final live-doc sweep before publishing the release so the SSOT matches the shipped behavior instead of the earlier intermediate fixes:
  - `Modules/Localization.md` now documents the approved four-category user-facing taxonomy as the live baseline, keeps legacy buckets explicitly as compatibility aliases only, and records that `Artifacts for the User` may drive workflow-created artifact shell text plus brief user-facing workflow chat updates while internal prompts stay English-only;
  - `System/SystemArchitecture.md` now states the Claude-specific full SDK isolation invariant and the workflow artifact-language boundary at system level;
  - `Contracts/UserFacing_Text_Localization_Boundary.md` now explicitly classifies brief workflow chat updates under `Artifacts for the User` and keeps workflow/provider prompt bodies under `Internal Agent Instructions`;
  - `Docs_Index.md` now points readers directly at the Claude isolation rule and the localization boundary contract as active SSOT.
- Final release state before publish:
  - packaged artifact: `codeai-hub-1.1.876.vsix`;
  - architecture docs synchronized to the release behavior;
  - worktree clean and ready for `git push`.
- Remaining post-release backlog now shifts from internal prompt/thinking boundary repair back to whatever residual user-facing labels/messages or workflow-created artifact surfaces still remain after packaged testing of `1.1.874` (for example add-workspace modal copy, status-bar copy, artifact repair copy, provider/version labels, or workflow-created user-facing artifacts).
- After validating Claude isolation in the packaged `1.1.876` build, the remaining backlog returns to residual user-facing localization tails (`add-workspace` modal, status-bar shell, artifact repair, provider/version labels, and workflow-created user-facing artifacts).

## Git commits
- `811d8a80 docs(plan): define post-release localization fix scope`
- `6484106d docs(session): bootstrap post-release localization fix report`
- `4f320934 fix(settings-localization): localize localization card labels`
- `9d6edca9 fix(settings-localization): localize localization card helper text`
- `4b3959c4 fix(settings-localization): localize glossary editor copy`
- `8c3466f0 fix(pm-localization): localize description provider picker labels`
- `bfb33e98 fix(pm-localization): localize description provider picker messages`
- `11c7d4c0 fix(pm-localization): localize panel container shell`
- `0a79b9df build(webview): refresh localization follow-up bundle`
- `fb6d2e38 docs(release): prepare post-release localization fix notes`
- `34e3ef6e build(release): assemble post-release localization fix release`
- `7871891c docs(session): record post-release localization fix release`
- `92161466 fix(pm-localization): localize description questionnaire fields`
- `20fa5ccf fix(settings-localization): localize response mode copy`
- `cea35e79 docs(localization): codify text ownership boundary`
- `0f55096a fix(settings-localization): localize session continuity helper copy`
- `4e604f2f fix(settings-localization): localize provider auto-update helper copy`
- `245ea638 fix(settings-localization): localize claude model helper copy`
- `a4ebd135 fix(settings-localization): localize codex model helper copy`
- `aa678d81 fix(settings-localization): localize gemini model helper copy`
- `8c378a65 fix(settings-localization): localize claude thinking sync helper copy`
- `8ed50baf fix(settings-localization): localize claude thinking toggle copy`
- `3da4f2ef fix(settings-localization): localize claude thinking token helper copy`
- `8c7157ef fix(settings-localization): localize claude thinking pro tip`
- `11923358 fix(settings-localization): localize codex reasoning dialog helper copy`
- `adb74198 fix(settings-localization): localize gemini thinking dialog helper copy`
- `ba0f45bd docs(release): prepare provider helper localization follow-up notes`
- `57564a96 build(webview): refresh provider helper localization bundle`
- `3e670f83 build(release): assemble provider helper localization release`
- `02aab669 fix(pm-localization): tighten questionnaire translation lookup typing`
- `224b5c49 fix(settings-localization): localize settings-only shell copy`
- `d3f89a56 fix(settings-localization): localize provider warning banner`
- `7169378c fix(settings-localization): localize claude model option descriptions`
- `1fc26c74 fix(settings-localization): localize codex model option descriptions`
- `a948f346 fix(settings-localization): localize gemini model option descriptions`
- `5f18f8fe docs(release): prepare provider settings tail release notes`
- `1e4294d0 build(webview): refresh provider settings tail bundle`
- `e5ac4645 build(release): assemble provider settings tail release`
- `95e801e6 fix(workflow-prompts): enforce english runtime scaffolding`
- `4b095d83 fix(description-agent): enforce english internal templates`
- `41d29ba6 fix(diagram-agent): enforce english prompt assets`
- `d8291f19 fix(diagram-agent): enforce english staged guidance`
- `53c3e3e4 fix(provider-thinking): stop forcing russian thought translation`
- `f72c9186 fix(virtual-simulation): enforce english internal prompt`
- `55999af4 test(workflow-contracts): expect english internal templates`
- `b01c1326 docs(release): prepare internal prompt english follow-up notes`
- `940fb78a build(release): assemble internal prompt english release`
- `2701887a fix(claude): isolate provider-home memory discovery`
- `7397bba5 docs(release): prepare claude memory isolation release notes`
- `9007cb25 build(release): assemble claude memory isolation release`
- `fd3b4261 fix(claude): disable filesystem claude discovery`
- `21618bd2 docs(claude): record sdk isolation mode`
- `03b79213 docs(release): prepare claude sdk isolation release notes`
- `6b3361a2 build(release): assemble claude sdk isolation release`
- `1a8119c3 docs(session): record claude sdk isolation release`
- `eea77470 docs(architecture): sync localization and claude isolation ssot`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/SolidWorks-WorkFlow/Plans/Archive/Localization_Release_1.1.870_PostRelease_Fixes.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session025.md`
6. `doc/Sessions/Session026.md` (THIS REPORT)
7. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
8. `doc/SolidWorks-WorkFlow/Modules/Localization.md`
9. `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
10. `doc/SolidWorks-WorkFlow/Modules/Claude.md`

## Plans for next session
- Treat `1.1.876` as the current published baseline: packaged Claude sessions should stay isolated from global `~/.claude/CLAUDE.md`, and the architecture docs in `doc/SolidWorks-WorkFlow/` should already reflect that shipped behavior.
- If new work starts, reopen from the still-unfinished user-facing localization backlog only (`add-workspace` modal, status-bar shell, artifact repair, provider/version labels, workflow-created user-facing artifacts) instead of reopening the already-approved localization category model or the Claude isolation scope.
