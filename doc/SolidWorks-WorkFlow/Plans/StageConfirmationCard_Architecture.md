# Stage Confirmation Card — Provider Override and Runtime Sync Architecture

**Status:** Accepted (2026-04-13, rev 2)
**Created:** 2026-04-11
**Updated:** 2026-04-13
**Owner:** Oleksandr + Codex
**Prototype:** `doc/tmp/prototypes/development-tree-sidebar.html`

---

## 1. Problem

The current trunk-stage confirmation card solves only the "start the next step" gap that appeared after the top toolbar removal:

- `Virtual Simulation` and `Diagram Modules` can be started from the sidebar when no continuity session exists;
- the card confirms that the upstream artifact is ready and then launches the step through the existing `submitQuestionnaire()` path.

However, the current implementation still has a hidden policy that is now too limited:

1. The provider is auto-resolved in the background through `resolvePreferredWorkflowProviderId()` with no explicit user control on the card.
2. The default resolver only inherits from `Description.primarySession`, which is not sufficient once the user wants to start `Diagram Modules` on a different provider than the previous step.
3. If the step is started on a different provider, the Project Manager must not leave stale runtime identity in the active session UI:
   - the lower session status bar must switch to the new provider/model surface;
   - the session header usage-limits bar must show the limits of the newly chosen provider, not the previous step provider.

This scope adds explicit provider override at step start while preserving the one-click path.

---

## 2. Goals

1. Keep the confirmation card as the explicit "start next step" surface for idle trunk stages.
2. Allow the user to choose the provider directly on the card before session creation.
3. Preserve the fast path: if the user accepts the preselected provider, `Start step` stays a single click.
4. Default to the provider used in the immediately previous workflow step.
5. Ensure that starting a step on a different provider updates:
   - the runtime session provider identity;
   - the bottom status bar model surface;
   - the usage-limits bar provider scope.

---

## 3. Non-Goals

This scope does not:

- change the `Description` questionnaire flow or its modal provider picker;
- add mid-session provider switching for already started trunk sessions;
- redefine workspace-wide provider settings or provider installation/auth UX;
- introduce the deferred lazy-session model from `DevelopmentTree_Sidebar_Visualization_Architecture.md`;
- change downstream branch workflow behavior.

---

## 4. UX Contract

### 4.1. Surface

When the user opens an idle trunk stage with no existing continuity session:

- left `Sessions` panel shows the confirmation card;
- right `Artifacts` panel keeps the existing Help/artifact behavior.

The card contains:

- step title;
- upstream artifact reference;
- helper warning that starting the step confirms the upstream artifact is ready;
- inline provider selector;
- `Start step` button;
- error text / unavailable-provider feedback if needed.

### 4.2. Provider selector shape

The selector is inline, not modal:

- a compact single-row segmented control / pill group;
- one provider is always selected when at least one connected provider exists;
- the inherited provider from the previous step is visually marked as `previous step`;
- when another provider is selected, the inherited provider chip and its `previous step` badge both become muted.

This is intentionally not a checkbox:

- the user is choosing one provider from several options;
- the control must stay visible before pressing `Start step`;
- the default path still requires no extra click.

### 4.3. Helper copy

The helper text under the artifact warning must explicitly state:

- the previous-step provider is preselected by default;
- the user may switch to any other available provider before launch;
- if the user does nothing, the step starts with the inherited provider.

### 4.4. Resume boundary

The provider selector exists only on the confirmation card path.

If the stage already has a continuity session:

- the confirmation card is not rendered;
- the existing resume/open-session behavior stays unchanged;
- this scope does not add a pre-resume provider override surface.

---

## 5. Default Provider Resolution Policy

The preselected provider must be derived from workflow continuity, not from a hardcoded "workspace default from Description only" shortcut.

### 5.1. `Virtual Simulation`

Default provider source:

- `workflowState.description.primarySession.providerId`

Meaning:

- if `Description` was done on Codex, `Virtual Simulation` starts with Codex preselected;
- if the user changes it to Claude or Gemini, the new `Virtual Simulation` session must be created on that chosen provider.

### 5.2. `Diagram Modules`

Default provider source:

- the provider of the latest `virtual_simulation` continuity segment

Meaning:

- `Diagram Modules` inherits from the actual previous trunk step, not from `Description`;
- if `Virtual Simulation` was switched to Gemini, `Diagram Modules` defaults to Gemini.

### 5.3. Fallback

If the inherited provider is unavailable or disconnected:

