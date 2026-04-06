# Diagram Workflow Audit TODO Plan

**Status:** DRAFT - active audit intake
**Date:** 2026-03-18
**Scope:** Recovery and re-validation of the interactive diagram workflow (`diagram_modules`, `diagram_facades`)

**Related documents:**
- `doc/TODO/todo-plan.md`
- `doc/TODO/Archive/todo-plan-phase5-interactive-diagram-workflow-stabilization-2026-03-16.md`
- `doc/Sessions/Archive/Session086.md`
- `doc/Sessions/Archive/Session090.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`

---

## 1. Problem Statement

The previous execution plan closed a large set of diagram-workflow streams as `DONE`, but the user-visible workflow is not reliable in practice.

The most important contradiction at intake is explicit:
- the recovered legacy `doc/TODO/todo-plan.md` says the toolbar start path for `Diagram Modules` / `Diagram Facades` was fixed and verified;
- later session reports still record that fresh toolbar bootstrap for these stages does not start reliably in some workspaces.

Because of this mismatch, the legacy execution plan cannot be treated as current truth. It must be audited stream by stream.

---

## 2. Why This Document Exists

- `doc/BugRegistry.md` is not the right primary tool for this scope.
- This is not a single isolated defect; it is a cross-cutting recovery and truth-audit effort.
- We need one place to track:
  - which earlier `DONE` claims are actually confirmed by code and runtime behavior;
  - which claims are disproved or only partially true;
  - which parts of the main execution plan must be rewritten.

This document is the audit and recovery planning surface for that work.

---

## 3. Working Rules

1. `doc/TODO/todo-plan.md` is temporarily preserved as the recovered legacy baseline, not as trusted execution truth.
2. No stream is accepted as implemented only because the legacy plan marks it `DONE`.
3. Every audit stream must produce four outputs:
   - code evidence;
   - runtime or manual verification result;
   - verdict: `confirmed`, `partially confirmed`, or `disproved`;
   - rewrite instruction for `doc/TODO/todo-plan.md`.
4. The main `doc/TODO/todo-plan.md` is rewritten only from evidence recorded in this audit plan.
5. If a legacy stream is disproved, its corresponding `DONE` items in the main plan must be removed, reopened, or replaced with a narrower truth-based stream.
6. Recovery fixes are allowed only after the failing path is reproduced and localized.
7. Regression coverage for this scope must prefer behavioral tests over source-shape checks such as `source.includes(...)`.

---

## 4. Known Intake Contradictions

### C1. Toolbar bootstrap truth mismatch

- The recovered legacy plan claims that the toolbar start path for steps 3 and 4 was fixed and verified.
- `Session086.md` states that fresh bootstrap for `Diagram Modules` / `Diagram Facades` still did not start after the corrective release.
- `Session090.md` still carries the same issue as a deferred follow-up blocker.

### C2. Test confidence mismatch

- Existing tests around the start flow are too shallow to prove end-to-end behavior.
- Some tests only verify that specific strings exist in source files or that a callback happens before another await point.
- That level of coverage is not sufficient to declare the full start path working.

### C3. Scope closure mismatch

- Later diagram workflow phases built visual shell, semantic editing, and hardening on top of a workflow that may still fail at the fresh bootstrap entry point.
- This means some later streams may be valid only for already-existing artifacts or already-opened sessions, not for the promised end-to-end workflow.

---

## 5. Audit Goal

Produce an evidence-based rewrite of the diagram workflow execution plan by answering these questions:

1. Which parts of the old plan are truly implemented in code?
2. Which parts only work in limited conditions?
3. Which `DONE` streams are false and must be reopened?
4. What is the real root cause of the fresh toolbar bootstrap failure?
5. What is the smallest safe repair plan that restores truthful end-to-end behavior?

---

## 6. Initial Audit Streams

### Stream A - Audit the claimed `DONE` statuses around diagram stage start

Objective:
- compare the legacy plan, session reports, and current code to identify false or overstated closure claims.

Expected outputs:
- list of disproved or suspicious `DONE` items;
- dependency map of downstream streams that relied on those claims.

### Stream B - Reproduce fresh `Diagram Modules` bootstrap

Objective:
- verify the full path from toolbar click to first provider-bound message for `diagram_modules`.

Focus path:
- PM tool selection;
- workflow start service;
- session creation event;
- session binding event;
- prompt-pack send.

Expected outputs:
- exact failing step;
- reproduction conditions;
- logs or observable event mismatch.

