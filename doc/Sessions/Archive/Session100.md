# Session 100 — Visible Layout Profile Effect Release

**Date:** 2026-03-19 09:46 (CET)
**Branch:** main
**Version:** 1.1.747

---

# 1. Work Done in This Session

## Work summary
- После manual verification `v1.1.746` подтверждено, что profile switch у `Diagram Modules` всё ещё не менял видимую диаграмму, хотя ELK уже считал разные координаты для `Vertical`, `Horizontal`, `Compact` и `Fill space`.
- Корневая причина локализована в visual shell: `Diagram Modules` рендерил module nodes через сломанную cluster-parent projection (`parentId` / `extent="parent"`) без полноценного custom-node contract, из-за чего React Flow визуально маскировал реальные layout changes.
- `Diagram Modules` projection исправлен: clustered modules больше не опираются на fake parent nesting, а diagram canvas получил явные node renderers для `cluster`, `module` и `facade`, чтобы profile switch менял именно текущий canvas.
- Обновлены `todo-plan`, `SystemArchitecture`, `README.md`, `CHANGELOG.md`; собран локальный релиз `codeai-hub-1.1.747.vsix`.

## Verification
- `node --test --import tsx src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.test.ts`
- `node --test --import tsx src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build:project-manager`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## Git commits
- `bdbc516d fix(diagram-modules): restore visible layout profile effect`
- `9cffa2c4 docs(release): prep visible layout profile effect release`
- `80f64f4e chore(release): build visible layout profile effect release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session100.md` (THIS REPORT)

> Далее: если manual verification подтвердит, что `v1.1.747` действительно делает profile switch видимым на canvas, следующий stream должен уже заниматься качеством самих layout profiles для `Diagram Modules`, а не bootstrap/persistence/render wiring.

## Plans for next session
- Проверить `v1.1.747` в реальном Project Manager: `Vertical` / `Horizontal` / `Compact` / `Fill space` должны менять сам canvas без reopen.
- Подтвердить, что выбранный profile по-прежнему переживает reopen/restart и не ломает launcher-safe toolbar contract.
- После подтверждения перейти к tuning самих layout profiles для `Diagram Modules`, а затем переносить lessons learned на `Diagram Facades`.
