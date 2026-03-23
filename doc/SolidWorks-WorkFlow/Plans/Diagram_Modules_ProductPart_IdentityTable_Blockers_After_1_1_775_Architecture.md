# Diagram Modules Product Part Identity-Table Blockers After 1.1.775

**Date:** 2026-03-23
**Status:** Approved for implementation
**Related retest:** local user retest of release `1.1.775`

---

## 1. Problem

После релиза `1.1.775` шаг `Diagram Modules` восстановил ранний staged flow:
- `product-parts.index.md` materialize-ится;
- в React Flow появляются `Product Part` плашки;
- hidden continuation автоматически стартует.

Новый blocker сместился на первый continuation artifact `product-parts/<part-id>.md`.
UI сообщает ошибку вида:

- `Не удалось загрузить Diagram Modules: не удалось разобрать Product Part vs-code-extension-shell: строка 1, Missing required field: part_id`

Из-за этого staged sequence больше не доходит до progressive materialization clusters/modules, хотя index-first шаг уже работает.

---

## 2. Confirmed live artifact shape

Фактический live file из test workspace:

- `# Product Part: VS Code Extension Shell`
- `## Identity` с markdown table, где `Part ID` хранится как строка таблицы, а не как bullet `- \`part_id\`: ...`
- `## Purpose` как обычный prose section
- `## Owned Clusters`
- cluster headers в виде `### \`cluster-id\`` без обязательной нумерации
- module rows в таблице с четырьмя колонками: `Module ID | Module | Status | Purpose`
- дополнительные narrative sections (`Boundary-Sensitive Handoffs`, `Normalization Notes`), которые допустимо игнорировать на semantic parse stage

Это уже третий живой human-readable format `Product Part`, который использует агент после staged prompt cleanup.

---

## 3. Root cause

Текущий staged parser для `product-parts/<part-id>.md` правильно различает `# Product Part: ...` и legacy inventory path, но outline-ветка всё ещё опирается на более старый interim DSL:

- ждёт `- \`part_id\`: \`...\`` вместо `## Identity` table;
- ждёт section `## Cluster Inventory`, а не `## Owned Clusters`;
- ждёт cluster heading `### <n>. \`cluster-id\`` вместо live `### \`cluster-id\``;
- ждёт module table без `Status` колонки.

В результате parser падает ещё до того, как успевает извлечь `Part ID` из live artifact.

Важно: предыдущий фикс `1.1.775` уже восстановил parsing `product-parts.index.md`. Его нельзя повредить. Этот follow-up должен менять только staged `product-parts/<part-id>.md` path.

---

## 4. Target behavior

Новый parser path должен:

1. Принимать текущий live identity-table format `Product Part` files.
2. Сохранять backward compatibility с уже поддержанным bullet-outline format.
3. Не трогать index parser и hidden continuation recovery из `1.1.775`.
4. Продолжать игнорировать non-semantic narrative sections, не требуя их для parse success.
5. Давать один и тот же semantic output и для progressive React Flow, и для compatibility aggregate composer.

---

## 5. Implementation direction

### 5.1. Part identity recovery
- В outline parser добавить fallback на `## Identity` table.
- Поддержать чтение `Part ID` из строки `Part ID | \`...\``.
- При необходимости брать `Product Part` / `Name` из `Identity`, но title из `# Product Part: ...` остаётся допустимым primary source.

### 5.2. Cluster section aliases
- Поддержать оба section name:
  - `Cluster Inventory`
  - `Owned Clusters`

### 5.3. Cluster header variants
- Поддержать оба варианта:
  - `### 1. \`cluster-id\``
  - `### \`cluster-id\``

### 5.4. Module row variants
- Поддержать оба варианта таблиц:
  - `Module ID | Module | Purpose`
  - `Module ID | Module | Status | Purpose`
- Колонка `Status` считается informational и не должна менять semantic ownership model.

---

## 6. Verification

Targeted checks:
- regression test на progressive loader с live identity-table artifact;
- regression test на aggregate composer с тем же live artifact;
- затем release cycle для нового patch baseline.

---

## 7. Files expected in implementation

Primary code scope:
- `src/client/project-manager/components/diagram-editor/diagram-modules-staged-part-parser.ts`
- `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts`
- `src/client/project-manager/components/sessions/diagram-modules-aggregate.test.ts`

Planning / handoff:
- `doc/TODO/todo-plan.md`
- next session report after release