### Stream C - Reproduce fresh `Diagram Facades` bootstrap

Objective:
- verify the same full path for `diagram_facades`, including upstream dependency on `module-map.md`.

Expected outputs:
- exact failing step;
- reproduction conditions;
- logs or observable event mismatch.

### Stream D - Audit PM/Core event correlation and matching rules

Objective:
- inspect payload correlation across PM and Core for:
  - `workspacePath`;
  - `initiativeSlug`;
  - `stage`;
  - session binding timing.

Expected outputs:
- confirmed or disproved hypotheses about event filtering, race windows, or incorrect assumptions in the PM start path.

### Stream E - Recovery fixes and regression coverage

Objective:
- implement only the fixes justified by Streams B-D and add regression coverage that proves the repaired path behaviorally.

Expected outputs:
- targeted fixes;
- behavioral tests for the repaired start path;
- updated architectural notes when the boundary changes.

### Stream F - Rewrite the main execution plan

Objective:
- replace the legacy fiction in `doc/TODO/todo-plan.md` with a truth-based recovery execution plan.

Expected outputs:
- reopened or removed false `DONE` items;
- newly scoped repair streams;
- clean separation between confirmed features and still-broken paths.

---

## 7. Main TODO Sync Policy

- The main `doc/TODO/todo-plan.md` stays available as the recovered historical baseline while the audit is in progress.
- This audit document is the active planning surface for the recovery investigation.
- After each audited stream, the corresponding section in the main `doc/TODO/todo-plan.md` must be updated to reflect reality.
- The main plan must not continue to accumulate false `DONE` markers.
- Once the audit stabilizes, the main plan should be rewritten into a normal execution plan again.

---

## 8. Initial Evidence Map

### Legacy plan sections that are immediately suspicious

- Phase 2 / post-release contract alignment:
  - claims that steps 3-4 toolbar start again creates agent sessions;
  - claims manual verification of toolbar start.
- Phase 2 / corrective release:
  - claims release verification around Diagram Modules / Diagram Facades startup.
- Any later stream that assumes the fresh bootstrap path was already trustworthy.

### Current code areas that need first-pass audit

- `src/client/project-manager/components/layout/use-workflow-tool-select.ts`
- `src/client/project-manager/services/workflow-step-start-service.ts`
- `src/client/project-manager/services/idea-collector-submit-service.ts`
- `src/client/project-manager/services/session-binding-waiter.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts`

---

## 9. Intake Queue

Items to be added live as the user defines the next checks:

- `[DONE]` First audit target: toolbar start for `Diagram Modules` from the top sidebar after `virtual-simulation.md` already exists.
- `[DONE]` First reproduction workspace/setup: workspace with an existing `.codeai-hub/<workspace>/virtual_simulation/virtual-simulation.md`, then fresh click on `Diagram Modules`.
- `[DONE]` First stream rewrite in `doc/TODO/todo-plan.md`: Phase 2 / post-release contract alignment and contract-alignment verification streams.

---

## 10. First Audit Finding - Diagram Modules bootstrap gate mismatch

### Scope

- `Description -> Virtual Simulation`
- `Virtual Simulation -> Diagram Modules`
- `Diagram Modules -> Diagram Facades`

### Evidence

- `Description -> Virtual Simulation` starts from the existence of `Final_Description.md`.
- `Diagram Modules` and `Diagram Facades` were implemented with an extra PM-side requirement in `WorkflowStepStartService`: upstream stage status had to equal `completed`.
- Current workflow-state readiness does not provide a reliable product contract around that stricter requirement for these diagram stages.
- The result was a mismatch:
  - workflow gating already allowed the next stage when the upstream artifact existed;
  - the final PM start service still rejected the launch because `virtual_simulation` / `diagram_modules` status was not exactly `completed`.

### Root cause

The PM start service for diagram stages drifted away from the working `Description -> Virtual Simulation` rule.

Instead of using the same product-facing readiness rule:
- "required upstream artifact exists"

it used a stricter internal rule:
- "upstream artifact exists and upstream workflow status is exactly `completed`"

That stricter rule blocked fresh toolbar bootstrap even though the user-facing workflow contract should have allowed the start.

### Implemented correction

- `WorkflowStepStartService` was updated so `startDiagramModules()` and `startDiagramFacades()` rely on the same artifact-readiness principle as the working upstream transition.
- A behavioral regression test now proves:
  - `Diagram Modules` starts when `virtual-simulation.md` is available even if the stage status is not `completed`;
  - `Diagram Facades` starts when `module-map.md` is available even if the stage status is not `completed`;
  - blocked gating still rejects the start.

