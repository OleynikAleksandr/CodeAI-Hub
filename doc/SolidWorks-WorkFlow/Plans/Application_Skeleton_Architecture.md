# Application Skeleton Architecture

**Status:** Accepted for execution planning.
**Created:** 2026-05-06
**Updated:** 2026-05-06
**Owner:** Oleksandr + Codex
**Scope:** новые workflow-steps между `Diagram Modules` и автоматическим Development Tree node bootstrap. `Application Skeleton` выбирает технологический стек, создает базовый skeleton приложения в workspace и фиксирует mapping будущего кода на `Product Part -> Cluster -> Module`; `Quality Gates Baseline` фиксирует обязательные build/typecheck/lint/test gates для будущего implementation flow.

---

> Follow-up refinement: `Application_Skeleton_Materialization_Prompt_Refactor.md` supersedes the earlier assumption that post-skeleton filesystem materialization should be owned by a separate downstream materialization layer. The current planning direction is: `Application Skeleton Agent` owns post-acceptance workspace skeleton materialization, and `Quality Gates Baseline Agent` owns post-acceptance gates integration.

## 1. Problem

Текущий workflow после `Diagram Modules` слишком рано запускает Development Tree automation:

1. `Diagram Modules` agent создает `product-parts.index.md` и `product-parts/<part-id>.md`.
2. Core строит `developmentTree` snapshot.
3. Core материализует neutral P/C/M folders под `.codeai-hub/<workspaceSlug>/development_tree/materialized/`.
4. Core создает draft-файлы и сразу запускает per-node agent sessions.

В этой цепочке отсутствуют два главных технических слоя:

1. **workspace application skeleton**;
2. **quality gates baseline**.

До появления per-node design sessions система еще не знает:

- язык программирования;
- framework/runtime;
- package manager/build system;
- test/lint/format baseline;
- repo shape: single app, monorepo, extension, desktop shell, backend service, web client, shared packages;
- где именно будущий production code должен лежать;
- как `Product Part`, `Cluster` и `Module` отображаются на реальную файловую систему кода.

Из-за этого текущая автоматизация создает node sessions и draft artifacts до того, как существует физическое место для будущего кода и before any industry-aligned project scaffold has been accepted.

Даже если skeleton уже создан, без quality gates future implementation agents не имеют machine-checkable definition of green. Полноценный код нельзя безопасно строить, пока не определены команды сборки, type/static checks, formatting/linting, test runner и policy around commit/release verification для выбранного стека.

## 2. Goal

Добавить два workflow-step сразу после `Diagram Modules`:

1. **Application Skeleton**.
2. **Quality Gates Baseline**.

Шаг должен:

1. Принять `Diagram Modules` ownership map как semantic input.
2. Определить или уточнить технологический стек будущего приложения.
3. Создать минимальный рабочий skeleton проекта в workspace root или в выбранной product root зоне.
4. Зафиксировать mapping `Product Part -> Cluster -> Module -> code path`.
5. Разблокировать следующий шаг `Quality Gates Baseline` после принятия skeleton пользователем.

`Quality Gates Baseline` должен:

1. Принять accepted skeleton и выбранный stack as input.
2. Зафиксировать обязательные commands for build/typecheck/lint/format/test.
3. Создать или настроить минимальные tool configs, которые нужны для этих команд.
4. Зафиксировать machine-readable gate contract для будущих Module Planning/Execution agents.
5. Разблокировать дальнейший Development Tree node bootstrap только после принятия gates пользователем.

Ключевой outcome: перед стартом Product Part / Cluster / Module design sessions в workspace уже есть технически валидный application skeleton and accepted quality gates, а future code folders can mirror the Development Tree inside the appropriate industry-standard scaffold.

## 3. Non-Goals

Этот scope не должен:

- писать feature/business implementation code;
- реализовывать Product Part / Cluster / Module спецификации;
- запускать Module Planning или Module Execution;
- переносить текущие `.codeai-hub/.../development_tree/materialized/` drafts в production code root;
- навязывать один универсальный filesystem canon для всех стеков;
- делать `Diagram Modules` ответственным за выбор framework/language.
- объединять stack/scaffold decisions and quality gate decisions в одного перегруженного агента, если это приводит к слишком большому first-turn scope.

