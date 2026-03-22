# Workflow Glossary Testing Feedback — Architecture Contract

**Status:** Active planning doc
**Updated:** 2026-03-22
**Owner:** Oleksandr

---

## Scope

Этот документ задаёт следующий testing-driven scope после релиза `1.1.763`.

Цель:
- продолжать live regression уже не только по surface-багам, но и по понятности архитектурного словаря для пользователя без инженерного бэкграунда;
- устранить разрыв между текущим DSL `Diagram Modules` и тем, как glossary объясняется в `Description Help` и upstream prompts;
- не подсказывать агентам “правильную” структуру известного проекта, а улучшать именно самообъяснимость workflow и его терминов.

---

## Problem statement

Текущее тестирование показало не только баги prompt/runtime surface, но и слабость словаря:

- в `Description Help` и upstream text используется длинный объяснительный термин `самостоятельная часть продукта`;
- в `Diagram Modules` user-facing DSL уже существует каноническая сущность `Product Part`;
- для `Product Part` в коде уже есть роли `shell`, `application`, `runtime`, `service`, `provider`, `external`;
- user-facing glossary не объясняет, что `Product Part` — это верхний уровень системы, а `shell/application/runtime/provider/...` — это именно роли этого уровня;
- user-facing field reference для `Diagram Modules` до сих пор перечисляет старый набор ролей без `application`, хотя runtime DSL уже поддерживает её.
- обязательное поле `Role` в `Product Part` даёт мало пользовательской пользы, но создаёт жёсткий DSL-контракт, который легко превращается в очередной vocabulary drift для новых типов продуктов.
- в user-facing диаграмме `Module` как сущность визуально потерян: пользователь видит `service` / `store` / `library`, тогда как `Product Part` и `Cluster` подписаны явно.

В результате пользователь и агент могут:
- спорить не о структуре системы, а о неудачных словах;
- путать верхнеуровневую сущность с её ролью;
- маркировать `Standalone Project Manager` как `service` просто потому, что в словаре не описана роль `application`;
- терять уверенность, какие ошибки на diagram-stage действительно архитектурные, а какие порождены бедным glossary.
- переоценивать важность `Role` по сравнению с реально важными полями `Product Part / Cluster / Module / Relations`;
- плохо различать на диаграмме сущность `Module` и вторичную классификацию `Kind`.

---

## Desired outcome

После этого scope пользователь должен понимать:

1. `Product Part` — это верхнеуровневая часть продукта.
2. `Cluster` и `Module` живут ниже этого уровня.
3. `Shell`, `Application`, `Runtime`, `Provider`, `External` — это не отдельные уровни модели, а роли `Product Part`.
4. Короткий словарь в `Description` должен подготавливать пользователя к `Diagram Modules`, а не вводить параллельный набор терминов.
5. Если `Role` остаётся в DSL, она не должна быть скрытым источником переусложнения для новых типов продуктов.
6. На диаграмме пользователь должен явно видеть `Module` как сущность, а `Kind` — только как дополнительную характеристику.

---

## Design decisions

### 1. Replace explanatory noun with canonical noun

Термин `самостоятельная часть продукта` в user-facing glossary больше не является каноническим названием сущности.

Его нужно заменить на `Product Part` с коротким русским пояснением:
- `Product Part` — верхнеуровневая часть продукта, которая может жить, запускаться, поставляться или обновляться отдельно.

Это снимает конфликт между:
- glossary в `Description`;
- prompt/reference в `Diagram Modules`;
- реальной DSL-сущностью.

### 2. Separate level from role

Нужно явно развести:
- `Product Part` как уровень модели;
- `Role` как смысловую классификацию этого уровня.

Краткая логика, которую должен увидеть пользователь:
- `Product Part` отвечает на вопрос: “это отдельная верхнеуровневая часть системы?”
- `Role` отвечает на вопрос: “какую роль эта часть играет?”

### 3. Add missing user-facing role explanation

В user-facing словарь и reference нужно добавить минимальные пояснения ролей:

- `Shell` — оболочка входа, установки, открытия или настройки системы.
- `Application` — основной пользовательский интерфейс, где человек выполняет основную работу.
- `Runtime` — отдельная часть, которая координирует выполнение, состояние или жизненный цикл системы.
- `Provider` — отдельная часть, которая подключает внешний AI/API provider.
- `External` — внешняя по отношению к продукту часть или boundary.

`Service` в этом scope не является первой проблемой glossary и может остаться как DSL role, но её объяснение тоже должно быть user-readable, если эта роль остаётся доступной в UI/agent-facing reference.

### 4. Testing principle

Этот scope не должен “натаскивать” агента на конкретную известную реализацию CodeAI Hub.

Нужно улучшать только:
- понятность glossary;
- self-check questions, по которым пользователь без знания кода может заметить структурные проблемы;
- согласованность `Description Help` -> `Virtual Simulation` -> `Diagram Modules`.

### 5. Re-evaluate mandatory Role field

Текущее поле `Role` не является главным носителем архитектурного смысла.

Для следующих шагов намного важнее:
- `Product Part`;
- `Cluster`;
- `Module`;
- `Title`;
- `Purpose` / `Responsibility`;
- `Relations`.

Поэтому в этом scope допустимо пересмотреть сам DSL-контракт:
- либо сделать `Role` optional;
- либо убрать его из user-facing inventory совсем;
- либо оставить только если удаётся доказать реальную продуктовую пользу, а не историческое удобство для внутреннего словаря.

Критерий решения здесь прагматичный:
- если поле не делает продукт лучше, оно не должно оставаться обязательным только “потому что уже есть”.

### 6. Restore explicit Module identity in the diagram

Сейчас user-facing diagram явно показывает `Product Part` и `Cluster`, но не показывает `Module` как сущность.

Это порождает ложную модель:
- будто `service` / `store` / `library` — это и есть уровень сущности;
- тогда как на самом деле это только `Kind` модуля.

Целевое состояние:
- диаграмма должна явно показывать `Module`;
- `Kind` должен оставаться вторичным badge/подписью вроде `Kind: service`.

---

## Minimal execution shape

### Stream A. Glossary source-of-truth alignment
- зафиксировать `Product Part` как каноническое user-facing имя верхнеуровневой сущности;
- убрать старый параллельный термин `самостоятельная часть продукта` из активного glossary, где это влияет на workflow.

### Stream B. Role vocabulary expansion
- добавить `application` в user-facing field reference и prompt/reference surfaces;
- объяснить роли `shell / application / runtime / provider / external` как роли `Product Part`.

### Stream C. Regression-oriented help wording
- скорректировать `Description Help` и связанные user-facing surfaces так, чтобы они подготавливали пользователя к следующему stage vocabulary без избыточной терминологической путаницы.

### Stream D. Role field simplification / DSL redesign
- проверить, даёт ли обязательный `Role` реальную продуктовую ценность;
- если не даёт, спроектировать упрощение DSL: optional `Role` или removal из user-facing inventory с безопасной миграцией parser/runtime/templates.

### Stream E. Explicit Module labeling in diagram UI
- вернуть `Module` как явную user-facing сущность на diagram surface;
- отделить подпись сущности `Module` от вторичной классификации `Kind`.

### Stream F. Release gate
- после принятых glossary fixes собрать следующий локальный release и продолжить live regression уже на нём.

---

## Non-goals

В этот scope не входит:
- переименование внутренних TypeScript types без user-facing причины;
- подгонка glossary под текущую кодовую реализацию одного конкретного проекта;
- массовый rewrite prompts без подтверждённого vocabulary problem.

---

## Exit criteria

Scope считается закрытым, когда одновременно выполнено следующее:

1. `Product Part` закреплён как user-facing верхнеуровневая сущность в активных glossary/reference surfaces.
2. Роль `application` и другие ключевые роли объяснены пользователю как роли `Product Part`.
3. Принято решение по судьбе обязательного поля `Role`: сохранить его осознанно, сделать optional или убрать из user-facing DSL.
4. Diagram UI снова явно показывает `Module` как сущность, а `Kind` остаётся вторичной характеристикой.
5. `Description Help`, diagram reference assets и SSOT docs больше не расходятся в этой vocabulary model.
6. Собран новый локальный release и regression продолжается уже на нём.
