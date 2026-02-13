# Session 037 — Phase 152: Continuity ACK/Retry + UI Failure Surfacing + Release 1.1.580

**Date:** 2026-02-13 11:31 (CET)
**Branch:** main
**Version:** 1.1.580

---

# 1. Work Done in This Session

## Problem
У провайдера Codex периодически ломался rollover по контекстному окну:
- internal turn `Flow Node Continuity — Create Report` мог не попасть в нужную provider session ("в пустоту") или завершиться без `turn_completed`.
- Core после этого ждал report file, оставался в `working`, и Project Manager зависал на `Agent is working… Please wait.` (ввод блокировался навсегда).
- У Claude тот же сценарий проходил стабильно.

## Root Cause (по наблюдаемым симптомам)
- Для Codex наблюдалась ненадежность доставки/финализации internal turns (нет гарантии, что `Create Report` реально попал в текущую provider session и что мы увидим финальный `turn_completed`).
- Core до Phase 152 полагался на то, что provider всегда корректно завершит turn, и не имел handshake/timeout/retry политики + user-facing failure сообщения.

## Fix (универсально для всех провайдеров)
Core:
- Введен requestId + состояние попыток для continuity `Create Report`.
- Добавлен delivery/ACK handshake: после отправки internal prompt Core ждет ACK (любой provider event) и делает retry в ТУ ЖЕ provider session.
- Добавлен retry при report-timeout: повторная отправка `Create Report` и повторное ожидание report file.
- После 2 попыток Core:
  - снимает блокировки (lock finalize + `turn_state=idle`);
  - возвращает `resumeMode` к `resume_in_place`;
  - эмитит `stream_event.data.kind=continuity_failed` (reason + context);
  - эмитит `flow_node_rollover phase=failed` с error.
- Добавлен safety: после `report_ready` Core эмитит `turn_state=idle` даже если провайдер не прислал `turn_completed` для internal turns.

Project Manager / Session UI:
- PM сохраняет continuity failure причины в `snapshot.status.rollover.error`.
- Input placeholder показывает `Continuity failed: <reason: error>` когда input unlocked.

## Release
- Собран релиз и VSIX:
  - `./scripts/build-all.sh` -> unified version 1.1.580, tarballs в `~/.codeai-hub/releases/`
  - `./scripts/build-release.sh --use-current-version` -> `codeai-hub-1.1.580.vsix` в корне репозитория

## Git commits
- `b2e7d30a fix(core): add continuity create-report request id and ack stage`
- `7bc46864 fix(core): retry continuity create-report when no ack received`
- `95e67f18 fix(core): surface continuity failure and unblock session after retries`
- `c2b6dcab fix(pm): capture continuity failures in rollover status`
- `3255f8a2 fix(ui): show continuity failure message and unlock input`
- `c578d5f6 docs(system): document continuity ack/retry and failure surfacing`
- `42ef8076 docs(stacks): add continuity smoke checklist across providers`
- `cc6c4ad6 docs(release): sync docs for v1.1.580`
- `588714bc chore(release): run build-all for v1.1.580`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/TODO/todo-plan.md`
2. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
3. `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`

## Follow-ups / Next steps
1. Реальный E2E smoke тест continuity rollover для Codex/Claude/Gemini (с форсированным threshold) и проверка:
   - нет stuck `Agent is working… Please wait.`
   - на failure появляется `Continuity failed: ...` и input unlocked
2. (Отдельная тема) Recovery после Core restart: если restore-core создает "пустую" сессию без инструкций/истории, нужен механизм rerun reviewer + cleanup артефактов.
