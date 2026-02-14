# Session 045 — PM: восстановление сессий после рестарта Core (cold start)

**Date:** 2026-02-14 10:40 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.591

---

# 1. Work Done in This Session

## Work summary
- Зафиксирована критичная регрессия: после перезапуска Core (cold start) в Project Manager пропадали сессии агента (например, `Reviewer Codex`) и клик по узлу в дереве ничего не открывал.
- Причина оказалась не в JSONL как источнике истории, а в гонках handshake на старте:
  - PM отправлял `workspace:select` по WebSocket слишком рано (когда сокет еще не поднят) и сообщение дропалось.
  - Затем PM ждал `workspace:select:ack` ограниченное время и не делал `workspace-activate`, из-за чего Core не восстанавливал runtime registry/дерево и UI оставался пустым.
- Исправления:
  - Очередь исходящих WS сообщений: `workspace:select` больше не теряется на cold start; сообщения копятся до `onopen` и отправляются сразу после соединения.
  - `workspace-activate` дергается на reconnect/cold start без зависимости от WS ACK, чтобы восстановление в Core срабатывало всегда.
- Цель поведения (контракт):
  - Пока PM открыт: live-tail (WS/HTTP events) наполняет диалог без дублей.
  - После рестарта Core/PM: cold-start восстановление читает накопленный JSONL диалога агента, затем продолжается hot-tail по live stream с дедупликацией.

## Git commits
- `31f0d729 fix(pm): queue ws messages until connected`
- `dfc2982f fix(pm): activate workspace without waiting for ws ack`
- `0a21cf50 chore(release): build-all for next patch`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session045.md` (THIS REPORT)

## Plans for next session
- Собрать VSIX для версии 1.1.591 (если еще не собран) и отдать на тест сценария:
  - Reviewer ответил -> закрыть PM -> перезапустить Core -> открыть PM -> сессия доступна и открывается.
- Если останется воспроизводимый кейс “сессия пропала после рестарта Core”:
  - снять логи WS handshake и Core workspace-activate,
  - добавить минимальный диагностический лог (не ломая UX) в PM + Core.
