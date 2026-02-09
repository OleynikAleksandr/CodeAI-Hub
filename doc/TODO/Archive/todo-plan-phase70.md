# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/Stacks/Project_Manager.md`
2. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md` (THIS FILE)
4. `doc/Sessions/Session040.md`

---

## Phase 68 — Session UI Panels Cleanup & Enhancement (owner: Oleksandr, updated: 2026-01-22)

### Stream 1: Hide TodoPanel
**Goal:** Закомментировать отображение TodoPanel (возможно уберём позже совсем).

1. [DONE] Fix(ui): закомментировать рендеринг TodoPanel в session-view.tsx — scope: `src/client/ui/src/session/session-view.tsx`; expected commit message: `fix(ui): hide TodoPanel from session view`
2. [DONE] Git Commit: `fix(ui): hide TodoPanel from session view` (hash: 62117cc0)

### Stream 2: InfoPanel — single line
**Goal:** Сделать InfoPanel в одну строку: "Session ID: <uuid>"

1. [DONE] Fix(ui): переделать InfoPanel на single-line layout — scope: `src/client/ui/src/session/info-panel.tsx`; expected commit message: `fix(ui): make InfoPanel single-line`
2. [DONE] Git Commit: `fix(ui): make InfoPanel single-line` (hash: 2793f04c)

### Stream 3: SessionTabs — add stage name
**Goal:** Добавить к имени провайдера короткое имя агента (Description Codex, Reviewer Claude).

1. [DONE] Fix(ui): добавить stage prefix в SessionTabs (использовать session.stage) — scope: `src/client/ui/src/session/session-tabs.tsx`; expected commit message: `fix(ui): add stage name to session tabs`
2. [DONE] Git Commit: `fix(ui): add stage name to session tabs` (hash: 20672f82)

### Stream 4: StatusPanel — Models instead of Providers (Вариант B — расширение SessionStatusInfo)
**Goal:** Расширить архитектуру для передачи информации о моделях и показывать реальную модель с reasoning level.

**Архитектурное решение:**
- Добавить тип `ModelInfo` в `session.ts`
- Расширить `SessionStatusInfo` полем `models?: readonly ModelInfo[]`
- Изменить `createInitialSnapshot` в `helpers.ts` для приёма settings и формирования models
- Обновить StatusPanel для отображения models вместо providerSummary

**Структура ModelInfo:**
```typescript
type ModelInfo = {
  readonly providerId: ProviderStackId;
  readonly providerName: string;    // "Claude", "Codex", "Gemini"
  readonly modelId: string;         // "claude-opus-4-5", "gpt-5.2-codex"
  readonly modelDisplayName: string; // "Claude Opus 4.5", "GPT-5.2 Codex"
  readonly reasoning?: string;       // "high", "medium" (для Codex/Gemini)
};
```

1. [DONE] Fix(types): добавить тип ModelInfo и расширить SessionStatusInfo — scope: `src/types/session.ts`; expected commit message: `feat(types): add ModelInfo type to SessionStatusInfo`
2. [DONE] Git Commit: `feat(types): add ModelInfo type to SessionStatusInfo` (hash: 3dbd2839)
3. [DONE] Fix(ui/helpers): изменить createInitialSnapshot для приёма settings и формирования models — scope: `src/client/ui/src/session/helpers.ts`, `src/client/ui/src/session/model-info-builder.ts`; expected commit message: `feat(ui): populate models in createInitialSnapshot`
4. [DONE] Git Commit: `feat(ui): populate models in createInitialSnapshot` (hash: a1c57041)
5. [DEFERRED] Fix(ui): обновить вызовы createInitialSnapshot с передачей settings — требует прокидывания settings через многие компоненты, отложено до отдельной Phase
6. [SKIPPED] Git Commit: skipped — settings prокидывание отложено
7. [DONE] Fix(ui): обновить StatusPanel для отображения models — scope: `src/client/ui/src/session/status-panel.tsx`; expected commit message: `feat(ui): display model names with reasoning in StatusPanel`
8. [DONE] Git Commit: `feat(ui): display model names with reasoning in StatusPanel` (hash: 7e07f682)

### Stream 5: StatusPanel — remove Status row
**Goal:** Убрать статичную строку "Status" и сократить высоту панели.

1. [DONE] Fix(ui): удалить строку "Status" из StatusPanel — scope: `src/client/ui/src/session/status-panel.tsx`; expected commit message: `fix(ui): remove static Status row from StatusPanel`
2. [DONE] Git Commit: `fix(ui): remove static Status row from StatusPanel` (hash: 0998dd61)

---

## Phase 69 — Settings Propagation for Models Display (owner: TBD, updated: 2026-01-22)

### Stream 4.3: Прокидывание Settings в createInitialSnapshot
**Goal:** Передать settings из верхнего уровня через цепочку компонентов в createInitialSnapshot для отображения реальных моделей.
**Status:** TODO — требует детального исследования и многофайловых изменений.

**Архитектура (исследована в Session041):**
- Settings хранятся в `~/.codeai-hub/settings/settings.json`
- В UI доступны через `useSettingsState()` hook в `app-host.tsx`
- Нужно прокинуть settings через:
  - `app-host.tsx` → `session-store.ts` (Webview Client)
  - `main-area.tsx` → `project-manager-session-view.tsx` (Project Manager)

**Микрозадачи:**

1. [TODO] Research: составить полную карту вызовов createInitialSnapshot — scope: research; определить все места вызова и цепочки props
2. [TODO] Fix(ui): добавить settings prop в session-store.ts — scope: `src/client/ui/src/app-host/session-store.ts`; expected commit message: `feat(ui): add settings param to session-store`
3. [TODO] Git Commit: `feat(ui): add settings param to session-store` (hash: TBD)
4. [TODO] Fix(ui): передать settings из app-host в session-store — scope: `src/client/ui/src/app-host.tsx`, `src/client/ui/src/app-host/session-store.ts`; expected commit message: `fix(ui): pass settings to session-store from app-host`
5. [TODO] Git Commit: `fix(ui): pass settings to session-store from app-host` (hash: TBD)
6. [TODO] Fix(ui): добавить settings prop в project-manager-session-view — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit message: `feat(ui): add settings param to project-manager-session-view`
7. [TODO] Git Commit: `feat(ui): add settings param to project-manager-session-view` (hash: TBD)
8. [TODO] Fix(ui): прокинуть settings из main-area в project-manager-session-view — scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit message: `fix(ui): pass settings to project-manager-session-view`
9. [TODO] Git Commit: `fix(ui): pass settings to project-manager-session-view` (hash: TBD)
10. [TODO] Fix(ui): добавить Settings context/hook в project-manager — scope: `src/client/project-manager/app.tsx` или новый файл; expected commit message: `feat(ui): add settings access to project-manager`
11. [TODO] Git Commit: `feat(ui): add settings access to project-manager` (hash: TBD)
12. [TODO] Verify: проверить отображение моделей в StatusPanel — scope: manual testing; убедиться что "Claude Opus 4.5 (high)" отображается
13. [TODO] Git Commit: `docs(todo): verify models display in StatusPanel` (hash: TBD)

### Stream 4.4: Fallback улучшения (опционально)
**Goal:** Улучшить fallback поведение когда settings недоступны.
**Status:** TODO — низкий приоритет.

1. [TODO] Fix(ui): улучшить fallback в model-info-builder когда settings=null — показывать "Model info unavailable" вместо провайдера; scope: `src/client/ui/src/session/model-info-builder.ts`; expected commit message: `fix(ui): improve model-info-builder fallback message`
2. [TODO] Git Commit: `fix(ui): improve model-info-builder fallback message` (hash: TBD)

---

## Phase 70 — Release Build 1.1.469 (owner: Oleksandr, updated: 2026-01-22)

### Stream: Build and Test Release
**Goal:** Собрать релиз для тестирования Phase 68 изменений.

1. [TODO] Pre-check: убедиться что git status чистый — scope: `git status`
2. [TODO] Build: запустить `./scripts/build-all.sh` — scope: release scripts
3. [TODO] Git Commit: `chore(release): build 1.1.469` (hash: TBD)
4. [TODO] Verify: проверить VSIX и tarball'ы в `doc/tmp/releases/`
5. [TODO] Test: установить VSIX и проверить UI изменения вручную
6. [TODO] Update: обновить CHANGELOG.md и README.md если нужно
7. [TODO] Git Commit: `docs(release): update 1.1.469 notes` (hash: TBD)

---

## Notes

- Phase 68 завершена (Session041): TodoPanel скрыта, InfoPanel в одну строку, SessionTabs с stage name, StatusPanel с Models
- Phase 69 требует прокидывания settings — сложная задача, затрагивает много файлов
- Phase 70 — сборка релиза для тестирования
- После Phase 68 можно рассмотреть полное удаление TodoPanel (сейчас только комментируем)
