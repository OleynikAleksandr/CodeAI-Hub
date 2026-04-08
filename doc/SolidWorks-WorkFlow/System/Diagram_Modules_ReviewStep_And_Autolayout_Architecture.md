# Diagram Modules Review Step And Deterministic Autolayout — Architecture Draft

**Статус:** Accepted planning baseline
**Дата:** 2026-03-23
**Охват:** `Diagram Modules` как главный user-review step, детерминированный first-open autolayout, purpose/description surface для `Product Part` и `Cluster`, release scope после принятия fixes

**Связанные документы:**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_PromptConsistency_And_Autolayout_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`
- `doc/Sessions/Archive/Session130.md`
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

### 11.7. Measured post-render min-gap enforcement completed on 2026-04-08

Пользовательский тест релиза `1.1.907` подтвердил, что одного усиления projection-time height heuristics недостаточно.

Root cause зафиксирован явно:
- projection already reserved nominal gaps and paddings;
- but the first-open layout still trusted estimated node heights instead of the actual React Flow measured boxes;
- shell-level collision repair existed only for dragged nodes, not for the first rendered layout.

Принятый corrective contract теперь такой:
- deterministic projection остаётся начальным seed layout;
- после first render React Flow bridge поднимает реальные measured width/height каждого ownership node;
- shell запускает отдельный measured normalization pass;
- hard invariant теперь формулируется на **реальных** box sizes: между всеми соседними ownership boxes (`Product Part`, `Cluster`, `Module`) должен оставаться минимум `4px`.

Что именно реализовано:
- добавлен pure measured-layout normalizer, который снизу вверх перепаковывает later siblings вниз без перестройки `x`-колонок и без “teleport” поведения ранних узлов;
- cluster and product-part heights теперь могут дорасти после first render по реально измеренному самому нижнему child bottom;
- отдельный React Flow child bridge читает `getInternalNode(...).measured` и прокидывает measured nodes в shell;
- stale `module-map.flow.json` geometry снова инвалидируется через новый `FLOW_SIDECAR_LAYOUT_METRIC_VERSION = 2`, чтобы дофиксная layout-метрика не переиспользовалась как canonical.

Новый evidence set для measured contract:
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.test.ts src/client/project-manager/components/diagram-editor/diagram-editor-shell.test.ts src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.product-parts.test.ts src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.standalone-band.test.ts`
- `npm run build:webview`
- `npm run typecheck:webview`

Практический смысл этого pass:
- теперь first-open layout больше не обязан идеально угадать высоты на projection stage;
- если реальный текст растянул карточку сильнее прогноза, measured pass обязан опустить следующий sibling и расширить контейнер до безопасной нижней границы;
- это напрямую убирает остаточные overlap cases, которые пользователь всё ещё видел на `1.1.907`.

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

### 11.6. Localized boundary hardening pass completed on 2026-04-08

В текущем corrective scope подтверждено следующее:

- initial layout estimator в `module-stage-react-flow.ts` стал консервативнее для текущего PM font stack и длинных русскоязычных строк;
- `Product Part` purpose panel теперь считает высоту по фактическому `line-height: 1.4`, а не по заниженному single-line budget;
- плотный localized cluster scenario больше не оставляет только 12px safety reserve на заниженной card height: regression fixtures отдельно проверяют, что последний module card не пересекает ни sibling сверху, ни нижнюю границу cluster-а;
- плотный localized standalone scenario отдельно проверяет, что `Dialogue Control Module`-класс сценариев не пересекает нижнюю границу owning `Product Part`;
- `module-map.flow.json` получил `layoutMetricVersion` compatibility guard, поэтому legacy sidecar geometry, рассчитанная по старой высотной модели, больше не применяется поверх новой projection.

Текущий evidence set для этого pass:

- `npx tsx --test src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.product-parts.test.ts src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.standalone-band.test.ts src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`
- `npm run build:webview`
- `npm run typecheck:webview`

Итог этого pass:

