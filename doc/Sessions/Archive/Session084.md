# Session 084 — Diagram DSL Foundation Release

**Date:** 2026-03-16 17:28 (CET)
**Branch:** main
**Version:** 1.1.731

---

# 1. Work Done in This Session

## Work summary
- Закрыта вся `Phase 1 — DSL foundation and artifact migration` из `doc/TODO/todo-plan.md`.
- Реализован foundation слой Markdown DSL для workflow шагов `Diagram Modules` и `Diagram Facades`: strict parser, deterministic serializer, revision helper, baseline diff и generated change summary.
- Runtime переведён на canonical artifacts `module-map.md` / `facade-map.md` + `*.flow.json` + `*.agent-baseline.md`; legacy Mermaid `.mmd` удалён из активного workflow/runtime path.
- Добавлены agent facade stubs и asset packs для diagram steps; prompt/template ownership перенесён в `packages/agents/diagram-modules-agent/assets/` и `packages/agents/diagram-facades-agent/assets/`.
- Обновлены SSOT-документы `WorkflowSteps_Overview.md`, `Workflow_CLI.md`, `SystemArchitecture.md`, а release-facing docs (`README.md`, `CHANGELOG.md`) синхронизированы под релиз `1.1.731`.
- Во время release cycle найден и исправлен хвост в `scripts/generate-bundled-templates.js`: release generator всё ещё требовал удалённые Mermaid source files.
- Выполнен release build:
  - tarball’ы `1.1.731` собраны и доступны в `~/.codeai-hub/releases/` и `doc/tmp/releases/`;
  - VSIX собран: `codeai-hub-1.1.731.vsix`;
  - `./scripts/build-release.sh --use-current-version` завершился успешно.

## Manual verification checklist for Phase 1 release
- Создать или сгенерировать `.codeai-hub/<workspaceSlug>/diagram_modules/module-map.md` и убедиться, что шаг `Diagram Modules` переходит в `DONE`.
- Зафиксировать `.codeai-hub/<workspaceSlug>/diagram_modules/module-map.agent-baseline.md`, затем повторно запустить agent flow и проверить, что runtime добавляет `Change Summary`.
- Убедиться, что изменение `module-map.md` переводит `Diagram Facades` в `OUTDATED`.
- Проверить, что `.codeai-hub/<workspaceSlug>/diagram_modules/module-map.flow.json` и `.codeai-hub/<workspaceSlug>/diagram_facades/facade-map.flow.json` не влияют на semantic gating.
- Проверить, что `.codeai-hub/<workspaceSlug>/diagram_facades/facade-map.md` проходит strict validation и сохраняется без Mermaid fallback.

## Git commits
- `ae49756a feat(core): add module map dsl parser foundation`
- `094d4133 feat(core): add facade map parser validation rules`
- `3a567d25 feat(core): add diagram dsl serializer and revision`
- `3a7f1f98 feat(core): add module map baseline diff service`
- `20c7a858 feat(core): add facade map change summaries`
- `f6a2f221 feat(agents): add diagram agent facades`
- `e7724aed feat(runtime): assemble diagram prompt packs with change summary`
- `56159d1c refactor(workflow): migrate diagram artifact paths to markdown dsl`
- `5808a2c5 feat(agents): add module diagram asset pack part 1`
- `a1374150 refactor(agents): replace module mermaid assets with agent pack`
- `66f6e95e feat(agents): add facade diagram asset pack part 1`
- `84255881 refactor(agents): replace facade mermaid assets with agent pack`
- `820c6dad refactor(runtime): point diagram template registry to agent asset packs`
- `0da009dc docs(workflow): sync diagram dsl artifact contract`
- `900c5116 docs(release): prep diagram dsl foundation release`
- `33309be2 fix(release): align bundled template generator with diagram dsl assets`
- `263df6eb chore(release): build diagram dsl foundation release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session084.md` (THIS REPORT)
7. `doc/SolidWorks-WorkFlow/Plans/DiagramSteps_InteractiveDSL_Architecture.md`

## Plans for next session
- Начать `Phase 2 — visual shell with React Flow and ELK`.
- Stream 1: реализовать `domainModelToReactFlow()` adapter для `module-map.md`, затем расширить его под `facade-map.md`.
- Stream 2: подключить `@xyflow/react` и `elkjs`, создать `DiagramEditorFacade` и `DiagramLayoutFacade`.
- Stream 3: перевести панели `Diagram Modules` / `Diagram Facades` с Mermaid-text view на visual shell с `*.flow.json`.
