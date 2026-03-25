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

1. [DONE] **Remove intro section and progress banner** from `diagram-stage-panel-scaffold.tsx`. (scope: 1 файл)
2. [DONE] Git Commit: `feat(pm): maximize diagram canvas area and add ctrl+drag for node movement` (hash: acdff8c2)

### Stream 2: Remove header bar and controls from ReactFlow canvas

Убрать "Diagram Modules" toolbar внутри ReactFlow контейнера и кнопки +/-/fit в левом нижнем углу.

3. [DONE] **Remove toolbar header and `<Controls />`** from `diagram-editor-facade.tsx` + тест. (scope: 2 файла)
4. [DONE] Git Commit: (included in acdff8c2)

### Stream 3: Ctrl+drag to move nodes, default drag = pan

По умолчанию левая кнопка мыши перемещает весь граф (pan), даже если схватиться за элемент. Перетаскивание отдельных элементов — только с зажатым Ctrl.

5. [DONE] **Add Ctrl-key state tracking + conditional nodesDraggable** in `diagram-editor-facade.tsx`. (scope: 1 файл)
6. [DONE] Git Commit: (included in acdff8c2)

### Stream 4: Release build

7. [DONE] **Таргетные сборки** `npm run build:webview`, `npm run typecheck:webview`, тесты — зелёные.
8. [DONE] **Release build**: `./scripts/build-all.sh` → 1.1.794, `./scripts/build-release.sh` → `codeai-hub-1.1.794.vsix`.
9. [DONE] Git Commit: `chore(release): bump version to 1.1.794` (hash: c73ce8da)
