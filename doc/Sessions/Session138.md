# Session 138 — Retest Findings For Composite Diagram Prompt Contract

**Date:** 2026-03-23 14:13 CET
**Branch:** main
**Version:** 1.1.769

---

# 1. Work Done in This Session

## Work summary
- Во время пользовательского retest релиза `1.1.769` на шаге `Diagram Modules` подтверждено, что проблема теперь находится не в одном prompt asset, а в composite prompt contract целиком: agent prompt, PM prompt pack, runtime workflow contract, template hint и appendix/reference layer вместе оставляют агенту слишком широкий discovery-space.
- Пользовательский screenshot промежуточных сообщений показал нежелательное поведение ещё до первой полезной записи: агент ищет `compatibility inventory`, staged examples, старый `diagram_modules` baseline и formal staged template вместо немедленной materialization текущего target artifact.
- Быстрый аудит репозитория подтвердил root cause: `diagram_modules` prompt asset всё ещё содержит legacy guidance про несинхронизированные staged templates и разрешает template/continuity scouting; PM compose prompt для diagram stages показывает generic `Шаблон (absolute)`; runtime contract для `diagram_modules` всё ещё привязан к `module-inventory-template.md` как к stage-level template.
- Дополнительный аудит `Diagram Facades` показал, что semantic template там корректнее, но prompt surface унаследовал те же рискованные паттерны: continuity files и runtime templates разрешены как default discovery source, а compose prompt по-прежнему показывает generic template path.
- На основе этих findings оформлен новый planning-doc и открывается follow-up scope на strict input contract, explicit non-inputs, cleanup compose/runtime prompt assembly для `Diagram Modules` и `Diagram Facades`, regression coverage и новый release cycle.

## Verification
- `view_image '/Users/oleksandroliinyk/Desktop/Screenshot 2026-03-23 at 14.02.33.png'`
- `sed -n '1,260p' /Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`
- `sed -n '1,260p' /Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/agents/diagram-facades-agent/assets/facade-map-prompt.md`
- `sed -n '1,320p' /Users/oleksandroliinyk/VSCODE/CodeAI-Hub/src/client/project-manager/services/prompt-pack-builder.ts`
- `sed -n '1,220p' /Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/core/src/remote-bridge/handlers/idea-contract-service.ts`
- `sed -n '1,220p' /Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/core/src/remote-bridge/handlers/diagram-contract-prompt-assets.ts`
- `sed -n '1,220p' /Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`
- `git status --short --branch`

## Notes
- Это planning/findings session поверх уже собранного baseline `1.1.769`: код релиза на момент оформления этого отчёта ещё не изменён.
- Ключевой новый вывод: prompt contract надо чинить как составной runtime product, а не как отдельный markdown asset.
- Пользовательский feedback по промежуточным сообщениям агента считается частью acceptance criteria следующего follow-up: после фиксов агент не должен тратить turn на поиск legacy/staged/helper artifacts, которые runtime ему явно не передавал.

## Git commits
- `cc80a289 docs(plan): capture composite diagram prompt retest findings`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `README.md`
3. `doc/SolidWorks-WorkFlow/README.md`
4. `doc/SolidWorks-WorkFlow/Docs_Index.md`
5. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
6. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
7. `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md`
8. `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_StagedPrompt_And_Continuation_Repair_Architecture.md`
9. `doc/SolidWorks-WorkFlow/Plans/Diagram_Workflow_CompositePrompt_Contract_And_Runtime_Input_Restrictions_Architecture.md`
10. `doc/TODO/todo-plan.md`
11. `doc/Sessions/Session137.md`
12. `doc/Sessions/Session138.md` (THIS REPORT)

## First sanity check
- Подтвердить, что baseline релиза всё ещё `1.1.769`, дерево чистое и новый Phase 45 уже появился в `todo-plan.md`.
- Подтвердить, что главная проблема scope-а описана как composite prompt contract bug, а не как единичный defect одного asset-файла.
- Перед первым кодовым фиксом ещё раз проверить user-visible compose prompt для `diagram_modules` и `diagram_facades`.

## Plans for next session
- Сначала ужесточить user-facing prompt surface для `Diagram Modules`.
- Затем вычистить stage-level runtime contract assembly для diagram stages и отдельно выровнять `Diagram Facades`.
- После этого добавить regression tests, собрать новый локальный release и повторить пользовательский retest.
