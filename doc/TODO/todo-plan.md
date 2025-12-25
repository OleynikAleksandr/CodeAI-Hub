# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества - `scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npm run check:links`, затем таргетная сборка.
- **Commit**: После зеленых гейтов — Git Commit и апдейт `todo-plan.md`.
- **Real-time Документация**: Обновляем `doc/Architecture/` и `doc/Project_Docs/` синхронно с кодом.

---

## Phase 1 — Multi-Workspace Core Foundation (owner: Gemini, updated: 2025-12-25)

### Stream 1: Project Registry Service
1. [DONE] Создать `ProjectRegistryService` в `packages/core/src/services/project-registry/` (DTO, Storage, Service).
2. [DONE] Git Commit: `feat(core): implement ProjectRegistryService`
3. [DONE] Обновить `CoreConfig` в `packages/core/src/config/index.ts`, сделав `*_WORKSPACE_PATH` опциональными.
4. [TODO] Git Commit: `refactor(core): make workspace paths optional in config`
5. [DONE] Интегрировать `ProjectRegistryService` в `CoreProcessManager` (регистрация дефолтного пути при старте).
6. [TODO] Git Commit: `feat(core): register default workspace on startup`

### Stream 2: Session Context Refactoring
1. [TODO] Обновить интерфейс `Session` и класс `UnifiedSession`: добавить `workspacePath` в конструктор и свойства.
2. [TODO] Git Commit: `refactor(session): add workspacePath to session context`
3. [TODO] Обновить `CoreOrchestrator`: извлекать путь из запроса `createSession` или брать из Registry.
4. [TODO] Git Commit: `feat(core): support dynamic workspace path in session creation`

### Stream 3: Tool Context Refactoring
1. [TODO] Рефакторинг `FileOperations`: использовать `session.workspacePath` вместо глобального конфига.
2. [TODO] Git Commit: `refactor(tools): file operations use session workspace`
3. [TODO] Рефакторинг `SearchOperations` (ripgrep/glob): использовать `session.workspacePath`.
4. [TODO] Git Commit: `refactor(tools): search operations use session workspace`
5. [TODO] Исправить `Launcher` и `VSCode Extension`: передавать корректный путь при инициализации.
6. [TODO] Git Commit: `fix(launcher): pass workspace path explicitly`

---

## Phase 2 — Project Manager UI & API (owner: Gemini, updated: 2025-12-25)

### Stream 1: Project Manager Layout & Sidebar
1. [TODO] Реализовать 7-секционный Layout с поддержкой Section 7 (Status Bar).
2. [TODO] Git Commit: `feat(ui): implement 7-section layout for project manager`
3. [TODO] Реализовать динамический Sidebar (Section 1) с подстройкой ширины под имена воркспейсов.
4. [TODO] Git Commit: `feat(ui): dynamic width sidebar based on content`
5. [TODO] Реализовать Header (Section 3) с иконкой настроек в стиле VS Code (справа от названия).
6. [TODO] Git Commit: `feat(ui): vs-code style header with gear icon`
