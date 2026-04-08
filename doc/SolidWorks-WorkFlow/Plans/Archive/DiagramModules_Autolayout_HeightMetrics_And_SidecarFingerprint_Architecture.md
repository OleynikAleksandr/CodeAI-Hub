# Diagram Modules Autolayout Height Metrics And Sidecar Fingerprint Architecture

**Status:** Draft for review (2026-04-08)
**Created:** 2026-04-08
**Updated:** 2026-04-08
**Owner:** Oleksandr + Codex
**Scope:** Устранить остаточные налезания в dense/localized `Diagram Modules`, вызванные занижением height budget в initial layout и повторным применением устаревшей geometry из `module-map.flow.json`.

---

## 1. Problem

После закрытия предыдущего execution scope trunk workflow работает на релизе `1.1.906`, но `Diagram Modules` всё ещё даёт hard layout defects на плотном `Product Part`:

- внутри cluster `Project Manager Workflow Ui` модуль `Project Structure Map` одновременно заходит в соседний module card сверху и в нижнюю границу cluster container;
- standalone module `Dialogue Control Module` заходит в нижнюю границу owning `Product Part`;
- дефект проявляется на user-facing first-open surface, то есть ломает сам review baseline шага `Diagram Modules`.

Это означает, что текущий contract `measure -> place` остаётся неполным именно на плотных локализованных текстах и не гарантирует инвариант:

- child cards не пересекают друг друга;
- child cards не пересекают boundary родительского container-а;
- `module-map.flow.json` не должен возвращать geometry, рассчитанную по уже устаревшей визуальной метрике.

---

## 2. Root Cause

### 2.1. Источник initial layout уже локализован

Current first-open layout целиком строится в:

- `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`

Именно этот адаптер:

- рассчитывает `Product Part` / `Cluster` / `Module` размеры;
- задаёт стартовую точку cluster body;
- рассчитывает baseline для standalone modules;
- определяет нижнюю границу product part.

Следовательно, defect находится не в semantic DSL и не в runtime orchestration, а в самом geometry contract адаптера.

### 2.2. Height estimator остаётся слишком оптимистичным

Текущий adapter измеряет текст через приближённый `chars-per-line` budget и набор hand-tuned constants.

Подтверждённые проблемы этого подхода:

1. `Product Part` purpose panel занижает vertical budget:
   - `getPurposePanelHeight()` использует line-height budget, который не совпадает с реальным `purposeTextStyle`.
2. `Cluster` header и `Module` card завязаны на символные коэффициенты, которые были приемлемы для более короткого англоязычного baseline, но недостаточно безопасны для текущего PM font stack и русских длинных строк.
3. Модульные card heights пишутся как `minHeight`, а не как жёстко рассчитанный `height`.
   - если DOM оказывается выше прогноза, следующий sibling и parent boundary остаются на старой координате.

Следствие:

- cluster height может закрываться раньше реального bottom последней card;
- product part height может закрываться раньше bottom standalone card;
- visual overlap становится возможным даже без sidecar и без user drag.

### 2.3. Shell не лечит плохой initial layout

`src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`

только:

- применяет user drag changes;
- разрешает sibling collisions для moved nodes;
- bottom-up resizing работает после ручного перемещения, но не пересчитывает сам initial layout contract.

Следовательно, если projection уже пришла со заниженными размерами, shell её не нормализует автоматически.

### 2.4. Sidecar contract знает только semantic revision

`src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts`

сейчас применяет `module-map.flow.json`, если совпадает только `revision`.

Этого недостаточно, потому что:

- semantic artifact может не измениться;
- layout metric contract может измениться;
- old sidecar positions могут быть валидны для старой геометрии и невалидны для новой.

Следствие:

- после изменения height estimator пользователь может снова увидеть stale overlap из старого sidecar, даже если computed layout уже исправлен.

---

## 3. Product Goal

После этого scope `Diagram Modules` должен давать стабильный first-open baseline для плотного локализованного `Product Part`:

1. Ни один module card не пересекает sibling card.
2. Ни один module card не пересекает нижнюю boundary своего `Cluster` или `Product Part`.
3. Start point cluster/module body рассчитывается от измеренного header bottom плюс фиксированный gap.
4. Standalone baseline рассчитывается от реального tallest cluster bottom, а не от недооценённого container budget.
5. `module-map.flow.json` применяется только если его geometry совместима не только по semantic `revision`, но и по текущей layout-metric версии.
6. Regression coverage воспроизводит dense localized scenario, близкий к пользовательскому скриншоту.

---

## 4. Non-Goals

