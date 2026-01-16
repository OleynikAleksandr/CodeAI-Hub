# Session 118 — Project Manager: disable mock workflow tree + Release 1.1.425

**Date:** 2026-01-16 13:44 (CET)
**Branch:** main
**Version:** 1.1.425

---

# 1. Work Done in This Session

## Work summary
- Унифицирован канонический документ Workflow Tree под MVP Project Manager (UX + привязка к runtime артефактам `.codeai-hub/` + upsert protocol).
- Project Manager UI подготовлен к “реальной” разработке: при выбранном workspace дерево показывает только корневой узел (без моковых шагов/модулей), статическая палитра инструментов отключена; старый мок оставлен закомментированным как reference.
- Собран релиз 1.1.425: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.425.vsix`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `2bf21d2e docs: consolidate workflow tree mvp`
- `3149b16d fix(project-manager): hide mock workflow tree`
- `e51848b8 chore(release): bump 1.1.425`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
5. `doc/Sessions/Session118.md` (THIS REPORT)

## Plans for next session
- Подключить реальные действия `Fork Workspace`/`New Workspace` в Project Manager (согласовать `git clone` vs `git worktree`).
- Начать генерацию дерева из реальных данных (артефакты/runs в `.codeai-hub/` и/или API Core), вместо моковых узлов.
