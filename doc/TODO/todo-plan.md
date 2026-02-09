# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Stream — микро-задачи.
- Каждая микро-задача должна затрагивать не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.
- Реализованный план переносится в `doc/TODO/Archive/` с префиксом завершённой Phase.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SessionUI_Layout_Stability.md`
2. `doc/SolidWorks-Flow/Stacks/Project_Manager.md`
3. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
4. `doc/SolidWorks-Flow/WorkspaceRuntime/WorkspaceRuntime.md`
5. `doc/Sessions/Session137.md` (CURRENT REPORT)
6. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 120 — Session UI Stability (fixed heights + ID in tabs) + Release (owner: Oleksandr, updated: 2026-02-09) ✅ COMPLETE

**Goal:** убрать "прыжки" диалога (стабильные высоты панелей) и перенести Session ID в табы.

**Design / Source of truth:**
- `doc/SolidWorks-Flow/System/SessionUI_Layout_Stability.md`

### Stream: Status Panel (Models/Tokens line) — fixed height
1. [DONE] Сконсолидировать Models+Tokens в 1 строку и зарезервировать 2-ю строку под continuity/rollover; фиксированная высота панели (scope: `status-panel.tsx`, `media/session-view.css`)
2. [DONE] Git Commit: `fix(ui): stabilize status panel layout and consolidate models/tokens` (hash: 0c88c0ad)

### Stream: Input Panel (remove extra layer) — fixed height + no orange focus
1. [DONE] Увеличить input textarea до "второй снизу" плашки, удалить промежуточный слой визуально (CSS-only) (scope: `media/session-view.css`)
2. [DONE] Git Commit: `fix(ui): simplify input panel layers and expand textarea` (hash: 8b7fafed)
3. [DONE] Зафиксировать высоту input panel (visibility:hidden вместо conditional render для подсказки); убрать оранжевую окантовку при фокусе (scope: `input-panel.tsx`, `media/session-view.css`)
4. [DONE] Git Commit: `fix(ui): lock input panel height and unify textarea border color` (hash: d2e6612c)

### Stream: Session Tabs (move Session ID into tab label)
1. [DONE] Убрать InfoPanel из SessionHeader, перенести `ID: <8chars>-…` в таб; увеличить min-width таба; вынести buildTabDisplayData для снижения complexity (scope: `session-tabs.tsx`, `virtual-conversation.tsx`, `session-view.tsx`, `media/session-view.css`)
2. [DONE] Git Commit: `fix(ui): move session id to tab label and remove info panel` (hash: d40f2988)

### Stream: Regression Coverage
1. [DONE] Добавлен тест: hint footer всегда в DOM (visibility:hidden при locked) (scope: `input-panel.test.tsx`)
2. [DONE] Git Commit: `test(ui): cover fixed heights and no focus border regression` (hash: 7e97e1fa)

### Stream: QA Gates + Targeted Builds
1. [DONE] Все гейты зелёные; таргетные сборки: build:webview, typecheck:webview, build:project-manager — PASSED
2. [DONE] Git Commit: `docs(qa): validate gates for session ui stability` (hash: fb7d73e1)

### Stream: Release Build (Final)
1. [DONE] Выполнить `./scripts/build-all.sh` v1.1.539
2. [DONE] Git Commit: `chore(release): run build-all for session ui stability v1.1.539` (hash: 3e239bd0)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` — VSIX codeai-hub-1.1.539.vsix (1.0M)
4. [DONE] Git Commit: `chore(release): build and validate vsix for session ui stability` (hash: TBD — this commit)
