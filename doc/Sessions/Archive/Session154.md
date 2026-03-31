# Session 154 — Phase 58-59: Purge module-inventory naming + documentation sync

**Date:** 2026-03-24 18:30–21:10 (CET)
**Branch:** main
**Version:** 1.1.788 → 1.1.790

---

# 1. Work Done in This Session

## Context: What Was This About

Тестирование релиза 1.1.788 (Phase 57) выявило, что agent assets, bundled templates, runtime paths и prompt контент всё ещё содержат "module-inventory" naming, хотя сам `module-inventory.md` aggregate был удалён. Параллельное сравнение двух провайдеров (Codex 5.4 vs Claude) показало проблемы с гранулярностью декомпозиции и stale ссылками в prompt.

## Work summary

### Phase 58 — Purge "module-inventory" naming (v1.1.789)

**Stream 1: Rewrite agent asset content**
- Prompt: убраны все 6 stale ссылок на `module-inventory.md`, убраны "следующий шаг" references (trunk заканчивается на Diagram Modules), добавлен **Granularity Guardrail** (3–8 модулей на PP, >10 = пере-декомпозиция, ≤5 модулей = кластеры обычно не нужны), добавлено правило обновления Status → `generated`
- Field reference: переписан под табличный staged формат (убран старый flat inventory с вложенными `#### Module:` заголовками и полями Inputs/Outputs/Contract Targets/Code Targets/Origin/Status)
- Merge rules: терминология "inventory" → "staged artifacts" / "product part files"

**Stream 2: Rename agent asset files**
- `module-inventory-prompt.md` → `diagram-modules-prompt.md`
- `module-inventory-field-reference.md` → `diagram-modules-field-reference.md`
- `module-inventory-merge-rules.md` → `diagram-modules-merge-rules.md`
- `module-inventory-template.md` — удалён (заменён на `product-part-template.md` + `product-parts-index-template.md`)

**Streams 3-6: Pipeline, runtime, parser, UI**
- `generate-bundled-templates.js` + `bundled-templates.ts`: 10 → 9 templates, paths обновлены
- `template-sync-service.ts`: 4 old module-inventory paths + 6 old diagram_facades paths в `LEGACY_TEMPLATE_RELATIVE_PATHS`
- Runtime paths: `diagram-contract-prompt-assets.ts`, `idea-contract-service.ts`, test
- Parser: `module-inventory-parser.ts` → `diagram-modules-parser.ts`
- Validation: `MODULE_INVENTORY_TITLE_RE` → `DIAGRAM_MODULES_TITLE_RE`, `validateModuleInventoryMarkdown` → `validateDiagramModulesMarkdown`, `MODULE_INVENTORY_MARKDOWN` → `PRODUCT_PART_MARKDOWN`
- UI: help text + virtual-simulation test path

**Stream 7: Documentation sync + release**
- CHANGELOG.md обновлён с Phase 58 changes
- `build-all.sh` → 1.1.789, `build-release.sh` → `codeai-hub-1.1.789.vsix`

### Documentation overhaul — remove Diagram Facades and module-inventory from all active SSOT docs

7 активных документов актуализированы:
- `WorkflowSteps_Overview.md` — удалены Шаг 4 (Diagram Facades), Шаг 5, Шаг 6; добавлено полное **Дерево разработки** `[DESIGNED, NOT IMPLEMENTED]`: trunk → Product Part → Cluster (spec + facade contract) → Module (spec + facade contract + TODO Plan + Implementation)
- `SystemArchitecture.md` — добавлено описание Development Tree
- `Clusters/Project_Manager.md` — Diagram Modules теперь `Artifacts/Help` (Source mode removed)
- `Contracts/Workflow_CLI.md` — 3 шага вместо 4, staged artifacts вместо module-inventory
- `Contracts/VirtualSimulation_Step.md` — убраны Diagram Facades и module-inventory из downstream
- `Contracts/ProjectManager_WorkflowNavigation_SSOT.md` — 3 stages, убран diagram_facades, обновлена матрица
- `Contracts/FacadeClassDiagram_DesignAndMaintenance.md` — заменены ссылки на удалённый workflow step
- `Contracts/SessionUI_Behavior.md` — убран Diagram Facades из примеров

### Phase 59, Stream 1 — Dead code cleanup (v1.1.790)

- Анализ мёртвого кода: кодовая база чистая, найдены только orphaned dist-артефакты и stale parser symbols
- `parseModuleInventoryDsl` → `parseDiagramModulesDsl`
- `INVENTORY_TITLE_RE` → `DIAGRAM_MODULES_LEGACY_TITLE_RE` (в обоих парсерах)
- `build-all.sh` → 1.1.790, `build-release.sh` → `codeai-hub-1.1.790.vsix`
- Orphaned dist-артефакты (`facade-map-parser.*`, `module-inventory-parser.*`) вычищены чистым rebuild