- accepted boundary теперь включает не только semantic `revision`, но и compatibility fingerprint визуальной метрики sidecar;
- localized dense `Diagram Modules` scenario зафиксирован в постоянном regression наборе как обязательный guardrail перед релизом.

### 11.8. Measured-first ownership reflow completed on 2026-04-08

Пользовательский ретест релиза `1.1.908` подтвердил, что одного measured sibling-gap enforcement недостаточно.

Что именно осталось сломанным после `1.1.908`:
- module-to-module gap действительно стабилизировался;
- но `Module` всё ещё мог визуально упираться в нижнюю границу `Cluster`;
- а `Cluster` / standalone `Module` всё ещё могли упираться в нижнюю границу `Product Part`.

Критическое подтверждение root cause:
- в user-provided workspace `diagram_modules` не было `module-map.flow.json`;
- значит проблема воспроизводилась на freshly computed layout, а не на stale sidecar geometry;
- следовательно, сама ownership layout model оставалась неправильной.

Принятый контракт после этого corrective pass:
- projection остаётся только deterministic seed для `x`-колонок, ownership relations и stable ordering;
- React Flow bridge теперь поднимает не только measured width/height node boxes, но и measured `bodyStartY` для ownership headers;
- `bodyStartY` строится от реального rendered header content plus fixed renderer offsets, а не от text heuristics;
- pure measured pass теперь не "ремонтирует" guessed parent height, а пересобирает `Cluster` и `Product Part` снизу вверх из finalized measured children;
- для ownership containers authoritative height теперь берётся из finalized `style.height`, а не из stale measured seed height.

Практическая модель reflow теперь такая:
1. внутри `Cluster` modules раскладываются по seed columns от measured `bodyStartY`;
2. высота `Cluster` вычисляется из deepest measured child bottom plus bottom padding;
3. внутри `Product Part` clusters и standalone modules раскладываются по своим seed columns от measured product-part `bodyStartY`;
4. высота `Product Part` вычисляется из deepest finalized child bottom plus bottom padding;
5. только после этого раздвигаются top-level `Product Part` siblings.

Новый evidence set для measured-first ownership contract:
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.test.ts`
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-shell.test.ts`
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-ownership-renderer.test.tsx`
- `npx tsx --test --test-name-pattern 'measurement bridge carries measured ownership header boundaries|keeps React Flow diagnostics widgets' src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`
- `npm run build:webview`
- `npm run typecheck:webview`

Итог этого pass:
- boundary safety для `Cluster` и `Product Part` больше не зависит от projection-time guesses о высоте модулей;
- измерение ownership header boundary стало частью runtime contract;
- следующий релиз должен валидироваться на том же workspace, который показал провал `1.1.908`.

### 11.9. Shared visual bounds and unified manual/autolayout contract completed on 2026-04-08

Пользовательский ретест релиза `1.1.909` показал ещё один остаточный дефект:
- нижняя граница `Cluster` и `Product Part` визуально всё ещё могла пересекаться с нижним краем `Module`;
- тот же симптом воспроизводился не только в first-open autolayout, но и после ручного перетаскивания;
- удаление `module-map.flow.json` меняло расстановку, но не убирало сам класс дефекта.

Это доказало сразу две вещи:
- проблема жила в общем ownership boundary contract, а не только в одном initial measured pass;
- border-box geometry всё ещё расходилась с тем, что фактически видит пользователь.

Критический root cause зафиксирован явно:
- `Module` card использует внешний `box-shadow`, который визуально выходит за пределы React Flow border box;
- measured autolayout и manual drag resize до этого corrective slice не делили один и тот же geometry helper;
- manual shell path продолжал пересчитывать container bounds из локальной fallback-модели (`style.height` / `style.minHeight`), а не из общего measured contract.

Принятый контракт после этого pass:
1. layout engine считает boundary safety не по одному border box, а по **visual bottom** прямого child-элемента;
2. для `Module` вводится explicit visual bottom allowance, компенсирующий внешний shadow на нижней границе;
3. высота `Cluster` всегда считается как `max(visualBottom всех direct module children) + bottom padding`;
4. высота `Product Part` всегда считается как `max(visualBottom всех direct cluster/standalone children) + bottom padding`;
5. autolayout и manual drag обязаны вызывать один и тот же shared geometry contract, а не две расходящиеся resize-ветки;
6. stale `module-map.flow.json` снова инвалидируется через новый `FLOW_SIDECAR_LAYOUT_METRIC_VERSION = 4`.

Что именно реализовано:
- добавлен shared layout-bounds helper для canonical width/height/body-start/visual-bottom math;
- measured normalizer теперь строит container bottoms от deepest direct child visual bottom;
- shell manual drag path вынесен в отдельный pure manual normalizer и больше не держит свою локальную container-resize логику;
- shell-level regression evidence теперь отдельно фиксирует, что manual drag проходит через unified normalizer, а не через старый local resize path.

Новый evidence set для shared visual-bounds contract:
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.test.ts`
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-manual-layout-normalizer.test.ts`
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-shell.test.ts`
- `npx tsx --test src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`

