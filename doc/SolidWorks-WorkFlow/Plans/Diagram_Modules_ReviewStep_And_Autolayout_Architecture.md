# Diagram Modules Review Step And Deterministic Autolayout — Architecture Draft

**Статус:** Accepted planning baseline
**Дата:** 2026-03-23
**Охват:** `Diagram Modules` как главный user-review step, детерминированный first-open autolayout, purpose/description surface для `Product Part` и `Cluster`, release scope после принятия fixes

**Связанные документы:**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_PromptConsistency_And_Autolayout_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`
- `doc/Sessions/Session130.md`
- `doc/TODO/todo-plan.md`

---

## 1. Почему этот шаг становится ключевым

После двух первых workflow-stage пользователь уже лучше понимает, что именно хочет построить:
- на step `Description` он договаривается о смысле и границах идеи;
- на step `Virtual Simulation` он проверяет сценарии, роли и ожидаемое поведение;
- на step `Diagram Modules` это понимание впервые превращается в наглядную структуру.

Именно здесь пользователь получает одновременно:
- визуальную картину системы;
- иерархию `Product Part -> Cluster -> Module`;
- короткие текстовые пояснения;
- возможность увидеть, что именно связано с чем, ещё до формализации relation lines.

Следствие:
- `Diagram Modules` должен считаться главным review-step всего workflow;
- именно здесь ожидается максимальный объём уточнений и структурных правок;
- `Diagram Facades` остаётся важным, но уже заметно более техническим этапом, ориентированным скорее на агента, чем на непрофильного пользователя.

Это не означает, что diagram stage обязана быть идеальной с первого раза.
Greenfield workflow по определению допускает неполноту, ошибки понимания и возвраты на предыдущие стадии. Задача продукта здесь не "угадать архитектуру с первого запроса", а дать пользователю максимально понятную форму для исправления своей мысли.

---

## 2. Подтверждённые проблемы текущего user-facing surface

На плотном `Product Part` с двумя cluster-ами и standalone module подтверждены три класса дефектов.

### 2.1. Hard layout bugs

- module cards залезают в header-zone cluster-а;
- module cards могут налезать друг на друга по вертикали;
- vertical placement считается слишком грубо и не уважает фактическую высоту контента.

Это не вопрос вкуса и не проблема "пользователь плохо объяснил". Это defect самого layout contract.

### 2.2. Defect компактизации product part

- standalone module отрывается слишком далеко от cluster column-ов;
- из-за этого `Product Part` растягивается по высоте пустым декоративным пространством;
- нижняя граница container-а определяется не по реально занятому содержимому.

### 2.3. Пробел информационной модели

- `Module` уже имеет описание ответственности;
- `Product Part` и `Cluster` показывают имя и счётчики, но почти не объясняют своё назначение;
- пользователю не хватает короткого purpose/description блока на верхних уровнях иерархии.

Если исправить только размещение, но не добавить purpose text, диаграмма останется технически аккуратной, но всё ещё слабой как review surface.

---

## 3. Принятое направление решения

Для `Diagram Modules` нужен не абстрактный "умный графовый autolayout", а простой и детерминированный блочный алгоритм `measure -> place`.

### 3.1. Шаг 1: Measure

Сначала вычисляются размеры всех блоков:
- `Product Part` header-zone;
- `Cluster` header-zone;
- `Module` card.

`Module` уже считается по тексту и эту логику можно использовать дальше как базу.

Для `Product Part` и `Cluster` header-zone должна включать:
- label;
- title;
- meta-счётчики;
- короткий purpose/description text.

Важно:
- дочерние карточки не имеют права заходить в header-zone;
- высоты должны считаться от реального содержимого, а не от грубой константы "по числу модулей".

### 3.2. Шаг 2: Place

После измерения layout раскладывается сверху вниз:
- сначала внутри каждого cluster-а;
- затем внутри `Product Part`.

`Cluster` строится как вертикальный контейнер:
- header-zone;
- фиксированный gap;
- вертикальный стек module cards;
- нижний padding.

Итоговая высота cluster-а:
- `header height + header-to-body gap + sum(module heights and gaps) + bottom padding`.

`Product Part` строится аналогично:
- header-zone;
- gap до body-area;
- cluster columns;
- standalone modules, которые не падают в нижний "подвал", а пристыковываются под более короткую измеренную колонку;
- симметричные left/right/bottom paddings.

---

## 4. Принятые layout-правила

### 4.1. Инварианты

1. Ни один дочерний блок не пересекает header-zone родителя.
2. Ни один module card не пересекает соседнюю module card.
3. Высота `Cluster` и `Product Part` считается по реальному содержимому.
4. `Product Part` и `Cluster` обязаны иметь purpose/description surface.
5. Нижняя граница `Product Part` определяется по реально самому нижнему дочернему элементу плюс bottom padding.
6. Для одинакового semantic input layout должен быть детерминированным.

### 4.2. Компактизация

1. Контент внутри container-а начинается сразу после header-zone и фиксированного gap.
2. Вертикальное размещение module cards считается накопительно от фактической высоты предыдущей карточки.
3. Standalone modules приклеиваются не ко дну container-а, а под более короткую колонку.
4. `Product Part` не должен создавать пустую декоративную вертикаль ради "симметрии".

### 4.3. Читаемость

1. `Product Part` должен коротко объяснять, что это за часть продукта.
2. `Cluster` должен коротко объяснять, какую подзону ответственности он держит.
3. `Module` сохраняет текущее описание ответственности.
4. Приоритет у читаемости и компактности, а не у идеальной геометрической симметрии.

---

## 5. Дополнительное правило для purpose text

`Product Part` description не должен всегда насильно занимать только вертикальное место под title.

Принятый baseline:
- если в верхней части container-а есть полезное горизонтальное пространство, purpose block может занимать его;
- если места недостаточно, purpose block безопасно уходит под title/meta;
- для кода это означает не обязательную "умную типографику", а наличие явной purpose-zone, которую layout умеет измерить и уважать.

Для `Cluster` baseline проще:
- purpose text входит в header-zone как обычная часть вертикального блока;
- cluster layout не должен зависеть от сложного side-by-side размещения.

---

## 6. Что входит в execution scope

1. Зафиксировать `Diagram Modules` как главный review-step workflow в planning/docs.
2. Протянуть purpose text `Product Part` / `Cluster` до React Flow data contract и renderer-а.
3. Перевести cluster height и product-part height на измеряемую модель.
4. Перестроить placement standalone modules так, чтобы они занимали более короткую колонку вместо пустого нижнего band-а.
5. Снять regression evidence на самом плотном `Product Part`.
6. После принятия fixes собрать новый локальный релиз.

---

## 7. Что не входит в этот scope

- Формализация relation lines и их visual routing.
- Полный redesign diagram runtime.
- Полная переработка `Diagram Facades` в той же волне.
- Попытка убрать все пользовательские исправления на стадии `Diagram Modules`.
- Реализация reviewer-loop как отдельного продукта прямо сейчас.

Reviewer / long-discussion loop здесь признаётся важной будущей темой, но не должен блокировать ближайший layout/readability slice.

---

## 8. Предлагаемые execution streams

### Stream A — Planning and workflow framing

- Заархивировать завершённый предыдущий plan.
- Открыть новый scope, где `Diagram Modules` трактуется как основной user-feedback step.
- Зафиксировать accepted autolayout rules и boundary текущего релизного scope.

### Stream B — Product hierarchy card contract

- Передать purpose text `Product Part` / `Cluster` через flow-node data.
- Отрисовать purpose text в container cards.
- Подтвердить, что purpose text не ломает текущую module card semantics.

### Stream C — Deterministic cluster measurement

- Перевести cluster layout с расчёта "по числу модулей" на расчёт по measured content.
- Зарезервировать header-zone cluster-а.
- Исключить overlaps внутри cluster column.

### Stream D — Standalone compaction inside product part

- Размещать standalone modules под более короткой измеренной колонкой.
- Замкнуть границы `Product Part` по реально занятому содержимому.
- Сохранить симметричные outer paddings.

### Stream E — Verification and release

- Зафиксировать visual regression evidence на плотном сценарии.
- Обновить workflow/docs, где это нужно.
- Выполнить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`.

