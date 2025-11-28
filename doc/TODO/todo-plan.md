# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Стриме — некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Если по факту разработки оказывается, что конкретная подзадача Stream затрагивает больше 3 файлов — такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества:
  - `scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
  - `npm run check:links`
  - Таргетная сборка: `npm run build:project-manager`
- **Commit**: После зелёных гейтов — Git Commit с релевантным описанием и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: Любое изменение архитектуры/логики требует синхронного обновления документации **ДО** коммита.
- **Phase завершается**: `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version` → tarball'ы в `doc/tmp/releases/` → отчёт в `doc/Sessions/`.

---

## Phase 1 — Project Manager Layout Implementation (owner: Claude, updated: 2025-11-28)

**Цель**: Реализовать 6-секционный layout согласно `doc/Project_Docs/NewFeature_Architecture.md`

**Затрагиваемые пакеты**: `src/client/project-manager/`, `packages/ui/project-manager/`

---

### Stream 1: Базовая инфраструктура (hooks + styles)

1. [TODO] Создать хуки для управления состоянием
   - Файлы: `src/client/project-manager/hooks/use-sidebar-state.ts`, `use-panel-sizes.ts`
   - Commit: `feat(project-manager): add state management hooks`

2. [TODO] Создать CSS стили для layout
   - Файлы: `src/client/project-manager/styles/layout.css`, `packages/ui/project-manager/styles.css`
   - Commit: `feat(project-manager): add layout CSS with theme tokens`

---

### Stream 2: SVG иконки

3. [TODO] Создать компоненты иконок
   - Файлы: `src/client/project-manager/components/icons/collapse-icon.tsx`, `expand-icon.tsx`, `settings-icon.tsx`
   - Commit: `feat(project-manager): add icon components`

---

### Stream 3: Layout компоненты (часть 1)

4. [TODO] Создать MainLayout и Sidebar
   - Файлы: `src/client/project-manager/components/layout/main-layout.tsx`, `sidebar.tsx`
   - Commit: `feat(project-manager): add MainLayout and Sidebar components`

5. [TODO] Создать MainArea и Toolbar
   - Файлы: `src/client/project-manager/components/layout/main-area.tsx`, `toolbar.tsx`
   - Commit: `feat(project-manager): add MainArea and Toolbar components`

---

### Stream 4: Layout компоненты (часть 2)

6. [TODO] Создать VerticalResizer
   - Файлы: `src/client/project-manager/components/resizer/vertical-resizer.tsx`
   - Commit: `feat(project-manager): add VerticalResizer component`

7. [TODO] Создать PanelContainer
   - Файлы: `src/client/project-manager/components/layout/panel-container.tsx`
   - Commit: `feat(project-manager): add PanelContainer with resizable panels`

---

### Stream 5: Интеграция

8. [TODO] Интегрировать все компоненты в App
   - Файлы: `src/client/project-manager/app.tsx`, `index.tsx`
   - Commit: `feat(project-manager): integrate layout components into App`

---



## История изменений

- 2025-11-28 — План создан, инициализация todo-plan.md
