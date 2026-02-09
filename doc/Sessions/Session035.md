# Session 035 — Docs: align SolidWorks-Flow + Project_Docs with Phase 65 decisions

**Date:** 2026-01-21 15:16 (CET)
**Branch:** main
**Version:** 1.1.464

---

# 1. Work Done in This Session

## Work summary
- Актуализированы документы в `doc/SolidWorks-Flow/` и `doc/SolidWorks-Flow/` под уже принятые решения:
  - Project Manager (CEF) — единственный активный UI‑клиент Core на период активной разработки FLOW.
  - `vscode-webview` — Settings-only (без сессий/чатов/подключения к Core) на период FLOW.
  - `web-client` — legacy UI, принят план полного удаления (Phase 65) вместе со сборкой/инсталляторами/ссылками.
- Обновлены диаграммы/описания, чтобы избежать ложного впечатления, что `web-client` остаётся целевым standalone UI.

## Verification
- `npm run check:links` (OK)
- `./scripts/check-architecture.sh` (PASS with warnings)
- `npx ultracite check` (OK)

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `02a3e466 docs(solidworks-flow): reflect project-manager-only mode`
- `834f865d docs(arch): align docs with web-client deprecation`
- `f5dd78c1 docs(ui): deprecate web-client in docs`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/TODO/todo-plan.md` (Phase 65)
2. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
3. `doc/SolidWorks-Flow/System/ProjectStructureMap.md`
4. `doc/SolidWorks-Flow/Stacks/UI_Modules.md`
5. `doc/SolidWorks-Flow/Stacks/Launcher_CEF_Module.md`
6. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
7. `doc/SolidWorks-Flow/README.md`
8. `doc/Sessions/Session034.md`
9. `doc/Sessions/Session035.md` (THIS REPORT)

## Plans for next session
- Начать реализацию Phase 65 (удаление `web-client` и перевод `vscode-webview` в Settings-only) по микрозадачам ≤3 файлов с обязательными гейтами и отдельными коммитами.
