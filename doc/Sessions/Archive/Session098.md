# Session 98 — Launcher-Safe Layout Profile Release

**Date:** 2026-03-19 08:59 (CET)
**Branch:** main
**Version:** 1.1.745

---

# 1. Work Done in This Session

## Work summary
- Подтверждена и локализована причина нового падения `v1.1.744`: crash происходил не в ELK и не в React Flow, а в native HTML `<select>` popup path внутри macOS CEF/AppKit. Это подтверждено diagnostic report `CodeAIHubLauncher-2026-03-19-085247.ips` с `NSInvalidArgumentException` / `unrecognized selector` на стороне `NSApplication`.
- Профильный selector для `Diagram Modules` переведён с native `<select>` на launcher-safe custom button group в toolbar; продуктовый контракт не менялся: остаются `Vertical`, `Horizontal`, `Compact`, `Fill space` рядом с `Auto-layout`.
- Добавлена targeted regression coverage, которая теперь явно запрещает native `<select>` в diagram toolbar и проверяет новый button-group contract.
- Planning-доки, audit и execution-plan синхронизированы под новый corrective stream `Phase 10 — launcher-safe diagram layout profile control`.
- Собран локальный релиз `codeai-hub-1.1.745.vsix`; release-time проверки снова подтвердили, что repo-wide duplication gate остаётся ниже порога (`2.84%`).

## Verification
- `node --test --import tsx src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`
- `npm run typecheck:webview`
- `npm run build:webview`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## Git commits
- `ba94fabe docs(plan): scope launcher-safe layout profile control`
- `a062884b fix(diagram-modules): replace layout profile select`
- `aba5a1c2 docs(release): prep launcher-safe layout profile release`
- `57c943b0 chore(release): build launcher-safe layout profile release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_Audit_TODO_Plan.md`
7. `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramWorkflow_UserSurface_Architecture.md`
8. `doc/Sessions/Session098.md` (THIS REPORT)

> Далее: если manual verification подтвердит, что launcher-safe button-group больше не валит Project Manager, можно вернуться к качеству самих layout-профилей и затем переносить lessons learned на `Diagram Facades`.

## Plans for next session
- Ручная проверка `v1.1.745` в реальном Project Manager: выбор любого profile button не должен падать, `Auto-layout` должен продолжать работать, а `Diagram Modules` должен сохранять full-height surface behavior.
- Если launcher стабилен, следующий corrective stream должен снова перейти к качеству раскладки `Diagram Modules`: сравнить поведение `Vertical`, `Horizontal`, `Compact`, `Fill space` и определить, какой profile требует отдельной tuning-итерации.
- После стабилизации `Diagram Modules` перенести launcher-safe profile UX и lessons learned на `Diagram Facades`, не копируя blindly текущие spacing/algorithm assumptions.
