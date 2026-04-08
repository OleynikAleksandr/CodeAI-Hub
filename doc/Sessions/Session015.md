# Session 015 — Diagram Modules Shared Visual Bounds Corrective Cycle

**Date:** 2026-04-08 11:10 (CEST)
**Branch:** main
**Version:** 1.1.910
**Execution Scope Status:** COMPLETED

---

# 1. Work Done in This Session

## Work summary
- Opened the fourth corrective cycle for `Diagram Modules` after confirming that the same lower-boundary overlap defect was reproducible in both first-open autolayout and manual drag.
- Reframed the fix around one shared visual-bounds contract so both layout paths derive ownership lower bounds from the deepest direct child visual bottom instead of duplicated border-box math.
- Added a shared layout-bounds helper, updated measured autolayout normalization, and replaced shell-local manual resize logic with a pure manual normalizer that reuses the same geometry contract.
- Added regression evidence for the measured path, the manual drag path, and the shell wiring; bumped the sidecar layout metric version again to invalidate pre-fix `.flow.json` geometry.
- Synced Diagram Modules SSOT and release-facing docs, built the new release baseline, and packaged the corrective VSIX `codeai-hub-1.1.910.vsix` together with fresh tarballs in `doc/tmp/releases/`.
- Closed the execution cycle by archiving the planning-doc and execution plan after the successful release build.

## Git commits
(REFERENCE ONLY: этот список сохраняется для исторической трассировки и расследования регрессий; следующая сессия не обязана читать все коммиты по умолчанию.)
- `32dca2ae7 docs(session): record measured ownership reflow closeout`
- `fa3cdaa15 docs(plan): open shared visual bounds corrective scope`
- `365b554fd fix(diagram): derive measured layout from visual bounds`
- `ba950ac6b fix(diagram): unify manual drag container bounds`
- `7a7c32fd1 test(diagram): cover unified manual layout contract`
- `112544ad2 fix(diagram): invalidate sidecars for visual bounds contract`
- `ac768f327 docs(diagram): record shared visual bounds contract`
- `9a88c39fe docs(release): prepare shared visual bounds release`
- `c78b4fb21 build(release): capture shared visual bounds version bump`
- `4e9f072a6 build(release): package shared visual bounds release`
- `46d33f8ec docs(closeout): archive shared visual bounds corrective scope`

---

# 2. Instructions for Next Session

**Base SSOT:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
**Scope Discovery Index:** `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Plans for next session
- Активный execution scope отсутствует.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT.
- Затем агент обязан согласовать с пользователем новый scope.
- После этого агент обязан открыть `doc/SolidWorks-WorkFlow/Docs_Index.md`, выбрать релевантные документы для нового scope и только потом формировать новый planning-doc.
- До появления нового planning-doc и нового `doc/TODO/todo-plan.md` навигационной опорой служит `doc/SolidWorks-WorkFlow/Docs_Index.md`.
