# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- Активный execution scope отсутствует.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT.
- Затем согласовать с пользователем новый scope.
- После этого открыть `doc/SolidWorks-WorkFlow/Docs_Index.md`, выбрать релевантные документы для нового scope и только потом формировать новый planning-doc в `doc/SolidWorks-WorkFlow/Plans/`.
- До появления нового planning-doc и нового активного списка задач навигационной опорой служит `doc/SolidWorks-WorkFlow/Docs_Index.md`.

## Правила выполнения (Execution Rules)

- Новый active execution scope создаётся только после planning-документа в `doc/SolidWorks-WorkFlow/Plans/` и явного согласования с пользователем.
- Новый `todo-plan.md` должен содержать Context Pack, Phase/Stream микрозадачи, отдельные `Git Commit` пункты после каждой микрозадачи, а также финальные Stream: `Release Build`, `User Visual Acceptance Testing`, `Scope Closeout`.
- Завершённый план предыдущего scope архивирован: `doc/TODO/Archive/todo-plan-provider-native-capture-bypass-phase1-1.2.123.md`.
