# Facade Map Field Reference

Поля `Facade`:
- `Id`: стабильный kebab-case identifier.
- `Module`: parent module ID из `module-inventory.md`.
- `Kind`: сейчас `class`.
- `Visibility`: `public` или `internal`.
- `Methods`: необязательный список facade method signatures.
- `Ports`: необязательный список в формате `In/Out: <type> from/to <target>`.
- `Contract Targets`: необязательные пути к contract files.
- `Code Targets`: необязательные пути к source files.
- `Origin`: `agent`, `user` или `merged`.
- `Status`: `proposed`, `accepted` или `deprecated`.
- `Notes` / `Rationale`: необязательные многострочные пояснения.

Поля `Facade Relation`:
- `Id`: детерминированный identifier вида `<from>__<type>__<to>`.
- `From` / `To`: facade IDs.
- `Type`: один из `sync-call`, `async-event`, `shared-data`, `config-ref`.
- `Label`: необязательный edge label.
- `Origin`, `Status`, `Notes`: те же значения, что и у facade fields.
