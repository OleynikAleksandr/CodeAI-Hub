# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/Regression_Prompt_Surface_Refinements_Architecture.md`, `doc/Sessions/Session117.md`, `doc/Sessions/Session118.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 25 — Regression Prompt Surface Refinements (owner: Oleksandr, updated: 2026-03-22)

### Stream: Planning baseline
1. [DONE] Заархивировать завершённый `todo-plan` после релиза `1.1.757`, создать planning-doc для prompt/help refinement scope и открыть новый execution plan под regression-driven улучшения `Description` и downstream prompt surface (scope: `doc/TODO/Archive/todo-plan-up-to-phase24-2026-03-22.md`, `doc/SolidWorks-WorkFlow/Plans/Regression_Prompt_Surface_Refinements_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): start regression prompt refinement scope`).
2. [TODO] Git Commit: `docs(plan): start regression prompt refinement scope` (hash: TBD)

### Stream: Description artifact semantics
1. [TODO] Переформулировать контракт `Description`, чтобы агент обязан был пересобирать артефакт как цельный согласованный документ, но не обязан физически делать полную замену файла, если можно сохранить валидные пользовательские правки patch-based; одновременно добавить явную поддержку composite / multi-surface archetype для гибридных продуктов (scope: `packages/agents/description-agent/assets/description-collector-prompt.md`, `src/client/project-manager/components/description/description-step-help.tsx`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): refine description artifact semantics`).
2. [TODO] Git Commit: `docs(prompt): refine description artifact semantics` (hash: TBD)
3. [TODO] Усилить DoD `Description`, чтобы `Final_Description.md` явно требовал 2–4 пользовательски понятных сценария как отдельный блок, а не только narrative summary; синхронно проверить template/help contract tests (scope: `packages/agents/description-agent/assets/description-collector-prompt.md`, `packages/core/src/templates/template-sync-service.test.ts`, `src/client/project-manager/components/description/description-step-help.test.ts`; expected commit: `docs(prompt): require explicit description scenarios`).
4. [TODO] Git Commit: `docs(prompt): require explicit description scenarios` (hash: TBD)

### Stream: Stage context scoping
1. [TODO] Уточнить stage prompts так, чтобы semantic source of truth всегда был ограничен канонической цепочкой артефактов текущего запроса, а continuity/runtime metadata использовались только для сохранения подтверждённого пользователем контекста, но не как источник архитектурной интерпретации (scope: `packages/core/src/templates/source/virtual-simulation-prompt.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `packages/agents/diagram-facades-agent/assets/facade-map-prompt.md`; expected commit: `docs(prompt): tighten stage context scoping`).
2. [TODO] Git Commit: `docs(prompt): tighten stage context scoping` (hash: TBD)

### Stream: Release build after Phase 25
1. [TODO] На чистом дереве прогнать таргетные prompt/help/template проверки, затем выполнить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`; после успеха обновить `doc/Sessions/`, `todo-plan.md` и зафиксировать новый локальный релиз для повторного regression pass (scope: `packages/core/src/templates/template-sync-service.test.ts`, `doc/Sessions/Session118.md`, `doc/Sessions/Session119.md`; expected commit: `chore(release): build prompt refinement package`).
2. [TODO] Git Commit: `chore(release): build prompt refinement package` (hash: TBD)

## Notes
- Archived previous completed rollout plan: `doc/TODO/Archive/todo-plan-up-to-phase24-2026-03-22.md`
- Active planning doc for this scope:
  - `doc/SolidWorks-WorkFlow/Plans/Regression_Prompt_Surface_Refinements_Architecture.md`
- Current regression log:
  - `doc/Sessions/Session118.md`
- Current validated release baseline before this scope:
  - `codeai-hub-1.1.757.vsix`
  - universal `Description` questionnaire/help baseline already shipped in `1.1.757`
  - downstream `Diagram Facades` prompt/help sync already shipped in `1.1.757`
