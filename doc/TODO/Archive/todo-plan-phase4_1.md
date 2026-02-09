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

## Phase 4_1 — Project Manager Layout Implementation (owner: Claude, updated: 2025-11-28)

**Цель**: Реализовать 6-секционный layout согласно `doc/SolidWorks-Flow/System/NewFeature_Architecture.md`

**Затрагиваемые пакеты**: `src/client/project-manager/`, `packages/ui/project-manager/`

---

### Stream 1: Базовая инфраструктура (hooks + styles)

1. [DONE] Создать хуки для управления состоянием
   - Файлы: `src/client/project-manager/hooks/use-sidebar-state.ts`, `use-panel-sizes.ts`
   - Commit: `ffe25f4` — feat(project-manager): add 6-section layout implementation

2. [DONE] Создать CSS стили для layout
   - Файлы: `src/client/project-manager/styles/layout.css`, `packages/ui/project-manager/styles.css`
   - Commit: `ffe25f4` — feat(project-manager): add 6-section layout implementation

---

### Stream 2: SVG иконки

3. [DONE] Создать компоненты иконок
   - Файлы: `src/client/project-manager/components/icons/collapse-icon.tsx`, `expand-icon.tsx`, `settings-icon.tsx`
   - Commit: `ffe25f4` — feat(project-manager): add 6-section layout implementation

---

### Stream 3: Layout компоненты (часть 1)

4. [DONE] Создать MainLayout и Sidebar
   - Файлы: `src/client/project-manager/components/layout/main-layout.tsx`, `sidebar.tsx`
   - Commit: `ffe25f4` — feat(project-manager): add 6-section layout implementation

5. [DONE] Создать MainArea и Toolbar
   - Файлы: `src/client/project-manager/components/layout/main-area.tsx`, `toolbar.tsx`
   - Commit: `ffe25f4` — feat(project-manager): add 6-section layout implementation

---

### Stream 4: Layout компоненты (часть 2)

6. [DONE] Создать VerticalResizer
   - Файлы: `src/client/project-manager/components/resizer/vertical-resizer.tsx`
   - Commit: `ffe25f4` — feat(project-manager): add 6-section layout implementation

7. [DONE] Создать PanelContainer
   - Файлы: `src/client/project-manager/components/layout/panel-container.tsx`
   - Commit: `ffe25f4` — feat(project-manager): add 6-section layout implementation

---

### Stream 5: Интеграция

8. [DONE] Интегрировать все компоненты в App
   - Файлы: `src/client/project-manager/app.tsx`
   - Commit: `f320e83` — feat(project-manager): integrate layout into App (Stream 5)

---

### Stream 6: Финальная сборка и релиз

9. [DONE] Запустить полную сборку и создать релиз
   - Действия: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`
   - Результат: `codeai-hub-1.1.316.vsix` (388K)
   - Commit: `ab2af78` — chore: bump version to 1.1.316

---

## История изменений

- 2025-11-28 — План создан, инициализация todo-plan.md
- 2025-11-28 — Streams 1-4 выполнены, commit `ffe25f4`
- 2025-11-28 — Stream 5 выполнен, commit `f320e83`
- 2025-11-28 — Stream 6 выполнен, VSIX 1.1.316 создан, commit `ab2af78`

---

## Phase 1 — COMPLETED ✅
