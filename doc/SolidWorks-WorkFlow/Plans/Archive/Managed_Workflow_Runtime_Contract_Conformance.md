# Managed Workflow Runtime Contract Conformance

**Status:** Shipped as VSIX 1.2.218 (commit `d6d62e278`, 2026-05-10) with three known downstream regressions; see section 12. Active follow-up: Phase 10 in `doc/TODO/todo-plan.md`.
**Created:** 2026-05-10
**Updated:** 2026-05-10
**Owner:** Oleksandr + Codex
**Scope:** mandatory runtime repair, приводящий реализацию Core / Project Manager / Codex adapter в соответствие уже зафиксированному в `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md` контракту managed workflow steps. Покрывает только Gaps A–E + R (см. секцию 4). Не вводит новых workflow-контрактов, не расширяет SSOT, не добавляет UI surfaces, не реализует корректирующие операции и не вводит универсальной фазы корректировок.

Связанный design layer (новые контракты фаз, UI-триггеры, корректирующие операции) вынесен в отдельный отложенный документ `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md` и реализуется отдельным scope после стабилизации happy path mandatory repair.

> **Post-release retest update (2026-05-10).** Mandatory repair was implemented and shipped, but Application Skeleton retest on VSIX 1.2.218 surfaced three runtime regressions (R1/R2/R3) where Phase 4 fixes (Gaps A/C/D) do not reach the Application Skeleton runtime path. Sections 1–11 below describe what was supposed to ship and remain authoritative. Section 12 records what actually shipped vs what slipped through. Future agents must read section 12 before assuming any Gap A/C/D fix is complete in runtime.

---

## 1. Проблема

