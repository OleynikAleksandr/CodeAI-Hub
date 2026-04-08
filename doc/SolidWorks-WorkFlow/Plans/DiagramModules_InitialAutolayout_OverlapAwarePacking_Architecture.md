# Diagram Modules — Initial Autolayout Overlap-Aware Packing Architecture

**Status:** Proposed
**Date:** 2026-04-08
**Owner:** Oleksandr + Codex
**Scope:** corrective scope after release `1.1.911`

---

## 1. Problem

После релиза `1.1.911` ручной drag для `Diagram Modules` ведёт себя корректно, но initial autolayout всё ещё может давать наползание нижних границ `MODULE` на `CLUSTER` и/или `PRODUCT PART`.

Ключевое наблюдение по коду: current initial packer в `diagram-editor-initial-autolayout-packer.ts` группирует direct children контейнера по **точному `x`-столбцу**. Это ломается на уровне `PRODUCT PART`, потому что direct children там неоднородны:
- `CLUSTER` может занимать один или два slot-а по ширине;
- `MODULE` standalone уже, чем двухколоночный `CLUSTER`;
- два элемента могут иметь разный `x`, но всё равно пересекаться по horizontal footprint.

Из-за этого solver считает элементы «разными колонками», хотя визуально они конфликтуют и должны участвовать в одном vertical packing chain.

---

## 2. Root Cause

Проблема больше не в line-height budget и не в stale sidecar.

Настоящая причина:
- initial autolayout использует measured sizes, но применяет неверную модель группировки sibling-элементов;
- grouping by exact `x` корректен для `MODULE` inside `CLUSTER`, но некорректен для `CLUSTER` + standalone `MODULE` inside `PRODUCT PART`;
- поэтому `PRODUCT PART` может недооценить deepest occupied bottom для некоторых horizontal overlap paths даже после measured pass.

Итог: bottom gap нарушается не потому, что размер неизвестен, а потому что sibling packing model слишком грубая.

---

## 3. Target Contract

Для initial autolayout вводится единый overlap-aware invariant:

1. Для каждого ownership container (`CLUSTER`, `PRODUCT PART`) vertical placement direct children считается не по exact-column key, а по **реальному горизонтальному пересечению bounds**.
2. Для child `A` и уже размещённого sibling `B` действует правило:
   - если их horizontal ranges пересекаются с учётом `minGap`, то `A.y >= B.bottom + minGap`.
3. Высота container считается только как:
   - `max(visualBottom всех direct children) + container paddingBottom`.
4. Initial autolayout обязан достигать fixed point снизу вверх:
   - `MODULE` within `CLUSTER`
   - `CLUSTER` + standalone `MODULE` within `PRODUCT PART`
   - top-level `PRODUCT PART` rows
5. Persisted sidecar path остаётся отдельным preserve-mode и не репакуется как initial seed.

---

## 4. Implementation Strategy

### 4.1. Replace exact-column packing with overlap-aware sibling solver

В `diagram-editor-initial-autolayout-packer.ts` заменить `packContainerColumns(...)` на overlap-aware packing pass:
- child сохраняет свой seed `x` (с clamp к `childMinX`);
- child стартует с `max(bodyStartY, seedY)`;
- затем child последовательно сдвигается вниз до тех пор, пока для всех уже размещённых siblings с horizontal overlap выполняется `gap >= minGap`;
- solver использует реальные widths/heights из measured geometry и `getNodeVisualBottom(...)`.

### 4.2. Reuse the same overlap law at every hierarchy level

Эта же логика применяется:
- внутри `CLUSTER` для `MODULE`;
- внутри `PRODUCT PART` для `CLUSTER` и standalone `MODULE`;
- на top-level для `PRODUCT PART` rows.

Разница только в том, какие children считаются direct children конкретного owner.

### 4.3. Preserve-mode boundary

`persisted-sidecar` путь не должен превращаться в aggressive repack.

Следовательно:
- новый overlap-aware solver используется только для `seed-autolayout`;
- preserved manual layout продолжает использовать текущий measured preserve path.

---

## 5. Files In Scope

Код:
- `src/client/project-manager/components/diagram-editor/diagram-editor-initial-autolayout-packer.ts`
- `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.ts`
- `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.test.ts`

Документация:
- `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
- `README.md`
- `CHANGELOG.md`

---

## 6. Acceptance Criteria

Scope считается закрытым только если выполняется всё ниже:

1. Initial autolayout больше не допускает отрицательный gap между:
   - `MODULE` ↔ `MODULE`
   - `MODULE` ↔ `CLUSTER`
   - `CLUSTER` ↔ `PRODUCT PART`
2. Solver корректно работает для wide `CLUSTER`, который перекрывает несколько slot-ов по horizontal footprint.
3. Persisted manual layouts не теряют композицию и не перепаковываются как seed layout.
4. Добавлены regression tests на overlap-aware packing для `PRODUCT PART` children.
5. Собран новый release build с новым `VSIX` и свежими tarball-артефактами.

---

## 7. Completion Note

Заполняется после реализации и релиза.
