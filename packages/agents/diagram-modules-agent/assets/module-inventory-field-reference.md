# Module Inventory Field Reference

Разделы `Module Inventory`:
- `Module Inventory`: semantic source of truth для этого шага. Runtime layout строится отдельно и не должен подменять inventory.
- `Product Parts`: верхний ownership layer. Вложенные `Cluster`-блоки и standalone `Module`-блоки должны жить внутри своего `Product Part`.
- `Simple Relations`: редкие прямые связи, которые уже полезно показать пользователю до следующего шага.
- `Assumptions / Open Questions`: незакрытые вопросы по boundary, naming или ownership.

Общие правила для inventory:
- Inventory должен отражать полный и непротиворечивый состав системы на уровне текущей модели.
- Если верхний ownership contour уже понятен, materialize-ьте его как `Product Part`, а не прячьте в `Notes` или декоративный `Cluster`.
- Поля `Clusters` и `Standalone Modules` внутри каждого `Product Part` должны точно совпадать с вложенными блоками этой секции.
- Не откатывайтесь к плоскому legacy inventory, если ownership contours уже видны.
- Не подменяйте архитектуру списком папок, пакетов или class names.

Поля `Product Part`:
- `Id`: стабильный kebab-case identifier. Должен совпадать с заголовком `### Product Part: ...`.
- `Title`: user-readable имя верхнего блока продукта.
- `Purpose`: одна короткая строка о том, зачем существует этот верхний блок.
- `Clusters`: упорядоченный список cluster IDs внутри этого `Product Part`. Должен точно совпадать с вложенными `### Cluster:` блоками.
- `Standalone Modules`: упорядоченный список module IDs, которые живут прямо в этом `Product Part` вне cluster-ов. Должен точно совпадать с вложенными standalone `### Module:` блоками.
- `Notes`: необязательное пояснение. Используйте его для ownership rationale, а не для сокрытия отсутствующих nested blocks.

`Product Part` — это верхний уровень продукта в этом DSL. Он отвечает на вопрос: "это отдельная крупная часть системы?" а не "какой label роли ей дать?".

Поля `Cluster`:
- `Id`: стабильный kebab-case identifier.
- `Title`: user-readable имя cluster-а.
- `Purpose`: одна короткая строка о роли этой subsystem.
- `Product Part`: owning product part ID. Должен совпадать с окружающим `Product Part`.
- `Modules`: упорядоченный список module IDs внутри cluster-а.
- `Notes`: необязательное пояснение boundary или user-approved rationale, но не dump implementation details.

Поля `Module`:
- `Id`: стабильный kebab-case identifier.
- `Kind`: обязательный DSL classifier; сейчас один из `service`, `library`, `adapter`, `gateway`, `store`, `external`. Относитесь к нему как ко вторичной tooling/rendering подсказке, а не как к главному архитектурному смыслу.
- `Title`: user-readable имя module по назначению, а не по стилю реализации.
- `Responsibility`: одна короткая строка о главной ответственности module.
- `Product Part`: owning product part ID. Обязателен и для cluster members, и для standalone modules.
- `Cluster`: необязательный parent cluster identifier. Пропускается только у standalone modules, которые живут прямо внутри `Product Part`.
- `Inputs` / `Outputs`: необязательные списки входящих или исходящих данных.
- `Spec Target`: необязательный относительный путь к detail spec.
- `Contract Targets`: необязательный список contract paths.
- `Code Targets`: необязательный список source paths.
- `Origin`: `agent`, `user` или `merged`.
- `Status`: `proposed`, `accepted` или `deprecated`.
- `Notes` / `Rationale`: необязательные многострочные пояснения.

Правила интерпретации `Cluster` / `Module`:
- Относитесь к `Cluster` как к formal subsystem container, а не как к loose topic label или hidden ownership workaround.
- Относитесь к `Module` как к самой маленькой самостоятельной functional boundary, которая всё ещё имеет смысл для пользователя.
- Standalone module должен оставаться вне cluster-ов, пока нет реальной subsystem reason его туда группировать.
- Standalone module всё равно обязан быть перечислен в поле `Standalone Modules` своего `Product Part`.
- Cluster member обязан явно объявлять и корректный `Product Part`, и корректный `Cluster`.
- Не создавайте декоративные cluster-ы, которые только повторяют label без реальных модулей внутри.
- Не используйте loose analytical labels вроде `core`, `shared`, `utils`, `services`, `stores`, `adapters`, если они не оправданы upstream product context.
- Предпочитайте один standalone module вместо fake cluster-а, если настоящая subsystem boundary ещё не проявилась.
- Если несколько peer integrations делят общий contract, но ещё не образуют настоящую subsystem boundary, моделируйте их как peer modules, а не как искусственный cluster.

Поля `Relation`:
- `Id`: детерминированный identifier вида `<from>__<type>__<to>`.
- `From` / `To`: module IDs.
- `Type`: один из `sync-call`, `async-event`, `shared-data`, `config-ref`.
- `Label`: необязательный edge label.
- `Criticality`: необязательный `high`, `medium` или `low`.
- `Origin`, `Status`, `Notes`: те же значения, что и у module fields.

Правила для `Relation`:
- Держите relations простыми и sparse.
- Если взаимодействуют два cluster-а, фиксируйте конкретную module-to-module relation, которая лучше всего объясняет их связь.
- Не превращайте inventory в полный dependency graph.
