# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/Sessions/Session155.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 61 — Diagram Modules UX cleanup (owner: Oleksandr, updated: 2026-03-25)

### Stream 1: Remove description text block above the diagram canvas

Убрать весь текстовый блок между верхним сайдбаром "DIAGRAM MODULES" и canvas диаграммы: заголовок "Diagram Modules", intro text "Artifacts show the staged...", Product Part Progress banner.

1. [TODO] **Remove intro section and progress banner** from `diagram-stage-panel-scaffold.tsx`. Удалить блок `<strong>{title}</strong>`, `<span>{introText}</span>` и `{progressBanner}`. Canvas должен занять всю доступную высоту. (scope: 1 файл)
2. [TODO] Git Commit: `refactor(pm): remove description text and progress banner from diagram stage panel`

### Stream 2: Remove header bar and controls from ReactFlow canvas

Убрать "Diagram Modules" toolbar внутри ReactFlow контейнера и кнопки +/-/fit в левом нижнем углу.

3. [TODO] **Remove toolbar header and `<Controls />`** from `diagram-editor-facade.tsx`. Удалить `<div style={toolbarStyle}>...</div>` и `<Controls showInteractive={false} />`. Обновить тест в `diagram-editor-facade.test.tsx`. (scope: 2 файла)
4. [TODO] Git Commit: `refactor(pm): remove toolbar header and zoom controls from diagram canvas`

### Stream 3: Ctrl+drag to move nodes, default drag = pan

По умолчанию левая кнопка мыши перемещает весь граф (pan), даже если схватиться за элемент. Перетаскивание отдельных элементов — только с зажатым Ctrl.

5. [TODO] **Add Ctrl-key state tracking + conditional nodesDraggable** in `diagram-editor-facade.tsx`. Добавить `useState` + `keydown`/`keyup` listeners для Ctrl. Установить `nodesDraggable={ctrlPressed}`. Когда Ctrl не нажат — `pointer-events: none` на `.react-flow__node` через conditional CSS class, чтобы drag на ноде = pan всего canvas. (scope: 1-2 файла)
6. [TODO] Git Commit: `feat(pm): ctrl+drag to move nodes, default drag pans canvas`

### Stream 4: Release build

7. [TODO] **Таргетные сборки** `npm run build:webview`, `npm run typecheck:webview`, проверка тестов.
8. [TODO] **Release build**: `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`. Записать результаты в `doc/Sessions/Session155.md`.
9. [TODO] Git Commit: `chore(release): bump version to <TBD>`
