# Session 042 — Application Foundation Envelope stage shell release

**Date:** 2026-04-05 11:27 (CEST)
**Branch:** main
**Version:** 1.1.888

---

# 1. Work Done in This Session

## Work summary
- Implemented the first `Application Foundation Envelope` wave end-to-end across core and Project Manager.
- Added the new workflow stage `application_foundation_envelope` to watcher/state/store ordering and gated it strictly on `diagramModulesProgress.aggregateReady === true`.
- Added prompt/template bundling, workflow contract exposure, HTTP persistence, canonical artifact path hydration, and artifact validation for `application-foundation-envelope.md`.
- Wired the Project Manager client to the new step: stage contracts, start-service routing, toolbar placement, tree labels, recovery priority, stage-node sync, panel shell, and artifact repair flow.
- Restored workflow fixtures and completed targeted verification successfully:
  - `npx tsx --test packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts packages/core/src/workflow/paths/workflow-artifact-paths.test.ts packages/core/src/remote-bridge/handlers/idea-contract-service.application-foundation-envelope.test.ts packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts`
  - `npx tsx --test src/client/project-manager/services/workflow-step-start-service.gating.test.ts src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`
  - `npm run typecheck:webview`
  - `npm run build:project-manager`
  - `npm run build --workspace=@codeai-hub/core`
- Synced release docs for version `1.1.888`, ran `./scripts/build-all.sh`, and produced release tarballs in `doc/tmp/releases/`.
- Ran `./scripts/build-release.sh --use-current-version` successfully and produced `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.888.vsix`.
- Closed this execution cycle by archiving the completed plan and creating a fresh empty `doc/TODO/todo-plan.md` while keeping the deferred planning scopes active.

## Git commits
(IMPORTANT: This list is required so the next session can restore context via `git show`)
- `ea2ff32e feat: declare application foundation envelope workflow stage`
- `03a999581 feat: track application foundation envelope workflow order`
- `a69e2055d feat: gate application foundation envelope after diagram modules`
- `f1ae28aa7 feat: hydrate application foundation envelope artifacts`
- `6599c4321 test: cover application foundation envelope artifact hydration`
- `1d5a7ef52 feat: bundle application foundation envelope prompt`
- `516ce640b feat: expose application foundation envelope contract`
- `45291588d feat: persist application foundation envelope artifacts`
- `fe10e0025 feat: add application foundation envelope client contracts`
- `04f044509 feat: start application foundation envelope from project manager`
- `6ae948399 test: cover application foundation envelope prompt pack`
- `9341dc527 feat: add application foundation envelope toolbar step`
- `86ca4d222 feat: label application foundation envelope tree stage`
- `9936228b2 feat: prioritize application foundation envelope UI recovery`
- `a4e51c7be feat: sync application foundation envelope stage nodes`
- `da7e68977 feat: add application foundation envelope panel shell`
- `d43b49531 feat: integrate application foundation envelope artifact view`
- `a16b496a4 test: align application foundation envelope workflow fixtures`
- `ef8a9f747 test: verify application foundation envelope stage shell`
- `614d1c897 docs(release): prepare application foundation envelope stage shell notes`
- `5922cdf85 docs(plans): tighten planning closeout governance`
- `1604ef73c docs(plans): record application foundation envelope planning baseline`
- `0b1b7f9ea docs(session): record application foundation envelope planning scope`
- `9a6ab9557 build(release): assemble application foundation envelope stage shell release`
- `TBD - this commit docs(session): record application foundation envelope stage shell release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/SolidWorks-WorkFlow/README.md`
4. `doc/SolidWorks-WorkFlow/Docs_Index.md`
5. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
6. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
7. `doc/TODO/todo-plan.md`
8. `doc/TODO/Archive/todo-plan-up-to-phase1-application-foundation-envelope-stage-shell-release-1.1.888-2026-04-05.md`
9. `doc/Sessions/Session042.md` (THIS REPORT)
10. `doc/SolidWorks-WorkFlow/Plans/Application_Foundation_Envelope_Architecture.md`
11. `doc/SolidWorks-WorkFlow/Plans/Implementation_Foundation_Architecture.md`
12. `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`

> Then review the release artifact `codeai-hub-1.1.888.vsix` and decide whether the next approved scope should continue the deferred `Application Foundation Envelope` waves or switch to another planning document.

## Plans for next session
- Validate release `1.1.888` from the produced VSIX and collect review feedback.
- Keep `Application_Foundation_Envelope_Architecture.md` active only for the deferred next waves:
  - `application-envelope.flow.json`
  - visual projection and renderer
  - downstream branch-level specification steps
- Keep `Implementation_Foundation_Architecture.md` deferred until the earlier workflow contracts and branch specs are approved.
- Do not start a new execution wave until a new planning scope is explicitly approved and sliced into `doc/TODO/todo-plan.md`.
