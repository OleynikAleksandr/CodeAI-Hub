# Session 103 — Inventory-First Prompt Contract

**Date:** 2026-03-19 14:13 (CET)
**Branch:** main
**Version:** 1.1.749

---

# 1. Work Done in This Session

## Work summary
- Вернул `diagram_modules` и `diagram_facades` в visible templates contract: их prompt/template-файлы теперь синкаются через bundled manifest в `~/.codeai-hub/templates/...`.
- Перевёл diagram prompt appendix resolution на templates-first path: synced visible templates читаются первыми, а package assets остаются только fallback.
- Добавил тестовое покрытие, которое проверяет, что visible diagram templates действительно устанавливаются в home templates после sync.
- Синхронизировал `SystemArchitecture.md` и `todo-plan.md` с новым контрактом, чтобы SSOT и план не расходились с runtime.
- Зафиксировал live contract для `Diagram Modules`: в каноническом порядке шагов появился `module-inventory.md` как первый semantic output, `Source` на PM теперь привязан к inventory-first flow, а `module-map.md` остался derived artifact.
- Привёл `todo-plan.md` к актуальному состоянию после закрытия live-contract стрима.
- Синхронизировал PM UX contract и docs index под inventory-first flow: `Project_Manager.md` теперь явно связывает `Source` с `module-inventory.md`, а `Docs_Index.md` указывает на inventory-first module flow.
- Довёл bookkeeping в `todo-plan.md` до `DONE` для live contracts и PM UX streams.
- Добавил inventory-first assets для `Diagram Modules`: появился `module-inventory.md` template contract с кластерами, standalone modules и simple relations, готовый для следующего runtime prompt step.
- Синхронизировал `todo-plan.md` после закрытия inventory-assets стрима.
- Добавил `module-inventory-merge-rules.md` и перевёл `diagram_modules` contract с `module-map` root prompt/template на inventory-first prompt/template.
- Перенастроил prompt appendix resolution для `Diagram Modules` на `module-inventory-field-reference.md` и `module-inventory-merge-rules.md`.
- Обновил `todo-plan.md`, чтобы он отражал новый dual-input inventory prompt contract и актуальные target files в core.
- Сохранил закрытие микрошагa отдельным docs commit, чтобы hash `36cef261` был зафиксирован в плане.

## Verification
- Commit hooks прошли на всех микро-коммитах этой сессии: `test`, `check-architecture`, `check:tsprune`, `jscpd`, `check:links`.
- Таргетный контрактный тест `node --test --import tsx packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts` прошёл успешно.
- Таргетные build-команды для этого шага не запускались, потому что изменения затронули только templates/runtime contract и документацию.

## Git commits
- `7a709c16 refactor(templates): sync diagram workflow templates`
- `1b6dfb3a refactor(templates): sync diagram workflow templates source`
- `00e2bb76 docs(plan): record visible templates source sync`
- `4e18a234 refactor(templates): prefer synced diagram prompt appendices`
- `87b2c1b5 docs(plan): record synced appendix resolution`
- `d4d5486a docs(architecture): add module inventory bridge contract`
- `a144d25d docs(plan): record module inventory bridge contract`
- `7d7203f1 docs(pm): sync module inventory source contract`
- `10315222 docs(plan): record module inventory source contract`
- `6b8a3281 feat(diagram-modules): add module inventory templates`
- `5356bebb docs(plan): record module inventory templates`
- `36cef261 refactor(diagram-modules): add dual-input inventory prompt contract`
- `f05776c9 docs(plan): record dual-input inventory prompt contract`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session103.md` (THIS REPORT)

> Далее: открыть `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md` и продолжить `Phase 14` с `module-inventory.md`.

## Plans for next session
- Ввести `module-inventory.md` в workflow artifact contract и watcher/runtime routing, не ломая существующие `module-map.md` и `module-map.flow.json`.
- Продолжить `Phase 14` по следующему стриму: PM UX `Source = module-inventory.md`, `Artifacts = module-map.md`, без поломки `Diagram Facades`.
- Оставаться на inventory-first контракте: `Final_Description.md` + `virtual-simulation.md` → `module-inventory.md` → `module-map.md`.
