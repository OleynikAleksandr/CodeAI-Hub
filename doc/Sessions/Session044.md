# Session 044 — PM Session Dialog Restore + Bootstrap Dedupe

**Date:** 2026-02-14 09:15 (America/Chicago)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.588

---

# 0. Problem And Proposed Fix (Read First)

## Symptoms (as reproduced)
- В Project Manager UI появляются повторы системного bootstrap:
  - `System Prompt — Reviewer Agent (description review)`
  - повторяющиеся ответы агента вида `Я прочитал: ...`
  Причем в persisted JSONL на диске эти сообщения присутствуют **один раз**.
- После закрытия Project Manager и/или рестарта Core: сессия Reviewer (и связанные диалоги) могут **не появляться в дереве** или **не открываться** по клику.

## Root Cause (current hypothesis, verified by code inspection)
1. **Cold start / Core restart:** на reconnect путь PM не вызывает `workspace-activate`, поэтому runtime registry сессий остается пустым. Дерево не может корректно открыть session history.
2. **Repeats:** UI строит «виртуальный диалог» как merge по continuity chain (несколько provider sessions). Для каждого сегмента в цепочке снова отображаются bootstrap‑сообщения (system prompt + первичный ack), хотя фактически это служебные сообщения начала сегмента.

## Fix Strategy (phase 160)
- PM: при reconnect (после рестарта Core) обязательно активировать выбранный workspace (`workspace-activate`), чтобы восстановить runtime session refs и дерево.
- UI: при построении virtual conversation подавлять bootstrap‑сообщения для `segmentIndex > 0` (оставляя bootstrap только для первого сегмента), чтобы continuity rollover не дублировал «System Prompt» и «Я прочитал».
- Docs: зафиксировать контракт “cold start из JSONL + hot tail из live stream” и правило suppression bootstrap сегментов.

---

# 1. Work Done in This Session

## Work summary
- Создан новый план работ Phase 160 под устранение дублей и восстановление после рестарта.
- Запланированы 2 точечных фикса (PM reconnect activation + UI bootstrap suppression) и обновление документации.

## Git commits
- TBD

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session044.md` (THIS REPORT)

## Plans for next session
- Применить фиксы Phase 160, прогнать гейты, собрать новый patch release и выдать VSIX для тестов.