### Verdict

- Legacy claim "diagram toolbar start was fixed and verified" = `disproved`
- Root cause for the first broken start path = `confirmed`

### Rewrite instruction for the main TODO

- Reopen any old stream that claimed the toolbar bootstrap was already repaired or manually verified.
- Preserve the historical git hashes, but do not keep those streams marked as truthful `DONE`.

---

## 11. Recovery Release Candidate - v1.1.738

### Built outputs

- Recovery commits landed:
  - `48bef62d fix(workflow): restore diagram stage bootstrap gating`
  - `ca7a9b10 docs(workflow): align diagram stage artifact gating`
  - `1abecd46 docs(release): prep diagram bootstrap recovery release`
  - `110bd337 chore(release): build diagram bootstrap recovery release`
- `./scripts/build-all.sh` completed successfully and raised the unified version to `1.1.738`.
- `./scripts/build-release.sh --use-current-version` completed successfully and produced `codeai-hub-1.1.738.vsix`.
- Tarball artifacts are present in both `~/.codeai-hub/releases/` and `doc/tmp/releases/`.

### Release notes for the audit

- This release only closes the first confirmed PM-side bootstrap blocker: the diagram-stage toolbar start no longer depends on `upstream stage === completed` when the required upstream artifact already exists.
- The deeper audit remains open for the downstream path:
  - `session:create`
  - `session:created`
  - `session:binding`
  - `sendSessionMessage`

### Manual verification priority

1. Install `codeai-hub-1.1.738.vsix` and fully restart VS Code / Project Manager.
2. Open a workspace where `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md` already exists.
3. Click `Diagram Modules` in the top toolbar and verify that a fresh session now starts.
4. If the start still fails, record the exact failing boundary:
   - no visible reaction at click time;
   - session is created but not bound;
   - session is bound but the initial message/prompt does not send.
5. Where possible, repeat the same check for `Diagram Facades` from an existing `module-map.md`.

### Build caveat

- During `build-release.sh`, the repository-wide `jscpd` duplication check reported `4.17%` duplicated lines over the configured `3%` threshold.
- The script treated that result as advisory, continued packaging, restored development dependencies, and finished successfully.

---

## 12. Second Audit Finding - Workflow state cold-start hydration gap

### Scope

- `workflow-state` HTTP read path
- PM toolbar start pre-check for `Diagram Modules`
- PM toolbar start pre-check for `Diagram Facades`

### Evidence

- In the affected workspaces, the canonical upstream artifact `virtual-simulation.md` already existed on disk.
- The toolbar click still produced no visible action because PM returned early on `workflowState.gating.blocked.diagram_modules === true`.
- Core computed that `blocked` value from in-memory `WorkflowState` artifacts only.
- Existing artifacts created before the current Core/watchers lifetime were not hydrated back into `WorkflowState` during `/workflow-state` reads.

### Root cause

The first bootstrap fix removed the wrong PM-side `stage === completed` requirement, but the source-of-truth feeding PM remained incomplete.

`WorkflowState` after cold start depended on watcher-memory instead of canonical disk state:
- if `virtual-simulation.md` or `module-map.md` already existed before the current watcher lifetime;
- and no fresh filesystem event replayed them into memory;
- PM still received `blocked=true` and aborted before `session:create`.

### Implemented correction

- Core `WorkflowStateService` now hydrates canonical artifacts from disk during `/workflow-state` reads before validation and gating are computed.
- The hydration keeps artifact paths aligned with watcher-state conventions (`stage/file-name`) so existing validators continue to resolve files correctly.
- Added behavioral regression coverage for:
  - cold-start workspace with existing valid `virtual-simulation.md` / `module-map.md`;
  - cold-start workspace with invalid `virtual-simulation.md`, which must stay blocked.

### Verdict

- Legacy claim "artifact exists, therefore toolbar start was already verified" = `disproved`
- Second real root cause for the broken toolbar bootstrap = `confirmed`

### Rewrite instruction for the main TODO

- Any remaining recovery stream around diagram bootstrap must explicitly include cold-start `workflow-state` hydration, not only PM click handlers or session binding logic.
- Manual verification for `Diagram Modules` / `Diagram Facades` must be re-run after this fix in workspaces where the upstream artifacts already existed before PM launch.

---

## 13. Third Audit Finding - Upstream invalid/outdated state over-blocked manual step start

