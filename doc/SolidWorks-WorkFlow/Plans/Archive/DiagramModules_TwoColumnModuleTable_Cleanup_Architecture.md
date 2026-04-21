# Diagram Modules — Two-Column Module Table Cleanup

## Problem

Refactor `c488df065` (2026-04-10) удалил поле `kind` из `ModuleEntity`, DSL types, core DSL parser'а, serializer'а и агентского template. Template `product-part-template.md` и `diagram-modules-field-reference.md` зафиксировали канонический 2-колоночный module table: `| \`module-id\` | Responsibility |`. Однако cleanup не дошёл до двух точек чтения артефакта:

- Browser staged-part parser в PM, который строит projection для `Diagram Modules` canvas.
- Core `development-tree-snapshot` reader, который строит Development Tree branch nodes для PM sidebar.

Оба parser'а по-прежнему требуют минимум 3 колонки с backticks во второй (legacy `kind` слот), поэтому ни один module-row из нового артефакта не распознаётся: 2 кластера в диаграмме показывают `Modules: 0`, standalone modules полностью теряются.

## Побочный дефект Development Tree

В `development-tree-snapshot.ts` standalone-секция вычисляется как `content.slice(standaloneSectionStart)` до конца файла, захватывая `## Simple Relations` и `## Assumptions / Open Questions`. Relation-строки `| \`from-id\` | \`to-id\` | sync-call | label |` случайно совпадают с MODULE_ROW_RE и материализуются как фантомные standalone modules (`From`-колонка → id, `To`-колонка → title). На скриншоте это три ложных узла. Даже после правки regex под 2 колонки этот leak остаётся: границу standalone-секции необходимо остановить на следующем `##`-заголовке.

## Solution

1. Browser staged-part parser:
   - `OUTLINE_MODULE_ROW_RE` и `MODULE_ROW_RE` → переписать под 2 колонки: `^\|\s*\`([a-z0-9]+(?:-[a-z0-9]+)*)\`\s*\|\s*(.+?)\s*\|$`.
   - `parseModuleRows` в shared helper: `match[2]` становится responsibility; heuristic `isKind` удалить; title всегда humanize-ится из id.
   - Table-header row `| module-id | Responsibility |` фильтруется по id-check (как и раньше).

2. Core `development-tree-snapshot`:
   - `MODULE_ROW_RE` → переписать под 2 колонки, как и в browser parser.
   - `parseProductPartTree`: ограничить `standaloneBody` следующим `##`-заголовком вместо конца файла.
   - Обновить inline-комментарий с примера `| module-id | kind | ... |` на актуальный.

3. Tests:
   - `diagram-modules-staged-part-parser.test.ts`: переписать все фикстуры под 2 колонки; удалить test `"3-column table uses humanized module-id as title instead of kind"` (неактуален); решить судьбу 4-column теста (удалить, если 4-column вариант больше не поддерживается field-reference'ом).
   - `development-tree-snapshot.test.ts`: обновить фикстуру под 2 колонки; добавить regression-тест на Simple Relations leak.

4. Production-артефакты:
   - Workspace artifacts уже в 2-колоночном формате (`/Users/oleksandroliinyk/VSCODE/CodeAI-Hub claude/.codeai-hub/codeai-hub-claude/diagram_modules/`). После правки parser'ов заработают без регенерации.

## Out of Scope

- DSL types, core DSL parser (`packages/core/src/workflow/diagram-dsl/*`), agent template/field-reference — уже чисты от `kind` и правильного формата.
- UI-action discriminator `kind: "cluster" | "productPart"` в `diagram-editor-context-menu.tsx` / `diagram-editor-layout-params.ts` — не связан с DSL.
- Миграция существующих 3-колоночных workspace-артефактов. Новый parser должен корректно обработать новый формат; legacy 3-колоночные файлы из более ранних workspace'ов можно будет пересгенерировать агентом при первом redo.

## Canonical Document Landing

После закрытия цикла planning-doc архивируется в `doc/SolidWorks-WorkFlow/Plans/Archive/`. Ключевой invariant про 2-колоночный module table остаётся в `product-part-template.md` + `diagram-modules-field-reference.md` как каноническом SSOT формата. В `System/SystemArchitecture.md` §6.3 / §6.5 корректировать не нужно — ownership hierarchy contract не меняется; добавится только короткая фиксация в §6.4 (tolerance к 2-колоночному module table в parser contract).
