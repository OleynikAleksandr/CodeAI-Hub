# Session 103 — Inventory-First Regression Repair

**Date:** 2026-03-19 15:40 (CET)
**Branch:** main
**Version:** 1.1.751

---

# 1. Work Done in This Session

## Work summary
- Синхронизировал release docs под `v1.1.751` и собрал regression-fix release: unified version поднята до `1.1.751`, VSIX успешно создан как `codeai-hub-1.1.751.vsix`.
- Пользователь вручную проверил `v1.1.751`: агент теперь создаёт `module-inventory.md`, sidecar `module-map.flow.json`, а `Diagram Modules` рендерит визуальную карту без регрессии стартового inventory-first flow.
- `Phase 15` доведена до конца: inventory-first prompt repair, shared repair-flow, automatic `module-map.md` materialization и release verification закрыты в `todo-plan.md`.
- Открыл `Phase 15` под regression-repair для `Diagram Modules`, чтобы исправить разъехавшийся inventory-first runtime contract уже после релиза `v1.1.750`.
- Починил visible templates / root prompt resolution для `diagram_modules`: synced home templates снова содержат `module-inventory-*`, а core читает root prompt/template из `~/.codeai-hub/templates/...` прежде, чем fallback-иться в package assets.
- Исправил PM prompt-pack: `Diagram Modules` теперь стартует в `module-inventory.md`, явно видит `Final_Description.md` и `virtual-simulation.md`, и получает три фазы `read -> discuss inventory -> derive module map`.
- Починил `Fix with agent`: shared repair flow открывает dialog session нужного stage и досылает туда parse/validation ошибку как follow-up repair prompt.
- Добавил automatic materialization: когда runtime сохраняет `module-inventory.md`, core сразу выводит и записывает derived `module-map.md`, чтобы downstream gating и `Diagram Facades` не зависели от ручного дублирования canonical map.
- Синхронизировал `todo-plan.md` и `SystemArchitecture.md` под regression-fix contract и закрыл два stream-а `Phase 15`.
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
- Зарегистрировал `module-inventory.md` как отдельный workflow artifact path для `diagram_modules`, не ломая `module-map.md` и его sidecars.
- Добавил слот `diagram.modules.inventory` и простую validation rule для `module-inventory.md` в artifact upsert router.
- Расширил `WORKFLOW_STAGE_FILES` / path contract так, чтобы `resolveWorkflowArtifactPaths(...)` принимал `module-inventory.md` как canonical diagram artifact.
- Синхронизировал `todo-plan.md`, чтобы item 5 был закрыт и hash `c1b0fb5d` оказался записан в плане.
- Уточнил help/pending copy для `Diagram Modules`, чтобы пользователю было явно видно inventory-first flow: сначала согласуется `module-inventory.md`, затем строится производная визуальная карта.
- Добавил `module-inventory-parser.ts` и перевёл `use-diagram-loader.ts` на inventory-first materialization path: `module-map.md` теперь строится из inventory и подаётся в React Flow projection.
- Обновил test coverage для `diagram-editor-facade.tsx`, чтобы проверить inventory-first loader path и runtime parsing `module-inventory.md`.
- Синхронизировал `todo-plan.md` под inventory-derived module map projection и зафиксировал hash `628d69e2`.
- Синхронизировал `README.md`, `CHANGELOG.md` и `SystemArchitecture.md` под inventory-derived `Diagram Modules` flow и подготовил release docs к `v1.1.750`.
- Собрал релиз `v1.1.750` через `build-all.sh` и `build-release.sh --use-current-version`; `codeai-hub-1.1.750.vsix` создан успешно.

## Verification
- Пользовательский smoke-test `v1.1.751` в живом PM подтвердил, что `Diagram Modules` создаёт `module-inventory.md` и `module-map.flow.json`, а диаграмма рендерится в `Artifacts`.
- `npm run build:webview` прошёл успешно перед релизом.
- `npm run build:project-manager` прошёл успешно перед релизом.
- `./scripts/build-all.sh` успешно собрал unified artifacts и поднял версию до `1.1.751`.
- `./scripts/build-release.sh --use-current-version` успешно создал `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.751.vsix`.
- `node --test --import tsx src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts` прошёл успешно после PM prompt-pack repair.
- `npm run typecheck:webview` прошёл успешно после repair-flow изменений в PM shared components.
- `node --test --import tsx packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts` прошёл успешно и подтвердил, что `artifact-upsert` пишет `module-inventory.md` и derived `module-map.md`.
- `npm run build --workspace @codeai-hub/core` прошёл успешно после automatic materialization changes в `http-api-router.ts`.
- Commit hooks прошли на всех микро-коммитах этой сессии: `test`, `check-architecture`, `check:tsprune`, `jscpd`, `check:links`.
- Таргетный контрактный тест `node --test --import tsx packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts` прошёл успешно.
- Smoke-check через `node --import tsx --input-type=module` подтвердил, что `resolveWorkflowArtifactPaths(...)` принимает `diagram_modules/module-inventory.md`.
- Smoke-check импорта `packages/core/src/remote-bridge/handlers/http-api-router.ts` прошёл успешно.
- `npm run typecheck:webview` прошёл успешно после inventory-loader changes.
- `node --test --import tsx src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx` прошёл успешно после inventory-first runtime changes.
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
- `c1b0fb5d feat(diagram-modules): register module inventory artifact`
- `fddced4d docs(plan): record module inventory artifact routing`
- `28f131c5 docs(pm): explain module inventory flow`
- `d572d69b docs(plan): record inventory-first help flow`
- `628d69e2 refactor(diagram-modules): derive module map from inventory`
- `f20eb845 docs(plan): record inventory-derived module map projection`
- `43132504 docs(release): prep module inventory diagram release`
- `af6b5585 docs(plan): record module inventory diagram release`
- `71de7e5f docs(plan): start module inventory release build`
- `7c346ad0 chore(release): build module inventory diagram release`
- `e873ddeb docs(plan): start diagram modules regression repair`
- `6973c732 fix(templates): sync diagram modules inventory templates`
- `8d412a62 fix(templates): prefer synced root diagram contracts`
- `f6248cd7 fix(diagram-modules): repair inventory-first prompt pack`
- `2d53cedf docs(plan): record inventory-first prompt pack repair`
- `23916bed fix(pm): forward artifact validation errors to agent`
- `0740fd1f fix(diagram-modules): materialize module map from inventory upload`
- `ba8b9ed8 docs(plan): record repair flow and derived artifact fixes`
- `d68266cd docs(release): prep diagram modules regression fix release`
- `aece7a29 chore(release): build diagram modules regression fix release`

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
> Далее: открыть `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/TODO/todo-plan.md` и этот отчёт, затем решить, архивируем ли закрытый `Phase 15` и открываем ли новый planning doc под следующий diagram follow-up.

## Plans for next session
- Разобрать quality gaps первого inventory-derived diagram draft: рендер простых связей, перегруженность storage/runtime-модулей и визуальное/семантическое положение `selected-ai-provider`.
- Решить, нужен ли возврат `CEF Launcher` как явного модуля верхнего уровня или его исключение должно быть закреплено как канонический контракт для `Diagram Modules`.
- После согласования нового scope вынести его сначала в planning doc, затем открыть новый `todo-plan.md` и только после этого идти в код.
