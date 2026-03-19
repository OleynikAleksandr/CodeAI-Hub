# Session 99 — Layout Profile Persistence Release

**Date:** 2026-03-19 09:18 (CET)
**Branch:** main
**Version:** 1.1.746

---

# 1. Work Done in This Session

## Work summary
- После manual verification `v1.1.745` подтверждён новый broken path: profile buttons `Vertical/Horizontal/Compact/Fill space` больше не валили launcher, но не влияли на текущую диаграмму и после reopen/restart silently возвращались к `vertical`.
- Для `Diagram Modules` расширен `module-map.flow.json`: sidecar теперь хранит `layoutProfile` вместе с node positions, а parser/serializer валидирует и восстанавливает этот режим.
- Shared diagram shell переписан так, чтобы выбор profile немедленно запускал новый layout pass на текущем graph, обновлял viewport и persist'ил одновременно и позиции, и активный режим layout.
- `Diagram Modules` panel теперь получает initial profile из flow sidecar и восстанавливает его при reopen/restart, а targeted coverage проверяет both restore path и immediate-apply contract.
- Под новый corrective slice синхронизированы release docs, `SystemArchitecture`, `todo-plan`; собран локальный релиз `codeai-hub-1.1.746.vsix`.

## Verification
- `node --test --import tsx src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`
- `node --test --import tsx src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`
- `npm run typecheck:webview`
- `npm run build:webview`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## Git commits
- `1c7c28c5 feat(diagram-modules): persist layout profile in sidecar`
- `3d0dc3a4 fix(diagram-modules): apply selected layout profile immediately`
- `61df7eef test(diagram-modules): cover layout profile restore flow`
- `4a7817b2 docs(release): prep layout profile persistence release`
- `5fc65c2d chore(release): build layout profile persistence release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_Audit_TODO_Plan.md`
7. `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`
8. `doc/Sessions/Session099.md` (THIS REPORT)

> Далее: если manual verification подтвердит, что profile switch теперь реально перестраивает `Diagram Modules` и переживает reopen/restart, можно переходить от bootstrap/persistence к качеству самих ELK profile outputs.

## Plans for next session
- Проверить `v1.1.746` в реальном Project Manager: переключение `Vertical/Horizontal/Compact/Fill space` должно менять layout без reload и восстанавливаться после reopen/restart.
- Если profile persistence работает, следующий stream посвятить качеству самих `Diagram Modules` layouts: tuning spacing, hierarchy handling и наполнению canvas по площади.
- После стабилизации `Diagram Modules` перенести аналогичный persisted-profile contract на `Diagram Facades`, не копируя blindly текущие ELK assumptions.
