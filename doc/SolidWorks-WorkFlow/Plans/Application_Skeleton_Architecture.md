# Application Skeleton Architecture

**Status:** Draft for discussion.
**Created:** 2026-05-06
**Owner:** Oleksandr + Codex
**Scope:** новый workflow-step между `Diagram Modules` и автоматическим Development Tree node bootstrap. Шаг выбирает технологический стек, создает базовый skeleton приложения в workspace и фиксирует mapping будущего кода на `Product Part -> Cluster -> Module`.

---

## 1. Problem

Текущий workflow после `Diagram Modules` слишком рано запускает Development Tree automation:

1. `Diagram Modules` agent создает `product-parts.index.md` и `product-parts/<part-id>.md`.
2. Core строит `developmentTree` snapshot.
3. Core материализует neutral P/C/M folders под `.codeai-hub/<workspaceSlug>/development_tree/materialized/`.
4. Core создает draft-файлы и сразу запускает per-node agent sessions.

В этой цепочке отсутствует главный технический слой: **workspace application skeleton**.

До появления per-node design sessions система еще не знает:

- язык программирования;
- framework/runtime;
- package manager/build system;
- test/lint/format baseline;
- repo shape: single app, monorepo, extension, desktop shell, backend service, web client, shared packages;
- где именно будущий production code должен лежать;
- как `Product Part`, `Cluster` и `Module` отображаются на реальную файловую систему кода.

Из-за этого текущая автоматизация создает node sessions и draft artifacts до того, как существует физическое место для будущего кода и before any industry-aligned project scaffold has been accepted.

## 2. Goal

Добавить workflow-step **Application Skeleton** сразу после `Diagram Modules`.

Шаг должен:

1. Принять `Diagram Modules` ownership map как semantic input.
2. Определить или уточнить технологический стек будущего приложения.
3. Создать минимальный рабочий skeleton проекта в workspace root или в выбранной product root зоне.
4. Зафиксировать mapping `Product Part -> Cluster -> Module -> code path`.
5. Разблокировать дальнейший Development Tree node bootstrap только после принятия skeleton пользователем.

Ключевой outcome: перед стартом Product Part / Cluster / Module design sessions в workspace уже есть технически валидный application skeleton, а future code folders can mirror the Development Tree inside the appropriate industry-standard scaffold.

## 3. Non-Goals

Этот scope не должен:

- писать feature/business implementation code;
- реализовывать Product Part / Cluster / Module спецификации;
- запускать Module Planning или Module Execution;
- переносить текущие `.codeai-hub/.../development_tree/materialized/` drafts в production code root;
- навязывать один универсальный filesystem canon для всех стеков;
- делать `Diagram Modules` ответственным за выбор framework/language.

## 4. Proposed Placement

Целевой high-level workflow:

```text
Description
 -> Virtual Simulation
 -> Diagram Modules
 -> Application Skeleton
 -> Product Part Specification
 -> Cluster Design
 -> Module Design
 -> Module Planning
 -> Module Execution
```

`Application Skeleton` является первым technical branch/root step после semantic trunk.

`Diagram Modules` остается semantic architecture step. Он не выбирает stack и не пишет project scaffold.

## 5. Core Decision: Disable Early Node Session Automation

Текущую автоматизацию создания Development Tree node sessions нужно поставить за gate.

До завершения `Application Skeleton` разрешено:

- читать `Diagram Modules` staged artifacts;
- показывать Development Tree как read-only/sidebar projection;
- показывать будущую P/C/M структуру пользователю;
- материализовать internal preview metadata, если это не запускает agents.

До завершения `Application Skeleton` запрещено:

- создавать Product Part / Cluster / Module agent sessions;
- отправлять first messages node agents;
- создавать agent-owned draft artifacts как будто branch design уже начался;
- считать Development Tree готовым к design/planning/execution automation.

Gate condition:

