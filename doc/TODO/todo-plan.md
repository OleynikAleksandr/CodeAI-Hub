# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Claude_Workflow_TurnStarted_ACK.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_TurnStarted_ACK.md`
  - `doc/Sessions/Session066.md`
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Release stream закрывается только на чистом дереве и строго по `Release Build Checklist`.

---

## Phase 293 — Post-release smoke for workflow submit diagnostics (owner: Oleksandr, updated: 2026-03-06)

### Stream 0: Live diagnostics capture
1. [TODO] Прогнать live PM smoke на `v1.1.716` для свежего workflow submit (`Description` или `Virtual Simulation`) и сохранить полную цепочку из `~/.codeai-hub/logs/core/dialog-send-trace.jsonl`, `~/.codeai-hub/logs/codex/sdk-codex-<providerSessionId>.jsonl` и соответствующего unified session JSONL; подтвердить, что один `outboundAttemptId` читается end-to-end на живом рантайме (scope: runtime logs, `doc/`; expected commit: `docs(trace): record v1.1.716 live submit smoke`).
2. [TODO] Git Commit: `docs(trace): record v1.1.716 live submit smoke` (hash: TBD)
3. [TODO] Сопоставить live smoke с контрактами `Codex_Workflow_Submit_Diagnostics.md` и `Codex_Workflow_TurnStarted_ACK.md`, затем решить, какая следующая implementation phase нужна: provider ACK persistence, resend/recovery или PM UX для failed submit (scope: `doc/SolidWorks-WorkFlow/Contracts/`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): outline post-release submit delivery follow-up`).
4. [TODO] Git Commit: `docs(plan): outline post-release submit delivery follow-up` (hash: TBD)

## Phase 294 — Single-source delivery ACK contract (owner: Oleksandr, updated: 2026-03-06)

### Stream 0: Codex ACK truth source
1. [DONE] Оформить отдельный SSOT-контракт `Codex_Workflow_TurnStarted_ACK.md` и зафиксировать single-source rule: runtime verdict delivered/failed для Codex submit опирается только на `sdk:turn.started`, а diagnostics trail и provider rollout не участвуют в state machine (scope: `doc/SolidWorks-WorkFlow/Contracts/`, `doc/SolidWorks-WorkFlow/System/`, `doc/SolidWorks-WorkFlow/Modules/`; expected commit: `docs(architecture): codex single-source turn-start ack`).
2. [TODO] Git Commit: `docs(architecture): codex single-source turn-start ack` (hash: TBD)
3. [DONE] Проверить cross-provider baseline на Claude через реальный adapter path и выделить provider-native ACK для начала нового turn; live experiment показал, что текущий Claude `turn_started` эмитится локально при `send()`, а первый пригодный provider ACK в resume-path приходит как `sdk:stream_event(message_start)` после `sdk:system(subtype=init)` (scope: runtime logs, `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/Sessions/`; expected commit: `docs(trace): record claude turn-start ack experiment`).
4. [TODO] Git Commit: `docs(trace): record claude turn-start ack experiment` (hash: TBD)
5. [DONE] Оформить отдельный SSOT-контракт `Claude_Workflow_TurnStarted_ACK.md` и зафиксировать single-source rule: runtime verdict delivered/failed для Claude submit опирается только на provider-originated `sdk:stream_event(message_start)`, а локальный lifecycle и diagnostics trail не участвуют в state machine (scope: `doc/SolidWorks-WorkFlow/Contracts/`, `doc/SolidWorks-WorkFlow/System/`, `doc/SolidWorks-WorkFlow/Modules/`; expected commit: `docs(architecture): claude single-source turn-start ack`).
6. [TODO] Git Commit: `docs(architecture): claude single-source turn-start ack` (hash: TBD)
