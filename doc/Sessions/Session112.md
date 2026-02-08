# Session 112 — Баг workspace-scope: залипание input lock + blueprint слоистой архитектуры Workspace Runtime

**Date:** 2026-02-07 17:25 (CET)
**Branch:** main
**Version:** 1.1.523

---

# 1. Work Done in This Session

## Work summary
- Разобран критичный регресс после workspace-scoped изоляции: после ответа агента UI остаётся в состоянии `Agent is working… Please wait.` и блокирует ввод.
- Подтверждён механизм: блокировка ввода зависит от `connectionState === "running"` (который обновляется из `turn_state` в `session:stream`). Если terminal-событие (`turn_state=idle`/unlock) теряется или не применяется, UI остаётся заблокирован.
- Выявлена системная причина класса ошибок: изоляция через фильтрацию событий может приводить к потере terminal-маркеров для конкретного scoped-клиента, а stale runtime-состояние затем не пересчитывается автоматически.
- Сформулирован правильный целевой подход: изоляция workspace по конструкции (шардирование runtime/store) + контракт `snapshot-first` (полный снапшот при выборе workspace, затем delta-stream с курсором), чтобы stale состояния автоматически исчезали при переподписке.
- Создан и затем уточнён архитектурный документ под SolidWorks-Flow: `doc/SolidWorks-Flow/WorkspaceRuntime_LayeredArchitecture.md`.
- Тесты/гейты в рамках этой сессии не запускались (изменения только в документации).

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- N/A (в этой сессии git commit не выполнялся)
- `3745f892 feat(bridge): add workspace scope message contract for project manager clients` (reviewed)
- `1952b667 fix(core): scope session event delivery by selected workspace for pm clients` (reviewed)
- `c12afc43 feat(pm): sync selected workspace scope to core bridge` (reviewed)
- `f6120a0b fix(non-regression): keep restart resume compatibility with scoped workspace isolation` (reviewed)

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/WorkspaceRuntime_LayeredArchitecture.md`
2. `doc/Project_Docs/SessionIsolation/ProjectManager_WorkspaceScopedSessionIsolation_Architecture.md`
3. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session112.md` (THIS REPORT)

## Plans for next session
- Сделать минимальный hotfix регресса: гарантировать, что terminal-состояние (`turn_state=idle` и/или unlock-маркер) не может быть потеряно scoped-клиентом и UI всегда разблокируется.
- Уточнить/согласовать контракт `WorkspaceSnapshot + cursor + delta-stream` (формат снапшота и правила reconcile) как основу надёжной изоляции.
