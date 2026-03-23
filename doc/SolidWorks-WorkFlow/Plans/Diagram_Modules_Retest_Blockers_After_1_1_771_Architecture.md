# Diagram Modules Retest Blockers After 1.1.771

**Date:** 2026-03-23  
**Status:** Planning baseline for follow-up fixes after live retest `1.1.771`

---

## 1. Problem Statement

После релиза `1.1.771` пользователь сразу начал новый live retest `Diagram Modules` и подтвердил, что два важных blocker-а всё ещё остались:

1. Кнопка `Source` показывает pending message даже после того, как `product-parts.index.md` уже создан.
2. React Flow остаётся пустым после первого agent write, а значит staged skeleton по-прежнему не materialize-ится из реального live artifact.

Оба сбоя происходят уже не на старом inventory-first baseline `1.1.770`, а на свежем релизе, в котором user-facing copy частично обновилась.

---

## 2. Confirmed Root Causes

### 2.1. Source availability hook still checks `module-inventory.md`

User-facing pending message уже обновлён и говорит про `product-parts.index.md`, но gate перед `WorkflowArtifactViewer` всё ещё завязан на старый artifact path:

- `src/client/project-manager/components/layout/use-diagram-modules-artifact-availability.ts`

Сейчас hook возвращает availability для:

- `.codeai-hub/<workspaceSlug>/diagram_modules/module-inventory.md`

Следствие:

- даже когда `product-parts.index.md` уже существует и выбран как canonical `Source`,
- UI продолжает считать `Source` недоступным до появления `module-inventory.md`.

Это объясняет observed behaviour пользователя без дополнительной гипотезы про refresh или stale cache.

### 2.2. Real live index format drifted again: now it is a Markdown table

Первый follow-up fix `1.1.771` восстановил parsing для numbered `Canonical order`, но реальный текущий live artifact уже имеет другой shape:

- section `## Canonical Product Parts`
- Markdown table c колонками `Order | Part ID | Product Part | Purpose`

Подтверждённый live artifact path:

- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md`

Текущие parser-ы всё ещё не умеют этот format:

- `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`
- `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`

Следствие:

- loader опять получает zero planned parts и рисует пустой canvas;
- progress snapshot не видит `plannedPartIds`, поэтому continuation loop снова не получает `currentPartId`.

---

## 3. Constraints

- Исправления снова делать микро-задачами не более 3 файлов на commit.
- Сначала закрыть `Source` availability bug как изолированный UI contract fix.
- Затем отдельно чинить parser mismatch под live table format, не смешивая это с предыдущим numbered-list parser fix.
- После обоих fixes нужен новый локальный release baseline и повторный пользовательский retest.

---

## 4. Fix Streams

### Stream A — Source availability recovery

Goal:

- сделать `Source` доступным сразу после появления `product-parts.index.md`, без ожидания runtime aggregate.

Primary files:

- `src/client/project-manager/components/layout/use-diagram-modules-artifact-availability.ts`
- один targeted test file

Expected result:

- `Source` открывает `product-parts.index.md` сразу после первого agent write;
- pending message больше не висит, когда index уже реально существует.

### Stream B — Table-format parser recovery

Goal:

- научить staged parser-ы читать live Markdown table format `Canonical Product Parts`.

Primary files:

- `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`
- `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`
- один targeted regression test file

Expected result:

- React Flow materialize-ит `Product Part` skeleton по live index table;
- progress snapshot снова возвращает `generate_product_part` и корректный `currentPartId`;
- hidden continuation перестаёт зависать после index write.

### Stream C — Retest release

Goal:

- собрать новый baseline только после закрытия обоих blocker-ов;
- повторно проверить live `Diagram Modules` на следующем patch release.

---

## 5. Acceptance Criteria

- `Source` перестаёт ждать `module-inventory.md`, если уже существует `product-parts.index.md`.
- Live table-format index сразу даёт непустой staged skeleton в React Flow.
- `readDiagramModulesProgressSnapshot(...)` видит `plannedPartIds` из table rows и снова выставляет `currentPartId`.
- Следующий пользовательский retest на новом release не воспроизводит ни pending `Source`, ни пустой canvas после первого agent write.
