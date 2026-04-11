# Stage Confirmation Card — Architecture

**Status:** Accepted
**Created:** 2026-04-11
**Owner:** Oleksandr + Claude

---

## Problem

After the top stage toolbar removal (v1.1.924), trunk workflow steps (Virtual Simulation, Diagram Modules) cannot be started from the sidebar. Clicking a stage in the Documentation Tree only resumes existing sessions or shows Help/artifacts. If no session exists, the user has no way to launch the step.

## Solution

When a user clicks an idle trunk stage (VS or DM) with no existing continuity session:
- **Left panel (Sessions)** shows a **confirmation card** instead of an empty/stale session
- **Right panel (Artifacts)** shows step Help (existing behavior)

The confirmation card contains:
- Step title
- Upstream artifact reference: which artifact will be sent to the agent
- Warning: clicking Start confirms the upstream artifact is ready
- "Start step" button (disabled if gating blocks)
- Error text if gating prevents start

After clicking Start:
- PM selects workspace default provider automatically
- Creates session via `DescriptionSubmitService.submitQuestionnaire()`
- Sends instruction pack
- Left panel replaces with dialog session showing agent's first response
- Right panel switches to artifact when it appears

For resume (session already exists): behavior unchanged — sidebar click opens session + artifact directly.

## Key decisions

- **Confirmation card replaces the old toolbar's one-click start** with an explicit "I'm ready" moment
- **No lazy session model yet** (deferred from `DevelopmentTree_Sidebar_Visualization_Architecture.md` section 4.3) — this is a targeted fix using the existing `submitQuestionnaire` flow
- **Description step unchanged** — keeps its questionnaire + Help flow
- **Provider selection automatic** — uses `resolvePreferredWorkflowProviderId()` (workspace default from Description step)

## Scope

New file: `src/client/project-manager/components/shared/stage-confirmation-card.tsx`
Modified: `main-area.tsx`, `main-area-panel-content.tsx`

## Related documents

- `Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md` (section 4.3 — deferred lazy session model)
- `System/WorkflowSteps_Overview.md` (trunk step overview)
- `Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