Практический смысл этого pass:
- нижняя граница ownership containers теперь определяется по тому, что пользователь реально видит, а не только по border-box math;
- ручное перетаскивание больше не может сохранять контейнеры на старом локальном resize contract;
- следующий релиз должен валидироваться на том же Gemini workspace, где пользователь воспроизвёл совпадающий дефект и в auto, и в manual mode.

### 11.10. Initial autolayout hierarchical packer accepted on 2026-04-08

Пользовательский ретест релиза `1.1.910` показал, что предыдущий corrective slice решил manual mode, но не решил first-open autolayout:
- persisted sidecar-backed layouts теперь должны сохранять пользовательскую композицию;
- manual drag уже держит положительный визуальный зазор;
- но initial autolayout без `module-map.flow.json` всё ещё нельзя строить как старый heuristic seed с последующим repair pass.

Принятый contract теперь разделяет layout source:
- `persisted-sidecar` path сохраняет текущую preserve-and-normalize модель;
- `seed-autolayout` path обязан пересобирать ownership hierarchy от measured geometry.

Для `seed-autolayout` runtime теперь обязан:
1. упаковать `Module` cards внутри каждого `Cluster` от measured `bodyStartY` и measured visual heights;
2. пересчитать высоту `Cluster` от deepest direct child visual bottom;
3. упаковать `Cluster` boxes и standalone `Module` cards внутри `Product Part` от уже финализированных child boxes;
4. пересчитать высоту `Product Part` от deepest direct child visual bottom;
5. повторять этот pack/resize sequence до fixed point.

Это означает, что first-open path больше не моделируется как “projection guess + minimal repair”.
Теперь это “deterministic seed columns + measured hierarchical pack-and-validate loop”.

Новый evidence set для этого corrective contract:
- projection now carries explicit `layoutSource`, so measured normalization distinguishes `seed-autolayout` from `persisted-sidecar`;
- persisted-sidecar path keeps the conservative preserve contract and does not repack the saved composition from scratch;
- seed autolayout now runs through a dedicated pure hierarchical packer that settles `Cluster` and `Product Part` bounds from measured direct children;
- regression coverage explicitly proves both sides of the split: safe initial autolayout and preserved sidecar-backed composition.

### 11.11. Zoom-safe body-start measurement plus overlap-aware packing accepted on 2026-04-08

Следующий пользовательский ретест показал, что одного ownership packer-а недостаточно:
- после устранения нижних пересечений верхние границы `Module` cards всё ещё могли залезать в header text `Product Part` и `Cluster`;
- визуально это выглядело как корректный lower clearance, но сломанный top clearance;
- значит в runtime одновременно существовали два независимых дефекта: top-boundary measurement и bottom-boundary packing.