### Scope

- Core workflow gating for `diagram_modules`
- Core workflow gating for `diagram_facades`
- Product contract for manual toolbar transitions

### Evidence

- After the cold-start hydration fix, `workflow-state` for `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub claude` still returned `gating.blocked.diagram_modules === true` even though `virtual-simulation.md` existed on disk.
- The remaining blocker was not artifact absence anymore; it was `virtual_simulation.status === invalid`.
- This contradicted the agreed product rule for toolbar transitions: like `Description -> Virtual Simulation`, the next step should unlock from the presence of the previous canonical artifact, while the user decides whether that artifact is good enough.

### Root cause

`resolveWorkflowBlockedStages()` treated `invalid` / `outdated` upstream statuses as hard blockers for downstream manual start instead of diagnostic state only.

That made the Diagram workflow stricter than the `Description -> Virtual Simulation` transition and stricter than the intended user-driven progression model.

### Implemented correction

- Downstream gating for `diagram_modules` now checks only the presence of `virtual-simulation.md`.
- Downstream gating for `diagram_facades` now checks only the presence of `module-map.md`.
- Upstream `invalid` / `outdated` statuses remain visible in the stage snapshot, but they no longer prevent manual launch of the next stage.
- Regression coverage now asserts that an invalid `virtual-simulation.md` still leaves `diagram_modules` launchable when the artifact exists.

### Verdict

- Legacy assumption "invalid upstream stage must block next manual diagram step" = `disproved`
- Third real root cause for "toolbar click does nothing" = `confirmed`

### Rewrite instruction for the main TODO

- Remaining recovery work must treat stage validation state and stage-start gating as separate concerns.
- Manual verification must now be repeated specifically in:
  - workspaces where upstream artifact already existed before PM launch;
  - workspaces where upstream artifact exists but stage status is `invalid` or `outdated`.

---

## 14. Fourth Audit Finding - Diagram contract omitted strict field reference / merge rules

### Scope

- Diagram Modules workflow contract assembly
- Diagram Facades workflow contract assembly
- PM visual-shell parseability of freshly generated diagram artifacts

### Evidence

- In `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub claude`, the toolbar click finally launched a real `Diagram Modules` session, but the resulting `module-map.md` failed to render in PM.
- The generated artifact contained `Kind: application` for module `project-manager`, while the DSL parser accepts only `service`, `library`, `adapter`, `gateway`, `store`, `external`.
- Agent asset packs already contained the missing constraints in `module-map-field-reference.md` / `facade-map-field-reference.md` and merge guidance in `*-merge-rules.md`.
- Runtime contract delivery passed only base `prompt` and `template`, so the agent never received those strict enum/merge references in the final prompt surface.

### Root cause

The bootstrap path was fixed, but the diagram-generation contract remained under-specified.

For diagram stages, the runtime exposed agent-owned reference assets on disk yet did not inject them into the prompt payload sent to the collector session. That left the model free to invent enum values such as `application`, which made the generated artifact unreadable by PM's Markdown DSL parser.

### Implemented correction

- Diagram Modules / Diagram Facades contracts now append field-reference and merge-rules asset contents directly into the emitted `prompt`.
- The appendix is marked as mandatory so enum fields and merge behavior are treated as strict contract, not optional guidance.
- Added regression coverage proving both diagram-stage contracts embed their field-reference and merge-rules text into the final prompt.

### Verdict

- Legacy assumption "diagram asset pack is shipped, therefore the agent receives the full contract" = `disproved`
- Fourth real root cause for "session started but artifact did not render" = `confirmed`

### Rewrite instruction for the main TODO

- Remaining audit on `Diagram Modules` must verify both halves of success:
  - session launch reaches provider binding;
  - the first generated artifact is parseable by PM visual shell without manual repair.

---

## 15. Fifth Audit Finding - Diagram user surface still exposes runtime source as primary artifact

### Scope

- PM right-panel header contract for `Diagram Modules` / `Diagram Facades`
- Diagram stage reopen/resume behavior
- Diagram-stage visual readability and default information density

### Evidence

- Manual verification on `v1.1.740` confirmed that both diagram stages now start correctly and produce parseable artifacts.
- The first visible surface for diagram stages is still cluttered with large semantic editing forms before the user reaches the diagram itself.
- After navigating away and back, PM can still show raw `module-map.md` / `facade-map.md` in the right panel instead of reopening the diagram as the primary surface.
- The current diagram chrome also exposes internal runtime details such as artifact-to-sidecar path strings, which are useful for implementation diagnostics but not for the user-facing workflow.

