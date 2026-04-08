# Diagram Modules — Live Measurement Stabilization Architecture

**Status:** Completed and archived after release `1.1.915`
**Date:** 2026-04-08
**Owner:** Oleksandr + Codex
**Scope:** corrective scope after release `1.1.914`

---

## 1. Problem

После пользовательской проверки релиза `1.1.914` подтверждено, что дефект нижних наложений в initial autolayout `Diagram Modules` не исправлен.

Симптом на этом этапе уже выглядит так:
- после первого открытия диаграммы нижние границы `CLUSTER` и `PRODUCT PART` всё ещё оказываются выше реального нижнего края дочерних `MODULE`;
- при ручном перемещении поведение заметно лучше, чем при initial autolayout;
- значит проблема живет не в общей manual collision logic, а именно в live pipeline первого измерения и первого measured normalize pass.

---

## 2. Root Cause Hypothesis

Текущий `DiagramEditorMeasuredLayoutBridge` делает measurement snapshot слишком рано и ведет себя как почти одноразовый снимок.

Это особенно опасно для `Diagram Modules`, потому что финальная визуальная высота module card зависит от:
- реального wrapping текста;
- загрузки рабочего шрифтового стека Project Manager;
- post-render стабилизации DOM после первого mount и `fitView`.

Итог:
- initial autolayout получает еще неустоявшиеся measured heights;
- container resize рассчитывается по заниженным значениям;
- позже DOM становится выше, но bridge больше не форсирует повторный measured pass по факту изменения геометрии.

То, что manual drag ведет себя лучше, согласуется именно с timing root cause: ручная нормализация происходит позже, когда DOM уже стабилизировался лучше, чем в первый момент initial autolayout.

---

## 3. Target Contract

Вводится новый runtime invariant:

1. Initial autolayout `Diagram Modules` не имеет права опираться только на первый synchronous measurement snapshot.
2. Measurement bridge обязан повторно эмитить measured nodes, если реальная DOM-геометрия node/header изменилась после первого mount.
3. Источниками re-measure должны быть как минимум:
   - следующий animation frame после render;
   - поздняя готовность шрифтов (`document.fonts.ready`), если браузер её поддерживает;
   - фактическое изменение размеров DOM-узлов через `ResizeObserver`.
4. Measurement dedupe не должен проглатывать второй pass только потому, что изменились container style bounds или поздние DOM measurements прибыли после первого emission.
5. Acceptance считается достигнутым только если новый first-open autolayout получает стабильные measured heights без ручного вмешательства.

---

## 4. Implementation Strategy

### 4.1. Stabilize the measurement bridge

`diagram-editor-measured-layout-bridge.tsx` нужно перевести с модели “один снимок после `nodesInitialized`” на модель “measure until layout stabilizes”.

Bridge должен:
- планировать measurement через `requestAnimationFrame`;
- слушать реальные resize-события node/header DOM через `ResizeObserver`;
- дожидаться `document.fonts.ready`, если API доступен;
- корректно очищать listeners/observers при unmount и при смене входных nodes.

### 4.2. Tighten bridge dedupe

Сигнатура измерений должна учитывать не только `position` и measured metrics, но и runtime style bounds, чтобы повторный pass не терялся после owner resize.

### 4.3. Regression coverage

Минимальная защита на этот corrective cycle:
- source-level regression для bridge, что в нём есть `ResizeObserver`, `requestAnimationFrame` и `document.fonts.ready` path;
- таргетные diagram tests + `build:webview` + `typecheck:webview` перед release.

### 4.4. SSOT sync

В SSOT `Diagram Modules` нужно зафиксировать, что initial autolayout geometry считается valid только после stabilized live measurement, а не по первому доступному DOM snapshot.

---

## 5. Files In Scope

Code:
- `src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-bridge.tsx`
- `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`

Docs:
- `doc/SolidWorks-WorkFlow/System/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
- `README.md`
- `CHANGELOG.md`

---

## 6. Acceptance Criteria

Scope считается закрытым только если:

1. Measurement bridge делает повторный measured pass после поздней стабилизации DOM.
2. Regression coverage явно защищает `ResizeObserver` / `fonts.ready` / `requestAnimationFrame` path.
3. Initial autolayout в shipped build больше не требует ручного drag, чтобы нижние границы `CLUSTER` и `PRODUCT PART` перестали налезать на `MODULE`.
4. Собран новый release с новым `VSIX` и свежими tarball-артефактами.