Retest 2026-05-10 (workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`, session `d02eea13-821e-4f8a-a70e-112a6c44ba4e`) показал: после релиза 1.2.216, который зачистил prompt-level ownership в provider asset prompts, `Application Skeleton` зависает между фазой контракта и фазой материализации. `Diagram Modules` в этом же тесте отработал без замечаний. Симптомы:

- ядро однократно отправляет корректирующее сообщение после первого readiness агента и не реагирует на повторный readiness;
- сам корректирующий текст содержит фразу "Commit or clean these files" — runtime-сообщение от ядра просит провайдера выполнить staging/commit, что прямо запрещено SSOT 82;
- пользовательский ввод "Подтверждаю контракт" не интерпретируется ядром как acceptance command и проскакивает в провайдер обычным сообщением; Core-сторона inbound-команды acceptance не имеет;
- ядро не открывает Core-owned phase transition к материализации; следующий turn агента трактуется как продолжение фазы контракта, агент материализует папки сам, в обход managed boundary;
- после завершения работы агента ядро не делает managed commit для фазы материализации и не продвигает план;
- managed-сообщения, отправленные ядром в адрес провайдера, не записываются как durable audit-history (видны только в native rollout-сессии Codex CLI и в `core.log`).

Дополнительно, в анализе SSOT vs runtime выявлен ещё один mandatory gap, не привязанный к одному retest, но обязательный для долгосрочной устойчивости managed steps: rollover / autocompact / session transition prompt shape для managed stages не сохраняет initial managed workflow context и active stage todo-plan content (см. Gap R).

Все эти несоответствия — нарушения уже принятого контракта `WorkflowSteps_Overview.md`. SSOT их регламентирует, реализация — нет.

## 2. Цель

Привести runtime в соответствие с уже принятым контрактом, без новых дизайнов:

1. Post-turn arbitration отрабатывает после каждого нового terminal event провайдера, дедуплицируясь по Core-normalized stable terminal-event identity (повторные триггеры на тот же event не приводят к повторным feedback/commit/retry-counter ticks).
2. Корректирующие сообщения, формируемые runtime, не содержат императивных просьб к провайдеру выполнить staging/commit/git-операции; диагностические констатации факта (включая dirty state) допустимы в нейтральных формулировках.
3. Inbound acceptance commands (`accept_contract_for_materialization` для `Application Skeleton`, `accept_contract_for_integration` для `Quality Gates`) реализованы как Core-owned команды, отдельные от provider-visible сообщений и от post-turn `handoff to user phase` decision.
4. После приёма acceptance command Core открывает managed materialization/integration phase: ведёт turn-цикл, валидирует owned diff и выполняет managed commit + plan advance в собственной транзакции.
5. Managed commit boundary применяется во всех managed phases: ядро валидирует owned paths, scope, expected commit, artifact schema и stage validator; невалидный, чужой или no-op turn → corrective feedback, не commit.
6. Managed-сообщения от ядра обслуживают два канала с разделённой ответственностью: user-visible delivery через существующий Core/PM event stream (real-time показ в UI чата); durable diagnostic storage в отдельном audit stream (replay-safe, изолирован от provider/user history). Это устраняет потерю видимости managed-сообщений и не нарушает replay/rollover семантику.
7. Регрессионный набор тестов фиксирует поведение по каждому из Gaps A–E и Gap R.
8. Rollover / autocompact / session transition для managed stages переводит target session в Core-built rollover envelope с inline initial managed workflow context, встроенным текстом active stage todo-plan, Continuation Mode marker и текущим microtask state — в полном соответствии с SSOT 336 (inline source artifact text in first/rollover prompts, no bare paths/links). Не managed stages (`description`, `virtual_simulation`) этим контрактом не затронуты.

## 3. Non-Goals

- не пересматривать существующие формулировки `WorkflowSteps_Overview.md`;
- не расширять SSOT новыми определениями (классификация фаз, "Корректировки", корректирующие операции — это отдельный design layer);
- не модифицировать provider asset prompts (`packages/agents/*/assets/`); они уже соответствуют SSOT после 1.2.216;
- не вводить новые workflow steps;
- не вводить UI surfaces (UI-кнопки, индикаторы re-apply, restart/revise actions и т.п. — отдельный design layer);
- не реализовывать корректирующие операции (re-materialize, re-integrate, structure-apply — отдельный design layer);
- не вводить универсальную финальную фазу корректировок для managed steps — отдельный design layer;
- не разрабатывать reviewer subsystem;
- не менять rollover envelope shape для не-managed stages (`description`, `virtual_simulation`).

## 4. Gap inventory (mandatory)

Каждый пункт — конкретное несоответствие runtime по уже зафиксированному контракту.

- **Gap A — Post-turn arbitration не повторяется (и не дедуплицируется).** SSOT 76–80: "Provider SDK emits terminal event → Core flushes → Core runs post-turn arbitration → Core sends exactly one decision". Runtime запускает arbitration однократно после первого `task_complete` агента в `Application Skeleton`, после второго `task_complete` молчит. Повторение должно происходить для каждого нового (необработанного ранее) terminal event, с дедупликацией по Core-normalized stable identity.
- **Gap B — Корректирующий текст содержит ownership leak.** SSOT 82 запрещает provider-visible managed prompts просить агента выполнить `git add` / `git commit` / `npm run plan:commit` или "commit before final response". Runtime corrective turn содержит "Managed workspace Git status is dirty… Commit or clean these files before Core can unlock" — это императивная просьба к провайдеру, прямо запрещённая SSOT.
- **Gap C — Inbound acceptance command не реализован.** SSOT 80 перечисляет четыре post-turn decision формы, включая `handoff to user phase` (Core решает передать ход пользователю после terminal event). Симметричной inbound-команды от пользователя ("принять контракт и открыть Core-led фазу") в runtime нет: пользовательский acceptance signal проскакивает в провайдер как обычное сообщение, фаза не переключается. Эта команда — отдельный контракт от post-turn `handoff to user phase`, и должна быть Core-owned.
- **Gap D — Materialization phase commit handler не triggered.** SSOT 256: "Core выполняет managed commit flow и продвижение child plan". После завершения работы агента в материализационной фазе Core 15 минут idle, managed commit не сделан, план не продвинут.
- **Gap E — Managed-сообщения от ядра не обслуживают user-visible delivery + durable audit одновременно.** SSOT 86: общий contract envelope подразумевает единый источник правды для аудита turn'a. Сейчас runtime пишет managed-сообщения в `core.log` и в native rollout, но они не доступны через session storage как durable diagnostic stream и не имеют чёткой границы с UI-каналом — невозможно аудитировать turn без обращения к скрытым файлам.
- **Gap R — Rollover / session transition prompt shape для managed stages.** SSOT 336: "First prompts and rollover prompts must carry required source artifact text inline. They should not include extra user-facing links/paths for the same sources unless a bounded fallback/truncation mode explicitly says why the agent may read from disk." Plus SSOT 56–64 — managed workspace lifecycle и managed context bundle preflight (агент останавливается до записи файлов, если в prompt'е нет `## Managed Workflow Context Bundle` и `activeStage` маркера). При rollover / autocompact / session transition для managed stages (`diagram_modules`, `application_skeleton`, `quality_gates`) target session получает обычный provider continuation prompt без inline initial managed workflow context, без встроенного текста active stage todo-plan, без Continuation Mode marker и без current microtask state. Resumed turn становится "плоским" continuation, теряет managed workflow привязку и нарушает preflight контракт.

Gaps F (универсальная финальная фаза корректировок), G (UI-триггеры между фазами), H (корректирующие операции) — **не в этом scope**, вынесены в отдельный design layer.

## 5. Контрактный контекст

Каждый Gap имеет якорь в существующем SSOT:

- Gap A → `WorkflowSteps_Overview.md` lines 76–80 (fixed turn-closing order, exactly one decision per terminal event).
- Gap B → `WorkflowSteps_Overview.md` line 82 (provider-visible managed prompts are content-readiness contracts, no provider-side git-imperatives).
- Gap C → `WorkflowSteps_Overview.md` line 80 (four post-turn decision forms enumerated, including `handoff to user phase`); inbound acceptance command симметричен этой post-turn форме, но является отдельным контрактом.
- Gap D → `WorkflowSteps_Overview.md` line 256 (Core executes managed commit flow and advances child plan after Application Skeleton phase).
- Gap E → `WorkflowSteps_Overview.md` line 86 (single workflow orchestration cluster with common contract envelope); SSOT 71–72 (Project Manager — command surface, не источник правды).
- Gap R → `WorkflowSteps_Overview.md` line 336 (cross-cutting rule: inline source artifact text in first/rollover prompts, no bare paths/links); SSOT 56–64 (managed workspace lifecycle + managed context bundle preflight); SSOT 64 (preflight stop on missing context bundle / activeStage marker).

Дополнительный контекст по ownership: `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`.

## 6. Конкретные решения по Gaps

### Gap A — Post-turn arbitration repeat with dedup

Re-run arbitration для **каждого нового** terminal event провайдера, с дедупликацией по Core-normalized stable terminal-event identity. Конкретный набор полей identity определяется на Stream 0 (code audit) — он зависит от того, какие стабильные identity-поля реально предоставляют Codex/Claude adapter при terminal events. Целевая форма: tuple из `sessionId`, `turnSequence`, `terminalKind` (`turn_completed` / `turn_failed`), и provider-supplied event sequence/id если такой есть; fallback — Core-owned monotonic event sequence, генерируемый на ingress. `terminalEventId` от провайдера может быть частным случаем identity, не обязательным полем.

Core ведёт processed-event ledger в session-scoped state. Arbitration выполняется только для events, которых нет в ledger. Повторный delivery того же event (reconnect, duplicate provider notification, lifecycle re-trigger) — no-op.

Защита от бесконечного цикла: счётчик попыток per-task-id (не per-session-lifetime) с верхним пределом N=5. Counter сбрасывается, когда план продвигается к следующему task. По достижении лимита runtime выдаёт `pause` decision, scope переводится в `BLOCKED` с человекочитаемым reason и user-actionable recovery instructions, привязанными к природе blocker (для plan-state blockers — supported `plan:repair` flow; для semantic blockers вроде "5 acceptance arbitration attempts failed" — отдельные resolution steps, документируемые в момент создания blocker; не подразумевается, что `plan:repair` чинит произвольный semantic blocker).

### Gap B — Corrective text без ownership leak (с разрешёнными формулировками)

Source corrective-сообщений в Core-коде должен быть найден, помечен и переписан в рамках реализации. **Запрещено**: императивные просьбы к провайдеру выполнить git-операции — "Commit or clean these files", "git add", "git commit", "Run `npm run plan:commit`", "stage these files". **Разрешено**: нейтральные констатации факта в content-readiness терминах:

- факт незавершённой проверки: "Core has not yet finalized the draft because <причина>";
- активная фаза с owned dirty: "Core will validate and commit owned changes once the agent reports content readiness; respond with a readiness note";
- блокировка из-за out-of-owner dirty: "Core is blocked by unrelated dirty paths: <list>. Resolution required before continuation. (User-facing notice; provider should not act on this.)";
- перечень owned файлов и required action в content-readiness терминах.

Регрессионный тест на запретные подстроки в любом исходящем corrective-сообщении.

### Gap C — Inbound acceptance command (Core-owned, через PM как command surface)

Реализована inbound-команда acceptance, отдельная от post-turn `handoff to user phase`:

- `workflow:acceptContractForMaterialization` (для `Application Skeleton`);
- `workflow:acceptContractForIntegration` (для `Quality Gates`).

**Маршрут команды:** Project Manager — единственный canonical ingress пользовательских команд (по SSOT 71–72), он публикует typed event в Core по обычному command channel. Core нормализует, валидирует контекст (текущий managed step, состояние артефактов), решает: открыть materialization/integration phase или отклонить (с corrective feedback). PM не делает workflow decision — только маршрутизирует.

**Распознавание acceptance в свободном тексте.** Mandatory repair использует консервативный text-перехват в Core (не в PM): incoming user message сравнивается с финальным списком фраз через **full-message match** (без substring-логики, после normalization: trim, case-insensitive, single-space). Совпадение → Core формирует acceptance command как если бы её прислал PM напрямую.

Финальный список фраз для full-message match (mandatory repair):

- "Подтверждаю контракт"
- "Принимаю контракт"
- "Утверждаю контракт"

Это три общие phrase для обоих шагов. Step-specific фразы ("Принять и материализовать", "Принять и интегрировать") — design layer, через UI-кнопку. Короткое "Применить" в mandatory repair **не используется** — слишком широкое, легко конфликтует с обычным user-typed continuation.

При совпадении — Core **не передаёт** оригинальное сообщение провайдеру, открывает materialization/integration phase. При несовпадении — сообщение идёт обычным user-message путём.

UI-кнопка как полноценный путь — отдельный design layer.

### Gap D — Materialization/integration phase commit handler

После приёма acceptance command Core открывает Core-owned managed phase для соответствующего шага: `application-skeleton.materialize` или `quality-gates.integrate`. Внутри фазы — обычный managed turn-цикл "Core continuation → agent → readiness → Core acceptance check → managed commit + plan advance" с теми же гарантиями, что и фаза 1 `Diagram Modules`. По завершении плана фазы ядро формирует terminal `handoff to user phase` decision (post-turn форма по SSOT 80) с подсказкой пользователю: "step done, use `Start step <next>` to continue".

В mandatory repair terminal сообщение содержит **только** указание перейти к следующему шагу. Восстановление/перезапуск/корректировки не входят в scope этого документа и относятся к design layer (UI-action `Restart attempt`, открытая корректирующая фаза и т.п.).

Resume-by-default для `Application Skeleton` / `Quality Gates` (открытая корректирующая фаза) — отложен в design layer.

### Gap E — Audit observability + user-visible delivery (разделённые каналы)

Managed-сообщения от ядра (continuation, acceptance check, корректирующая инструкция, post-turn decision) обслуживают два канала с разделённой ответственностью:

**(a) User-visible delivery.** Сохраняется через **существующий** Core/PM event stream — тот же канал, по которому Core сейчас доставляет managed lifecycle events в UI чата. Этот пункт не вводит новых UI surfaces; он только фиксирует, что managed-сообщения должны попадать в этот существующий event stream, чтобы пользователь видел корректирующую инструкцию или decision в реальном времени. Deserialize/render формат — тот же, что для других Core-emitted notifications в UI.

**(b) Durable diagnostic storage.** Отдельный **audit stream** рядом с провайдерским session log. Path не вводится новой конвенцией — получается через тот же session path builder, что и primary session log, путём добавления суффикса `.audit.jsonl` к тому же basename в той же директории. Конкретный путь определяется builder-ом (provider id остаётся canonical, как используется session writer — например `codexCli`).

Формат записи: `{kind: "managed_corrective" | "managed_continuation" | "managed_acceptance_check" | "managed_post_turn_decision", source: "core", text: "<full text>", timestamp: "<ISO>"}`.

**Изоляция audit stream.** Audit stream не является ни provider-authored, ни user-authored history. Все существующие reader-ы (provider replay, rollover/autocompact, prompt pack builder, transcript reconstruction, session restore) **должны игнорировать** audit stream. UI/observability/diagnostics читают audit stream отдельно для post-hoc анализа; user-visible delivery managed-сообщений в UI чата идёт по каналу (a), а не из audit stream. Ревизия reader-ов на корректную изоляцию — обязательная часть Stream релиза, с регрессионным тестом на rollover.

### Gap R — Rollover envelope shape для managed stages

Все rollover / autocompact / session transition пути для managed stages обязаны строить **Core-built rollover envelope**, который target session получает как provider-visible wrapper вокруг первого resumed turn. Это не standalone bootstrap/resume prompt: envelope inject-ится в текущий user message или Core continuation command, который фактически возобновляет работу target session. Envelope содержит **inline** (без голых ссылок вместо текста):

1. **Initial managed workflow contract/context block** для current stage — self-contained stage contract, managed context bundle и `activeStage` marker, достаточные для preflight на target session. Этот блок **не** должен включать one-shot task mode / reset instructions из cold-start first prompt (например `create_initial_draft`), чтобы rollover не переинициализировал уже начатую фазу.
2. **Explicit `Continuation Mode` marker** — отметка, что target session — это resumption, не fresh start.
3. **Active stage todo-plan: встроенный текст** active `doc/TODO/stages/<stage>/todo-plan.md` (managed-workspace child plan, не корневой `doc/TODO/todo-plan.md`). Path указывается в envelope **только** как identifier/diagnostics; агент не должен получать голую ссылку "прочитай файл" вместо встроенного текста.
4. **Workspace plan text / managed workflow context bundle** — тот же bundle, что используется в обычных continuation prompts по managed lifecycle.
5. **Текущая active microtask state** — id, expected commit, accepted commits summary/count, current target artifact (точные поля сверяются на Stream 0 с тем, что сейчас принимает managed turn-handler).
6. **Last user-visible assistant message from source session** — для preservation диалогового контекста, без необходимости провайдеру читать собственную историю.
7. **Current user message or Core continuation command**, который вызвал resumed turn (acceptance command, corrective trigger, обычное user message etc.).

Этот envelope применяется к:

- provider-инициированному rollover/autocompact (когда session перевыполняется из-за context limit или провайдера-инициированного reset);
- Core-инициированному session transition (восстановление после crash/stale state, recovery flow, restart attempt в будущем design layer);
- любому пути, где target provider session впервые получает managed-stage сообщение и не имеет полного inline контекста этого stage.

Envelope **не применяется** к не-managed stages (`description`, `virtual_simulation`) — их rollover контракт остаётся прежним и не входит в scope mandatory repair.

**Ключевое уточнение про active stage todo-plan:** envelope передаёт встроенный текст active todo-plan, а не голую ссылку. По текущему SSOT context bundle — это inline text Core-built bundle с current active stage todo-plan content; path остаётся внутри envelope как identifier/diagnostic, но не как замена текста. Это прямое следствие SSOT 336.

## 7. Managed commit boundary

Во всех managed phases (как фаза 1 `Diagram Modules`, фаза 1/2 `Application Skeleton`, фаза 1/2 `Quality Gates`) Core:

- валидирует, что owned paths изменения попадают в scope текущей microtask;
- проверяет, что dirty Git diff не пустой (no-op → corrective, не commit);
- сверяет message с expected commit;
- запускает stage validator и artifact schema check (если применимо для конкретной фазы);
- при любом отказе валидации — отправляет corrective feedback (без ownership leak, см. Gap B), turn не commit'ится;
- при положительной валидации — commit + plan advance в одной Core-owned транзакции.

Это ровно та проверка, что уже работает для фазы 1 `Diagram Modules`. В этом scope требуется убедиться, что та же проверка применяется для всех managed phases, включая материализационную и интеграционную фазы (которые в `Application Skeleton` / `Quality Gates` сейчас вообще не активируются — см. Gap D).

Type-A/Type-B классификация и user-led фазы корректировок — это design layer, не часть этого scope.

## 8. Implementation streams (предварительные)

Стримы — области работы, не финальные phases/tasks. Финальная разбивка по микрозадачам (≤3 файла каждая) появится в `doc/TODO/todo-plan.md` после accept этого документа.

- **Stream 0 — разведка по коду.** Прочитать обработчики managed turns в `packages/core/src/remote-bridge/handlers/`. Определить:
    - где именно в Core реализована arbitration (Gap A) и какие стабильные identity-поля даёт provider adapter для terminal events;
    - где формируется corrective text (Gap B);
    - где должно быть acceptance command handling (Gap C);
    - где ожидается materialization commit (Gap D);
    - где провайдер пишет session log и какой существующий Core/PM event stream обслуживает user-visible delivery (Gap E);
    - **где находятся текущие rollover / autocompact / session transition prompt builder paths и их reader-ы (Gap R)**, какие пути сейчас формируют resumed prompt и какие из них применяются к managed stages.
    Без правок кода.
- **Stream 1 — Corrective text без leak.** Gap B. Один фикс на текст-генератор + регрессионный тест на запретные подстроки + позитивные тесты разрешённых формулировок.
- **Stream 2 — Post-turn arbitration repeat with dedup.** Gap A. Идемпотентная re-execution + processed-event ledger c Core-normalized identity + guard счётчик + pause-decision на превышение лимита + регрессионный тест на дедупликацию duplicate events.
- **Stream 3 — Inbound acceptance command.** Gap C. Core-side decision channel + typed command от Project Manager + text-recognition в Core по финальному списку фраз (full-message match) + isolation сообщения от провайдера + интеграционный тест.
- **Stream 4 — Materialization/integration phase commit handler.** Gap D. Открытие Core-owned material/integration фазы по acceptance command + turn-цикл + commit + plan advance + terminal `handoff to user phase` без restart-action + интеграционный тест.
- **Stream 5 — Managed commit boundary uplift.** Перенос валидации owned paths/scope/no-op/schema из обработчика `Diagram Modules` в общий managed turn-handler, чтобы он применялся к новым материализационным/интеграционным фазам без дублирования.
- **Stream 6 — User-visible delivery + audit stream observability + rollover envelope.** Покрывает Gap E и Gap R.
    - (a) Маршрутизация managed-сообщений в существующий Core/PM event stream для UI delivery + регрессия на UI render (Gap E).
    - (b) Codex CLI session writer пишет managed-сообщения в `.audit.jsonl` (path через session path builder) + ревизия reader-ов (provider replay, rollover, prompt pack builder) на изоляцию + регрессионный тест на rollover (Gap E).
    - (c) Rollover / autocompact / session transition prompt builder для managed stages переписан на Core-built envelope shape по разделу 6 Gap R: первый resumed provider-visible turn target session получает inline initial managed workflow contract/context block (без cold-start one-shot task mode/reset instructions) + встроенный текст active stage todo-plan + Continuation Mode marker + current microtask state + last user-visible assistant message + current user/continuation command. Активная ревизия rollover readers/builders на сохранение initial context + todo-plan inline content (без вырождения в bare-path link и без standalone bootstrap prompt). Не managed stages не затрагиваются.
- **Stream 7 — Регрессионные и интеграционные тесты.**
    - Полный happy-path `Application Skeleton` (фаза контракта → acceptance command → фаза материализации → terminal handoff пользователю).
    - Полный happy-path `Quality Gates`.
    - Регрессии на ownership и формулировки (Gap B запретные подстроки).
    - **Forced-rollover regression (Gap R):** для `Application Skeleton` и `Quality Gates` — после симулированного rollover в midstream фазе первый resumed provider-visible turn target session содержит initial managed workflow contract/context block (managed context bundle + `activeStage` marker, но без cold-start one-shot task mode/reset instructions), inline текст active stage todo-plan (с identifier-path как diagnostic, без bare link вместо текста), explicit `Continuation Mode` marker, current microtask state и last user-visible assistant message; не вырождается в plain continuation message и не создаёт standalone bootstrap prompt.
- **Stream 8 — Release Build.** Только после явного подтверждения от пользователя.
- **Stream 9 — User Workflow Acceptance Testing.** Retest всех трёх managed steps на новом VSIX, включая контролируемый rollover-сценарий хотя бы для одного managed step.
- **Stream 10 — Scope Closeout.**

Ориентир объёма: ≈ 6–10 микрозадач на стрим, общий объём scope сравним с предыдущим prompt-ownership scope.

## 9. Risks и mitigations

- **Регресс в `Diagram Modules` при выделении общего managed-turn-handler-а (Stream 5).** Митigation: Stream 0 разведка перед любыми правками; Stream 5 покрывается регрессионным тестом на полный happy-path `Diagram Modules` до и после.
- **Re-execution loop без guard может зациклиться.** Митigation: per-task-id счётчик попыток + явный лимит N=5 + pause decision (см. Gap A).
- **Duplicate terminal events могут съесть retry counter.** Митigation: processed-event ledger с Core-normalized identity; повторный event — no-op (см. Gap A).
- **Stream 0 может показать, что provider adapter не даёт стабильную identity для terminal events.** Митigation: fallback на Core-owned monotonic event sequence на ingress (см. Gap A); фактический набор identity-полей фиксируется как результат Stream 0 и переносится в фазы Stream 2.
- **Text-перехват списка фраз пересекается с user-typed continuation в фазе диалога.** Митigation: full-message match (не substring), short formal list, регрессионный тест на edge case "Принимаю эту правку" (не должно перехватываться).
- **Audit stream isolation требует ревизии всех reader-ов.** Митigation: Stream 6 завершается только после подтверждения изоляции тестами на rollover/replay; новый stream добавляется как отдельный writer, не модифицирует существующий session log writer.
- **User-visible delivery через существующий event stream может потребовать adjustments в render-логике UI.** Митigation: Stream 0 фиксирует точные точки интеграции в существующем stream; Stream 6 шаг (a) включает регрессию на UI render.
- **Rollover envelope изменения могут затронуть не-managed stages (`description`, `virtual_simulation`).** Митigation: Gap R явно ограничен managed stages; Stream 0 фиксирует, какие builder paths общие, какие специфичны для managed; Stream 6 шаг (c) включает регрессию на не-managed rollover (он не должен поменяться).
- **Active stage todo-plan может быть большим, и envelope может упереться в context limit провайдера.** Митigation: Stream 6 шаг (c) включает граничный тест на размер envelope; truncation/chunking стратегии (если потребуются) фиксируются явно с пометкой "bounded fallback" по SSOT 336, и не подменяют inline content silently.

## 10. Required decisions (для accept этого документа)

Каждый пункт ниже снабжён предложенным значением (default). Если пользователь не предложит альтернативу при review, эти defaults считаются принятыми и переносятся в фазы реализации без дополнительного раунда подтверждения.

1. **Список фраз для text-перехвата.** Default: `["Подтверждаю контракт", "Принимаю контракт", "Утверждаю контракт"]` — full-message match.
2. **Audit stream path convention.** Default: derived from session path builder, same directory + same basename + `.audit.jsonl` suffix.
3. **Re-execution guard limit.** Default: N=5 attempts per-task-id, counter resets on plan advance.
4. **Quality Gates параллельно с Application Skeleton.** Default: parallel implementation в одном scope (Streams 3–7 покрывают оба шага), один релиз, общая приёмка.
5. **Поведение runtime после материализационной/интеграционной фазы.** Default: terminal `handoff to user phase` decision с сообщением "step done, use Start step <next> to continue", без restart/revise actions и без открытой фазы корректировок (то и другое — design layer).
6. **Scope rollover envelope (Gap R).** Default: применяется только к managed stages (`diagram_modules`, `application_skeleton`, `quality_gates`); не-managed stages (`description`, `virtual_simulation`) сохраняют существующее поведение rollover. Forced-rollover regression в Stream 7 покрывает только `Application Skeleton` и `Quality Gates` (`Diagram Modules` — опциональная дополнительная регрессия).

## 11. Связанные документы

- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md` — главный SSOT.
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — архитектурный контекст.
- `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md` — ownership SSOT.
- `doc/SolidWorks-WorkFlow/Plans/Managed_Workspace_Lifecycle_From_Diagram_Modules.md` — managed lifecycle.
- `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md` — архитектура skeleton.
- `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md` — отложенный design layer (фаза корректировок, UI-триггеры, корректирующие операции, формализация типов фаз).

## 12. Post-release retest findings (2026-05-10)

Mandatory repair was shipped as VSIX 1.2.218 (commit `d6d62e278`). User retest of Application Skeleton on the new release surfaced three runtime regressions, each tracing back to incomplete code reach of fixes shipped under Gap A/C/D. None of these invalidate Sections 1–11 — they document where the Section 6 solutions did not land in the actual Application Skeleton runtime path. Diagram Modules continued to work in the same release.

**R1 — Stage advance does not write `activeStage` into `workspace.plan.md`.** Bundle builder (`packages/core/src/remote-bridge/handlers/session-request-handler-managed-context-bundle.ts`) reads the persisted value through `parseWorkspacePlanState`, but no caller updates `workspace.plan.md` when the workflow advances Diagram Modules → Application Skeleton → Quality Gates. The managed context bundle for Application Skeleton therefore ships with `activeStage: null` even after the stage has begun. Diagram Modules works because that stage is the first/initialised value seeded by `ensureManagedTodoTree`. Section 6 Gap A fixes (event identity ledger, retry guard) were correct in their own surface but assume the bundle correctly identifies the active stage; they do not paper over the missing stage-advance writer.

**R2 — Acceptance phrase matcher is exact-match only.** Section 6 Gap C specifies "full-message match (без substring-логики, after normalization: trim, case-insensitive, single-space)". The implementation in `recognizeManagedContractAcceptancePhrase` honoured that literally — `localeCompare === 0` against the three canonical phrases. In production, real users type the acceptance verb plus contextual filler (the retest message was "Контракт принимаю, можешь двигаться к фазе 2."), which equals none of the three canonical strings. The matcher returns null and the message reaches the provider unintercepted. The mandatory repair design avoided substring matching to prevent false positives ("Принимаю эту правку"), but the resulting matcher is too strict for real user input. A normalised contains-keyword recogniser scoped to the acceptance-eligible Type B state stays consistent with Section 6 Gap C intent while accepting natural acceptance phrasings; it must reject the same false-positive cases the original design called out.

**R3 — Application Skeleton has no materialization continuation dispatcher and no completion observer.** Section 6 Gap D specifies that Core opens a managed materialization phase after acceptance and runs the standard turn cycle. The shipped Phase 4 fixes wired the commit gate (`hasCommittableApplicationSkeletonStage` requires `applicationSkeletonProgress.materialized === true`) and the commit transaction (`managed-documentation-commit-transaction.ts` invokes `npm run plan:commit`), but did not wire two upstream signals: (a) an Application Skeleton materialization continuation dispatcher analogous to `sendDiagramModulesContinuationIfReady`, and (b) a post-turn observer that re-reads `application-skeleton-map.json` and refreshes the `materialized` flag in Core's progress state. Tests pre-stage the flag, which is why they pass; in runtime the gate stays false, the commit never fires, the plan stays at task2 IN_PROGRESS indefinitely. The user-visible symptom was that Core "woke up only once" — it stamped the draft commit hash and rolled the pointer to task2, then went silent.

**Active follow-up.** Phase 10 in `doc/TODO/todo-plan.md` covers fixes for R1, R2 and R3 plus end-to-end happy-path coverage and a forced-rollover regression inside Phase B. Quality Gates symmetric fix is intentionally out of scope for Phase 10 — it follows after Application Skeleton stabilises and ships separately. Full Type B candidate microtask lifecycle remains in the deferred design layer (`Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md`); R1/R2/R3 are the prerequisites that must ship before that layer can be implemented in any form.
- `doc/TODO/Archive/todo-plan-closeout-managed-workflow-prompt-ownership-repair.md` — closeout предыдущего scope, который вычистил prompt-level ownership.
