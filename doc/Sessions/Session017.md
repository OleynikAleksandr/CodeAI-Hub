# Session 017 — Description: ↻ Restart attempt (one-shot recovery)

**Date:** 2026-02-24 10:02 (CET)
**Branch:** main
**Version:** 1.1.663

---

# 1. Work Done in This Session

## Work summary
- Заархивирован текущий `doc/TODO/todo-plan.md` (Phase 237) и создан новый план под Phase 238: аварийный ↻ Restart attempt для one-shot Description.
- Зафиксирован контракт обсуждения: Description = job/no-resume; ↻ не перезапускает Core; restart = новая попытка с confirm + игнор late results от старых attempt’ов.

## Git commits
- TBD

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
5. `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`
6. `doc/TODO/todo-plan.md` (THIS PLAN)
7. `doc/Sessions/Session017.md` (THIS REPORT)

## Plans for next session
- Реализовать Phase 238 по плану: docs/contract → Core attemptId gating → PM ↻ рядом с `Questionary.md` → UI ↻ вместо Stop/Play (Description only) → rebuild webview.
