# Session 107 — Core-first immediate lock prep (Phase 103 planning)

**Date:** 2026-02-07 11:35 (CET)
**Branch:** main
**Version:** 1.1.521

---

# 1. Work Done in This Session

## Work summary
- Проведён runtime/code audit по кейсу: в Codex-сессии поле ввода блокируется не мгновенно после user submit, а после прихода provider stream marker.
- Подтверждена причина различия поведения:
  - `Claude_Module` эмитит `turn_started` сразу при `send(...)` (optimistic start);
  - `Codex_Module` эмитит `turn_started` только на входящем `turn.started` событии SDK.
- Подтверждено, что UI/PM lock-логика в целом централизована и общая, но триггер `running` сейчас зависит от provider-specific источника `turn_started`.
- Принято решение по унификации: централизовать мгновенный lock в Core на уровне `handleMessage` (до `adapter.sendMessage`) и делать rollback в `idle` на send-error.
- Обновлён `doc/TODO/todo-plan.md`: добавлена новая фаза `Phase 103 — Core-first Immediate Input Lock Parity` с отдельным Stream и микрозадачами под реализацию/тесты.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- В этой сессии коммиты не создавались.
- Рабочее дерево содержит незакоммиченные изменения: `doc/TODO/todo-plan.md`.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/SessionContinuity/Core/FlowNodeContinuity_InputLock_Contract_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/Core/FlowNodeContinuity_TurnEnd_AtomicLock_Architecture.md`
4. `doc/TODO/todo-plan.md` (Phase 103, Stream: `centralize immediate lock on send in Core + rollback on provider send error`)
5. `doc/Sessions/Session106.md`
6. `doc/Sessions/Session107.md` (THIS REPORT)

## Runtime/code artifacts to read for fast context restore
1. `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
2. `src/client/project-manager/components/sessions/token-usage-stream.ts`
3. `src/client/project-manager/components/sessions/session-message-sender.ts`
4. `src/client/ui/src/session/input-panel.tsx`
5. `src/client/ui/src/session/session-view-helpers.tsx`
6. `packages/Claude_Module/src/messaging/message-processor.ts`
7. `packages/Codex_Module/src/messaging/message-processor.ts`
8. `/Users/oleksandroliinyk/.codeai-hub/logs/codex/sdk-codex-019c378e-ece2-7201-a9ea-f53b079a325e.jsonl`
9. `/Users/oleksandroliinyk/.codeai-hub/logs/core/core.log`

## Verified diagnostic notes (from this session)
- Codex log фиксирует задержку между `user_input` и `turn.started` на startup path; это окно и даёт визуальный late lock в UI.
- UI блокировка привязана к `connectionState` (`running|blocked`) и не включает отдельный optimistic lock on submit.
- Для унификации UX между провайдерами нужно поднимать `turn_state=running` в Core до вызова provider adapter.

## Plans for next session
- Выполнить `Phase 103` по микрозадачам из `doc/TODO/todo-plan.md` с обязательными git commits после каждой подзадачи.
- Сначала зафиксировать doc-contract (Core-first immediate lock + rollback semantics), затем реализовать Core изменения в `handleMessage`.
- Добавить/обновить регрессионные тесты Core и PM/UI на provider-agnostic immediate lock parity и rollback on send failure.
- Прогнать обязательные quality gates и таргетные тесты/сборки затронутых пакетов.