### Root cause

The bootstrap recovery fixed execution and parseability, but PM still uses the old artifact-centric contract:

- the layout header only distinguishes `Artifacts` vs `Help`;
- internal stage sync keeps selecting canonical `.md` artifacts as if they were the primary user surface;
- diagram stage panels place the canvas below editing forms instead of treating the diagram as the main deliverable of the step.

### Approved correction plan

- Introduce a diagram-stage-only `Source` mode in the right-panel header.
- Redefine `Artifacts` for `Diagram Modules` / `Diagram Facades` as the visual diagram, not raw Markdown.
- Keep canonical `.md` files available only in the secondary `Source` view.
- Remove `*.flow.json` and other runtime-only details from the default visible UI.
- Promote the canvas to the first visible object and demote semantic editing controls into secondary sections.

### Verdict

- Legacy assumption "diagram stage artifact panel may safely show raw Markdown because the source file is the artifact" = `disproved`
- Fifth real recovery target after bootstrap + parseability = `confirmed`

### Rewrite instruction for the main TODO

- The next execution phase must focus on diagram user-surface recovery, not on bootstrap gating.
- Release verification must explicitly confirm the `Artifacts / Source / Help` contract and diagram-first reopen behavior.

---

## 16. Sixth Audit Finding - Repository duplication debt now threatens diagram delivery

### Scope

- repository-wide `jscpd` gate used by release packaging
- diagram-related symmetry introduced by separate Modules / Facades surfaces
- mismatch between pre-commit architecture duplication scan and release duplication scan

### Evidence

- `build-release.sh` still completes, but repeatedly reports repository-wide duplication above the enforced `3%` threshold.
- The latest repository-wide scan on `src` reports `1824` duplicated lines out of `43414`, which is `4.2%`.
- The largest live clone clusters now include:
  - provider settings dialogs
  - diagram stage panels
  - diagram relation editors
- `scripts/check-architecture.sh` scans a narrower subset than `npm run check:dup`, so local architecture feedback is greener than the release-stage duplication feedback.

### Root cause

The diagram recovery work restored correct behavior, but it kept a set of intentionally parallel UI surfaces as separate implementations.

That was acceptable while the product path was broken and rapid iteration mattered more than structural reuse. It is no longer acceptable now that release delivery keeps carrying an advisory duplication warning and every follow-up diagram improvement compounds the same debt.

### Approved correction plan

- Create a dedicated duplication-debt reduction phase instead of treating this as incidental cleanup.
- Collapse the highest-value clones first:
  - shared provider option dialog shell
  - shared diagram stage panel scaffold
  - shared relation editor scaffold
  - shared PM/UI helper extraction if needed
- Re-measure repository-wide duplication after each extraction.
- Only after duplication drops below `3%`, align `check-architecture.sh` with the repository-wide duplication gate used by release packaging.

### Verdict

- Legacy assumption "release duplication debt can stay advisory while diagram work continues" = `disproved`
- Sixth real recovery target after bootstrap, parseability, and user surface = `confirmed`

### Rewrite instruction for the main TODO

- A new execution phase must explicitly own repository-wide duplication debt reduction.
- Diagram feature work should not continue piling onto the same clone clusters before this phase is closed.

---

## 17. Seventh Audit Finding - Auto-layout persists but does not refresh the live canvas

### Scope

- `Diagram Modules` visual shell
- shared React Flow facade/shell used by both diagram stages
- auto-layout action after first load and after explicit button click

### Evidence

- Manual verification on `v1.1.742` showed that `Auto-layout` did not visibly rearrange the current canvas in-place.
- The same action did persist different node positions, because after leaving the stage and reopening it, the diagram appeared in a different arrangement.
- Code inspection confirmed that the shared diagram shell recalculated node positions and persisted them to `*.flow.json`, but no live viewport refresh (`fitView`) happened after the new layout was applied.
- The current React Flow surface only received `fitView` on mount, so the user could see the updated layout only after a remount/reopen.

### Root cause

The shared diagram editor treated auto-layout as a data update only:

- nodes were recalculated;
- sidecar positions were persisted;
- but the active canvas viewport was left untouched.

Because of that, the user-visible graph stayed on the stale camera framing until the stage was remounted and React Flow ran its initial `fitView` again.

### Implemented correction