```text
Diagram Modules aggregateReady
AND Application Skeleton accepted
AND Application Skeleton mapping exists
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

## 7. Inputs

Application Skeleton first prompt должен получить:

- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`;
- `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`;
- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md`;
- все generated `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/<part-id>.md`;
- явные user preferences, если пользователь уже указал stack/language/framework;
- detected workspace facts, если workspace не пустой и detection включен в scope.

Если stack неизвестен, агент обязан задать пользователю focused technology questions before writing scaffold, rather than guessing.

## 8. Outputs

Шаг должен создать два класса output.

### 8.1. Workspace Skeleton

Минимальный skeleton в workspace, соответствующий выбранному стеку:

- package/build/test/lint/format config;
- source root;
- entry points;
- empty app/package/module placeholders only where justified by the chosen stack;
- README or developer note for how to run the skeleton, if appropriate.

Skeleton должен быть runnable/checkable for the chosen ecosystem.

### 8.2. Skeleton Contract

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

## 9. Filesystem Principle

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

## 10. Relationship to Existing `.codeai-hub/.../development_tree/materialized/`

The current materialized namespace remains internal workflow state, not the production code root.

Future behavior after Application Skeleton acceptance:

1. Core reads `application-skeleton-map.json`.
2. Core creates or verifies production code folders at mapped paths.
3. Core creates Development Tree draft artifacts and sessions only after mapped paths exist.
4. Node prompts include both:
   - workflow draft paths under `.codeai-hub/.../development_tree/materialized/`;
   - production code target paths from `application-skeleton-map.json`.

This keeps workflow artifacts separate from code while still giving agents concrete code destinations.

## 11. UI/UX Contract

Project Manager should show `Application Skeleton` after `Diagram Modules` and before branch node sessions.

Expected states:

- `blocked`: no valid `Diagram Modules` aggregate yet.
- `ready_to_start`: valid `Diagram Modules`, no skeleton session/artifact.
- `in_progress`: skeleton agent/session active or skeleton artifacts exist but are not accepted.
- `accepted`: skeleton artifacts exist, mapping validates, user accepted.

When `Application Skeleton` is not accepted:

- Development Tree branch rows may be visible as preview.
- Their sessions are disabled/unavailable.
- The UI should explain that node sessions unlock after Application Skeleton acceptance.

## 12. Validation

Application Skeleton cannot be accepted unless:

1. `application-skeleton.md` exists.
2. `application-skeleton-map.json` exists and parses.
3. Every generated `Product Part` from `Diagram Modules` has a mapping.
4. Every generated Cluster/Module has a mapping or an explicit deferred/unmapped disposition.
5. Mapped code paths are safe relative paths inside the workspace.
6. Skeleton baseline commands are known, even if some are marked unavailable with rationale.
7. User explicitly accepts the skeleton.

## 13. Open Questions

1. Should `Application Skeleton` write real scaffold files immediately, or first create a proposal and write files only after user approval?
2. Should stack detection for non-empty workspaces be part of the first implementation scope or deferred?
3. Should Core create production code folders automatically after acceptance, or should the skeleton agent create them as part of the step?
4. Should `application-skeleton-map.json` support multiple source roots per Product Part from day one?
5. Should Development Tree preview remain visible before skeleton acceptance, or should it be hidden until the skeleton step is complete?

## 14. Initial Implementation Direction

Recommended MVP:

1. Add `Application Skeleton` as a new workflow stage after `Diagram Modules`.
2. Disable current automatic Development Tree node session bootstrap until skeleton acceptance.
3. Keep Development Tree sidebar preview visible but non-startable.
4. Add `Application Skeleton Agent` first prompt and artifacts.
5. Require user acceptance before downstream P/C/M sessions are created.
6. After acceptance, use the skeleton mapping to seed node prompts with production code target paths.

This creates a clean boundary:

```text
Diagram Modules = semantic product structure
Application Skeleton = technical project substrate
Development Tree = design/planning/execution over accepted substrate
```