---

## 9. Ожидаемый результат

После этого scope пользователь должен получать на `Diagram Modules`:
- несломанную first-open диаграмму без налезаний;
- более компактный `Product Part` без пустого нижнего band-а;
- видимое назначение `Product Part` и `Cluster`, а не только их названия;
- более надёжную основу для дальнейшего обсуждения структуры продукта;
- новый локальный релиз, на котором этот review-step можно прогонять дальше.

---

## 10. Regression Evidence After First Implementation Pass

На текущем implementation pass уже подтверждено:
- `Product Part` и `Cluster` получили purpose surface в React Flow projection и renderer;
- `Diagram Modules` зафиксирован в workflow/system docs как главный user-review step до `Diagram Facades`;
- высота `Cluster` больше не считается только по числу модулей: runtime учитывает measured header/content budget и больше не опирается на один грубый `y-step`;
- stack safety для длинных module cards зафиксирован regression test-ом `domain-model-to-react-flow.standalone-band.test.ts`;
- standalone modules внутри `Product Part` больше не обязаны падать в общий нижний band: shortest-column docking зафиксирован regression test-ом `domain-model-to-react-flow.product-parts.test.ts`.

Текущий evidence set для dense scenario:
- `npx tsx --test src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.product-parts.test.ts src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.standalone-band.test.ts src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.test.ts`
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-ownership-renderer.test.tsx src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.test.ts`

Следующий обязательный шаг после этой фиксации evidence:
- собрать новый локальный release baseline и прогнать release-level verification.

---

## 11. Post-Release Findings After 1.1.766 User Test

Релиз `1.1.766` подтвердил, что направление исправлений выбрано верно:
- purpose surface у `Product Part` и `Cluster` появился;
- standalone modules больше не проваливаются в общий пустой нижний band;
- общий dense `Product Part` стал заметно компактнее и понятнее.

Но пользовательский тест сразу показал второй класс остаточных дефектов.

### 11.1. Product Part header/body separation всё ещё нестабилен

На плотном `Product Part` purpose block визуально доходит до верхней границы cluster-ов.
Это означает, что body-area для cluster columns начинается не от реальной нижней точки header-content, а от сокращённого budget, который недооценивает высоту description.

Следствие:
- clusters могут визуально налезать на purpose surface;
- проблема проявляется не только при длинном title, но и при длинном purpose text;
- сам факт наличия purpose surface уже недостаточен, если container не умеет зарезервировать под неё весь vertical budget.

### 11.2. Cluster header/body separation тоже остаётся нестабилен

Во втором плотном сценарии первый module card внутри cluster-а всё ещё может подниматься слишком рано и налезать на description cluster-а.
Это показывает, что старт module-stack считается не от фактического `header bottom`, а от приближённого значения.

Следствие:
- cluster description визуально конфликтует с первым module card;
- perceived distance между модулями в разных cluster-ах кажется разной даже при одинаковом числе cards;
- корень проблемы находится не в module gap как таковом, а в нестабильной стартовой точке первого module.

### 11.3. Product Part purpose width использует горизонтальное место слишком слабо

Верхняя правая зона `Product Part` уже существует, но purpose panel остаётся слишком узкой.
Из-за этого:
- текст purpose разбивается на лишние строки;
- header artificially растёт по высоте;
- overlap с cluster section проявляется сильнее;
- рядом с title/meta остаётся неиспользуемое горизонтальное пространство.

### 11.4. Принятые правила для второго pass

1. `Product Part` body должен начинаться от реальной нижней границы всего header-content плюс фиксированный body-start gap.
2. `Cluster` body должен начинаться от реальной нижней границы cluster header plus одинаковый fixed module-stack start gap.
3. Product part purpose panel должна занимать большую доступную ширину справа, чтобы purpose text реже дробился на лишние строки.
4. Первая module card в каждом cluster-е должна стартовать по единому контракту: `header bottom + fixed gap`.
5. Gap между соседними module cards остаётся константой и не должен казаться разным из-за плавающей верхней точки stack-а.

### 11.5. Execution impact

Следующий implementation slice должен быть не новым redesign, а точечным second-pass fix:
- пересчитать measurement contract для `Product Part` header;
- пересчитать measurement contract для `Cluster` header;
- расширить width allocation для `Product Part` purpose panel;
- добить regression tests под stable header/body boundary и consistent stack start;
- после этого собрать ещё один локальный release baseline для пользовательского retest.