## 4. Proposed Placement

Целевой high-level workflow:

```text
Description
 -> Virtual Simulation
 -> Diagram Modules
 -> Application Skeleton
 -> Quality Gates Baseline
 -> Product Part Specification
 -> Cluster Design
 -> Module Design
 -> Module Planning
 -> Module Execution
```

`Application Skeleton` является первым technical branch/root step после semantic trunk.

`Quality Gates Baseline` является вторым technical branch/root step. Он идет после skeleton, потому что gates depend on the selected languages, frameworks, package manager, repo shape and source roots.

`Diagram Modules` остается semantic architecture step. Он не выбирает stack и не пишет project scaffold.

## 5. Core Decision: Disable Early Node Session Automation

Текущую автоматизацию создания Development Tree node sessions нужно поставить за gate.

До завершения `Application Skeleton` и `Quality Gates Baseline` разрешено:

- читать `Diagram Modules` staged artifacts;
- показывать Development Tree как read-only/sidebar projection;
- показывать будущую P/C/M структуру пользователю;
- материализовать internal preview metadata, если это не запускает agents.

До завершения `Application Skeleton` и `Quality Gates Baseline` запрещено:

- создавать Product Part / Cluster / Module agent sessions;
- отправлять first messages node agents;
- создавать agent-owned draft artifacts как будто branch design уже начался;
- считать Development Tree готовым к design/planning/execution automation.

Gate condition:

```text
Diagram Modules aggregateReady
AND Application Skeleton accepted
AND Application Skeleton mapping exists
AND Quality Gates Baseline accepted
AND Quality Gates command contract exists
```

Только после этого Core может запускать downstream Development Tree bootstrap.

## 6. Who Creates the Skeleton

Предлагаемое решение: отдельный **Application Skeleton Agent**.

Почему не `Diagram Modules Agent`:

- `Diagram Modules Agent` отвечает за semantic decomposition.
- `Application Skeleton Agent` принимает технические решения и пишет файлы в workspace.
- Эти режимы имеют разный риск: semantic graph can be revised cheaply; skeleton writes can affect repo structure, tooling and future implementation.
- Смешивание приведет к преждевременному framework guessing внутри `Diagram Modules`.

При этом `Application Skeleton Agent` использует результат `Diagram Modules` как обязательный input, а не начинает с нуля.

## 7. Who Creates the Quality Gates

Предлагаемое решение: отдельный **Quality Gates Agent**.

Почему не `Application Skeleton Agent`:

- Skeleton agent отвечает за stack/scaffold/source mapping.
- Quality Gates agent отвечает за definition of green and executable verification contract.
- Gates нельзя определить до skeleton, потому что command set depends on actual stack and repo shape.
- Разделение снижает нагрузку на одного агента и уменьшает риск half-configured scaffold where folders exist but verification is weak or ambiguous.

Quality Gates agent writes configs only when they are necessary for the accepted gate contract. It must not start feature implementation.

## 8. Application Skeleton Inputs

Application Skeleton first prompt должен получить:

- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`;
- `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`;
- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md`;
- все generated `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/<part-id>.md`;
- явные user preferences, если пользователь уже указал stack/language/framework;
- detected workspace facts, если workspace не пустой и detection включен в scope.

Если stack неизвестен, агент обязан задать пользователю focused technology questions before writing scaffold, rather than guessing.

## 9. Application Skeleton Outputs

Шаг должен создать два класса output.

### 9.1. Workspace Skeleton

Минимальный skeleton в workspace, соответствующий выбранному стеку:

- package/build/test/lint/format config;
- source root;
- entry points;
- empty app/package/module placeholders only where justified by the chosen stack;
- README or developer note for how to run the skeleton, if appropriate.

Skeleton должен быть runnable/checkable for the chosen ecosystem.

### 9.2. Skeleton Contract

Machine-readable или строго structured Markdown contract under `.codeai-hub/<workspaceSlug>/application_skeleton/`.

Proposed canonical artifacts:

```text
.codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton.md
.codeai-hub/<workspaceSlug>/application_skeleton/application-skeleton-map.json
```