- The shared diagram shell now emits a dedicated viewport refresh signal whenever auto-layout finishes.
- The shared React Flow facade listens for that signal and performs an in-place `fitView` after the new node positions are ready.
- This applies both to:
  - the first automatic layout on load when no meaningful positions exist yet;
  - explicit clicks on the `Auto-layout` button.

### Verdict

- User expectation "auto-layout must visibly rearrange the graph immediately in the current screen" = `confirmed`
- Previous shared editor behavior for auto-layout visibility = `disproved`

### Rewrite instruction for the main TODO

- Add a dedicated follow-up stream for real-time auto-layout refresh and live viewport refit.
- Future diagram readability work must assume that auto-layout feedback is immediate, not reopen-dependent.

---

## 18. Eighth Audit Finding - Diagram Modules needs layout profiles, not one hard-coded ELK mode

### Scope

- `Diagram Modules` visual auto-layout
- right-panel vertical occupancy for the diagram stage
- next-step readability work before `Diagram Facades`

### Evidence

- `v1.1.743` fixed live auto-layout refresh, but manual verification showed that the current ELK profile can still place many module nodes into one long horizontal band.
- The current layout contract is effectively one hard-coded mode:
  - layered algorithm
  - fixed direction
  - fixed spacing
  - no user-visible profile selection
- The artifact panel still leaves a large unused area below the collapsed `Edit modules` / `Edit relations` sections instead of letting the diagram stage occupy the full available height.

### Root cause

The shared diagram editor currently exposes auto-layout as a single action, but not as a controllable layout strategy.

That is too weak even for the simpler `Diagram Modules` graph:
- different graph shapes need different layout profiles;
- a single layered configuration cannot serve vertical readability, horizontal tracing, compact grouping, and area-filling spread at the same time;
- the stage container itself is not yet modeled as a full-height artifact surface.

### Approved correction plan

- Improve `Diagram Modules` first, before tuning `Diagram Facades`.
- Add several explicit ELK-backed layout profiles next to the existing `Auto-layout` action.
- Include one profile that spreads nodes across the available canvas area rather than optimizing for compactness only.
- Stretch the diagram stage vertically so the canvas and collapsed editing sections occupy the whole right artifact panel.

### Verdict

- Current assumption "one hard-coded ELK auto-layout mode is enough for Diagram Modules readability" = `disproved`
- Next real recovery target after realtime refresh = `confirmed`

### Rewrite instruction for the main TODO

- Open a new execution phase focused on `Diagram Modules` layout profiles and full-height diagram surface.
- Keep `Diagram Facades` out of the first implementation slice until the simpler module graph is behaving acceptably.

---

## 19. Ninth Audit Finding - Native HTML select crashes the macOS launcher for Diagram Modules layout profiles

### Scope

- `Diagram Modules` layout profile control in the Project Manager launcher
- macOS CEF/AppKit runtime path for profile selection
- release hardening after `v1.1.744`

### Evidence

- Manual verification of `v1.1.744` showed that attempting to open the layout-profile chooser and pick `Vertical` collapses the Project Manager window at the OS level.
- The crash is not accompanied by a JavaScript error in `chrome_debug.log`.
- The macOS diagnostic report `CodeAIHubLauncher-2026-03-19-085247.ips` records `NSInvalidArgumentException` with `-[NSApplication ...]: unrecognized selector sent to instance`, inside the Chromium Embedded Framework main-thread path.

### Root cause

The newly added layout-profile chooser is implemented as a native HTML `<select>`.

That control is safe in the browser/webview path, but in the macOS launcher it enters a native CEF/AppKit popup flow that is currently unstable and crashes outside the React/TypeScript layer. The failure therefore happens before any ELK profile logic can run.

### Approved correction plan

- Remove the native `<select>` from the diagram toolbar.
- Replace it with a launcher-safe custom control rendered entirely by the app surface itself.
- Keep the product contract unchanged: users still choose between `Vertical`, `Horizontal`, `Compact`, and `Fill space`, but selection must no longer require the native popup path.
- Add targeted regression coverage that proves the toolbar no longer renders a `<select>` for layout profiles.

### Verdict

- Current assumption "the profile selector can safely be a native HTML select in the launcher" = `disproved`
- Root cause location "launcher-safe control chrome, not ELK" = `confirmed`

### Rewrite instruction for the main TODO

- Open a new corrective execution phase dedicated to replacing the native profile selector with a launcher-safe control.
- Keep layout algorithms unchanged in the first fix; restore launcher stability first, then continue readability tuning.
