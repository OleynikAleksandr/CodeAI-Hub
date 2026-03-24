# Diagram Modules Field Reference

Staged artifacts этого шага состоят из:
- `product-parts.index.md` — ordered список Product Parts с Id, Title, Purpose и Status.
- `product-parts/<part-id>.md` — один ownership subtree per Product Part: Identity, Purpose, Owned Clusters, Standalone Modules, Simple Relations, Assumptions / Open Questions.

Runtime строит visual Module Graph из этих staged artifacts отдельно. Layout sidecar не является semantic artifact.

Общие правила:
- Staged artifacts должны отражать полный и непротиворечивый состав системы на уровне текущей модели.
- Если верхний ownership contour уже понятен, materialize-ьте его как `Product Part`, а не прячьте в `Notes` или декоративный `Cluster`.
- Не подменяйте архитектуру списком папок, пакетов или class names.

## Product Part

Поля в `product-parts.index.md`:
- `Id`: стабильный kebab-case identifier. Должен совпадать с заголовком `### Product Part: <part-id>`.
- `Title`: user-readable имя верхнего блока продукта.
- `Purpose`: одна короткая строка о том, зачем существует этот верхний блок.
- `Status`: staged flow status: `planned`, `in_progress`, `generated`, `reviewed`.

`Product Part` — это верхний уровень продукта в этом DSL. Он отвечает на вопрос: "это отдельная крупная часть системы?" а не "какой label роли ей дать?".

## Cluster (inside product-part file)

Формат внутри `product-parts/<part-id>.md`:

```markdown
### `cluster-id`

**Purpose:** одна короткая строка о роли этой subsystem.

| `module-id` | `kind` | Responsibility |
| --- | --- | --- |
| `example-module` | `service` | One-line responsibility |
```

Правила:
- `Cluster` — formal subsystem container, а не loose topic label или folder grouping.
- Используйте `Cluster` только там, где есть реальная подсистема из нескольких модулей.
- Не создавайте декоративные cluster-ы, которые только повторяют label без реальных модулей.
- Не используйте loose analytical labels вроде `core`, `shared`, `utils`, `services`, `stores`, `adapters`, если они не оправданы upstream product context.

## Module (inside product-part file)

Модули описываются в таблицах внутри Owned Clusters или Standalone Modules секции:

```markdown
| `module-id` | `kind` | Responsibility |
| --- | --- | --- |
| `example-module` | `service` | One-line responsibility |
```

Поля:
- `module-id`: стабильный kebab-case identifier.
- `kind`: обязательный DSL classifier; один из `service`, `library`, `adapter`, `gateway`, `store`, `external`. Вторичная classification — не выводите архитектуру из kind.
- `Responsibility`: одна короткая строка о главной ответственности module.

Правила:
- `Module` — самая маленькая самостоятельная functional boundary, которая всё ещё имеет смысл для пользователя.
- Standalone module должен оставаться вне cluster-ов, пока нет реальной subsystem reason его туда группировать.
- Предпочитайте один standalone module вместо fake cluster-а, если настоящая subsystem boundary ещё не проявилась.
- Если несколько peer integrations делят общий contract, но ещё не образуют настоящую subsystem boundary, моделируйте их как peer modules, а не как искусственный cluster.

## Simple Relations (inside product-part file)

Формат:

```markdown
| From | To | Type | Label |
| --- | --- | --- | --- |
| `module-a` | `module-b` | sync-call | edge-label |
```

Поля:
- `From` / `To`: module IDs.
- `Type`: один из `sync-call`, `async-event`, `shared-data`, `config-ref`.
- `Label`: необязательный edge label.

Правила:
- Держите relations простыми и sparse.
- Если взаимодействуют два cluster-а, фиксируйте конкретную module-to-module relation.
- Не превращайте staged artifacts в полный dependency graph.