Этот scope не должен:

- вводить DOM measurement / `ResizeObserver` / runtime probing размеров React Flow nodes;
- менять semantic DSL `product-parts.index.md` / `product-parts/<part-id>.md`;
- переделывать `Diagram Modules` в другой layout engine;
- менять manual-layout-first boundary;
- расширять scope на `Diagram Facades`;
- смешивать этот fix с branch workflow или implementation foundation.

Это точечный hardening pass существующего deterministic `measure -> place`.

---

## 5. Core Decisions

### 5.1. Сохраняем deterministic estimator, но делаем его консервативным

В этом execution cycle не вводится DOM-based measurement.

Вместо этого:

- height estimator в `module-stage-react-flow.ts` становится renderer-faithful и intentionally conservative;
- line-height constants должны совпадать с фактическими `fontSize/lineHeight` из `diagram-editor-facade.tsx`;
- purpose/header/module budgets округляются вверх и должны предпочитать небольшой запас вместо риска overlap.

Правило:

- неверно недооценивать высоту и получать налезание;
- допустимо дать небольшой дополнительный vertical reserve, если это цена стабильного first-open layout.

### 5.2. Header/body boundary считается от полного measured header budget

Для `Product Part` и `Cluster` фиксируется одинаковый принцип:

- сначала измеряется весь header content;
- затем body start = `header bottom + fixed gap`;
- child stack стартует только от этой точки.

Следовательно:

- `Cluster` больше не может начинать module stack от сокращённого approximation value;
- `Product Part` больше не может поднимать cluster section или standalone band раньше полного bottom purpose block.

### 5.3. Parent bottom замыкается по реально рассчитанному child bottom

`Cluster` и `Product Part` должны рассчитывать нижнюю границу только по самому нижнему дочернему элементу:

- `cluster bottom = max(cluster child bottoms) + bottom padding`;
- `product part bottom = max(cluster bottoms, standalone bottoms) + bottom padding`.

Standalone modules не должны получать привилегированную «декоративную» зону, которая потом закрывается раньше их реального bottom.

### 5.4. Sidecar получает layout metric fingerprint

В `FlowSidecarDocument` вводится дополнительный compatibility field:

- `layoutMetricVersion` (или эквивалентный fingerprint constant).

Новый apply contract:

- sidecar применяется только если совпадают и `revision`, и `layoutMetricVersion`;
- при несовпадении используется computed layout;
- отсутствие нового поля в legacy sidecar трактуется как incompatible после введения нового contract.

Это deliberate invalidation:

- старые пользовательские manual positions один раз перестанут применяться после изменения layout metric contract;
- зато пользователь не увидит geometry, несовместимую с новой высотной моделью.

### 5.5. Regression coverage обязана воспроизводить localized dense failure

Англоязычный happy-path baseline недостаточен.

Новые regression tests должны отдельно покрыть:

1. dense cluster с русским responsibility text, где третий module card раньше мог пересечь sibling и boundary;
2. dense product part со standalone module, который раньше мог пересечь нижнюю границу product part;
3. sidecar invalidation по layout metric mismatch.

---

## 6. Planned Implementation Surface

Основной кодовой surface этого scope:

- `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`
- `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts`
- `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.standalone-band.test.ts`
- `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.product-parts.test.ts`
- `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`

Документационный surface после подтверждённой реализации:

- `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
- `doc/TODO/todo-plan.md`
- `doc/Sessions/Session013.md`

---

## 7. Acceptance Criteria

Scope считается закрытым, когда одновременно выполнено следующее:

1. Dense localized regression fixture доказывает, что module cards больше не пересекаются внутри cluster-а.
2. Dense localized regression fixture доказывает, что standalone module не пересекает нижнюю границу product part.
3. Sidecar test доказывает fallback на computed layout при metric-version mismatch.
4. Targeted verification для PM diagram surface проходит без новых layout regressions.
5. SSOT / execution docs синхронизированы.
6. Собран новый локальный release baseline с этим fix.

---

## 8. Risks And Tradeoffs

1. После введения `layoutMetricVersion` старые пользовательские позиции из legacy sidecar будут один раз проигнорированы.
   - Это ожидаемая и приемлемая цена за отказ от stale geometry.
2. Estimator остаётся эвристическим.
   - Scope не обещает pixel-perfect DOM measurement; он обещает стабильный safe baseline на подтверждённом defect scenario.
3. Dense русскоязычные тексты должны стать частью постоянного regression набора.
   - Иначе будущие cosmetic changes снова откалибруют layout только под английский happy-path.
