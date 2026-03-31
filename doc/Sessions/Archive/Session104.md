# Session 104 — Inventory-Only Diagram Cleanup Release

**Date:** 2026-03-19 19:54 (CET)
**Branch:** main
**Version:** 1.1.752

---

# 1. Work Done in This Session

## Work summary
- Довёл `Phase 16` до релизного состояния: `Diagram Modules` теперь inventory-only на всём активном пути runtime/PM/docs, без `module-map.md` как workspace artifact, gating dependency или visible template.
- Перевёл downstream contract `Diagram Facades` на `module-inventory.md`: start/gating, prompt assets, merge-rules, help-copy и navigation SSOT больше не опираются на raw module map file.
- Убрал последние legacy-хвосты из PM surface: `Diagram Modules` loader читает только `module-inventory.md`, `Fix with agent` и help-copy не рекламируют старый `module-map.md`, а visual diagram остаётся derived runtime projection поверх `module-map.flow.json`.
- Синхронизировал живые архитектурные документы: `SystemArchitecture.md`, `Workflow_CLI.md`, `WorkflowSteps_Overview.md`, `ProjectManager_WorkflowNavigation_SSOT.md`, `VirtualSimulation_Step.md`, `FacadeClassDiagram_DesignAndMaintenance.md`.
- Удалил неиспользуемый legacy `module-map-*` asset pack из `packages/agents/diagram-modules-agent/assets/`, чтобы inventory-first pack остался единственным активным contract source.
- Во время релизной верификации нашёл и закрыл compile-tail в core: `http-api-router.ts` больше не содержит stale type reference на `parseModuleMapDsl`.
- Синхронизировал `README.md`, `CHANGELOG.md` и release SSOT под `v1.1.752`.
- Собрал unified artifacts через `./scripts/build-all.sh` и затем успешно создал `codeai-hub-1.1.752.vsix` через `./scripts/build-release.sh --use-current-version`.

## Verification
- `node --test --import tsx packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`
- `node --test --import tsx packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts`
- `node --test --import tsx src/client/project-manager/services/workflow-step-start-service.gating.test.ts`
- `npm run typecheck:webview`
- `npm run build --workspace @codeai-hub/core`
- `npm run build:webview`
- `npm run build:project-manager`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
- Release artifact created: `codeai-hub-1.1.752.vsix`

## Git commits
- `7089e5b3 docs(session): record v1.1.751 manual validation`
- `46f436d7 docs(plan): scope inventory-only diagram cleanup`
- `a8961374 refactor(templates): drop legacy module map sync`
- `0d8e4a6d refactor(diagram-modules): remove module map prompt tail`
- `49184ef3 refactor(pm): remove module map references from diagram modules`
- `4fda5662 refactor(pm): align inventory-only gating messaging`
- `63b0f83a refactor(workflow): gate diagrams on module inventory`
- `25358a47 refactor(workflow): remove module map workspace artifact`
- `e6e15451 refactor(diagram-facades): point prompt to module inventory`
- `d1cb1d8a refactor(diagram-facades): align prompt merge rules with inventory`
- `36313637 docs(plan): record inventory-only cleanup progress`
- `c1bbbb93 refactor(pm): remove module map fallback from modules loader`
- `801d811b refactor(diagrams): remove raw module map copy tails`
- `c6cb708c docs(architecture): sync inventory-only workflow ssot`
- `02fe4911 docs(contracts): sync downstream inventory references`
- `a6ed3919 refactor(diagram-modules): drop legacy module map prompt assets`
- `37424b33 refactor(diagram-modules): drop legacy module map appendix assets`
- `5ed05f0d docs(plan): record inventory-only cleanup streams`
- `d31a3b19 docs(release): prep inventory-only diagram cleanup release`
- `56160cfd fix(core): remove stale module map parser type reference`
- `ebf9c72d chore(release): prepare inventory-only diagram cleanup build`
- `781bdf77 chore(release): build inventory-only diagram cleanup release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session104.md` (THIS REPORT)

> Далее: открыть `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramWorkflow_UserSurface_Architecture.md` и решить, архивируется ли закрытый `Phase 16` или на его базе открывается следующий diagram follow-up scope.

## Plans for next session
- Провести ручную проверку `v1.1.752` в живом PM и подтвердить, что inventory-only contract не имеет новых регрессий.
- После ручного подтверждения закрыть bookkeeping-хвост в `todo-plan.md` и при необходимости запушить `main`.
- Обсудить следующий diagram UI scope: читаемость связей, визуальный вес storage/runtime модулей, место `CEF Launcher`, положение external/provider узлов и manual alignment tools.
