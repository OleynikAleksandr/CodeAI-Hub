# Session 93 — Strict Diagram Contract Delivery

**Date:** 2026-03-18 12:09 (CET)
**Branch:** main
**Version:** 1.1.740

---

# 1. Work Done in This Session

## Work summary
- Investigated the next real failure after toolbar bootstrap recovery: in `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub claude` the `Diagram Modules` session launched, but the first generated `module-map.md` did not render in PM because the artifact contained an invalid DSL enum value `Kind: application`.
- Confirmed the parser/UI failure path and traced the systemic root cause to runtime contract delivery: `Diagram Modules` / `Diagram Facades` asset packs already shipped strict field-reference and merge-rules files, but the emitted collector prompt still contained only the base prompt plus template, so the provider could invent unsupported enum values.
- Fixed the contract pipeline by appending diagram field-reference and merge-rules assets directly into the final prompt payload, marking them as mandatory guidance, and added regression coverage for both diagram-stage contract builders.
- Updated `README.md`, `CHANGELOG.md`, `SystemArchitecture`, the audit plan, and the recovered `todo-plan` to record that successful diagram-stage recovery now requires both session launch and immediate PM-parseable first artifacts.
- Ran targeted verification (`node --test --import tsx packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`, `npm run build --workspace=@codeai-hub/core`) and the full release cycle, producing `codeai-hub-1.1.740.vsix`.

## Git commits
- `52408187 fix(workflow): embed strict diagram contract references`
- `b7cc7420 chore(release): build strict diagram contract release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Archive/Session093.md` (THIS REPORT)

> Далее: открыть `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_Audit_TODO_Plan.md`, затем проверить живой PM run для `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub claude` и `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4` именно на предмет parseable первого `module-map.md` после свежего запуска `Diagram Modules`.

## Plans for next session
- Проверить локальный релиз `v1.1.740` в реальном PM: `Diagram Modules` должен не только стартовать, но и сразу открыть parseable `module-map.md` без `Fix with agent`.
- Если артефакт всё ещё не рендерится, продолжить audit уже в prompt/output contract: сравнить фактический generated Markdown с injected field-reference / merge-rules и зафиксировать следующее узкое место.
- По результату живой проверки обновить `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_Audit_TODO_Plan.md` и переписать соответствующий пункт в `doc/TODO/todo-plan.md` только из подтверждённой фактической картины.
