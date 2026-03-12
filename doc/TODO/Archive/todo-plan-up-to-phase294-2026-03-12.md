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

> Closeout note (2026-03-12): `Phase 293` и `Phase 294` были фактически завершены 2026-03-06 и зафиксированы итоговым doc-коммитом `04eee951 docs(architecture): sync provider turn-start ack contracts`, но статусы в этом файле тогда не были доведены до финального состояния. Ниже план синхронизирован ретроспективно по `Session066.md`, `Session067.md` и фактической истории git.

## Phase 293 — Post-release smoke for workflow submit diagnostics (owner: Oleksandr, updated: 2026-03-12)

### Stream 0: Live diagnostics capture
1. [DONE] Пользовательский live PM smoke на `v1.1.716` для workflow submit был проведён после релиза: в `Session066.md` уже зафиксированы успешный smoke для Codex `Description`, штатный continuity rollover, параллельный Claude workflow smoke и ручная проверка `~/.codeai-hub/logs/core/dialog-send-trace.jsonl` + provider traces; итоговые выводы затем были синхронизированы в SSOT и рабочем плане одним closeout-коммитом (scope: runtime logs, `doc/Sessions/Session066.md`, `doc/`; actual commit: `docs(architecture): sync provider turn-start ack contracts`).
2. [DONE] Git Commit: `docs(architecture): sync provider turn-start ack contracts` (hash: `04eee951`)
3. [DONE] Live smoke сопоставлен с контрактами `Codex_Workflow_Submit_Diagnostics.md` и `Codex_Workflow_TurnStarted_ACK.md`; по итогам следующая implementation phase сознательно не открывалась, а вместо этого были выделены provider-specific single-source ACK contracts и зафиксировано, что retry/outbox UX требует отдельного design-документа до любого кода (scope: `doc/SolidWorks-WorkFlow/Contracts/`, `doc/TODO/todo-plan.md`, `doc/Sessions/`; actual commit: `docs(architecture): sync provider turn-start ack contracts`).
4. [DONE] Git Commit: `docs(architecture): sync provider turn-start ack contracts` (hash: `04eee951`)

## Phase 294 — Single-source delivery ACK contract (owner: Oleksandr, updated: 2026-03-12)

### Stream 0: Codex ACK truth source
1. [DONE] Оформить отдельный SSOT-контракт `Codex_Workflow_TurnStarted_ACK.md` и зафиксировать single-source rule: runtime verdict delivered/failed для Codex submit опирается только на `sdk:turn.started`, а diagnostics trail и provider rollout не участвуют в state machine (scope: `doc/SolidWorks-WorkFlow/Contracts/`, `doc/SolidWorks-WorkFlow/System/`, `doc/SolidWorks-WorkFlow/Modules/`; actual commit: `docs(architecture): sync provider turn-start ack contracts`).
2. [DONE] Git Commit: `docs(architecture): sync provider turn-start ack contracts` (hash: `04eee951`)
3. [DONE] Проверить cross-provider baseline на Claude через реальный adapter path и выделить provider-native ACK для начала нового turn; live experiment подтвердил, что текущий Claude `turn_started` эмитится локально при `send()`, а первый пригодный provider ACK в resume-path приходит как `sdk:stream_event(message_start)` после `sdk:system(subtype=init)` (scope: runtime logs, `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/Sessions/`; actual commit: `docs(architecture): sync provider turn-start ack contracts`).
4. [DONE] Git Commit: `docs(architecture): sync provider turn-start ack contracts` (hash: `04eee951`)
5. [DONE] Оформить отдельный SSOT-контракт `Claude_Workflow_TurnStarted_ACK.md` и зафиксировать single-source rule: runtime verdict delivered/failed для Claude submit опирается только на provider-originated `sdk:stream_event(message_start)`, а локальный lifecycle и diagnostics trail не участвуют в state machine (scope: `doc/SolidWorks-WorkFlow/Contracts/`, `doc/SolidWorks-WorkFlow/System/`, `doc/SolidWorks-WorkFlow/Modules/`; actual commit: `docs(architecture): sync provider turn-start ack contracts`).
6. [DONE] Git Commit: `docs(architecture): sync provider turn-start ack contracts` (hash: `04eee951`)
