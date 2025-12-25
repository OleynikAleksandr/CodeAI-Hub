# План разработки (Development TODO Plan)

## Phase 1 — Multi-Workspace Core Foundation (owner: Gemini, updated: 2025-12-25) [DONE]

---

## Phase 2 — Project Manager UI & API (owner: Gemini, updated: 2025-12-25)

### Stream 1: Project Manager Layout & Sidebar [DONE]
1. [DONE] Реализовать 7-секционный Layout с поддержкой Section 7 (Status Bar).
2. [DONE] Реализовать динамический Sidebar (Section 1).
3. [DONE] Реализовать Header (Section 3) в стиле VS Code.

### Stream 2: Project Manager API Integration [DONE]
1. [DONE] Реализовать обработчики RPC `projects:list` и `projects:add` в `RemoteBridge` (Core).
2. [DONE] Создать клиентский сервис API в UI Project Manager (`api.ts`).
3. [DONE] Интегрировать API в `MainLayout`.

### Stream 3: Workspace Actions & Details
1. [DONE] Добавить кнопки "Session" и "Task" для каждого элемента в списке воркспейсов.
2. [DONE] Git Commit: `feat(ui): add session and task buttons to workspace list`
3. [DONE] Реализовать логику кнопки "Add Workspace" (вызов API добавления).
4. [DONE] Git Commit: `feat(ui): implement add workspace functionality`
5. [TODO] Реализовать базовое отображение деталей выбранного проекта в Секциях 4-6.
6. [TODO] Git Commit: `feat(ui): display workspace details in main panels`

---

## Phase 3 — Tech Debt & Refactoring (owner: Gemini, updated: 2025-12-25)

### Stream 1: RemoteBridge Decomposition
1. [TODO] Рефакторинг `RemoteBridge`: разбить монолитный класс на `Router` и `Handlers` (Session, Project, System).
2. [TODO] Git Commit: `refactor(core): split RemoteBridge into handlers`
