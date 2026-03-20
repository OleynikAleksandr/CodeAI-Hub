# Архитектура пользовательского layout и формата diagram stages

**Статус:** Discussion baseline
**Дата:** 2026-03-20
**Охват:** user-facing отображение и читаемость `Diagram Modules` / `Diagram Facades` при первом открытии, без обязательного наличия `*.flow.json`

**Связанные документы:**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
- `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`
- `doc/Sessions/Session106.md`
- `doc/Sessions/Session107.md`
- `doc/TODO/todo-plan.md`

---

## 1. Проблема

Текущий diagram runtime уже умеет:
- читать semantic artifact шага;
- строить React Flow projection;
- применять поверх него `*.flow.json`, если sidecar уже существует;
- сохранять пользовательские drag-перемещения обратно в sidecar.

Но product-quality первого открытия диаграммы сейчас недостаточен.

Подтвержденный дефект на текущем `Diagram Modules` artifact:
- при отсутствии `module-map.flow.json` визуальная диаграмма всё равно рендерится;
- fallback-layout расставляет node-ы так, что часть карточек пересекается;
- длинные responsibility-тексты делают карточки выше ожидаемого базовым алгоритмом;
- standalone modules оказываются в тех же координатных lane-ах, что и clustered modules;
- пользователь видит читаемо не весь graph даже до первой ручной правки.

Пользовательский эффект:
- артефакт в `Artifacts` визуально выглядит сломанным;
- доверие к шагу падает уже на первом открытии;
- user вынужден вручную раздвигать graph до того, как сможет нормально его прочитать.

---

## 2. Подтвержденные факты

### 2.1. Semantic SSOT уже определен корректно

Для `Diagram Modules` source of truth остается:
- `.codeai-hub/<workspace>/diagram_modules/module-inventory.md`

Для `Diagram Facades` source of truth остается:
- `.codeai-hub/<workspace>/diagram_facades/facade-map.md`

`*.flow.json` не является semantic source of truth и не должен подменять Markdown artifact.

### 2.2. Диаграмма уже строится без sidecar

Если `module-map.flow.json` отсутствует, PM не падает и не показывает пустой canvas. Вместо этого runtime:
- materialize-ит graph напрямую из `module-inventory.md`;
- строит default React Flow projection;
- использует sidecar только как optional position override.

Значит, first-open readability обязана обеспечиваться самим fallback-layout, а не наличием sidecar.

### 2.3. Текущий fallback-layout слишком примитивен

Подтвержденные причины дефекта:
- координаты сейчас вычисляются фиксированными шагами по `x/y`;
- standalone modules раскладываются по тем же lane-ам, что и clustered modules;
- вертикальный шаг не учитывает реальную высоту карточки;
- карточки имеют variable height из-за длины responsibility и служебных строк.

Следствие:
- на длинных текстах появляются вертикальные налезания;
- standalone stores/services могут перекрывать cluster columns.

### 2.4. Sidecar нужен только для user-owned geometry

Текущий layout sidecar должен и дальше хранить только:
- координаты node-ов;
- viewport;
- revision guard.

Это правильный контракт, и менять его на semantic artifact нельзя.

---

## 3. Требование уровня продукта

Пользовательская диаграмма должна быть читаемой уже на первом открытии, даже если:
- workflow artifact только что создан;
- `module-map.flow.json` / `facade-map.flow.json` ещё не существует;
- пользователь ни разу не двигал node-ы руками.

Новый product baseline:
- без перекрытий карточек;
- с предсказуемым расположением cluster lanes;
- с отдельной и читаемой зоной для standalone modules;
- с приемлемой плотностью текста;
- с детерминированным initial layout для одинакового semantic input;
- с сохранением user-owned geometry в sidecar после ручной правки.

---

## 4. Инварианты scope

1. Semantic source of truth не меняется:
   - `module-inventory.md` и `facade-map.md` остаются каноническими.
2. `*.flow.json` остается non-semantic sidecar:
   - только positions/viewport/revision.