`application-skeleton.md` фиксирует rationale and human-readable choices:

- selected language/framework/runtime;
- repo shape;
- build/test commands;
- source root;
- assumptions/open questions;
- user acceptance checklist.

`application-skeleton-map.json` фиксирует deterministic mapping:

```json
{
  "schema": "codeai-application-skeleton-v1",
  "sourceRoot": "src",
  "productParts": [
    {
      "id": "project-manager",
      "codePath": "src/product-parts/project-manager",
      "clusters": [
        {
          "id": "workflow-artifact-ui",
          "codePath": "src/product-parts/project-manager/clusters/workflow-artifact-ui",
          "modules": [
            {
              "id": "step-flow-presenter",
              "codePath": "src/product-parts/project-manager/clusters/workflow-artifact-ui/modules/step-flow-presenter"
            }
          ]
        }
      ]
    }
  ]
}
```

Exact schema can change during implementation planning, but the existence of a deterministic mapping is required.

## 10. Filesystem Principle

The production code filesystem should mirror Development Tree **inside the appropriate industry-standard scaffold**, not necessarily at repository root.

Examples:

### Single application

```text
src/
  product-parts/
    <part-id>/
      clusters/
        <cluster-id>/
          modules/
            <module-id>/
```

### Monorepo / multi-app

```text
apps/
  <product-part-app>/
    src/
      clusters/
        <cluster-id>/
          modules/
            <module-id>/
packages/
  <shared-product-part>/
    src/
      clusters/
        <cluster-id>/
          modules/
            <module-id>/
```

### Extension / desktop shell / runtime split

```text
packages/
  <product-part>/
    src/
      clusters/
        <cluster-id>/
          modules/
            <module-id>/
```

Rule: industry scaffold outside, Development Tree mirror inside.

## 11. Quality Gates Baseline

`Quality Gates Baseline` is a separate workflow step after `Application Skeleton`.

It owns the verification substrate for future code:

- build command;
- typecheck/static analysis command;
- lint command;
- format check/fix command;
- unit test command;
- optional integration/e2e test command;
- optional duplication/dead-code checks where ecosystem support exists;
- architecture guardrails where the selected stack can support them;
- CI/local command contract for Module Planning and Module Execution.

The step should create a human-readable and machine-readable contract under:

```text
.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.md
.codeai-hub/<workspaceSlug>/quality_gates/quality-gates.json
```

Proposed `quality-gates.json` shape:

```json
{
  "schema": "codeai-quality-gates-v1",
  "commands": {
    "build": "npm run build",
    "typecheck": "npm run typecheck",
    "lint": "npm run lint",
    "formatCheck": "npm run format:check",
    "test": "npm test"
  },
  "requiredBeforeModuleExecution": ["build", "typecheck", "lint", "test"],
  "requiredBeforeCommit": ["typecheck", "lint", "formatCheck"],
  "notes": []
}
```

Exact schema can change during implementation planning, but the existence of a deterministic command contract is required.

### 11.1. Quality Gates Acceptance

`Quality Gates Baseline` cannot be accepted unless:

1. `quality-gates.md` exists.
2. `quality-gates.json` exists and parses.
3. Every required command is either executable or explicitly marked unavailable/deferred with rationale.
4. The gate contract references the accepted skeleton source roots/package roots.
5. Future Module Planning and Module Execution prompts can cite the gate contract without guessing commands.
6. User explicitly accepts the gates.

## 12. Relationship to Existing `.codeai-hub/.../development_tree/materialized/`

The current materialized namespace remains internal workflow state, not the production code root.

Future behavior after Application Skeleton and Quality Gates acceptance:

1. Core reads `application-skeleton-map.json`.
2. Core reads `quality-gates.json`.
3. Core creates or verifies production code folders at mapped paths.
4. Core creates Development Tree draft artifacts and sessions only after mapped paths exist and gates are accepted.
5. Node prompts include:
   - workflow draft paths under `.codeai-hub/.../development_tree/materialized/`;
   - production code target paths from `application-skeleton-map.json`;
   - quality gate commands from `quality-gates.json`.

This keeps workflow artifacts separate from code while still giving agents concrete code destinations.

