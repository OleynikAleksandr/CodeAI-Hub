# Diagram Modules Canonical ProductPart Template And Prompt Delivery Architecture

**Date:** 2026-03-23
**Status:** Approved for implementation
**Scope:** `Diagram Modules` staged `product-parts.index.md` / `product-parts/<part-id>.md` contract stabilization

---

## 1. Problem

Текущий `Diagram Modules` flow снова вошёл в contract drift:
- `product-parts.index.md` уже materialize-ится и читается корректно;
- hidden continuation уже стартует автоматически;
- все `product-parts/<part-id>.md` физически создаются;
- но semantic parse вложенной структуры расходится с тем, что реально пишет агент.

Итог: UI обновляет только верхний `Product Part` purpose, но не materialize-ит `Cluster` и `Module`, а compatibility aggregate может завершаться практически пустым.

Проблема не в отсутствии содержания у agent-written файлов. Проблема в том, что у нас нет одного обязательного, runtime-delivered, parser-backed канонического шаблона `product-parts/<part-id>.md`, который одновременно:
- передаётся агенту как template текущего turn-а;
- совпадает с user-facing template asset;
- совпадает с bundled/synced template delivery;
- совпадает с parser contract;
- совпадает с validation/aggregate contract.

---

## 2. Confirmed root cause

Сейчас одновременно живут несколько несовместимых contract layers:
1. parser-supported staged formats;
2. agent-authored live human-readable formats;
3. legacy template assets, которые всё ещё тянут inventory-style shape;
4. prompt/contract assembly, которая не гарантирует, что агент действительно получил текущий canonical template path для своего turn-а.

Из-за этого модель пишет хороший human-readable ownership document, но runtime читает только ту часть, которая совпадает с узким parser subset.

---

## 3. Target state

Нужен один канонический staged contract:
- отдельный canonical template для `product-parts.index.md`;
- отдельный canonical template для одного `product-parts/<part-id>.md`;
- explicit template path текущего turn-а в runtime/prompt delivery;
- parser и validation заточены под этот же shape;
- transitional compatibility остаётся только как ограниченный migration layer, а не как бесконечный набор live drift-исключений.

---

## 4. Protected working parts

Следующий rollout **не должен ломать** уже восстановленные части:
- parsing `product-parts.index.md`;
- появление `Product Part` cards после index write;
- hidden continuation после index write;
- `Source` availability на index artifact;
- staged sequence lock / gating / review boundary;
- базовую сборку compatibility aggregate pipeline как workflow step.

Если для новой фиксации шаблонов нужен additive compatibility shim, он должен быть локализован и не менять рабочий ранний flow.

---

## 5. Required implementation outcomes

### 5.1. Canonical template SSOT
- Удалить legacy ambiguity из `product-part-template.md`.
- Зафиксировать один user-facing `Product Part` template, который одновременно человекочитаем и deterministic для parser-а.
- Явно определить, какие sections semantic, а какие optional narrative appendix.

### 5.2. Prompt delivery
- Runtime contract обязан передавать template path именно текущего turn-а.
- `index` turn получает canonical index template.
- `product-part` turn получает canonical single-part template.
- Prompt не должен провоцировать template hunting: агент должен знать, какой шаблон у него есть прямо сейчас.

### 5.3. Parser/validation alignment
- Parser обязан читать canonical template без эвристик.
- Validation должна падать явно, если файл заявляет ownership structure, но semantic entities не materialize-ятся.
- Нельзя больше считать part-file "достаточно хорошим" только потому, что у него есть `Part ID` и `Purpose`.

### 5.4. Transitional compatibility
- Для уже существующих live drift files допускается ограниченная backward compatibility на период миграции.
- Но она должна быть оформлена как transition guard, а не как новый открытый набор форматов.

### 5.5. Regression coverage
- Отдельные tests нужны для:
  - canonical template parsing;
  - runtime prompt/template delivery;
  - validation failure на semantically-empty part file;
  - compatibility aggregate from canonical part files.

---

## 6. Implementation rule

Новый scope должен исправлять именно contract chain `template -> prompt delivery -> parser -> validation -> aggregate`.
Не расширять параллельно unrelated части UI/layout/orchestration, если это не требуется для совместимости.
