# Session 021 — Localization Picker And Browser Hydration Planning Intake

**Date:** 2026-04-02 10:31 CEST
**Branch:** main
**Version:** 1.1.865

---

# 1. Work Done in This Session

## Work summary
- Restored the full release context from [Session020](../Sessions/Session020.md) and re-read the complete localization rollout through its listed commit chain plus the closing planning/session commit `5b740050 docs(session): record ui localization release`.
- Confirmed the current product gap: `General -> Localization` still uses free-form text inputs, shows the raw internal sentinel `source`, does not expose the language catalog as a picker, and browser/runtime surfaces still resolve bundled English source catalogs only.
- Created a new approved planning document for the next scope: [Localization_Language_Picker_And_Browser_Runtime_Hydration_Architecture.md](../SolidWorks-WorkFlow/Plans/Localization_Language_Picker_And_Browser_Runtime_Hydration_Architecture.md).
- Replaced the placeholder execution plan with a new implementation/release plan in [doc/TODO/todo-plan.md](../TODO/todo-plan.md).
- Did not start implementation yet. This session is planning-only.

## Current worktree state
- Local uncommitted planning changes exist:
  - [doc/SolidWorks-WorkFlow/Plans/Localization_Language_Picker_And_Browser_Runtime_Hydration_Architecture.md](../SolidWorks-WorkFlow/Plans/Localization_Language_Picker_And_Browser_Runtime_Hydration_Architecture.md) — new file
  - [doc/TODO/todo-plan.md](../TODO/todo-plan.md) — updated file
  - [doc/Sessions/Session021.md](../Sessions/Session021.md) — this report

## Git commits
- No new commit was created in this planning-only session.
- Current HEAD at review time: `5b740050 docs(session): record ui localization release`

---

# 2. Zero-Context Bootstrap For Next Session

## What is already true
- Release `1.1.865` already shipped the backend localization foundation:
  - new package `@codeai-hub/localization`
  - bundled English source catalogs
  - glossary protection and user overrides
  - bundle materialization + metadata reuse
  - dictionary-driven lookup migration for Settings / Session / part of Project Manager
- The current user-visible limitation is not theoretical. It is the active live gap:
  - Localization controls are still free-form text inputs
  - the visible default is raw `source`
  - there is no searchable language picker
  - the browser runtime still uses bundled English source catalogs until hydrated bundles are bridged in from the host

## New approved scope
- Scope name: `Localization Language Picker + Browser Runtime Hydration`
- Canonical planning document:
  - [Localization_Language_Picker_And_Browser_Runtime_Hydration_Architecture.md](../SolidWorks-WorkFlow/Plans/Localization_Language_Picker_And_Browser_Runtime_Hydration_Architecture.md)
- Core approved decisions from that plan:
  - keep `source` as an internal persisted sentinel only
  - show `English` instead of raw `source`
  - replace free-form language fields with searchable comboboxes
  - drive language choices from the engine language catalog
  - materialize and load active bundles in the host
  - provide one hydrated localization runtime to both Settings webview and Project Manager

## Current execution plan
- Active execution plan:
  - [doc/TODO/todo-plan.md](../TODO/todo-plan.md)
- Plan structure:
  1. Phase 0: planning-baseline commit
  2. Phase 1: runtime contract + host materialization
  3. Phase 2: shared browser/runtime hydration
  4. Phase 3: searchable picker UX
  5. Phase 4: docs, verification, release build

## First practical next step
- Before code changes, review the pending planning baseline and then close the missing Phase 0 commit from [doc/TODO/todo-plan.md](../TODO/todo-plan.md):
  - target commit: `docs(plan): define localization hydration scope`
- After that, implementation should start from Phase 1 / Stream `Localization Runtime Contract`.

