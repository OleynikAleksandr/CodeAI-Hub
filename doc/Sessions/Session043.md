# Session 043 — Переписывание схемы отображения диалогов (History JSONL + Live Tail)

**Date:** 2026-02-14 08:04 CET
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.587

---

# 1. Work Done in This Session

## Work summary
- Зафиксирована проблема: текущая схема UI Project Manager (мердж history + live) даёт повторы при активном PM и может не восстанавливать/не открывать сессию Reviewer после закрытия PM и рестарта Core.
- Сформулирован целевой инвариант: **cold-start загружает историю из JSONL**, затем **hot-mode подписывается на live stream и применяет только tail** (без дублей), с детерминированным курсором/seq/eventId.
- Собран новый patch релиз 1.1.587 (build-all + build-release), артефакт VSIX создан.
- Архивирован предыдущий `doc/TODO/todo-plan.md` и создан новый `doc/TODO/todo-plan.md` под Phase 159 (переписывание схемы диалогов).

## Git commits
- `f253f5cf docs(todo): archive old plan and start phase159 dialog UI rewrite`
- `a9f59522 docs(todo): update release build progress for 1.1.587`
- `41c0bab1 chore(release): build-all for next patch`
- `5b17d7f9 chore(release): build-all for next patch`
- `5705d587 docs(flow): document per-agent dialogSessionId separation`
- `f8ea4467 fix(core): backfill mixed dialog history into per-agent files`
- `afc05237 fix(pm): dedupe session messages when merging history and live stream`
- `2e3fd4f4 fix(core): skip empty thinking records in unified-session`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session043.md` (THIS REPORT)

## Plans for next session
- Реализовать контракт **стабильной идентичности событий** (`eventId` или `seq`) так, чтобы он был одинаковым в JSONL history и в live stream.
- Переписать UI Project Manager на модель **history -> tail**:
  - грузить JSONL один раз (cold start), запоминать курсор;
  - держать single subscription на `dialogSessionId` и применять только события после курсора;
  - корректно переживать reconnect без дублей.
- Исправить восстановление сессий в дереве после рестарта Core/PM (кликабельность/открытие) на основе persisted `dialogSessionId`.
- После фиксов: QA сценарии (active PM + rollover/resume, restart Core/PM, reconnect/network glitch) и сборка нового релиза.
