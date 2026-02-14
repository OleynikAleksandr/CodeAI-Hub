# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream несколько микро‑задач.
- Каждая микро‑задача затрагивает ≤ 3 файлов.
- Каждая микро‑задача оформляется парой пунктов: (1) реализация/изменения, (2) Git Commit (отдельной строкой).
- После каждой микро‑задачи прогоняем гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка затронутого пакета.
- После зелёных гейтов: Git Commit + немедленный апдейт статусов/хешей в этом файле.
- В конце каждой Phase: Phase Report (в `doc/SolidWorks-Flow/Architecture/`) + коммит.

Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

Source of Truth (архитектура):
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

---

## Phase 170 — PM: восстановление диалогов по dialogId после рестарта Core/PM (owner: Codex, updated: 2026-02-14)

**Goal:** После рестарта Core при живом PM и при холодном старте PM клик по `Reviewer Codex` (и аналогам) открывает диалог, загружая историю из накопительного JSONL через Core `dialog:history`, без зависимости от runtime sessions.

### Stream: PM — WS протокол dialog:* (api + types)
1. [DONE] Добавить в PM WS-протокол команды/ивенты `dialog:list`, `dialog:history`, `dialog:send`, `dialog:message` (scope: `src/client/project-manager/core-stream-message-types.ts`, `src/client/project-manager/api.ts`; expected commit message: `feat(pm): add dialog WS commands to api`)
2. [DONE] Git Commit: `feat(pm): add dialog WS commands to api` (hash: 6bc726d9)

### Stream: PM — persistence (openDialogIds/activeDialogId/treeBindings)
1. [DONE] Добавить минимальный persistence-store для `dialogId` (open tabs + активный + bindings дерева) (scope: `src/client/project-manager/services/dialog-tabs-store.ts`; expected commit message: `feat(pm): persist dialog tabs by dialogId`)
2. [DONE] Git Commit: `feat(pm): persist dialog tabs by dialogId` (hash: 296d386d)

### Stream: PM — дерево: клик открывает диалог (не resume)
1. [DONE] Перевести клик по узлу `Reviewer <provider>` в дереве на событие `pm:dialog:open` (dialog intent), без требования runtime session (scope: `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `feat(pm): tree click opens dialog intent`)
2. [DONE] Git Commit: `feat(pm): tree click opens dialog intent` (hash: a0285526)

### Stream: PM — Session Panel: dialog:list + dialog:history (cold start + core restart)
1. [DONE] Прокинуть `workspaceSlug` в `ProjectManagerSessionView` и реализовать open/replay: 
- восстановить openDialogIds из persistence
- получить `dialog:list`
- по клику/intent открыть dialog tab (pseudo session = dialogId)
- запросить `dialog:history` и смержить в snapshots
(scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/sessions/session-stream.ts`; expected commit message: `feat(pm): restore dialogs via dialog history after core restart`)
2. [DONE] Git Commit: `feat(pm): restore dialogs via dialog history after core restart` (hash: c8b24fd7)

### Stream: Phase Report (Phase 170)
1. [DONE] Docs: Phase 170 report + update plan (scope: `doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase170.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(flow): phase170 report (pm dialog restore via history)`)
2. [DONE] Git Commit: `docs(flow): phase170 report (pm dialog restore via history)` (hash: c447c1b0)

---

## Phase 171 — PM: live stream + send по dialogId (owner: Codex, updated: 2026-02-14)

**Goal:** PM отправляет сообщения через `dialog:send` и принимает live `dialog:message`, мержит без дублей в тот же reducer, независимо от runtime sessionId.

### Stream: PM — send via dialogId
1. [DONE] Переключить отправку сообщения на `dialog:send` по `activeDialogId` (scope: `src/client/project-manager/api.ts`, `src/client/project-manager/components/sessions/session-message-sender.ts`; expected commit message: `feat(pm): send via dialogId`)
2. [DONE] Git Commit: `feat(pm): send via dialogId` (hash: 83b773a2)

### Stream: PM — live dialog:message -> snapshots
1. [DONE] Подписка/маршрутизация `dialog:message` (scope: `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/project-manager/components/sessions/session-message-dedupe.ts`; expected commit message: `feat(pm): live dialog stream by dialogId`)
2. [DONE] Git Commit: `feat(pm): live dialog stream by dialogId` (hash: 7ac94d51)

### Stream: Phase Report (Phase 171)
1. [DONE] Docs: Phase 171 report + update plan (scope: `doc/SolidWorks-Flow/Architecture/Refactor_Progress_Phase171.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(flow): phase171 report (pm live+send via dialogId)`)
2. [DONE] Git Commit: `docs(flow): phase171 report (pm live+send via dialogId)` (hash: 9986edec)

---

## Phase 172 — Release Build (New Patch Release) (owner: Codex, updated: 2026-02-14)

### Stream: Release Build (New Patch Release)
1. [DONE] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + `npm run typecheck:webview` (scope: repo; expected commit message: `chore: quality gates before release`)
2. [DONE] Git Commit: `chore: quality gates before release` (hash: N/A)
3. [DONE] Build: `./scripts/build-all.sh` (version bump -> `1.1.595`) (scope: repo; expected commit message: `chore(release): build-all for next patch`)
4. [DONE] Git Commit: `chore(release): build-all for next patch` (hash: d20b1547)
5. [DONE] Build: `./scripts/build-release.sh --use-current-version` (VSIX: `codeai-hub-1.1.595.vsix`) (scope: repo build)
6. [DONE] Docs: обновить этот план статусами/датами/путями артефактов релиза (scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record patch release build`)
   - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.595.vsix`
   - Tarballs (release cache): `/Users/oleksandroliinyk/.codeai-hub/releases/*-1.1.595.tar.bz2`
   - Tarballs (repo copy): `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*-1.1.595.tar.bz2`
7. [DONE] Git Commit: `docs(todo): record patch release build` (hash: 04e0f375)
