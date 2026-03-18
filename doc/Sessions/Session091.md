# Session 091 — Diagram Bootstrap Recovery Release

**Date:** 2026-03-18 11:23 (CET)
**Branch:** main
**Version:** 1.1.738

---

# 1. Work Done in This Session

## Work summary
- Восстановлен контекст после `Session090`: возвращён archived execution plan в `doc/TODO/todo-plan.md`, создан audit planning surface `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_Audit_TODO_Plan.md` и зафиксировано, что historical `DONE` по toolbar bootstrap для `Diagram Modules` / `Diagram Facades` нельзя считать truth.
- Найдена и исправлена первая подтверждённая причина сломанного fresh bootstrap path: `WorkflowStepStartService` требовал `virtual_simulation` / `diagram_modules` в точном статусе `completed`, хотя продуктовый контракт перехода должен был зависеть только от наличия upstream artifact и открытого gating.
- `Diagram Modules` и `Diagram Facades` теперь стартуют по тому же artifact-readiness principle, что и рабочий переход `Description -> Virtual Simulation`; blocked-gating при этом по-прежнему режет запуск.
- Source-level gating test заменён на поведенческий regression test для `WorkflowStepStartService`, который проверяет старт обоих diagram stages при наличии upstream artifact даже без `completed` статуса.
- Синхронизированы contract/architecture docs и release-facing docs: `Workflow_CLI.md`, `WorkflowSteps_Overview.md`, `SystemArchitecture.md`, `README.md`, `CHANGELOG.md`.
- Выполнены таргетные проверки recovery scope:
  - `npx tsx --test src/client/project-manager/services/workflow-step-start-service.gating.test.ts`
  - `npm run typecheck:webview`
  - `npm run build:webview`
- Выполнен полный release cycle:
  - `./scripts/build-all.sh` поднял unified version до `1.1.738` и пересобрал provider/core/ui/launcher artifacts;
  - `./scripts/build-release.sh --use-current-version` завершился успешно;
  - VSIX собран: `codeai-hub-1.1.738.vsix`;
  - tarball artifacts присутствуют в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.
- Во время `build-release.sh` repository-wide duplication check (`jscpd`) снова превысил порог: `4.17%` duplicated lines при лимите `3%`. Скрипт трактовал это как advisory warning и продолжил packaging.

## Manual verification checklist for 1.1.738
- Установить `codeai-hub-1.1.738.vsix` и полностью перезапустить VS Code / Project Manager.
- Открыть workspace, где уже существует `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`.
- Нажать в верхнем toolbar кнопку `Diagram Modules` и проверить, что стартует новая session bootstrap sequence.
- Если старт не произошёл, зафиксировать точную границу отказа:
  - на клик вообще нет реакции;
  - session создаётся, но не происходит binding;
  - binding происходит, но не отправляется первый prompt/message.
- Если есть workspace с существующим `.codeai-hub/<workspaceSlug>/diagram_modules/module-map.md`, повторить ту же проверку для кнопки `Diagram Facades`.
- Дополнительно убедиться, что старый blocked path не сломан: при отсутствии `virtual-simulation.md` / `module-map.md` запуск соответствующего шага всё ещё должен быть отклонён.

## Git commits
- `48bef62d fix(workflow): restore diagram stage bootstrap gating`
- `ca7a9b10 docs(workflow): align diagram stage artifact gating`
- `1abecd46 docs(release): prep diagram bootstrap recovery release`
- `110bd337 chore(release): build diagram bootstrap recovery release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_Audit_TODO_Plan.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Session091.md` (THIS REPORT)

## Plans for next session
- Начать с ручной проверки `1.1.738` в реальном PM/UI, в первую очередь toolbar click `Diagram Modules` из workspace с существующим `virtual-simulation.md`.
- Если user-visible старт всё ещё сломан, не возвращаться к уже исправленному gating rule, а идти глубже по event chain: `session:create -> session:created -> session:binding -> sendSessionMessage`.
- По результатам ручной проверки продолжить переписывать legacy `doc/TODO/todo-plan.md` из audit truth и открывать следующие recovery streams только на основании подтверждённого поведения.
