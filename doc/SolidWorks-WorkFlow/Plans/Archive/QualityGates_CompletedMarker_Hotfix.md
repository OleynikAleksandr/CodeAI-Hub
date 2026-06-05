# Quality Gates Completed Marker Hotfix

**Status:** Accepted bugfix intake
**Date:** 2026-06-05
**Owner:** Codex

## User Report

After `Quality Gates Baseline` completes, the Documentation Tree marker stays red while the stage is complete and the Development Tree is already available.

## Expected Behavior

- A completed `Quality Gates Baseline` stage must render with the same completed/available marker as other completed technical trunk stages.
- The marker truth must come from Core-owned workflow state or canonical artifact availability, not from Project Manager-only inference.
- Development Tree readiness must remain unchanged.

## Scope

- Inspect the Core/Project Manager status projection for `quality_gates`.
- Fix the smallest owner boundary that causes completed Quality Gates to project as non-complete.
- Add or update a focused regression test.
- Do not run release packaging in this scope unless the user explicitly asks for a release build later.

## Context Pack

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
- `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

