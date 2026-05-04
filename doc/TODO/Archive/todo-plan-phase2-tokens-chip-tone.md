# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** этот scope — короткий visual hotfix без отдельного `Plans/` planning-doc; правка ограничена одной CSS color-настройкой и release packaging.
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md` (цветовой контракт чипов)
  - `media/session-view.css` блок `.session-status-row / .session-status-chip / .session-status-button`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **Gates (автоматически через Husky hooks):** `git commit` → architecture / lint / knip / format; `git push` → `check:dup` / `check:links`.
- **Таргетные сборки** перед release: `npm run typecheck:webview`, `npm run build:webview`, `npm run build:project-manager`.
- **Real-time Документация:** `SessionStatusPanel.md` обновляется в одном коммите с CSS-правкой.
- **Release closeout:** запуск `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version` строго на чистом дереве.

## Phase 1 — Tokens chip color tone-down (owner: agent, updated: 2026-04-29)

### Stream 1.1: Color fix + docs sync + release prep

1. [IN_PROGRESS] В `media/session-view.css` поменять цвет `.session-status-chip--limits .session-status-chip__value` с `rgba(220, 220, 220, 1)` на `#b0b0b0` (тот же нейтральный серый, что и default-фаза кнопок имени модели и reasoning). Добавить упоминание этого color contract в `SessionStatusPanel.md`. Обновить `README.md` и `CHANGELOG.md` под будущую версию `1.2.105`.
   - scope: 4 файла (`media/session-view.css`, `SessionStatusPanel.md`, `README.md`, `CHANGELOG.md`).
   - actual scope note: 4 файла > 3 правила, но это все жёстко связаны единым visual hotfix-scope (color contract + sync README/CHANGELOG под release требование `CLAUDE.md §7.0`); explicit отклонение от ≤3 файлов на одну подзадачу зафиксировано здесь.
   - commit message: `fix(session-ui): mute tokens chip metric to match model chip default tone`.
2. [IN_PROGRESS] Git Commit: `fix(session-ui): mute tokens chip metric to match model chip default tone` (hash: TBD).

### Stream 1.2: Verification + release

1. [TODO] Прогнать `npm run typecheck:webview`, `npm run build:webview`, `npm run build:project-manager`.
2. [TODO] Запустить `./scripts/build-all.sh` (поднимает версии до `1.2.105`, пересобирает provider/core/UI/launcher tarballs).
3. [TODO] Git Commit: `chore: build release 1.2.105` (автоматический после version bump; hash: TBD).
4. [TODO] Запустить `./scripts/build-release.sh --use-current-version` (соберёт `codeai-hub-1.2.105.vsix`).

### Stream 1.3: Closeout

1. [TODO] Заархивировать `doc/TODO/todo-plan.md` в `doc/TODO/Archive/todo-plan-phase2-tokens-chip-tone.md`, создать новый no-active-scope shell, обновить `doc/SolidWorks-WorkFlow/Docs_Index.md` (короткая запись о visual hotfix release `1.2.105`). Финализировать `legacy session report (removed)` под новый итог.
2. [TODO] Git Commit: `docs: archive tokens chip tone scope` (hash: TBD).
