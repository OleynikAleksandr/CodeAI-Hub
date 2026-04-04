# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед созданием новых execution-задач сначала обновить или создать planning-doc в `doc/SolidWorks-WorkFlow/Plans/`.
- Каждая implementation-подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Каждая подзадача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново.
- Любое изменение логики или архитектуры требует синхронного обновления связанных SSOT-доков в том же commit.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

## Active Status
- Сейчас нет активных утверждённых execution streams.
- Следующий scope должен начинаться с нового planning-doc в `doc/SolidWorks-WorkFlow/Plans/`, после чего под него создаётся новый Phase/Stream в этом файле.