## 13. UI/UX Contract

Project Manager should show `Application Skeleton` and `Quality Gates Baseline` after `Diagram Modules` and before branch node sessions.

Expected `Application Skeleton` states:

- `blocked`: no valid `Diagram Modules` aggregate yet.
- `ready_to_start`: valid `Diagram Modules`, no skeleton session/artifact.
- `in_progress`: skeleton agent/session active or skeleton artifacts exist but are not accepted.
- `accepted`: skeleton artifacts exist, mapping validates, user accepted.

Expected `Quality Gates Baseline` states:

- `blocked`: Application Skeleton is not accepted.
- `ready_to_start`: accepted skeleton exists, no gates session/artifact.
- `in_progress`: gates agent/session active or gate artifacts exist but are not accepted.
- `accepted`: gate artifacts exist, command contract validates, user accepted.

When either `Application Skeleton` or `Quality Gates Baseline` is not accepted:

- Development Tree branch rows may be visible as preview.
- Their sessions are disabled/unavailable.
- The UI should explain that node sessions unlock after Application Skeleton and Quality Gates Baseline acceptance.

Implementation note (2026-05-06): Project Manager now renders both technical root stages in Documentation Tree, routes them through the same `StageConfirmationCard` start/resume path as VS/DM, shows `application-skeleton.md` / `quality-gates.md` artifact panels with Help tabs, and shows a locked Development Tree row while skeleton/gates acceptance is incomplete.

## 14. Application Skeleton Validation

Application Skeleton cannot be accepted unless:

1. `application-skeleton.md` exists.
2. `application-skeleton-map.json` exists and parses.
3. Every generated `Product Part` from `Diagram Modules` has a mapping.
4. Every generated Cluster/Module has a mapping or an explicit deferred/unmapped disposition.
5. Mapped code paths are safe relative paths inside the workspace.
6. Skeleton baseline commands are known, even if some are marked unavailable with rationale.
7. User explicitly accepts the skeleton.

## 15. Combined Downstream Gate

Development Tree node bootstrap is allowed only when both technical root steps are accepted:

```text
diagramModules.aggregateReady === true
applicationSkeleton.accepted === true
qualityGates.accepted === true
```

This is the earliest point where Core may create Product Part / Cluster / Module agent sessions.

Future node prompts should include:

- semantic owner context from `Diagram Modules`;
- production code target paths from `application-skeleton-map.json`;
- verification commands from `quality-gates.json`;
- workflow draft targets under `.codeai-hub/.../development_tree/materialized/`.

## 16. Open Questions

1. Should `Application Skeleton` write real scaffold files immediately, or first create a proposal and write files only after user approval?
2. Should stack detection for non-empty workspaces be part of the first implementation scope or deferred?
3. Should Core create production code folders automatically after acceptance, or should the skeleton agent create them as part of the step?
4. Should `application-skeleton-map.json` support multiple source roots per Product Part from day one?
5. Should Development Tree preview remain visible before skeleton acceptance, or should it be hidden until the skeleton step is complete?
6. Should Quality Gates Agent run the full gate suite immediately before acceptance, or is command/config materialization plus targeted smoke verification enough for MVP?
7. Should CI file generation be part of `Quality Gates Baseline` MVP or deferred until release/package planning?

## 17. Initial Implementation Direction

Recommended MVP:

1. Add `Application Skeleton` as a new workflow stage after `Diagram Modules`.
2. Add `Quality Gates Baseline` as a new workflow stage after `Application Skeleton`.
3. Disable current automatic Development Tree node session bootstrap until skeleton and gates acceptance.
4. Keep Development Tree sidebar preview visible but non-startable.
5. Add `Application Skeleton Agent` first prompt and artifacts.
6. Add `Quality Gates Agent` first prompt and artifacts.
7. Require user acceptance for both technical steps before downstream P/C/M sessions are created.
8. After acceptance, use the skeleton mapping and gate contract to seed node prompts with production code target paths and verification commands.

This creates a clean boundary:

```text
Diagram Modules = semantic product structure
Application Skeleton = technical project substrate
Quality Gates Baseline = definition of green for future code
Development Tree = design/planning/execution over accepted substrate and gates
```