### Provider comparison analysis (testing input)

Сравнение output'а Diagram Modules от двух провайдеров на одинаковых входных данных:
- **Codex 5.4**: 38 модулей, 9 кластеров — пере-декомпозиция
- **Claude**: 22 модуля, 3 кластера — ближе к оптимуму, но имел stale reference на Diagram Facades в Purpose
- Вердикт: Claude 7/10, Codex 6/10; обоим нужна доработка
- Результат: добавлен Granularity Guardrail в prompt (3–8 модулей на PP)

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `8ca62c77 refactor(diagram-modules): purge module-inventory references and add granularity guardrails to prompt`
- `a95769cd refactor(diagram-modules): rewrite field reference for staged product-part format`
- `8fd6ed91 refactor(diagram-modules): update merge rules terminology from inventory to staged artifacts`
- `919aed66 refactor(diagram-modules): rename agent assets from module-inventory to diagram-modules`
- `811006c0 refactor(build): update bundled template paths from module-inventory to diagram-modules`
- `bde48c52 refactor(templates): add old module-inventory paths to legacy cleanup and update tests`
- `70b4a4e9 refactor(core): update diagram prompt assembly paths to diagram-modules naming`
- `9d8d7ea2 test(core): update diagram stage test for renamed templates`
- `8564fcc7 refactor(core): rename module-inventory-parser to diagram-modules-parser`
- `16242a08 refactor(core): rename module-inventory validation symbols to diagram-modules`
- `3c0395c0 refactor(ui): update diagram-modules help text and test paths for renamed templates`
- `1e7cd9a7 docs(architecture): sync diagram-modules template naming in changelog and plan`
- `52b1532f chore(release): bump version to 1.1.789`
- `c2bc785d docs(workflow): remove Diagram Facades and module-inventory references from active SSOT documents`
- `69769140 docs(workflow): add Development Tree structure after Diagram Modules trunk`
- `12b80559 refactor(core): rename stale inventory parser symbols to diagram-modules naming`
- `2b374852 chore(release): bump version to 1.1.790`
- `741378b4 fix(test): update import to renamed parseDiagramModulesDsl`

---

# 2. Current State of the Codebase After This Session

## Naming cleanup status
- Zero references to `module-inventory` in source code (except intentional legacy cleanup paths and regression tests)
- Zero references to `diagram_facades` in source code (except intentional legacy cleanup paths and regression tests)
- All agent assets use `diagram-modules-*` naming
- Parser file: `diagram-modules-parser.ts`, export: `parseDiagramModulesDsl`
- Bundled templates: 9 (was 10 before deleting module-inventory-template)

## Workflow documentation state
- Trunk: Description → Virtual Simulation → Diagram Modules (3 steps only)
- Development Tree `[DESIGNED, NOT IMPLEMENTED]`: PP → Cluster (spec + facade) → Module (spec + facade + TODO + impl)
- All 7 active SSOT documents synchronized with current codebase
- Plans/ directory untouched (historical records)

## Agent prompt improvements
- Granularity Guardrail: 3–8 modules per Product Part
- Status update rule: agent sets `generated` after part materialization
- No stale references to module-inventory.md, "следующий шаг", or downstream aggregate

## Dead code analysis
- Source code: clean (zero dead imports, zero dead types, zero unreachable branches)
- dist/: clean after rebuild (orphaned facade-map-parser and module-inventory-parser removed)

---

# 3. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md` — master process and architecture
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md` — Phase 59 (Stream 2 reserved for UX feedback)
6. `doc/Sessions/Archive/Session154.md` (THIS REPORT)

> Далее: в зависимости от задачи открыть нужные документы из `doc/SolidWorks-WorkFlow/Clusters/`, `Modules/`, `Contracts/`.

## Plans for next session

### 1. Test release 1.1.790
- Clean `~/.codeai-hub/templates/` before install
- Install `codeai-hub-1.1.790.vsix`
- Verify legacy `module-inventory-*` and `diagram_facades/*` templates cleaned from disk
- Run Diagram Modules step — verify prompt quality, granularity guardrail, status updates

### 2. Phase 59, Stream 2: UX / graph format improvements
- User feedback from testing 1.1.789/790 on Project Manager graph rendering
- React Flow layout and format changes
- To be scoped based on user input

### 3. Known deferred issues
- Relations not parsed from product part files → revisit during branch workflow design
- `product-parts.index.md` statuses remain "planned" until agent updates them → now covered by prompt rule
