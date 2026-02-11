# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/System/SessionUI_Layout_Stability.md`
3. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 132 — Session Header Tokens Formatting (owner: Oleksandr, updated: 2026-02-10)

**Goal:** улучшить читаемость строки `Models | Tokens` в Session UI: убрать отображение максимального окна и увеличить разделитель между Model и Tokens.

### Stream: Session Header
1. [DONE] Обновить отображение Tokens: убрать `/<max>` и оставить `Tokens: <used> (<percent>)`; увеличить пробелы вокруг `|` в 2 раза (scope: `src/client/ui/src/session/status-panel.tsx`, `media/react-chat.js`; expected commit message: `fix(session-ui): simplify tokens label and widen separator`)
2. [DONE] Git Commit: `fix(session-ui): simplify tokens label and widen separator` (hash: b9e97e28)
3. [DONE] Обновить документацию по Session UI: формат строки `Models | Tokens` без `/<max>` (scope: `doc/SolidWorks-Flow/System/SessionUI_Layout_Stability.md`; expected commit message: `docs(plan): archive phase131 and open phase132`)
4. [DONE] Git Commit: `docs(plan): archive phase131 and open phase132` (hash: 3c467435)

### Stream: Release Build (Phase 132)
1. [DONE] Выполнить `./scripts/build-all.sh` (scope: manifests; expected commit message: `chore(release): run build-all for session header tokens formatting`)
2. [DONE] Git Commit: `chore(release): run build-all for session header tokens formatting` (hash: 1d661f25)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (scope: scripts; expected commit message: `chore(release): build and validate vsix for v1.1.551`)
4. [DONE] Git Commit: `chore(release): build and validate vsix for v1.1.551` (hash: a81332d0)