Критический root cause зафиксирован так:
- React Flow рендерит canvas под viewport zoom через CSS transform;
- bridge до этого corrective slice брал `bodyStartY` через `getBoundingClientRect().height`, то есть в viewport/screen pixels;
- autolayout solver затем интерпретировал это значение как flow-coordinate height, из-за чего при zoom `< 1` header boundary становилась заниженной и child nodes стартовали слишком высоко.

Принятый контракт после этого pass:
1. top clearance ownership containers должен строиться только от **unscaled** measured header boundary;
2. bridge обязан переводить measured header DOM height обратно в flow coordinates через текущий `reactFlow.getZoom()`;
3. fixed renderer offset (`data-diagram-body-start-offset`) остаётся в flow coordinates и не масштабируется повторно;
4. после этого seed-autolayout packer обязан раскладывать direct children не по exact `x` column, а по **horizontal bounds overlap**;
5. итоговый safe layout для first-open path теперь есть комбинация двух инвариантов:
   - `top`: zoom-safe `bodyStartY`
   - `bottom`: overlap-aware sibling packing + resize from deepest direct child bottom.

Практически это означает:
- верхняя граница module placement больше не зависит от viewport zoom;
- wide `Cluster` inside `Product Part` теперь конфликтует со standalone `Module`, даже если у них разные seed `x`;
- first-open layout больше не может считать, что два sibling box-а независимы только потому, что у них разные column keys.

Новый evidence set для combined contract:
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.test.ts src/client/project-manager/components/diagram-editor/diagram-editor-shell.test.ts`
- `npx tsx --test --test-name-pattern 'measurement bridge|diagram-editor-shell is now user-owned layout only|diagram stage scaffold keeps the visual shell stretched to full panel height|diagram modules panel persists manual node positions without layout profiles|diagram-editor-facade keeps React Flow diagnostics widgets' src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`
- `npm run build:webview`
- `npm run typecheck:webview`

### 11.12. Module shadow visual-bottom allowance accepted on 2026-04-08

Следующий пользовательский ретест после rebuild `1.1.913` показал более узкий остаточный defect profile:
- верхние границы `Module` cards уже не залезают в header-zones `Cluster` / `Product Part`;
- sibling packing и owner resize продолжают работать как по автолайауту, так и по manual path;
- но нижние границы ownership containers всё ещё визуально режут нижний край module cards.

Уточнённый root cause теперь зафиксирован так:
- React Flow measured node height покрывает только border-box rendered card;
- у `Module` card есть внешний `box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24)`;
- этот visual tail не входит в measured height, поэтому shared `visualBottom` contract с прежним allowance `12px` оставался заниженным.

Принятый contract после этого corrective pass:
1. `Module` visual bottom больше не равен measured DOM bottom;
2. shared layout-bounds helper обязан резервировать explicit bottom shadow allowance, вычисленный из shipped module-card CSS shadow, а не из произвольной эвристики;
3. и initial measured autolayout, и manual normalize path обязаны использовать один и тот же tightened module visual-bottom budget;
4. owner resize по `Cluster` и `Product Part` должен происходить от deepest direct child **visual** bottom, включая bottom shadow allowance module cards.

Практически это означает:
- безопасный нижний зазор теперь строится от того, что пользователь реально видит на экране, а не только от measured border-box;
- оставшийся defect после `1.1.912` / `1.1.913` классифицирован как shared visual-bounds underestimation, а не как новый packing bug;
- последующий release validation должен подтверждать именно исчезновение нижнего visual overlap на Gemini workspace пользователя.

Новый evidence set для этого tightened visual-bottom contract:
- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-measured-layout-normalizer.test.ts src/client/project-manager/components/diagram-editor/diagram-editor-manual-layout-normalizer.test.ts`
- `npm run build:webview`
- `npm run typecheck:webview`

Последующая live-measurement stabilization wave релиза `1.1.915` была откатана и не входит в active SSOT; историческая трассировка сохранена только в archived planning-doc и session reports.
