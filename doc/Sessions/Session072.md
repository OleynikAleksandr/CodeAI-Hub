# Session 72 — Phase 88: Core-driven auto-resume (lastActive) implementation

**Date:** 2026-02-02 15:57 (CET)
**Branch:** main
**Version:** 1.1.496

---

# 1. Work Done in This Session

## Work summary
- Реализован Core-driven auto-resume на выборе workspace (без UI-driven auto-resume через workflow-state polling).
- Core: добавлен persisted `lastActive` (пока: stage=`description` + artifactPath) в `.codeai-hub/<workspaceSlug>/workflow/state.json` и выдача `lastActive` в `GET /api/v1/orchestrator/workflow-state`.
- Core: добавлен `POST /api/v1/orchestrator/workspace-activate`:
  - best-effort создаёт `.codeai-hub/<workspaceSlug>/` и подключает watcher;
  - инициирует resume description-сессии (если есть sessionRef в `description-step.json`) и бродкастит `session:created`.
- Core: исправлена workspace validation при resume — теперь проверяем unified-session history по `workspaceKey = sanitize(workspacePath)` + fallback scan по `~/.codeai-hub/sessions/*`.
- Project Manager: при смене workspace вызывает `workspace-activate` и перестаёт делать auto-resume через `pm:session:resume` из workflow-state (оставили ручной resume по клику на Session-узел).

## Git commits
- `74017a2f docs: approve core-driven auto-resume lastActive architecture`
- `6f77eae4 docs(todo): mark Phase 88 design approved`
- `83f9f150 docs(session): add Session071 core-driven auto-resume design`
- `554dd8a4 docs: supersede UI-driven reviewer auto-resume design`
- `17196214 feat(core): persist workflow lastActive snapshot`
- `199d7841 docs(todo): record Phase 88 lastActive hash`
- `19d9e6a8 feat(core): add workspace activate endpoint for auto-resume`
- `05ef7475 docs(todo): record Phase 88 workspace activate hash`
- `f20c2df0 fix(core): validate resume against workspaceKey`
- `519cd85a docs(todo): record Phase 88 resume validation hash`
- `352b503a fix(core): core-driven lastActive resume with workspace validation`
- `fc0d2905 docs(todo): record Phase 88 core-driven resume hash`
- `4dbb7466 feat(project-manager): trigger core-driven auto-resume on workspace select`
- `b45ee8af docs(todo): record Phase 88 project-manager wiring hash`

---

# 2. Verification Status

## Automated gates
- ✅ `npm run check:architecture`
- ✅ `npx ultracite check`
- ✅ `npm run check:tsprune`
- ✅ `npm run check:dup`
- ✅ `npm run check:links`
- ✅ `npm run build:core`
- ✅ `npm run build:project-manager`

## Manual verification (owner)
- **Verified:** 2026-02-02 (owner confirmation)
- [x] После рестарта Core: при выборе workspace в Project Manager автоматом резюмится lastActive description-сессия (если валидна) и открывается последний артефакт.
- [x] Cross-workspace resume невозможен (workspace A не может поднять providerSessionId из workspace B).
- [x] Очистка workspace-local `.codeai-hub/<workspaceSlug>/**` корректно отключает resume (нет sessionRef/lastActive).

---

# 3. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/ProjectManager/CoreDriven_AutoResume_LastActive_Architecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session072.md` (THIS REPORT)

## Plans for next session
- Ручная верификация выполнена (см. чеклист выше). Закрыть пункты 13–14 в `doc/TODO/todo-plan.md` отдельным коммитом.
- При необходимости — фикс найденных багов (микро‑задачами ≤3 файлов).
