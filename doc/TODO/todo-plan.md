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
5. `doc/Sessions/Session138.md` (CURRENT REPORT)
6. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 121 — Dead Code Cleanup (post-Phase 120) + Release (owner: Oleksandr, updated: 2026-02-09)

**Goal:** удалить мёртвый код, оставшийся после Phase 120 (InfoPanel), и собрать чистый релиз.

### Stream: InfoPanel Dead Code Removal
1. [DONE] Удалить `src/client/ui/src/session/info-panel.tsx` (осиротевший, нигде не импортируется); удалить CSS-правила `.session-info`, `.session-info__text`, `.session-info__spacer` из `media/session-view.css` (scope: `info-panel.tsx`, `media/session-view.css`)
2. [TODO] Git Commit: `refactor(ui): remove orphaned info-panel and dead css rules` (hash: TBD)

### Stream: QA Gates + Targeted Builds
1. [TODO] Все гейты зелёные; таргетные сборки: build:webview, typecheck:webview, build:project-manager
2. [TODO] Git Commit: `docs(qa): validate gates for dead code cleanup` (hash: TBD)

### Stream: Release Build (Final)
1. [TODO] Выполнить `./scripts/build-all.sh`
2. [TODO] Git Commit: `chore(release): run build-all for dead code cleanup` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-release.sh --use-current-version` — VSIX
4. [TODO] Git Commit: `chore(release): build and validate vsix for dead code cleanup` (hash: TBD)