## Recommended implementation entry files
- Localization package runtime contract:
  - [packages/localization/src/localization-contract.ts](../../packages/localization/src/localization-contract.ts)
  - [packages/localization/src/localization-facade.ts](../../packages/localization/src/localization-facade.ts)
  - [packages/localization/src/index.ts](../../packages/localization/src/index.ts)
- VS Code settings host:
  - [src/extension-module/message-handlers/settings-message-handler.ts](../../src/extension-module/message-handlers/settings-message-handler.ts)
- Project Manager / remote bridge:
  - [packages/core/src/remote-bridge/handlers/settings-request-handler.ts](../../packages/core/src/remote-bridge/handlers/settings-request-handler.ts)
  - [src/client/project-manager/api.ts](../../src/client/project-manager/api.ts)
  - [src/client/project-manager/core-stream-message-types.ts](../../src/client/project-manager/core-stream-message-types.ts)
- Shared browser localization runtime:
  - [src/client/ui/src/app-host/use-localization.ts](../../src/client/ui/src/app-host/use-localization.ts)
  - [src/client/ui/src/components/settings/use-settings-state.ts](../../src/client/ui/src/components/settings/use-settings-state.ts)
  - [src/client/ui/src/app-host/settings-only-host.tsx](../../src/client/ui/src/app-host/settings-only-host.tsx)
- Settings UI controls:
  - [src/client/ui/src/components/settings/localization-settings-card.tsx](../../src/client/ui/src/components/settings/localization-settings-card.tsx)
- Project Manager app/root:
  - [src/client/project-manager/app.tsx](../../src/client/project-manager/app.tsx)
  - [src/client/project-manager/components/settings/use-project-manager-settings.ts](../../src/client/project-manager/components/settings/use-project-manager-settings.ts)

---

# 3. Required Documents To Review Before Work

1. [README.md](../../README.md)
2. [doc/SolidWorks-WorkFlow/Docs_Index.md](../SolidWorks-WorkFlow/Docs_Index.md)
3. [doc/SolidWorks-WorkFlow/System/SystemArchitecture.md](../SolidWorks-WorkFlow/System/SystemArchitecture.md)
4. [doc/Sessions/Session020.md](../Sessions/Session020.md)
5. [doc/Sessions/Session021.md](../Sessions/Session021.md)
6. [doc/TODO/todo-plan.md](../TODO/todo-plan.md)
7. [doc/TODO/Archive/todo-plan-up-to-phase6-ui-localization-release-1.1.865-2026-04-01.md](../TODO/Archive/todo-plan-up-to-phase6-ui-localization-release-1.1.865-2026-04-01.md)
8. [doc/SolidWorks-WorkFlow/Modules/Localization.md](../SolidWorks-WorkFlow/Modules/Localization.md)
9. [doc/SolidWorks-WorkFlow/Plans/UI_Localization_And_Local_Glossary_Architecture.md](../SolidWorks-WorkFlow/Plans/UI_Localization_And_Local_Glossary_Architecture.md)
10. [doc/SolidWorks-WorkFlow/Plans/UI_Localization_Glossary_Baseline.md](../SolidWorks-WorkFlow/Plans/UI_Localization_Glossary_Baseline.md)
11. [doc/SolidWorks-WorkFlow/Plans/Localization_Language_Picker_And_Browser_Runtime_Hydration_Architecture.md](../SolidWorks-WorkFlow/Plans/Localization_Language_Picker_And_Browser_Runtime_Hydration_Architecture.md)
12. [doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md](../SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md)

---

# 4. Plans For Next Session

- Review the documents above with zero context and confirm the worktree still contains the pending planning files.
- Close the missing planning-baseline commit: `docs(plan): define localization hydration scope`.
- Start Phase 1 implementation from [doc/TODO/todo-plan.md](../TODO/todo-plan.md):
  - runtime snapshot contract in `packages/localization`
  - extension-side settings runtime materialization
  - remote-bridge payload support for Project Manager
- Keep the micro-task discipline from the new TODO plan and finish the scope only with updated docs plus a full release build.
