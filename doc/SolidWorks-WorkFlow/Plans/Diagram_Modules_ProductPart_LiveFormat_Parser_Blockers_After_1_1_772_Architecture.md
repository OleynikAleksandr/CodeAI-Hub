# Diagram Modules Product Part Live Format Parser Blockers After 1.1.772

**Date:** 2026-03-23  
**Status:** Planning baseline for follow-up fixes after live retest `1.1.772`

---

## 1. Problem Statement

После релиза `1.1.772` пользователь подтвердил, что два предыдущих blocker-а действительно закрылись:

1. `Artifacts` больше не пустой после `product-parts.index.md` — skeleton `Product Part` появился.
2. Hidden continuation снова стартует автоматически после index write.

Но на первом continuation part-файле проявился следующий blocker:

- `Diagram Modules` падает на parse error при чтении `product-parts/<part-id>.md`.

Наблюдавшиеся live ошибки:

- `Expected '# Module Inventory' title`
- затем `Metadata, Simple Relations, and either Product Parts or legacy Clusters / Standalone Modules sections are required`

Это означает, что staged pipeline теперь доходит до materialized part-файла, но consumer-ы этого файла всё ещё живут на старом inventory parser contract.

---

## 2. Confirmed Root Cause

### 2.1. Progressive loader still parses `product-parts/<part-id>.md` as legacy inventory DSL

Файл:

- `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`

Сейчас loader делает:

- `materializeModuleMapFromInventoryDsl(partResult.content)`

То есть каждый staged `Product Part` file прогоняется через parser, который ожидает canonical inventory DSL с:

- `# Module Inventory`
- `## Metadata`
- `## Product Parts` или legacy ownership sections
- `## Simple Relations`

### 2.2. Compatibility aggregate composer repeats the same mistake

Файл:

- `src/client/project-manager/components/sessions/diagram-modules-aggregate.ts`

Там те же staged `product-parts/<part-id>.md` снова materialize-ятся через:

- `materializeModuleMapFromInventoryDsl(...)`

Следствие:

- даже если progressive UI переживёт первый parse mismatch, runtime aggregate позже упадёт на той же несовместимости.

### 2.3. Live staged Product Part format is human-readable and not equal to `product-part-template.md`

Подтверждённые live файлы:

- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/vs-code-extension-shell.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/standalone-project-manager.md`

Фактический shape:

- `# Module Inventory`
- `Product Part: <title>`
- `## Product Part` с Markdown table `Field | Value`
- `## Boundaries`
- `## Clusters`
- `### Cluster N. <cluster-id>`
- `#### Modules` с Markdown table `Order | Module ID | Module | Purpose`
- `## Standalone Modules`
- `## Non-Ownership`

То есть live file уже staged и ownership-oriented, но ещё не canonical inventory DSL и не совпадает с текущим `packages/agents/diagram-modules-agent/assets/product-part-template.md`.

---

## 3. Constraints

- Исправления продолжать микро-задачами не более 3 файлов на commit.
- Сначала закрыть parser mismatch для progressive loader, чтобы пользовательский surface перестал падать на первом materialized part.
- Затем отдельно перевести compatibility aggregate на тот же staged parser.
- Prompt/template conformance для `product-part-template.md` не смешивать с текущим unblocker-ом, если staged parser recovery можно сделать без дополнительного runtime contract change.
- После parser fixes обязателен новый локальный patch release и live retest.

---

## 4. Fix Streams

### Stream A — Staged Product Part parser for progressive loader

Goal:

- ввести parser, который понимает live human-readable staged `Product Part` format и materialize-ит из него `ModuleMapModel`.

Primary files:

- новый staged part parser module
- `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`
- один targeted regression test file

Expected result:

- `Artifacts` не падает на первом `product-parts/<part-id>.md`;
- staged graph расширяется real clusters/modules из materialized part-файла;
- user-facing error на legacy `Metadata`/`Simple Relations` contract исчезает.

### Stream B — Compatibility aggregate recovery

Goal:

- использовать тот же staged part parser при сборке `module-inventory.md`.

Primary files:

- `src/client/project-manager/components/sessions/diagram-modules-aggregate.ts`
- один targeted regression test file

Expected result:

- runtime может пройти весь continuation sequence и собрать compatibility aggregate из live staged part-файлов;
- aggregate path больше не зависит от legacy inventory parser на intermediate part-files.

### Stream C — Retest release

Goal:

- собрать новый baseline только после progressive и aggregate parser fixes;
- повторно проверить live `Diagram Modules` на следующем patch release.

---

## 5. Acceptance Criteria

- Первый materialized `product-parts/<part-id>.md` больше не ломает `Diagram Modules` surface.
- Progressive loader расширяет staged graph из live `Clusters` / `Modules` section-ов part-файла.
- Compatibility aggregate строится из тех же staged part-файлов без parse error на `Metadata`/`Simple Relations`.
- Следующий пользовательский retest на новом release не воспроизводит parse failure ни на первом `Product Part`, ни в конце staged sequence.