3. First-open rendering не может зависеть от предварительного ручного drag.
4. Fallback-layout не имеет права смешивать standalone nodes с cluster columns.
5. Карточки не должны перекрывать друг друга даже при длинном responsibility-тексте.
6. Любая ручная раскладка пользователя должна по-прежнему побеждать fallback-layout при совпадающем `revision`.

---

## 5. Направление решения

### 5.1. Separate default layout from sidecar override

Нужно формально разделить два слоя:
- **default layout engine**: детерминированно строит читаемый graph без sidecar;
- **sidecar override layer**: применяет user-owned positions поверх default layout, если `revision` совпадает.

### 5.2. Layout должен стать lane-aware

Базовый layout для `Diagram Modules` должен как минимум различать:
- cluster headers;
- modules внутри каждого cluster lane;
- standalone lane или набор standalone lanes, не пересекающихся с cluster lanes.

### 5.3. Vertical placement должен учитывать размер карточки

Фиксированный `y-step` сам по себе недостаточен.

Нужен один из двух вариантов:
- либо измеряемый/вычисляемый card height budget;
- либо формализованные size tiers, зависящие от объема текста/метаданных.

В обоих случаях итоговое правило одно:
- следующий node в lane должен ставиться после фактической высоты предыдущего node плюс predictable gap.

### 5.4. Visual format карточек тоже входит в scope

Проблема не только в координатах. На итоговую читаемость влияют:
- ширина карточек;
- плотность responsibility-текста;
- наличие/отсутствие text clamp;
- порядок secondary metadata;
- визуальное различие cluster / module / facade / standalone.

Значит scope должен покрывать не только placement algorithm, но и format contract самих node cards.

---

## 6. Открытые решения для обсуждения

Эти вопросы нужно утвердить до начала кода:

1. Как именно пользователь должен видеть standalone modules:
   - одной отдельной колонкой;
   - отдельной секцией ниже cluster lanes;
   - несколькими dedicated lanes.
2. Что делать с длинным responsibility:
   - полный текст в карточке;
   - clamp + tooltip/details;
   - короткий summary в card и полный текст в side panel.
3. Нужно ли выравнивать clusters по общей сетке высот или разрешить каждой lane жить собственной вертикальной жизнью.
4. Должен ли `Diagram Facades` получить тот же layout engine сразу или после стабилизации `Diagram Modules`.
5. Нужен ли отдельный visual contract для store/gateway/service/adapters, или пока достаточно текущего отличия по caption.

---

## 7. Кандидатные implementation slices

Это пока не финальные execution streams, а заготовка для дальнейшего обсуждения.

### Slice A — Layout contract baseline

- Зафиксировать user-facing требования к first-open layout.
- Утвердить lane model для clustered и standalone nodes.
- Зафиксировать boundary между default layout и sidecar override.

### Slice B — Node format contract

- Утвердить width/spacing/text-density contract карточек.
- Определить, где полный текст, а где summary.
- Согласовать визуальную читаемость на типовых длинных responsibility.

### Slice C — Runtime layout implementation

- Перестроить default placement algorithm.
- Исключить standalone/cluster overlap.
- Исключить vertical overlap при variable-height cards.

### Slice D — Verification

- Добавить targeted regression checks для first-open layout без sidecar.
- Проверить, что sidecar persistence по-прежнему корректно override-ит fallback positions.
- Зафиксировать ручные smoke scenarios для `Diagram Modules`.

---

## 8. Что не входит в этот scope

- Пересмотр semantic структуры `module-inventory.md` как таковой.
- Возврат inline semantic editing в canvas.
- Изменение смысла `*.flow.json` с layout sidecar на semantic artifact.
- Полный redesign всего Project Manager вне правой панели diagram stages.

---

## 9. Условие готовности planning-baseline

Planning baseline можно считать утвержденным, когда мы вместе зафиксируем:
- expected first-open behavior без sidecar;
- политику расположения standalone modules;
- формат и плотность текста внутри карточек;
- границы первого implementation stream.

Только после этого active `todo-plan.md` должен раскладываться на полноценные execution streams под код.
