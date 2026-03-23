# Diagram Modules Retest Blockers After 1.1.770

**Date:** 2026-03-23  
**Status:** Planning baseline for follow-up fixes after live retest

---

## 1. Problem Statement

После локального релиза `1.1.770` пользователь выполнил живой retest `Diagram Modules` и подтвердил новый набор блокеров уже после composite prompt cleanup:

1. Агент успешно записывает `product-parts.index.md`, но React Flow остаётся пустым.
2. После записи index hidden continuation не стартует, хотя staged flow должен немедленно перейти к следующему `Product Part`.
3. User-facing surface `Diagram Modules` всё ещё содержит legacy copy старой `module-inventory` архитектуры:
   - preamble в visual shell говорит про derived visual module map и review `module-inventory.md`;
   - `Source` pending message всё ещё отсылает к `module-inventory.md` и upstream `virtual-simulation.md`;
   - empty-canvas placeholder советует “add semantic entities or rerun the stage”, хотя staged index уже существует.

Это означает, что after-release behaviour всё ещё расходится с staged `product-parts.index.md -> product-parts/<part-id>.md -> runtime aggregate` contract.

---

## 2. Confirmed Root Causes

### 2.1. Index parser mismatch breaks both graph materialization and continuation

Подтверждено по коду и по реальному artifact:

- Реальный `product-parts.index.md`, записанный агентом, использует numbered `Canonical order` list:
  - ``1. `vscode-extension-shell` — `VS Code Extension Shell``` и т.д.
- Loader и workflow progress snapshot до сих пор ждут old-style headings:
  - `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`
  - `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`
- Оба файла используют regex формата `### Product Part: <id>`.

Следствие:

- loader видит `plannedPartIds = []` и строит пустую skeleton model;
- progress snapshot остаётся на `substep: index` вместо `generate_product_part`;
- hidden continuation не отправляется, потому что orchestration не видит `currentPartId`.

### 2.2. User-facing surface still points to legacy module-inventory baseline

Подтверждённые источники legacy copy:

- `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`
  - `artifactFileName="module-inventory.md"`
  - `artifactPath` указывает на `module-inventory.md`
  - `introText` говорит про derived visual module map и review `module-inventory.md`
- `src/client/project-manager/components/layout/stage-artifact-mode.ts`
  - Source path для `Diagram Modules` всё ещё привязан к `module-inventory.md`
  - pending message всё ещё говорит, что source станет доступен после создания `module-inventory.md`
- `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`
  - generic empty-state copy больше не соответствует staged index-first flow

---

## 3. Constraints

- Исправления делать малыми микрозадачами, не более 3 файлов на commit.
- После каждой микрозадачи обязателен отдельный commit и immediate update `doc/TODO/todo-plan.md`.
- Новый release пока не собирать автоматически; сначала добить live blockers и проверить поведение локально/тестами.

---

## 4. Fix Streams

### Stream A — Index parser recovery for graph + continuation

Goal:

- научить `Diagram Modules` tolerant parsing both current numbered `Canonical order` index format and old heading-based format;
- восстановить loader skeleton и workflow progress snapshot из реального `product-parts.index.md`.

Primary files:

- `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`
- `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`
- один targeted regression test file

Expected result:

- после записи index canvas больше не пустой;
- `readDiagramModulesProgressSnapshot(...)` возвращает `generate_product_part` и корректный `currentPartId`;
- hidden continuation получает следующий staged target без ручного `Продолжай`.

### Stream B — Diagram Modules user-surface cleanup

Goal:

- вычистить из `Diagram Modules` visual shell и `Source` mode последние tails старой `module-inventory` архитектуры.

Primary files:

- `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`
- `src/client/project-manager/components/layout/stage-artifact-mode.ts`
- один targeted regression test file

Expected result:

- intro / source / pending copy больше не рекламируют `module-inventory.md` как primary artifact stage;
- `Source` surface честно объясняет staged artifacts (`product-parts.index.md`, part files, runtime-owned aggregate);
- user-facing copy не подсказывает ложные действия вроде “add semantic entities” в момент, когда index уже создан.

### Stream C — Retest handoff

Goal:

- после исправлений повторно проверить live flow на `1.1.770`-line без немедленного нового релиза;
- зафиксировать фактический outcome и только после этого решать, нужен ли следующий patch release.

---

## 5. Acceptance Criteria

- Index-only state после первого agent write показывает непустой staged skeleton в React Flow.
- Hidden continuation стартует автоматически сразу после `product-parts.index.md`, если progress snapshot уже знает следующий `Product Part`.
- `Diagram Modules` visual shell и `Source` mode больше не содержат user-facing утверждений старой inventory-first архитектуры.
- Следующая сессия может восстановить этот scope только по `todo-plan.md`, `Session140.md` и этому planning-doc без дополнительного расследования.
