# Session 058 — SSOT (JSONL) для ленты + план фаз на устранение регрессий

**Date:** 2026-02-15 13:34 CET
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.603

---

# 1. Work Done in This Session

## Work summary
- Зафиксирован и реализован базовый каркас SSOT для панели диалога: `history(full) + tail(cursor)` из канонического JSONL.
- Улучшен cold start: Core умеет резолвить JSONL по `dialogId` без активной runtime‑сессии.
- Упорядочена запись/рассылка: append в JSONL происходит до broadcast, чтобы UI мог догонять по cursor без гонок.
- Убраны legacy UI‑вставки divider’ов (implicit divider после thinking); divider/summary должны идти только из JSONL boundary/meta.
- Исправлен один из ключевых источников “send в никуда”: bootstrap unlock в Core перенесён на `turn_completed`.
- Пересобран `doc/TODO/todo-plan.md`: предыдущий план заархивирован, создан новый фазовый план (Phase 200–204) под оставшиеся баги.

## What is still broken (user reports)
- В UI могут появляться два разделителя “Новая сессия” (двойная разметка границы).
- User‑сообщения могут не отображаться в real-time, но появляются после перезагрузки/повторного выбора в дереве.
- После рестарта PM+Core может отображаться “пустая” сессия до ручного клика по агенту/диалогу в дереве.
- Контракт input lock/unlock требует добивки: UI должен разблокировать ввод строго на границе `turn_completed`, а Core — строго запрещать send до готовности сегмента.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `d3f9a7ba docs(flow): add dialog ssot pipeline contract`
- `beea3528 docs(flow): clarify ui data sources for dialog vs status`
- `3bed3a86 feat(core): dialog history + tail cursor api`
- `aee19b53 docs(todo): record phase191 dialog history cursor`
- `08bcdd58 fix(core): resolve dialog jsonl on cold start`
- `ce0f4b67 docs(todo): record phase191 cold start fix`
- `1f5af7fc fix(core): idempotent segment boundary meta`
- `695fc105 docs(todo): record phase191 segment meta idempotency`
- `afb6c401 fix(core): jsonl append before broadcasts`
- `3a4a4cba docs(todo): record phase191 append ordering fix`
- `a80ccb2a refactor(ui): dialog panel ssot via jsonl feed`
- `9c24cfcf docs(todo): record phase192 ssot feed`
- `dfcc8ecd fix(ui): render boundaries and summary from jsonl only`
- `7bc2b6ac docs(todo): record phase192 boundaries fix`
- `2f0e5543 fix(core): unlock bootstrap gate on turn completion`
- `c3fc2b63 docs(todo): record phase193 bootstrap unlock fix`
- `020aedc3 docs(todo): archive old plan and add new phased plan`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/Sessions/Session058.md` (THIS REPORT)
2. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/TODO/todo-plan.md` (Phase 200–204)
3. `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

## Plans for next session
- Phase 200: довести SSOT feed до полного устранения пропажи user‑сообщений в real-time + восстановление выбора диалога на cold start.
- Phase 201: перенести запись boundary/meta на первичный триггер (создание новой физической сессии Core), убрать двойные divider’ы.
- Phase 202: добить строгий input lock/unlock контракт (Core+UI) против “send в никуда”.
- Phase 203: исправить naming (`description` вместо `agent`) и обеспечить совместимость/миграцию.
- Phase 204: после фиксов — гейты + сборка нового patch release.
