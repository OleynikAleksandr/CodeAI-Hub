# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md` (THIS FILE)
3. `doc/Sessions/Archive/Session042.md`

---

## Notes

- **Release 1.1.469** собран и протестирован (Session042)
- Phase 68 (Session UI Panels) — завершена и заархивирована
- Phase 69 (Settings propagation) — отложена, требует много файловых изменений
- Phase 70 (Release build) — завершена и заархивирована

---

## Backlog

### TodoPanel Removal (опционально)
**Goal:** Полностью удалить TodoPanel вместо текущего комментирования.
**Status:** Низкий приоритет.

---

## Phase 71 — Session UI Bugfixes (owner: Oleksandr, updated: 2026-01-22)

### Stream 1: Fix SessionTabs agent name (sessionKind)
**Goal:** Показывать правильное имя агента ("Reviewer" вместо "Description") в SessionTabs.
**Problem:** `session.stage` = "description" (имя этапа Flow), а нужно `sessionKind` = "reviewer"/"collector" (тип агента).
**Solution:** Добавить поле `sessionKind` в `SessionRecord` и использовать его в SessionTabs.

1. [DONE] Fix(types): добавить поле `sessionKind?: "collector" | "reviewer"` в SessionRecord — scope: `src/types/session.ts`
2. [DONE] Fix(ui): использовать sessionKind в SessionTabs для отображения имени агента — scope: `src/client/ui/src/session/session-tabs.tsx`

### Stream 2: Fix StatusPanel models display (settings propagation)
**Goal:** Показывать реальные модели с reasoning level вместо просто имени провайдера.
**Problem:** `settings` не передаётся в `createInitialSnapshot`, fallback возвращает только имя провайдера.
**Solution:** Прокинуть settings во все вызовы createInitialSnapshot.

1. [DONE] Fix(ui): прокинуть settings в session-store.ts — scope: `src/client/ui/src/app-host/session-store.ts`, `src/client/ui/src/app-host.tsx`
2. [DONE] Fix(ui): прокинуть settings в project-manager-session-view.tsx — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`

### Stream 3: Build and verify
**Goal:** Собрать webview и проверить исправления.

1. [DONE] Build: npm run build:webview && npm run typecheck:webview — все гейты прошли
2. [DONE] Git Commit: `fix(ui): session tabs agent name and models display` (hash: dda770b6)

### Stream 4: Deep fix for sessionKind and models sync (added 2026-01-22)
**Problem:** sessionKind wasn't being propagated; models not updating when settings changed.
**Solution:** Full propagation of sessionKind from workflow to UI; reactive models sync via useSettingsModelsSync hook.

1. [DONE] Add sessionKind to ServerSession type and sanitizeSession — scope: `types.ts`, `normalizers.ts`
2. [DONE] Add sessionKind to SessionResumeIntent and workspace-tree.tsx dispatch — scope: `session-resume-intent.ts`, `workspace-tree.tsx`
3. [DONE] Add sessionKind to api.createSession — scope: `api.ts`
4. [DONE] Create useSettingsModelsSync hook for reactive model updates — scope: `use-settings-models-sync.ts`
5. [DONE] Apply hook in session-store.ts and project-manager-session-view.tsx
6. [DONE] Git Commit: `fix(ui): propagate sessionKind and sync models with settings` (hash: 825ab222)
7. [DONE] Release 1.1.471 built
