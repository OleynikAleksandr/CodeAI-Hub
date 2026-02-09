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
5. `doc/Sessions/Session136.md` (THIS REPORT)
6. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 120 — Session UI Stability (fixed heights + ID in tabs) + Release (owner: Oleksandr, updated: 2026-02-09)

**Goal:** убрать “прыжки” диалога (стабильные высоты панелей) и перенести Session ID в табы.

**Design / Source of truth:**
- `doc/SolidWorks-Flow/System/SessionUI_Layout_Stability.md`

### Stream: Status Panel (Models/Tokens line) — fixed height
1. [TODO] Сконсолидировать Models+Tokens в 1 строку и зарезервировать 2-ю строку под continuity/rollover; фиксированная высота панели (scope: `src/client/ui/src/session/status-panel.tsx`, `src/client/ui/src/session/model-info-builder.ts`, `src/client/ui/src/session/token-usage-cache.ts`; expected commit: `fix(ui): stabilize status panel layout and consolidate models/tokens`)
2. [TODO] Git Commit: `fix(ui): stabilize status panel layout and consolidate models/tokens` (hash: TBD)

### Stream: Input Panel (remove extra layer) — fixed height + no orange focus
1. [TODO] Увеличить input textarea до “второй снизу” плашки, удалить промежуточный слой, не ломая скругления/фон (scope: `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/input-textarea.tsx`, `src/client/ui/src/session/dialog-panel.tsx`; expected commit: `fix(ui): simplify input panel layers and expand textarea`)
2. [TODO] Git Commit: `fix(ui): simplify input panel layers and expand textarea` (hash: TBD)
3. [TODO] Зафиксировать высоту input panel в unlocked состоянии (с подсказкой) и не менять при locked (подсказку скрывать без коллапса); убрать оранжевую окантовку при фокусе (scope: `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/input-textarea.tsx`, `src/client/ui/src/styles/session.css`; expected commit: `fix(ui): lock input panel height and unify textarea border color`)
4. [TODO] Git Commit: `fix(ui): lock input panel height and unify textarea border color` (hash: TBD)

### Stream: Session Tabs (move Session ID into tab label)
1. [TODO] Убрать верхнюю плашку `Session ID: ...` и перенести `ID: <8chars-...>` в таб рядом с именем агента/провайдера; увеличить ширину таба (scope: `src/client/ui/src/session/info-panel.tsx`, `src/client/ui/src/session/session-tabs.tsx`, `src/client/ui/src/session/session-view.tsx`; expected commit: `fix(ui): move session id to tab label and remove info panel`)
2. [TODO] Git Commit: `fix(ui): move session id to tab label and remove info panel` (hash: TBD)

### Stream: Regression Coverage
1. [TODO] Обновить/добавить тесты snapshot UI (минимум): стабильность DOM для подсказки и отсутствие focus-border изменения (scope: `src/client/ui/src/session/input-panel.test.tsx`, `src/client/ui/src/session/virtual-conversation.test.tsx`, `src/client/ui/src/session/input-textarea.tsx`; expected commit: `test(ui): cover fixed heights and no focus border regression`)
2. [TODO] Git Commit: `test(ui): cover fixed heights and no focus border regression` (hash: TBD)

### Stream: QA Gates + Targeted Builds
1. [TODO] Прогнать гейты и таргетные сборки UI (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(qa): validate gates for session ui stability`)
   - Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`
   - Target builds: `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview`
2. [TODO] Git Commit: `docs(qa): validate gates for session ui stability` (hash: TBD)

### Stream: Release Build (Final)
1. [TODO] Выполнить `./scripts/build-all.sh` и закоммитить auto-generated version/manifest изменения (scope: `package.json`, `package-lock.json`, `assets/**`; expected commit: `chore(release): run build-all for session ui stability`)
2. [TODO] Git Commit: `chore(release): run build-all for session ui stability` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball и smoke UI (scope: `codeai-hub-<version>.vsix`, `doc/tmp/releases/*`, `doc/Sessions/SessionXXX.md`; expected commit: `chore(release): build and validate vsix for session ui stability`)
4. [TODO] Git Commit: `chore(release): build and validate vsix for session ui stability` (hash: TBD)
