# Session 94 — Diagram User Surface Recovery Release

**Date:** 2026-03-18 15:51 (CET)
**Branch:** main
**Version:** 1.1.741

---

# 1. Work Done in This Session

## Work summary
- Converted the diagram audit from bootstrap recovery into a new Phase 6 recovery scope focused on the actual user-facing contract: `Artifacts` must show the diagram, `Source` must show the canonical Markdown only on demand, and `Help` remains separate guidance.
- Added a diagram-stage header mode model in Project Manager so `Diagram Modules` / `Diagram Facades` now expose `Artifacts | Source | Help`, while non-diagram stages keep the legacy `Artifacts | Help` contract.
- Reworked the right-panel routing so diagram stages no longer reopen into raw `module-map.md` / `facade-map.md`; the visual diagram stays primary, and `Source` becomes an explicit secondary debug view.
- Rebuilt both diagram panels into diagram-first surfaces: the React Flow canvas is now rendered before semantic editing controls, the old `artifact -> sidecar` chrome is removed from the default UI, and editing forms are demoted into collapsible secondary sections.
- Upgraded the shared React Flow shell so users can manually reposition nodes; those layout changes persist in `*.flow.json`, while the canonical semantic truth remains `module-map.md` / `facade-map.md`.
- Synchronized the new contract in planning docs, the audit plan, `SystemArchitecture`, `README.md`, `CHANGELOG.md`, and the recovered `todo-plan`.
- Verified the touched UI surface with:
  - `node --test --import tsx src/client/project-manager/components/layout/stage-artifact-mode.test.ts src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`
  - `npm run typecheck:webview`
  - `npm run build:webview`
- Ran the full release cycle:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
  - produced `codeai-hub-1.1.741.vsix`
- Final release note: `build-release.sh` again reported `jscpd` duplication at `4.2%` over the `3%` threshold, but the script treated it as advisory and the VSIX build completed successfully.

## Git commits
- `5cc54c10 docs(plan): scope diagram user surface recovery`
- `9ea0b6a3 feat(ui): add diagram source mode toggle`
- `10fe98a5 fix(ui): keep diagrams primary and source secondary`
- `033bcd0c feat(diagram-modules): prioritize visual surface`
- `9b7db88c feat(diagram-facades): prioritize visual surface`
- `562b3edf docs(workflow): define diagram user surface contract`
- `583a7424 docs(release): prep diagram user surface recovery release`
- `e9ae8b3b chore(release): build diagram user surface recovery release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_Audit_TODO_Plan.md`
5. `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramWorkflow_UserSurface_Architecture.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Session094.md` (THIS REPORT)

> Далее: открыть PM в реальном UI и проверить `v1.1.741` именно по user-surface contract, а не только по технической корректности артефактов.

## Plans for next session
- Проверить в живом PM, что `Artifacts` по умолчанию открывает диаграмму и для `Diagram Modules`, и для `Diagram Facades`, даже после перехода на другой шаг и возврата назад.
- Проверить, что `Source` показывает canonical `.md`, а `*.flow.json` нигде не появляется в пользовательской правой панели.
- Проверить, что ручное перемещение нод действительно сохраняется после reopen/resume.
- Если диаграммы всё ещё визуально перегружены даже после manual layout path, следующий scope должен идти уже в projection/readability redesign: compact node cards, inspector-driven details, selective edge density control.
