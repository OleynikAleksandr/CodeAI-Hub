# Diagram Modules Product Part Outline Format Blockers After 1.1.773

**Date:** 2026-03-23  
**Status:** Planning baseline for follow-up fixes after live retest `1.1.773`

---

## 1. Problem Statement

После релиза `1.1.773` пользователь подтвердил, что предыдущие staged fixes частично работают:

1. `Product Part` skeleton появляется в `Artifacts`.
2. Hidden continuation после `product-parts.index.md` снова стартует автоматически.

Но первый же continuation `Product Part` file снова ломает `Diagram Modules`:

- `Не удалось загрузить Diagram Modules: не удалось разобрать Product Part vscode-extension-shell: строка 1, Expected '# Module Inventory' title`

Пользователь остановил сессию сразу после появления ошибки и запросил новый follow-up цикл: отчёт, новая фаза, новые стримы, новый фикс и новый релиз.

---

## 2. Confirmed Root Cause

### 2.1. Live `Product Part` format drifted again

В релизе `1.1.773` staged parser был настроен на предыдущий human-readable format:

- `# Module Inventory`
- `## Product Part` table
- `## Clusters`
- `## Standalone Modules`

Но live continuation file в реальном workspace уже имеет другой shape:

- `# Product Part: VS Code Extension Shell`
- bullets `part_id`, `index_order`
- `## Purpose`
- `## Ownership Boundary`
- `## Cluster Inventory`
- cluster headers `### 1. <cluster-id>`
- module tables без отдельной колонки `Order`
- `## Direct Standalone Modules Under This Part`
- `## Outside This Part`

Подтверждённый live artifact:

- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/vscode-extension-shell.md`

Следствие:

- staged parser `1.1.773` падает ещё на первой строке, потому что всё ещё ожидает `# Module Inventory`.

### 2.2. Same parser is shared by progressive UI and compatibility aggregate

Текущий shared parser используется и в:

- `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`
- `src/client/project-manager/components/sessions/diagram-modules-aggregate.ts`

Следствие:

- первый visible continuation file ломает `Artifacts`;
- даже если UI перестанет падать, без parser recovery aggregate path позже свалится на том же format drift.

---

## 3. Constraints

- Продолжать микро-задачами не более 3 файлов на commit.
- Новый parser должен принять live outline format, но не сломать backward compatibility с предыдущим table-based staged format, уже учтённым в `1.1.773`.
- Сначала закрыть parser recovery в shared staged parser, чтобы сразу исправить и progressive UI, и aggregate runtime path.
- Затем отдельно добавить regression coverage, что aggregate path тоже принимает новый live outline format.
- После фиксов обязателен новый локальный patch release и повторный пользовательский retest.

---

## 4. Fix Streams

### Stream A — Outline `Product Part` parser recovery

Goal:

- расширить shared staged parser под live outline `Product Part` format.

Primary files:

- staged parser module(s)
- targeted progressive regression test file

Expected result:

- `Diagram Modules` больше не падает на `# Product Part: ...`;
- `Cluster Inventory` materialize-ится в clusters/modules на графе;
- previous table-based staged part format остаётся совместимым.

### Stream B — Aggregate regression coverage

Goal:

- подтвердить regression test-ом, что aggregate path тоже переживает новый outline format.

Primary files:

- targeted aggregate regression test file

Expected result:

- финальный `module-inventory.md` тоже может быть собран из live outline continuation files.

### Stream C — Retest release

Goal:

- собрать новый baseline только после parser recovery и aggregate coverage;
- снова прогнать live retest `Diagram Modules`.

---

## 5. Acceptance Criteria

- Первый live `product-parts/<part-id>.md` с заголовком `# Product Part: ...` больше не ломает `Artifacts`.
- `Cluster Inventory` отображается на графе как реальные clusters/modules, а не заканчивается parse error.
- Shared staged parser остаётся совместимым с предыдущим table-based `Product Part` format.
- Aggregate path тоже принимает новый outline format и не ломает финальный `module-inventory.md`.
