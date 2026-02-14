# Session 046 — PM: клик по сессии не должен «умирать» после рестарта Core

**Date:** 2026-02-14 11:35 (CET)
**Branch:** codex/phase156-unified-agent-dialog
**Version:** 1.1.592

---

# 1. Work Done in This Session

## Work summary
- Воспроизведена и локализована причина «мертвого клика» по узлу `Reviewer Codex` в дереве Project Manager после перезапуска Core.
- Механика клика (`pm:session:resume`) шла через `useSessionResumeIntent`, который жёстко ждал `workspace:select:ack` (3 секунды). Если ACK не приходил вовремя или приходил для другого requestId (из параллельного выбора workspace), resume silently отменялся.
- Итог: UI выглядел так, будто «сессии нет» или «клик не работает», хотя Core уже мог корректно отдавать `workflow-state` и `description-step.json` содержал правильные ссылки на JSONL.

## Fix
- Убрана жёсткая зависимость resume от WS ACK: теперь перед resume выполняется best-effort `workspace:select` (если нужно), но resume/создание сессии не блокируется ожиданием ACK.
- Это восстанавливает прежнее поведение: клик всегда приводит к открытию/созданию нужной сессии, даже если WS ACK/handshake “плавает” при cold start.

## Release
- Собран новый patch релиз 1.1.592.

## Git commits
- `e8358e0b fix(pm): avoid dead click on session resume (best-effort workspace select)`
- `ace28fde chore(release): build-all for next patch`
- `d566c9bf chore(release): refresh provider manifest checksums`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session046.md` (THIS REPORT)

## Plans for next session
- Перепроверить сценарий, который ломался у вас:
  - Reviewer ответил -> закрыть PM -> перезапустить Core -> открыть PM -> клик по `Reviewer Codex` должен открывать сессию.
- Если после этого останется кейс «узел виден, но диалог не подтягивается из JSONL», тогда уже точечно правим cold-start загрузку истории (без слома live-tail) и добавляем диагностический вывод только для этого пути.
