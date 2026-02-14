# Session 043 — Переписывание схемы отображения диалогов (History JSONL + Live Tail)

**Date:** 2026-02-14 08:23 CET
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.588

---

# 1. Work Done in This Session

## Work summary
- Зафиксирована проблема: текущая схема UI Project Manager (мердж history + live) ведёт себя нестабильно.
  - После закрытия Project Manager и остановки Core: сессия Reviewer могла не появляться/не открываться.
  - Пока Project Manager активен: появлялись повторы (особенно при reconnect/rehydrate).
- Реализованы базовые hotfix-исправления под целевую модель: **cold-start из JSONL (через Core history endpoint) + hot tail через live WS**.
  - Core: reuse resume sessions теперь учитывает `runSlug` (collector/reviewer не схлопываются при одинаковом providerSessionId).
  - Core: workspace activate восстанавливает обе description-сессии из persisted snapshot (`collectorSession` + `reviewerSession`).
  - PM/UI: исключена повторная загрузка history при повторных `session:created` для одной session.
  - PM/UI: live-tail не добавляет подряд идущие дубликаты `role+content`.
  - Flow state: в workflow-state snapshot для description теперь отдаются `collectorSession` + `reviewerSession`.
- Собран новый patch релиз 1.1.588 (build-all + build-release), VSIX создан.
- Архивирован предыдущий `doc/TODO/todo-plan.md` и создан новый `doc/TODO/todo-plan.md` под Phase 159.

## Git commits
- `d06aa1e1 fix(core): include runSlug in resume session reuse matching`
- `bddc2f04 fix(core): restore description collector+reviewer sessions on workspace activate`
- `6fa0947b fix(pm): avoid redundant history reloads to reduce transcript duplication`
- `099dd0d4 feat(flow): expose description collector/reviewer session refs in workflow state`
- `798ea880 fix(pm): skip consecutive duplicate session messages`
- `66769190 chore(release): build-all for next patch`
- `c90d1a03 docs(todo): mark release build 1.1.588 done`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session043.md` (THIS REPORT)

## Plans for next session
- Зафиксировать в документах контракт «History (JSONL) + Tail (Live)» (курсоры/идемпотентность/reconnect).
- Если повторы всё ещё воспроизводятся: добавить более строгую идемпотентность (stable `eventId/seq`) на уровне Core live stream и/или UI dedupe (не только consecutive).
- Провести QA сценарии: active PM + rollover/resume, restart Core/PM, reconnect/network glitch.
