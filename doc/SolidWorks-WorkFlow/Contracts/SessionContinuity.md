# Session Continuity — Contract (SSOT)

## Назначение
Механика непрерывности для долгоживущих workflow-сессий: post-turn threshold arbitration → rollover → продолжение без потери контекста.

В production есть два разных continuity path:
- **Documentation Tree synthetic rollover** для `description`, `virtual_simulation`, `diagram_modules`, `application_skeleton`, `quality_gates`: без continuity report, без internal resume turn; Core создаёт новый provider segment, сохраняет lightweight continuation context и добавляет continuation envelope только к следующему реальному user message.
- **Report-based fallback** для implementation-heavy / non-Documentation-Tree flows с отдельным contract: handoff report → новая session → internal `Flow Node Continuity — Resume`.

## Инварианты
- Для report-based fallback handoff report delivery обязателен (ack + retry). При failure UI должен получить явный failure, а не stuck working.
- Для report-based fallback bootstrap новой сессии выполняется internal turn’ом `Flow Node Continuity — Resume`.
- Для Documentation Tree synthetic rollover Core не создаёт, не ждёт и не читает continuity report. Новая session считается готовой после materialized continuation state + lock unlock; `resumeMode` target lifecycle нормализуется в `resume_in_place`, чтобы UI не показывал standalone resuming.
- Documentation Tree continuation envelope строится лениво при первом реальном `dialog:send`/user turn target session. Envelope обязан включать normal workflow start/step contract, `Continuation Mode`, last user-visible assistant message from source session и текущий user message; visible history message пользователя остаётся без служебной обёртки.
- Для managed stages (`diagram_modules`, `application_skeleton`, `quality_gates`) continuation envelope обязан добавлять Core-built context bundle: embedded upstream artifact text, workspace plan text, active stage todo-plan text, derived plan status, current task/expected commit, and accepted commit count. Provider-visible input paths are not recovery instructions when Core embedded the text; paths can appear only as output targets or explicit truncated/stale fallback metadata.
- Managed rollover envelope (релиз 1.2.217) добавляет явный `## Artifact Mode` маркер `artifact_mode: continue_active_microtask`, чтобы агент НЕ считал resumed turn как `create_initial_draft`. Не managed stages (`description`, `virtual_simulation`) Artifact Mode маркер не получают и сохраняют прежнее cold-start поведение.
- Managed Core audit stream (`<basename>.audit.jsonl` рядом с primary session log) — отдельный durable diagnostic канал. Provider replay, rollover prompt builders, transcript reconstruction и dialog history reader обязаны игнорировать `.audit.jsonl` файлы; они НЕ становятся источником provider-visible сообщений и НЕ участвуют в continuation envelope.
- Managed-stage automatic continuation after a provider turn is not a PM/read-model responsibility. It is a Core post-turn decision that runs after provider terminal event handling, assistant/dialog message flush, managed validation, and any accepted managed commit.
- Rollover for a managed stage must be richer than the first turn: it repeats the upstream source artifact text that started the stage and adds accumulated plan/progress context. It must not downgrade to "read these files" because that changes provider behavior and adds another file-read cycle.
- Last assistant context для Documentation Tree берётся только из user-visible assistant messages; `thinking`, `translation`, hidden/system/internal и ready-to-continue placeholders не имеют права становиться continuation question.
- UI не должен показывать continuity-инфраструктуру как отдельные узлы; пользователь видит только актуальный диалог.
- Любая continuity-фаза не должна приводить к “вечному resuming”: lock/unlock SSOT описан в `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`.
- Для flow-node/document sessions threshold-trigger continuity разрешён только на post-turn boundary: `token_usage` во время активного user turn может только кешировать snapshot и не имеет права немедленно запускать rollover.
- Flow-node rollover в текущем production scope разрешён для trunk Documentation Tree stages `description`, `virtual_simulation`, `diagram_modules`, `application_skeleton`, `quality_gates` при `runSlug=null` и идёт через synthetic path. Collector/reviewer/Development Tree branch agents остаются ineligible до отдельного artifact-specific continuity contract.
- Для eligible flow-node session обязательны `initiativeSlug` и `stage`. Restored dialog materialization и `dialog:send` reuse обязаны восстанавливать `initiativeSlug=workspaceSlug`, иначе Core обязан завершать arbitration как `no_rollover` и разблокировать UI.
- Continuity chain обязана хранить актуальный `session.modelBinding`: initial outbound turn создаёт segment с binding snapshot, а каждый последующий outbound после same-session model/reasoning switch refresh-ит latest matching segment без создания duplicate segment. Threshold-created continuation session наследует именно этот persisted/current binding.
- Если provider отдаёт `turn_completed` раньше финального usage snapshot, session остаётся в pending-arbitration до появления trailing `token_usage`; отсутствие usage прямо в `turn_completed` не считается автоматическим `no_rollover`.
- Если provider может доказуемо сказать, что trailing usage snapshot для уже завершённого turn-а не придёт, он обязан эмитить explicit signal `postTurnTokenUsageUnavailable: true` вместе с `turn_completed`. Только этот explicit signal разрешает Core завершить pending-arbitration как `no_rollover` без trailing `token_usage`; просто отсутствие usage этого по-прежнему не означает.
- Cached token-usage snapshot обязан очищаться при старте нового outbound user turn и после финального post-turn arbitration, чтобы usage предыдущего turn-а не протекал в следующий.
- Legacy threshold-trigger handoff path сейчас отключен в production runtime (`enableLegacyHandoff=false`), но при включении обязан быть retry-safe: `ContinuityMonitor` и pending handoff state сбрасываются после неудачной отправки handoff prompt, невозможности записать report, невозможности создать continuation session и после финальной попытки resume prompt.

## Порог
- Запуск continuity привязан к remaining% threshold per-provider (дефолт 30%).

## Связанные контракты
- Workspace runtime/lock: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Input lock SSOT/state machine: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Dialog routing: `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
