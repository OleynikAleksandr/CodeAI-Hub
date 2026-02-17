# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- Каждая микро‑задача затрагивает **≤ 3 файлов**.
- Каждая микро‑задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро‑задачи прогоняем гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links`, затем таргетные сборки затронутого пакета/клиента.

Обязательное чтение перед фиксом (anti “релиз в пустоту”):
- `doc/SolidWorks-Flow/Workflow/FacadeClassDiagram_DesignAndMaintenance.md`
- `doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`
- `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`

---

## Phase 209 — PM/UI: auto-handoff с Description → Reviewer (owner: Oleksandr+Codex, updated: 2026-02-17)

**Problem (validated):** после завершения one-shot `Description` (создан `description.md`) Core авто‑стартует `Reviewer`, сессия появляется в дереве, но **не фокусируется автоматически** в области Session UI (появляется только по клику или после reload/switch workspace).

**Goal:** когда `Description` становится terminal/read‑only и в workflow появляется `Reviewer` для того же узла — PM автоматически переключает активную сессию на `Reviewer` (без ручного клика), но **не ворует фокус**, если пользователь уже ушёл в другую сессию.

### Stream: Диагностика (SSOT owner + событие переключения)
1. [TODO] Trace: зафиксировать реальный путь событий/состояний от `description.md written` → `reviewer session created` → `dialog list updated` → `selected dialog` (scope: `~/.codeai-hub/logs/**`, `doc/BugRegistry.md`, `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`; expected outcome: точный “owner” selection и точка для авто‑handoff)
2. [TODO] Git Commit: `docs(pm): describe live auto-handoff trigger for reviewer` (hash: TBD)

### Stream: Реализация auto-handoff (live)
1. [DONE] Fix: добавить live авто‑handoff правило “terminal Description → focus Reviewer” на уровне owner выбора active session (`ProjectManagerRuntimeSessionView` + `runtime-session-auto-select`) (scope: `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`, `src/client/project-manager/components/sessions/runtime-session-auto-select.ts`; expected commit message: `fix(pm): auto-focus reviewer after description completes`)
2. [DONE] Git Commit: `fix(pm): auto-focus reviewer after description completes` (hash: `3e5438b4`)

### Stream: Guards
1. [DONE] Test/Smoke: добавить regression (unit/logic) на условие “не воровать фокус если пользователь переключился” (scope: `src/client/project-manager/components/sessions/runtime-session-auto-select.test.ts`; expected commit message: `test(pm): guard auto-handoff focus rules`)
2. [DONE] Git Commit: `test(pm): guard auto-handoff focus rules` (hash: `3e5438b4`)

### Stream: Fix reviewer visibility (forcedHidden)
1. [DONE] Fix: при `sessionKind=reviewer` корректно резолвить `reviewerSessionId` (предпочитать `sessionKind/runSlug=reviewer` до binding), чтобы PM не скрывал реального Reviewer и не оставлял активной terminal Description (scope: `src/client/project-manager/components/sessions/reviewer-session-visibility.ts`, `src/client/project-manager/components/sessions/reviewer-session-visibility.test.ts`; expected commit message: `fix(pm): resolve reviewer session during live handoff`)
2. [DONE] Git Commit: `fix(pm): resolve reviewer session during live handoff` (hash: `e3202ab2`)

### Stream: Auto-open reviewer dialog (handoff trigger)
1. [DONE] Fix: при переходе workflow-state `description.sessionKind=reviewer` автоматически диспатчить `pm:dialog:open` (как клик по узлу дерева) с guard `activeTool=Description` + дедуп по `providerSessionId`, чтобы reviewer появлялся в Session UI без ручного клика (scope: `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts`; expected commit message: `fix(pm): auto-open reviewer dialog on handoff`)
2. [DONE] Git Commit: `fix(pm): auto-open reviewer dialog on handoff` (hash: `5efbd970`)

### Stream: Release
1. [DONE] Release: `./scripts/build-all.sh` (version bump -> `1.1.624`) + `./scripts/build-release.sh --use-current-version` (VSIX: `codeai-hub-1.1.624.vsix`; tarballs: `doc/tmp/releases/*-1.1.624.tar.bz2`, `~/.codeai-hub/releases/*-1.1.624.tar.bz2`) (scope: repo)
2. [DONE] Git Commit: `feat(release): v1.1.624 - pm auto-handoff to reviewer (live)` (hash: `1fe34f60`)

### Stream: Release (follow-up)
1. [DONE] Release: `./scripts/build-all.sh` (version bump -> `1.1.625`) + `./scripts/build-release.sh --use-current-version` (VSIX: `codeai-hub-1.1.625.vsix`; tarballs: `doc/tmp/releases/*-1.1.625.tar.bz2`, `~/.codeai-hub/releases/*-1.1.625.tar.bz2`) (scope: repo)
2. [DONE] Git Commit: `feat(release): v1.1.625 - auto-open reviewer dialog on handoff` (hash: `0d40f576`)

**Validated:** 2026-02-17 — verified in release `1.1.625` (Codex, Claude)

---

## Phase 210 — PM/UI: token usage refresh after turns (owner: Oleksandr+Codex, updated: 2026-02-17)

**Problem (validated):** `Tokens: …` in Session UI does not always refresh after turn completion (numbers appear only after switching workspace / reopening PM).

**Goal:** token usage is updated after each completed turn, including dialog sessions that hydrate snapshots after stream events.

### Stream: Fix + Release
1. [DONE] Fix: accept token usage stream events even when snapshot is missing; fallback by `binding.providerSessionId` and write last-known cache (scope: `src/client/project-manager/components/sessions/token-usage-stream.ts`, `src/client/project-manager/components/sessions/token-usage-stream.test.ts`; expected commit message: `fix(pm): sync token usage after turns`)
2. [DONE] Git Commit: `fix(pm): sync token usage after turns` (hash: `29c1ddea`)
3. [DONE] Release: `./scripts/build-all.sh` (version bump -> `1.1.626`) + `./scripts/build-release.sh --use-current-version` (VSIX: `codeai-hub-1.1.626.vsix`; tarballs: `doc/tmp/releases/*-1.1.626.tar.bz2`, `~/.codeai-hub/releases/*-1.1.626.tar.bz2`) (scope: repo)
4. [DONE] Git Commit: `feat(release): v1.1.626 - token usage sync` (hash: `5edb563d`)

**Validated:** 2026-02-17 — verified in release `1.1.626` (token usage refresh after each turn)
