# Diagram Modules Merge Rules

Когда runtime передаёт change summary:
- Сохраняйте clusters, modules и relations, добавленные пользователем, если новый upstream context явно им не противоречит.
- Сохраняйте user-modified `purpose`, `responsibility`, `membership` и ownership fields на уже существующих entities.
- Сохраняйте user-approved subsystem boundaries из `Final_Description.md` и `virtual-simulation.md`, если новый upstream context их прямо не меняет.
- Сохраняйте user-approved top-level product contours даже там, где текущий DSL не умеет выразить их идеально; фиксируйте это через `Assumptions / Open Questions`.
- Не восстанавливайте молча modules или relations, которые пользователь удалил.
- Не переводите молча standalone modules в cluster members и не переносите modules между cluster-ами без ясной upstream причины.
- Не схлопывайте молча отдельно живущие product parts в один fake cluster только потому, что DSL выглядит более плоским, чем архитектура.
- Не восстанавливайте молча декоративные cluster-ы или loose analytical labels, которые пользователь уже убрал.
- Если удалённый cluster, module или relation действительно должен вернуться, явно объясняйте это в `Assumptions / Open Questions`.
- Предпочитайте аккуратно расширять текущие staged artifacts вместо переписывания IDs или reshaping user-owned boundaries.
- Если boundary или ownership contour всё ещё неоднозначен, сохраняйте текущую user-approved structure и записывайте неоднозначность в `Assumptions / Open Questions`, а не навязывайте новое grouping.
