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
5. `doc/Sessions/Session139.md` (CURRENT REPORT)
6. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 121 — Dead Code Cleanup (post-Phase 120) + Release (owner: Oleksandr, updated: 2026-02-09) ✅ COMPLETE

**Goal:** удалить мёртвый код, оставшийся после Phase 120 (InfoPanel), и собрать чистый релиз.

### Stream: InfoPanel Dead Code Removal
1. [DONE] Удалить `src/client/ui/src/session/info-panel.tsx` (осиротевший, нигде не импортируется); удалить CSS-правила `.session-info`, `.session-info__text`, `.session-info__spacer` из `media/session-view.css` (scope: `info-panel.tsx`, `media/session-view.css`)
2. [DONE] Git Commit: `refactor(ui): remove orphaned info-panel and dead css rules` (hash: 0c5bb40f)

### Stream: QA Gates + Targeted Builds
1. [DONE] Все гейты зелёные; таргетные сборки: build:webview, typecheck:webview, build:project-manager — PASSED
2. [DONE] Git Commit: included in 0c5bb40f (gates passed in pre-commit hooks)

### Stream: Release Build (Final)
1. [DONE] Выполнить `./scripts/build-all.sh` v1.1.540
2. [DONE] Git Commit: `chore(release): run build-all for dead code cleanup v1.1.540` (hash: 0456b328)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` — VSIX codeai-hub-1.1.540.vsix (1.0M)
4. [DONE] Git Commit: `chore(release): build and validate vsix for dead code cleanup` (hash: 78f9ab38)

---

## Phase 122 — Session UI Tweaks (Session ID bar + One-line Status) (owner: Oleksandr, updated: 2026-02-10)

**Goal:** вернуть плашку Session ID между Tabs и Dialog; сделать status panel однострочной (Models/Tokens + right-aligned continuity), выровнять типографику по input-hint.

**Design / Source of truth:**
- `doc/SolidWorks-Flow/System/SessionUI_Layout_Stability.md` (раздел "Phase 122 — Planned UI Adjustments")

### Stream: Session ID Bar (restore)
1. [DONE] Добавить плашку `ID: <8chars>-...` между Tabs и Dialog; типографика как у input-hint (scope: `src/client/ui/src/session/session-id-bar.tsx`, `src/client/ui/src/session/session-view.tsx`, `media/session-view.css`; expected commit message: `fix(ui): restore session id header bar`)
2. [DONE] Git Commit: `fix(ui): restore session id header bar` (hash: 8cad1fee)

### Stream: Tabs (remove ID, compact width)
1. [DONE] Убрать `ID: ...` из лейбла таба, оставить только имя агента (например: `Reviewer Claude`); уменьшить ширину таба (scope: `src/client/ui/src/session/session-tabs.tsx`, `media/session-view.css`; expected commit message: `fix(ui): revert tab labels to agent name only`)
2. [DONE] Git Commit: `fix(ui): revert tab labels to agent name only` (hash: c72a88f4)

### Stream: Status Panel (one-line + right aligned continuity)
1. [DONE] Сконсолидировать Models/Tokens и `#1 ... | #2 ...` в одну строку; правый блок выровнять по правому краю; уменьшить высоту плашки до одной строки; типографика как у input-hint (scope: `src/client/ui/src/session/status-panel.tsx`, `media/session-view.css`; expected commit message: `fix(ui): make status panel single-line with right aligned continuity`)
2. [DONE] Git Commit: `fix(ui): make status panel single-line with right aligned continuity` (hash: b709c19e)

### Stream: QA Gates + Targeted Builds
1. [DONE] Все гейты зелёные; таргетные сборки: build:webview, typecheck:webview, build:project-manager — PASSED (scope: N/A; expected commit message: `docs(qa): validate gates for session ui tweaks`)
2. [DONE] Git Commit: `docs(qa): validate gates for session ui tweaks` (hash: TBD — this commit)

### Stream: Build Artifacts Sync (pre-release)
1. [DONE] Обновить `media/react-chat.js` после таргетной сборки webview, чтобы fallback UI bundle соответствовал Session UI изменениям (scope: `media/react-chat.js`; expected commit message: `chore(build): regenerate webview bundle for session ui tweaks`)
2. [DONE] Git Commit: `chore(build): regenerate webview bundle for session ui tweaks` (hash: TBD — this commit)

### Stream: Release Build (Final)
1. [TODO] Выполнить `./scripts/build-all.sh` (scope: scripts; expected commit message: `chore(release): run build-all for session ui tweaks`)
2. [TODO] Git Commit: `chore(release): run build-all for session ui tweaks` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-release.sh --use-current-version` — VSIX (scope: scripts; expected commit message: `chore(release): build and validate vsix for session ui tweaks`)
4. [TODO] Git Commit: `chore(release): build and validate vsix for session ui tweaks` (hash: TBD)
