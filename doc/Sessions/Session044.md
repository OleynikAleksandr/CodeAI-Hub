# Session 044 — PM Session Dialog Restore + Bootstrap Dedupe

**Date:** 2026-02-14 09:45 (America/Chicago)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.589

---

# 0. Problem And Proposed Fix (Read First)

## Symptoms (as reproduced)
- В Project Manager UI появляются повторы системного bootstrap:
  - `System Prompt — Reviewer Agent (description review)`
  - повторяющиеся ответы агента вида `Я прочитал: ...`
- После закрытия Project Manager и/или рестарта Core: сессия Reviewer (и связанные диалоги) могут не появляться в дереве или не открываться по клику.

## Root Cause (confirmed)
1. **Cold start / Core restart:** на reconnect путь PM выполнял resync scope, но не делал `workspace-activate`. В результате runtime registry сессий не восстанавливался и PM не мог открыть диалоги.
2. **Repeats (hot/reopen):** при reconnect/replay некоторые сообщения приходили повторно (иногда с новыми id) и без tail-dedupe копились в snapshot.
3. **Repeats (continuity chain):** virtual conversation мог показывать bootstrap system prompt каждого continuation segment и дублировать сообщения при сборке цепочки.

## Fix Strategy (Phase 160)
- PM: после reconnect Core выполнять `workspace-activate` для выбранного workspace.
- PM/UI: live-tail dedupe не только по `messageId`, но и по ключу `role + createdAt + content` (ограниченно по tail).
- UI: в virtual conversation скрывать bootstrap system prompt continuation segment (segmentIndex > 0) и применять display-dedupe по `role + createdAt + content`.
- Docs: зафиксировать контракт “cold start из JSONL + hot tail из live stream” и правила suppression/dedupe.

---

# 1. Work Done in This Session

## Work summary
- Заархивирован старый `doc/TODO/todo-plan.md`, создан новый план Phase 160 и отмечался прогресс по ходу работ.
- Исправлен cold start после рестарта Core: reconnect теперь приводит к `workspace-activate` и восстановлению runtime session registry.
- Усилен dedupe live stream в PM: suppress replay по `role+createdAt+content` (не только подряд и не только по id).
- Исправлено отображение continuity chain: suppression bootstrap system prompt для continuation segment + display-dedupe.
- Обновлены архитектурные документы в `doc/SolidWorks-Flow/` под новый контракт.
- Собран новый patch релиз `1.1.589`.

## Git commits
- `41e7d84b docs(sessions): start Session044 (pm dialog restore + dedupe plan)`
- `4bba2724 fix(pm): activate workspace after core reconnect`
- `84aabce9 docs(todo): update Phase 160 progress (report + reconnect fix)`
- `fc008dc1 fix(pm): dedupe replayed messages by createdAt+role+content`
- `8d4dc85a docs(todo): add commit hash for replay dedupe`
- `d7c0f3b9 fix(ui): suppress continuity bootstrap repeats in virtual conversation`
- `144571db docs(todo): record ui bootstrap suppression commit hash`
- `9964c010 docs(flow): document cold-start+tail contract and bootstrap suppression`
- `4b1b4785 docs(todo): record docs contract commit hash`
- `aaf4b743 docs(todo): archive previous plan (phase159)`
- `b89bcd4e docs(todo): mark release gates done`
- `ba3c49cf chore(release): build-all for next patch`
- `4787e8cc docs(todo): record release 1.1.589 build stream`

## Release artifacts
- VSIX: `codeai-hub-1.1.589.vsix`
- Tarballs: `~/.codeai-hub/releases/*-1.1.589.tar.bz2`
- Copied to repo: `doc/tmp/releases/*-1.1.589.tar.bz2`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session044.md` (THIS REPORT)

## Plans for next session
- Провести ручной QA на `1.1.589`:
  - (1) активный PM: несколько reconnect/rollover без дублей.
  - (2) закрыть PM + рестарт Core: сессии появляются в дереве и открываются.
  - (3) continuity chain: в диалоге нет повторов bootstrap system prompt для continuation segment.
- Если останутся дубли: добавить диагностический лог вокруг replay/WS resubscribe и/или расширить стабильный cursor/seq контракт для history+tail.
