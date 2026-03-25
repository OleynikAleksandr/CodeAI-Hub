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
- user-facing glossary не объясняет, что `Product Part` — это верхний уровень системы;
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
3. Короткий словарь в `Description` должен подготавливать пользователя к `Diagram Modules`, а не вводить параллельный набор терминов.
4. `Role` не должна оставаться обязательным user-facing полем в `module-inventory.md`, если она не делает продукт лучше.
5. На диаграмме пользователь должен явно видеть `Module` как сущность, а `Kind` — только как дополнительную характеристику.

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

### 2. Keep Product Part as the level, not the role

Нужно явно развести:
- `Product Part` как уровень модели;
- любые role-like слова как вторичное объяснение, а не как обязательное поле inventory.

Краткая логика, которую должен увидеть пользователь:
- `Product Part` отвечает на вопрос: “это отдельная верхнеуровневая часть системы?”
- `Title` и `Purpose` должны объяснять, что это за верхнеуровневая часть и зачем она нужна.

### 3. Remove formal Role from user-facing inventory DSL

Формальное поле `Role` больше не должно быть канонической частью `module-inventory.md`.

Решение этого scope:
- `Product Part` остаётся верхним уровнем inventory;
- `Title` и `Purpose` несут основной пользовательский смысл;
- parser должен оставаться tolerant к legacy `Role:` строкам в старых артефактах, но не требовать их;
- serializer/templates/help/reference больше не должны навязывать `Role` как обязательный DSL field.

### 4. Testing principle

Этот scope не должен “натаскивать” агента на конкретную известную реализацию CodeAI Hub.

Нужно улучшать только:
- понятность glossary;
- self-check questions, по которым пользователь без знания кода может заметить структурные проблемы;
- согласованность `Description Help` -> `Virtual Simulation` -> `Diagram Modules`.

### 5. Simplify the DSL instead of expanding role enums

Текущее поле `Role` не является главным носителем архитектурного смысла.

Для следующих шагов намного важнее:
- `Product Part`;
- `Cluster`;
- `Module`;
- `Title`;
- `Purpose` / `Responsibility`;
- `Relations`.

Поэтому в этом scope принят прагматичный вывод:
- `Role` убирается из user-facing inventory DSL;
- backward compatibility обеспечивается tolerant parser path для legacy artifacts;
- дальнейшее расширение enum ролей больше не является продуктовой задачей этого workflow.

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

### Stream B. Product Part DSL simplification
- убрать обязательное `Role` из user-facing `module-inventory.md`;
- синхронизировать parser/serializer/templates/help/reference под новый упрощённый contract;
- сохранить backward-compatible parse старых inventories с legacy `Role:` строками.

### Stream C. Regression-oriented help wording
- скорректировать `Description Help` и связанные user-facing surfaces так, чтобы они подготавливали пользователя к следующему stage vocabulary без избыточной терминологической путаницы.

### Stream D. Follow-up after Role removal
- проверить, не осталось ли скрытого role drift в UI, prompts, docs или runtime adapters после удаления `Role` из user-facing inventory;
- при необходимости дочистить только residual compatibility tails, не возвращая поле обратно.

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
2. Обязательное поле `Role` убрано из user-facing `module-inventory.md`, а parser по-прежнему читает legacy artifacts без ручной миграции.
3. Diagram UI снова явно показывает `Module` как сущность, а `Kind` остаётся вторичной характеристикой.
4. `Description Help`, diagram reference assets и SSOT docs больше не расходятся в этой vocabulary model.
5. Собран новый локальный release и regression продолжается уже на нём.
