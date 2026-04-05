# Session 046 — Workflow new-step rollout guardrails SSOT

**Date:** 2026-04-05 13:05 (CEST)
**Branch:** main
**Version:** 1.1.891

---

# 1. Work Done in This Session

## Work summary
- Created a new system-level SSOT document `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md` to formalize how any new workflow step must be rolled out end-to-end.
- Turned the concrete `Application Foundation Envelope` rollout failures into reusable system guardrails: full reference-step cloning, mandatory localization ownership, canonical artifact/continuity/workflow-state folder structure, PM parity, continuity path rules, cold-start persistence, and release acceptance.
- Updated `doc/SolidWorks-WorkFlow/Docs_Index.md` so the new guardrails document is discoverable as a canonical System document.
- Updated `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` so the new-step rollout protocol is part of `Start here` and the global invariants list.
- Kept the active `doc/TODO/todo-plan.md` placeholder untouched because this was a narrow docs-only SSOT closeout, not a new implementation wave.

## Git commits
(IMPORTANT: This list is required so the next session can restore context via `git show`)
- `b73fc77cf docs(system): add workflow step rollout guardrails`
- `TBD - this commit docs(session): record workflow step rollout guardrails ssot`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/Docs_Index.md`
2. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
3. `doc/SolidWorks-WorkFlow/System/Workflow_NewStep_Rollout_Guardrails.md`
4. `doc/Sessions/Session046.md` (THIS REPORT)
5. `doc/TODO/todo-plan.md`

## Plans for next session
- Use `Workflow_NewStep_Rollout_Guardrails.md` as mandatory preflight reading before any future workflow-step rollout.
- If a future scope adds another workflow stage, start by producing the reference-step surface matrix required by the new guardrails doc before touching code.
- Keep `Application_Foundation_Envelope_Architecture.md` and `Implementation_Foundation_Architecture.md` deferred until the next approved implementation wave.
