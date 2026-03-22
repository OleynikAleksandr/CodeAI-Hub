# Facade Map Merge Rules

Когда runtime передаёт change summary:
- Сохраняйте facades и relations, которые были добавлены пользователем.
- Сохраняйте user-modified method signatures, ports, labels и ownership metadata.
- Не восстанавливайте молча facades или relations, которые пользователь удалил.
- Если удалённый facade действительно должен вернуться, явно объясняйте это в `Notes` или `Rationale`.
- Держите facade ownership согласованным с текущим `module-inventory.md`, не выдумывая новые module IDs.
