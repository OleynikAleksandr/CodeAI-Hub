# Session 115 — Phase 22 Prompt Guardrails And Phase 23 Diagram Layout Stabilization

**Date:** 2026-03-21 14:40 (CET)
**Branch:** main
**Version:** 1.1.755

---

# 1. Work Done in This Session

## Work summary

- Продолжен manual greenfield regression на локальном релизе `1.1.755` в mirrored workspace `CodeAI-Hub codex 5.4` после принятия стадий `Description` и `Virtual Simulation`.
- Для `Diagram Modules` был отделён semantic defect от runtime/parser поведения:
  - ранний `module-inventory.md` оставался в legacy flat DSL через `## Clusters` и `## Standalone Modules`, из-за чего runtime синтетически materialize-ил `Default Product Part`;
  - после корректирующего замечания agent пересобрал artifact уже на ownership-aware DSL `Product Part -> Cluster -> Module`.
- Проверкой accepted `module-inventory.md` подтверждено, что semantic hierarchy уже корректна: `VS Code Extension Shell`, `Standalone Project Manager` и `Local Core Runtime` выражены как реальные `Product Part`.
- Главный remaining defect после этого сместился в auto-layout и prompt surface, а не в смысловое понимание агента.
- Полностью закрыт `Phase 22 — Greenfield Runtime Prompt Scope And Help SSOT`:
  - `Virtual Simulation` и `Diagram Modules` prompts теперь жёстко ограничивают допустимые источники empty-workspace только project-local artifacts, continuity-файлами и явно указанными user files;
  - prompts больше не подталкивают agent искать “истинный контракт” в parser/runtime implementation самой кодовой базы продукта;
  - `Diagram Modules` prompt теперь явно фиксирует parser-critical invariants для `Product Part`, exact match между `Clusters:` / `Standalone Modules:` и nested blocks, и запрещает откат к flat fallback при уже известных product parts;
  - `module-inventory-field-reference.md` и `module-inventory-template.md` синхронизированы с ownership-aware DSL, содержат явное описание `Product Part` как top-level ownership layer и authoring checklist по exact-match правилам;
  - `bundled-templates.ts` регенерирован после каждого prompt/template изменения;
  - ранее выполненный UI fix закреплён отдельным commit: пока canonical artifact отсутствует, `Artifacts` surfaces для `Virtual Simulation`, `Diagram Modules` и `Diagram Facades` используют тот же help SSOT, что и вкладка `Help`.
- Полностью закрыт `Phase 23 — Diagram Modules Product Part Auto-Layout Stabilization`:
  - first-open layout больше не кладёт top-level `Product Part` друг на друга: теперь они раскладываются отдельными row/lane containers с учётом реальных child bounds;
  - standalone modules внутри `Product Part` больше не раздувают ширину container по числу карточек: они укладываются в предсказуемую wrapped band/grid внутри `Product Part`;
  - sidecar tests подтверждают, что positions nested ownership nodes и standalone band по-прежнему остаются layout-only данными;
  - external AI-provider boundary снова читается как внешний контур: `external` modules materialize-ятся вне `Product Part`, следующий row больше не наезжает на их столбец, а renderer подписывает их как `External to ...`, а не как внутренний standalone node.
- Для layout fixes прогнаны таргетные проверки:
  - `npx tsx --test` по ownership/layout regression tests и `flow-sidecar-types.test.ts`;
  - `npm run typecheck:webview`;
  - `npm run build:webview`.
- `todo-plan.md` обновлён в real-time: все micro-task `Phase 22` и `Phase 23` закрыты соответствующими commit hashes.
- Следующий шаг — чистый release-oriented цикл: session docs checkpoint commit, затем на чистом дереве `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, затем новый regression pass на свежем VSIX.

## Git commits
- `d41957d8 fix(ui): reuse stage help before artifact creation`
- `1d5198d1 docs(prompt): restrict greenfield stages to project artifacts`
- `75f6c3ee docs(prompt): clarify product part parser invariants`
- `2eb6927f docs(template): codify product part authoring checklist`
- `4c3e6702 fix(diagram-layout): separate product part containers`
- `996ad9ef fix(diagram-layout): stabilize standalone module band`
- `2e7be37f fix(diagram-layout): keep external provider outside product parts`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Archive/Session114.md`
6. `doc/Sessions/Archive/Session115.md` (THIS REPORT)

> Дополнительно открыть regression artifacts текущего mirrored workspace:
> - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/description/Final_Description.md`
> - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/virtual_simulation/virtual-simulation.md`
> - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/diagram_modules/module-inventory.md`

## Plans for next session
- Завершить release stream на чистом дереве: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать новый VSIX и release artifacts.
- После сборки прогнать следующий manual regression pass уже на новом релизе и проверить, насколько `Diagram Modules` теперь читается без ручного drag/layout.
- Если regression подтвердит улучшение first-open diagram, перевести focus на `Diagram Facades`; если нет — открыть следующий execution scope уже на оставшиеся visual/layout issues.