### Stream: Post-Release Version Sync
1. [DONE] Синхронизировать `README.md`, `CHANGELOG.md` и `doc/SolidWorks-Flow/System/SystemArchitecture.md` под фактическую версию после `build-all/build-release` (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(release): sync root notes and system architecture for v1.1.551`)
2. [DONE] Git Commit: `docs(release): sync root notes and system architecture for v1.1.551` (hash: 36d3d0a1)

---

## Phase 133 — Session Debug Summary + Claude Thinking Label (owner: Oleksandr, updated: 2026-02-10)

**Goal:** улучшить информативность Session status panel: debug summary `#1/#2` показывает проценты в скобках, а для Claude в имени модели отображается состояние Thinking (on/off).

### Stream: Session Status Panel
1. [DONE] Изменить debug summary формат: `#1 (78%) | #2 (81%)` вместо `#1 78% | #2 81%`; для Claude добавить в модельный label `thinking on/off` (scope: `src/client/ui/src/session/virtual-conversation.tsx`, `src/client/ui/src/session/model-info-builder.ts`, `media/react-chat.js`; expected commit message: `fix(session-ui): debug summary parens and claude thinking label`)
2. [DONE] Git Commit: `fix(session-ui): debug summary parens and claude thinking label` (hash: 028caea5)

### Stream: Release Build (Phase 133)
1. [DONE] Выполнить `./scripts/build-all.sh` (scope: manifests; expected commit message: `chore(release): run build-all for phase133 session status panel`)
2. [DONE] Git Commit: `chore(release): run build-all for phase133 session status panel` (hash: 3ece9cb3)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (scope: scripts; expected commit message: `chore(release): build and validate vsix for v1.1.552`)
4. [DONE] Git Commit: `chore(release): build and validate vsix for v1.1.552` (hash: b4ed115d)

### Stream: Post-Release Version Sync (Phase 133)
1. [DONE] Синхронизировать `README.md`, `CHANGELOG.md` и `doc/SolidWorks-Flow/System/SystemArchitecture.md` под фактическую версию после `build-all/build-release` (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(release): sync root notes and system architecture for v1.1.552`)
2. [DONE] Git Commit: `docs(release): sync root notes and system architecture for v1.1.552` (hash: 5994b7a7)

### Stream: Session Report (Phase 133)
1. [DONE] Создать `doc/Sessions/Session010.md` и зафиксировать итоги Phase 133 (scope: `doc/Sessions/Session010.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(session): add Session010 and close phase133`)
2. [DONE] Git Commit: `docs(session): add Session010 and close phase133` (hash: febb998b)

---

## Phase 134 — Flow Node Continuity Resume Timeout Unblock (owner: Oleksandr, updated: 2026-02-10)

**Goal:** устранить зависание UI на `Agent is resuming your session…` при `resume_timeout/resume_failed` в flow-node continuity: Core обязан снимать lock и очищать rollover pending.

### Stream: Core Continuity Resume
1. [DONE] Разблокировать flow-node continuity lock на `resume_timeout/resume_failed`, убрать bootstrap-prompt который провоцирует выполнение работы до ack; ужесточить resume-template (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/flow-node-continuity/template-loader.ts`; expected commit message: `fix(core): unblock flow-node resume timeout`)
2. [DONE] Git Commit: `fix(core): unblock flow-node resume timeout` (hash: d45da87e)

### Stream: Release Build (Phase 134)
1. [DONE] Выполнить `./scripts/build-all.sh` (scope: manifests; expected commit message: `chore(release): run build-all for core continuity resume unlock`)
2. [DONE] Git Commit: `chore(release): run build-all for core continuity resume unlock` (hash: c863f589)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (scope: scripts; expected commit message: `chore(release): build and validate vsix for v1.1.553`)
4. [DONE] Git Commit: `chore(release): build and validate vsix for v1.1.553` (hash: 3f304405)

### Stream: Post-Release Version Sync (Phase 134)
1. [DONE] Синхронизировать `README.md`, `CHANGELOG.md` и `doc/SolidWorks-Flow/System/SystemArchitecture.md` под фактическую версию после `build-all/build-release` (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(release): sync root notes and system architecture for v1.1.553`)
2. [DONE] Git Commit: `docs(release): sync root notes and system architecture for v1.1.553` (hash: 7cbdf6ed)

### Stream: Session Report (Phase 134)
1. [DONE] Создать `doc/Sessions/Session011.md` и зафиксировать итоги Phase 134 (scope: `doc/Sessions/Session011.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(session): add Session011 and close phase134`)
2. [DONE] Git Commit: `docs(session): add Session011 and close phase134` (hash: a6997b45)

---

## Phase 135 — Persist Default Settings on Clean Install (owner: Oleksandr, updated: 2026-02-10)

**Goal:** при чистой установке настройки провайдера должны быть записаны на диск сразу, чтобы Session UI отображал полный default model label (например, `gpt-5.2-codex (medium)`), а не только provider id.

### Stream: Settings Defaults Persistence
1. [DONE] Исправить загрузку настроек: при отсутствии/битом `settings.json` возвращать и сохранять дефолтный snapshot (scope: `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`, `src/extension-module/settings/settings-storage.ts`; expected commit message: `fix(settings): persist defaults on first load`)
2. [DONE] Git Commit: `fix(settings): persist defaults on first load` (hash: 8284c468)

### Stream: Release Build (Phase 135)
1. [DONE] Выполнить `./scripts/build-all.sh` (scope: manifests; expected commit message: `chore(release): run build-all for v1.1.554`)
2. [DONE] Git Commit: `chore(release): run build-all for v1.1.554` (hash: 23c426d8)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и собрать новый VSIX (scope: scripts; expected commit message: `chore(release): build and validate vsix for v1.1.554`)
4. [DONE] Git Commit: `chore(release): build and validate vsix for v1.1.554` (hash: 18c0b649)

### Stream: Post-Release Version Sync (Phase 135)
1. [DONE] Синхронизировать `README.md`, `CHANGELOG.md` и `doc/SolidWorks-Flow/System/SystemArchitecture.md` под фактическую версию после `build-all/build-release` (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(release): sync root notes and system architecture for v1.1.554`)
2. [DONE] Git Commit: `docs(release): sync root notes and system architecture for v1.1.554` (hash: dc91b1fb)

### Stream: Session Report (Phase 135)
1. [IN_PROGRESS] Создать `doc/Sessions/Session012.md` и зафиксировать итоги Phase 135 (scope: `doc/Sessions/Session012.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(session): add Session012 and close phase135`)
2. [TODO] Git Commit: `docs(session): add Session012 and close phase135` (hash: TBD)
