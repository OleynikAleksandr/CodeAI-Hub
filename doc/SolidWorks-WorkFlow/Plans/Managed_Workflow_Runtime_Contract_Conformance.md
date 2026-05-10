# Managed Workflow Runtime Contract Conformance

**Status:** Draft for review (revised 2026-05-10).
**Created:** 2026-05-10
**Updated:** 2026-05-10
**Owner:** Oleksandr + Codex
**Scope:** mandatory runtime repair, приводящий реализацию Core / Project Manager / Codex adapter в соответствие уже зафиксированному в `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md` контракту managed workflow steps. Покрывает только Gaps A–E (см. секцию 4). Не вводит новых workflow-контрактов, не расширяет SSOT, не добавляет UI surfaces, не реализует корректирующие операции и не вводит универсальной фазы корректировок.

Связанный design layer (новые контракты фаз, UI-триггеры, корректирующие операции) вынесен в отдельный отложенный документ `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md` и реализуется отдельным scope после стабилизации happy path mandatory repair.

---

## 1. Проблема

Retest 2026-05-10 (workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`, session `d02eea13-821e-4f8a-a70e-112a6c44ba4e`) показал: после релиза 1.2.216, который зачистил prompt-level ownership в provider asset prompts, `Application Skeleton` зависает между фазой контракта и фазой материализации. `Diagram Modules` в этом же тесте отработал без замечаний. Симптомы:

- ядро однократно отправляет корректирующее сообщение после первого readiness агента и не реагирует на повторный readiness;
- сам корректирующий текст содержит фразу "Commit or clean these files" — runtime-сообщение от ядра просит провайдера выполнить staging/commit, что прямо запрещено SSOT;
- пользовательский ввод "Подтверждаю контракт" не интерпретируется ядром как acceptance signal и проскакивает в провайдер обычным сообщением;
- ядро не открывает Core-owned phase transition к материализации; следующий turn агента трактуется как продолжение фазы контракта, агент материализует папки сам, в обход managed boundary;
- после завершения работы агента ядро не делает managed commit для фазы материализации и не продвигает план;
- managed-сообщения, отправленные ядром в адрес провайдера, не записываются в провайдерский session log (видны только в native rollout-сессии Codex CLI и в `core.log`).

Все эти симптомы — нарушения уже принятого контракта `WorkflowSteps_Overview.md`. SSOT их регламентирует, реализация — нет.

## 2. Цель

Привести runtime в соответствие с уже принятым контрактом, без новых дизайнов:

1. Post-turn arbitration отрабатывает после **каждого** terminal event провайдера, не однократно.
2. Корректирующие сообщения, формируемые runtime, не содержат просьб к провайдеру выполнить staging/commit/git-операции.
3. Decision form `handoff to user phase`, заявленная в SSOT 80, реализована — runtime распознаёт явный пользовательский acceptance signal и не передаёт его в провайдер как обычное сообщение.
4. После Core-разрешённого phase transition в материализационную фазу ядро ведёт turn-цикл, валидирует owned diff и выполняет managed commit + plan advance в собственной транзакции.
5. Managed commit boundary применяется во всех managed phases: ядро валидирует owned paths, scope, expected commit, artifact schema и stage validator; невалидный, чужой или no-op turn → corrective feedback, не commit.
6. Все managed-сообщения от ядра видимы пользователю и доступны для аудита; при этом replay/rollover пути их не дублируют и не интерпретируют как provider-authored.
7. Регрессионный набор тестов фиксирует поведение по каждому из Gaps A–E.

## 3. Non-Goals

- не пересматривать существующие формулировки `WorkflowSteps_Overview.md`;
- не расширять SSOT новыми определениями (классификация фаз, "Корректировки", корректирующие операции — это отдельный design layer);
- не модифицировать provider asset prompts (`packages/agents/*/assets/`); они уже соответствуют SSOT после 1.2.216;
- не вводить новые workflow steps;
- не вводить UI surfaces (UI-кнопки B→A, кнопки re-apply и т.п. — отдельный design layer);
- не реализовывать корректирующие операции (re-materialize, re-integrate, structure-apply — отдельный design layer);
- не вводить универсальную финальную фазу корректировок для managed steps — отдельный design layer;
- не разрабатывать reviewer subsystem.

## 4. Gap inventory (mandatory)

Каждый пункт — конкретное несоответствие runtime по уже зафиксированному контракту.

- **Gap A — Post-turn arbitration не повторяется.** SSOT 76–80: "Provider SDK emits terminal event → Core flushes → Core runs post-turn arbitration → Core sends exactly one decision". Runtime запускает arbitration однократно после первого `task_complete` агента в `Application Skeleton`, после второго `task_complete` молчит. Должно повторяться после каждого terminal event.
- **Gap B — Корректирующий текст содержит ownership leak.** SSOT 82: "Provider-visible managed prompts are content-readiness contracts. Они не должны просить агента выполнить `git add`, `git commit`...". Runtime corrective turn содержит "Managed workspace Git status is dirty… Commit or clean these files before Core can unlock" — это просьба к провайдеру делать staging/commit, прямо запрещённая SSOT.
- **Gap C — `handoff to user phase` decision не реализован.** SSOT 80 перечисляет `handoff to user phase` как одну из четырёх decision-форм. Runtime эту форму не имеет: пользовательский acceptance signal проскакивает в провайдер как обычное сообщение, фаза не переключается.
- **Gap D — Materialization phase commit handler не triggered.** SSOT 256: "Core выполняет managed commit flow и продвижение child plan". После завершения работы агента в материализационной фазе Core 15 минут idle, managed commit не сделан, план не продвинут.
- **Gap E — Managed-сообщения от ядра не видимы в провайдерском логе.** SSOT 86: "общий contract envelope" подразумевает единый источник правды для аудита turn'a. Runtime пишет managed-сообщения в `core.log` и в native rollout, но не в провайдерский session log → невозможно аудитировать turn без обращения к скрытым файлам.

Gaps F (универсальная финальная фаза корректировок), G (UI-триггеры B→A), H (корректирующие операции) — **не в этом scope**, вынесены в отдельный design layer.

## 5. Контрактный контекст

Каждый Gap имеет якорь в существующем SSOT:

- Gap A → `WorkflowSteps_Overview.md` lines 76–80 (fixed turn-closing order, exactly one decision per terminal event).
- Gap B → `WorkflowSteps_Overview.md` line 82 (provider-visible managed prompts are content-readiness contracts only).
- Gap C → `WorkflowSteps_Overview.md` line 80 (four decision forms enumerated, including `handoff to user phase`).
- Gap D → `WorkflowSteps_Overview.md` line 256 (Core executes managed commit flow and advances child plan after Application Skeleton phase).
- Gap E → `WorkflowSteps_Overview.md` line 86 (single workflow orchestration cluster with common contract envelope).

Дополнительный контекст по ownership: `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md`.

## 6. Конкретные решения по Gaps

### Gap A — Post-turn arbitration repeat

Pull arbitration logic в idempotent re-execution: после **каждого** terminal event провайдера ядро запускает acceptance check, без памяти о предыдущих запусках. Защита от бесконечного цикла — счётчик попыток с верхним пределом N (предлагается N=5); по достижении лимита runtime выдаёт `pause` decision и блокирует scope как `BLOCKED` с человекочитаемой причиной.

### Gap B — Corrective text без ownership leak

Source corrective-сообщений в Core-коде помечен и переписан: убраны фразы "Commit or clean these files", "Managed workspace Git status is dirty", любые упоминания `git add`/`git commit`/`npm run plan:commit`. Заменено нейтральной констатацией: "Core ещё не зафиксировал draft, поскольку <причина>" + перечень owned файлов и required action в content-readiness терминах. Регрессионный тест на запретные подстроки.

### Gap C — Handoff to user phase decision

Реализована четвёртая decision form `handoff to user phase`. Распознавание acceptance signal — через text-перехват ограниченным списком фраз в Project Manager (canonical ingress пользовательского acceptance):

- "Подтверждаю контракт"
- "Принимаю контракт"
- "Утверждаю контракт"
- "Можно материализовать"
- "Применить"

Совпадение (после нормализации регистра/пробелов) → ядро формирует `handoff to user phase` decision, **не передаёт** сообщение провайдеру, открывает следующую managed phase (для `Application Skeleton` — материализационную, для `Quality Gates` — интеграционную). Несовпадение → сообщение идёт обычным путём (т.е. как user message внутри текущей фазы).

UI-кнопка — отдельный design layer, не в этом scope. Список фраз — **финальный** в этом scope, расширение в follow-up.

### Gap D — Materialization phase commit handler

После handoff acceptance ядро открывает материализационную managed phase для `Application Skeleton` (или интеграционную для `Quality Gates`). Внутри фазы — обычный Type-A-like цикл "Core continuation → agent → readiness → Core acceptance check → managed commit + plan advance" с теми же гарантиями, что и фаза 1 `Diagram Modules`. По завершении плана фазы ядро формирует terminal decision (передаёт ход пользователю с подсказкой "step done, use Start step <next> to continue"). Resume-by-default для `Application Skeleton` / `Quality Gates` остаётся **отложенным** до design layer.

### Gap E — Audit observability

Managed-сообщения, отправляемые ядром в адрес провайдера (continuation, acceptance check, корректирующая инструкция, handoff), пишутся в **отдельный audit stream**: `.codeai-hub/sessions/<workspace-slug>/<provider>/<session>.audit.jsonl`. Формат записи: `{kind: "managed_corrective" | "managed_continuation" | "managed_acceptance_check" | "managed_handoff", source: "core", text: "<full text>", timestamp: "<ISO>"}`.

**Важно:** audit stream **не является** ни provider-authored history, ни user-authored history. Все существующие reader-ы (provider replay, rollover/autocompact, prompt pack builder, transcript reconstruction) **должны игнорировать** audit stream. UI/observability/diagnostics читают audit stream отдельно. Ревизия reader-ов на корректную изоляцию — обязательная часть Stream релиза.

## 7. Managed commit boundary

Во всех managed phases (как фаза 1 `Diagram Modules`, фаза 1/2 `Application Skeleton`, фаза 1/2 `Quality Gates`) Core:

- валидирует, что owned paths изменения попадают в scope текущей microtask;
- проверяет, что dirty Git diff не пустой (no-op → corrective, не commit);
- сверяет message с expected commit;
- запускает stage validator и artifact schema check (если применимо для конкретной фазы);
- при любом отказе валидации — отправляет corrective feedback (без ownership leak, см. Gap B), turn не commit'ится;
- при положительной валидации — commit + plan advance в одной Core-owned транзакции.

Это ровно та проверка, что уже работает для фазы 1 `Diagram Modules`. В этом scope требуется убедиться, что та же проверка применяется для **всех** managed phases, включая материализационную и интеграционную фазы (которые в `Application Skeleton` / `Quality Gates` сейчас вообще не активируются — см. Gap D).

Type-A/Type-B классификация и user-led фазы корректировок — это design layer, не часть этого scope.

## 8. Implementation streams (предварительные)

Стримы — области работы, не финальные phases/tasks. Финальная разбивка по микрозадачам (≤3 файла каждая) появится в `doc/TODO/todo-plan.md` после accept этого документа.

- **Stream 0 — разведка по коду.** Прочитать обработчики managed turns в `packages/core/src/remote-bridge/handlers/`. Определить: где именно в Core реализована arbitration (для Gap A), где формируется corrective text (для Gap B), где должно быть handoff decision (для Gap C), где ожидается materialization commit (для Gap D), где провайдер пишет session log (для Gap E). Без правок кода. Сужение последующих стримов на основе фактического состояния кода.
- **Stream 1 — Corrective text без leak.** Gap B. Один фикс на текст-генератор + регрессионный тест на запретные подстроки.
- **Stream 2 — Post-turn arbitration repeat.** Gap A. Идемпотентная re-execution + guard счётчиком + pause-decision на превышение лимита + регрессионный тест.
- **Stream 3 — Handoff to user phase decision.** Gap C. Распознавание ограниченного списка фраз в Project Manager + handoff decision form в Core decision channel + isolation сообщения от провайдера + интеграционный тест.
- **Stream 4 — Materialization commit handler.** Gap D. Открытие Core-owned материализационной/интеграционной фазы по handoff signal + turn-цикл + commit + plan advance + интеграционный тест.
- **Stream 5 — Managed commit boundary uplift.** Перенос валидации owned paths/scope/no-op/schema из обработчика `Diagram Modules` в общий managed turn-handler, чтобы он применялся к новым материализационным/интеграционным фазам без дублирования (Application Skeleton, Quality Gates).
- **Stream 6 — Audit stream observability.** Gap E. Codex CLI session writer пишет managed-сообщения в `.audit.jsonl` + ревизия reader-ов (provider replay, rollover, prompt pack builder) на изоляцию + регрессионный тест на rollover.
- **Stream 7 — Регрессионные и интеграционные тесты.** Полный happy-path `Application Skeleton` (фаза 1 → handoff → фаза 2 → terminal hand-off пользователю) + полный happy-path `Quality Gates` + регрессии на критичные формулировки и ownership.
- **Stream 8 — Release Build.** Только после явного подтверждения от пользователя.
- **Stream 9 — User Workflow Acceptance Testing.** Retest всех трёх managed steps на новом VSIX.
- **Stream 10 — Scope Closeout.**

Ориентир объёма: ≈ 6–10 микрозадач на стрим, общий объём scope сравним с предыдущим prompt-ownership scope.

## 9. Risks и mitigations

- **Регресс в `Diagram Modules` при выделении общего managed-turn-handler-а (Stream 5).** Митigation: Stream 0 разведка перед любыми правками; Stream 5 покрывается регрессионным тестом на полный happy-path `Diagram Modules` до и после.
- **Re-execution loop без guard может зациклиться.** Митigation: счётчик попыток + явный лимит + pause decision (см. Gap A).
- **Text-перехват списка фраз пересекается с user-typed continuation в фазе диалога.** Например, пользователь правит контракт и пишет "Применить эту правку". Митigation: список фраз короткий и формальный; нормализация целиком, не подстрокой; регрессионный тест на edge case "Применить эту правку" не должно перехватываться. Если коллизии будут — список расширяется/сужается в follow-up.
- **Audit stream isolation требует ревизии всех reader-ов.** Без полной ревизии есть риск, что провайдер replay/rollover поймает audit-record как provider message и удвоит контекст. Митigation: Stream 6 завершается только после подтверждения изоляции тестами на rollover/replay.
- **Codex CLI session writer изменения затрагивают live sessions.** Митigation: новый stream добавляется как отдельный writer, не модифицирует существующий session log writer; backward compat по умолчанию.

## 10. Required decisions (для accept этого документа)

1. **Список фраз text-перехвата.** Финализирован выше (5 фраз). Подтвердить или скорректировать.
2. **Audit stream путь.** Предложен `.codeai-hub/sessions/<workspace-slug>/<provider>/<session>.audit.jsonl`. Подтвердить или предложить альтернативу.
3. **Re-execution guard limit.** Предложено N=5 попыток. Подтвердить или скорректировать.
4. **Quality Gates параллельно с Application Skeleton или последовательно.** Stream 4–7 чинят оба шага одинаковыми правками; параллельная реализация — один релиз, общая приёмка. Подтвердить параллель или потребовать последовательной разбивки на два релиза.
5. **Поведение runtime после завершения материализационной/интеграционной фазы.** Предложено terminal decision "step done, use `Start step <next>` to continue" без открытия фазы корректировок. Подтвердить или потребовать дополнительный механизм возврата (тогда это уйдёт в design layer).

## 11. Связанные документы

- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md` — главный SSOT.
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — архитектурный контекст.
- `doc/SolidWorks-WorkFlow/System/ManagedDocumentationCommitOwnership.md` — ownership SSOT.
- `doc/SolidWorks-WorkFlow/Plans/Managed_Workspace_Lifecycle_From_Diagram_Modules.md` — managed lifecycle.
- `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md` — архитектура skeleton.
- `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Phase_Types_And_Corrective_Operations_Design.md` — отложенный design layer (фаза корректировок, UI-триггеры, корректирующие операции, формализация типов фаз).
- `doc/TODO/Archive/todo-plan-closeout-managed-workflow-prompt-ownership-repair.md` — closeout предыдущего scope, который вычистил prompt-level ownership.