- fall back to the first connected provider from the current provider catalog;
- only if no runtime snapshot is available at all, fall back to the first provider descriptor.

The resolver must prefer `connected === true` providers over a blind first-item fallback.

---

## 6. Runtime Start Contract

When the user presses `Start step`:

1. The selected provider from the confirmation card becomes the authoritative `providerId`.
2. `WorkflowStepStartService.startVirtualSimulation()` / `startDiagramModules()` receives that `providerId`.
3. `DescriptionSubmitService.submitQuestionnaire()` forwards the same provider into `api.createSession(...)`.
4. Core creates the new runtime session for that provider through the existing `session:create` path.
5. `StageSessionIntent` and the post-start PM routing path must carry the same chosen provider.

No hidden provider re-resolution is allowed after the user has explicitly changed the card selection.

---

## 7. Status Bar and Model Identity Contract

Changing the provider on the confirmation card is not complete unless the active session UI reflects the new runtime identity.

### 7.1. Lower status bar

The lower session status bar must switch to the newly chosen provider/model surface for the new step session.

Required behavior:

- after the new session is created and becomes active, the status panel must no longer show the previous step provider/model summary;
- the newly created snapshot must be seeded from the chosen provider session record;
- later runtime corrections still come from the normal `session:model:update` path.

### 7.2. Runtime authority

The actual effective model remains Core-owned:

- PM may seed the surface from the created session snapshot;
- Core still confirms the effective runtime identity via `session:model:update`;
- `useRuntimeModelSync()` remains the authority for final runtime label correction.

Acceptance rule:

- the user must see the new provider context immediately on the new step session;
- once Core emits runtime model identity, the bottom panel must converge to the actual applied model for that provider.

---

## 8. Usage Limits Contract

If the user starts the next step on a different provider, the header bar must show that provider family's usage limits.

### 8.1. Ready-only refresh remains unchanged

`SessionIdBar` keeps its existing invariant:

- no refresh while `binding.status !== "ready"`;
- refresh uses the real runtime `sessionId`, `providerId`, and bound `providerSessionId`.

### 8.2. Provider switch outcome

For the newly started step session:

- once binding becomes `ready`, the usage-limits refresh must run against the chosen provider;
- the bar must not reuse or visually preserve the previous step provider limits;
- the provider-global scope (`claude:global`, `codex:global`, `gemini:global`) must naturally switch with the new provider family.

### 8.3. No fake persistence

This scope must not reintroduce any persistent usage-limits cache or placeholder reuse.

Expected user-visible behavior:

- before binding is ready: pending/unavailable state is acceptable;
- after binding is ready: limits shown belong to the chosen provider.

---

## 9. Implementation Surfaces

Primary surfaces expected to change:

- `src/client/project-manager/components/shared/stage-confirmation-card.tsx`
- `src/client/project-manager/services/workflow-provider-resolver.ts`
- `src/client/project-manager/services/workflow-step-start-service.ts`

Likely read/verification surfaces:

- `src/client/project-manager/components/layout/main-area-panel-content.tsx`
- `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`
- `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`
- `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`
- `src/client/ui/src/session/session-id-bar.tsx`
- `src/client/project-manager/services/provider-snapshot.ts`

Localization surfaces:

- `assets/localization/source/en/ui_helper_text.json`
- `assets/localization/source/en/ui_labels.json`
- `assets/localization/source/en/messages_for_the_user.json`

Tests expected in scope:

- provider default resolver / inheritance tests;
- confirmation-card interaction tests;
- start-service tests for explicit provider forwarding;
- regression coverage that runtime model surface and usage-limits refresh follow the chosen provider.

---

## 10. Acceptance Criteria

The scope is complete only if all points below are true:

1. `Virtual Simulation` and `Diagram Modules` confirmation cards show an inline provider selector.
2. The selector defaults to the provider used in the immediately previous trunk step.
3. The user can press `Start step` without touching the selector and get current behavior.
4. If the user chooses another provider, the created session actually uses that provider.
5. The confirmation-card helper text explicitly explains the default-inherit behavior.
6. The bottom session status bar switches away from the previous provider/model surface for the new step session.
7. The final runtime model label still converges through `session:model:update`.
8. The usage-limits bar refreshes for the chosen provider once binding becomes ready.
9. No stale usage-limits rows from the previous provider remain visible after the new provider session is active.
10. Resume paths for already existing stage sessions remain unchanged.

---

## 11. Related Documents

- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionIdUsageBar.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
- `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md`
