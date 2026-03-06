# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Submit_Diagnostics.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_UserTurn_Delivery.md`
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
3. [TODO] Сопоставить live smoke с контрактами `Codex_Workflow_Submit_Diagnostics.md` и `Codex_Workflow_UserTurn_Delivery.md`, затем решить, какая следующая implementation phase нужна: provider ACK persistence, resend/recovery или PM UX для failed submit (scope: `doc/SolidWorks-WorkFlow/Contracts/`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): outline post-release submit delivery follow-up`).
4. [TODO] Git Commit: `docs(plan): outline post-release submit delivery follow-up` (hash: TBD)
