# Managed Workflow Phase Types and Corrective Operations (Design Draft)

**Status:** Deferred draft. Mandatory repair shipped 2026-05-10 as VSIX 1.2.218, but Application Skeleton happy path remains unstable due to three runtime regressions (R1/R2/R3) that turn out to be preconditions for any Type B candidate microtask lifecycle; see section 12. Active follow-up: Phase 10 in `doc/TODO/todo-plan.md` ships R1/R2/R3 only — full Type B candidate runtime stays deferred. Until this layer is accepted, runtime behaviour after materialization/integration is the mandatory-repair default — terminal `handoff to user phase` decision with "step done, use Start step <next>", **without** an open-ended correction phase.
**Created:** 2026-05-10
**Updated:** 2026-05-10
**Owner:** Oleksandr + Codex
**Scope:** новый дизайн классификации фаз managed workflow, универсальной финальной фазы корректировок, UI-триггеров между фазами и корректирующих операций. Этот документ — design layer; он расширяет SSOT и вводит новые runtime-механизмы.

Параллельно с этим документом действует mandatory repair: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Runtime_Contract_Conformance.md`. Этот design layer **не должен реализовываться** до завершения mandatory repair и до устранения R1/R2/R3 prerequisites (см. секцию 12); иначе репарационный scope расширится за пределы conformance и станет невозможно закрыть.

---

## 1. Цель

Формализовать поведение фаз managed workflow steps так, чтобы:

1. Любая фаза любого managed step описывалась явной классификацией (источник плана микрозадач, владелец триггеров).
2. Управляемая структура работы пользователя с уже завершённым шагом (resume-by-default по SSOT 308) была реализована единообразно для всех managed steps, а не только `Diagram Modules`.
3. Структурные корректировки (например, добавление нового Product Part, нового gate, перематериализация скелета) были покрыты явными корректирующими операциями с тем же managed-turn контрактом, что и первичные.
4. Переходы из user-led фаз в Core-led фазы триггерились через явный пользовательский command, а не через эвристику над свободным текстом; UI primary path остаётся первичным, headless/accessibility — secondary через тот же Core command handler.

## 2. Концепция типов фаз (предлагаемая)

Любая фаза managed step классифицируется по источнику плана микрозадач:

- **Type A — Core-led.** План микрозадач формируется Core-side: по контракту артефактов, по индексу, по delta, или как single-bootstrap microtask. Core отправляет агенту continuation, валидирует результат, коммитит, продвигает план. Завершение — встроено в план (план исчерпан).

- **Type B — User-led.** Каждое сообщение пользователя порождает **candidate microtask** в Core runtime state. Candidate microtask — это ephemeral runtime entity, она не попадает в child `todo-plan.md` до промоушена. Промоушен candidate в plan-tracked microtask происходит **только если** результат turn'a содержит валидный owned artifact diff (внутри scope, прошедший stage validator и artifact schema check); промоушен сопровождается paired Git Commit и обычным managed commit boundary. Pure discussion, no-op assistant answer, или out-of-scope/invalid diff приводят к "drop candidate" — candidate сбрасывается без записи в `todo-plan.md`. Audit-info по drop'нутым candidate'ам пишется в audit stream для post-hoc analysis; этот design layer обязан расширить mandatory repair audit schema отдельным kind вроде `managed_candidate_dropped` или описать отдельный candidate audit stream до реализации Type B lifecycle. Завершение фазы — внешний триггер (UI command или переход к следующему шагу).

Эти два типа достаточны для покрытия всех текущих и обозримых сценариев managed workflow. Дополнительный "приёмочный" тип не вводится: приёмка контракта — это user-led диалог (Type B) с триггером перехода к следующей фазе.

**Lifecycle candidate microtask** требует отдельной runtime-state surface (вне `todo-plan.md`). Её детальный design — часть реализации этого design layer; ключевое правило: `todo-plan.md` остаётся single source of truth для коммитов, но не для in-flight discussion turns.

## 3. Initial draft как Type A bootstrap

Первичное создание draft-артефактов в `Application Skeleton` и `Quality Gates` — это **Core-инициированная** single-microtask Type A operation, не часть user-led Type B. Микроплан — одна задача "создать первый draft по step contract", expected commit и validator формирует Core. После завершения — переход в Type B review/корректировок.

Это устраняет ownership-двусмысленность: первый draft не является пользовательской инициативой, его initiator — `Start step` (или handoff из upstream шага).

## 4. Сценарии шагов в Type A / Type B терминах

### `Diagram Modules`

1. Phase 1 (Type A — primary generation). Триггер: `Start step`. План: индекс → каждый Product Part по порядку.
2. Phase 2 (Type B — user-led review and corrections). Open-ended. Триггер выхода: `Start step <next>` (переход к следующему workflow step).

### `Application Skeleton`

1. Phase 1.1 (Type A — initial draft bootstrap). Триггер: `Start step`. Single-microtask: создать `application-skeleton.md` + `application-skeleton-map.json`.
2. Phase 1.2 (Type B — user-led contract review). Open-ended. Триггер выхода: пользовательский command "Принять и материализовать" (primary path — UI-кнопка на карточке черновика; secondary headless path — typed acceptance command через тот же Core command handler).
3. Phase 2 (Type A — materialization). План: создать/обновить `product-parts/**` projection, обновить статусы артефактов.
4. Phase 3 (Type B — финальные корректировки). Open-ended. Структурные правки контракта в Type B + повторный command "Принять и материализовать" → корректирующая Type A → возврат в Type B.

### `Quality Gates`

1. Phase 1.1 (Type A — initial draft bootstrap). Single-microtask: создать `quality-gates.md` + `quality-gates.json`.
2. Phase 1.2 (Type B — user-led contract review). Open-ended. Триггер выхода: command "Принять и интегрировать" (UI-кнопка primary, typed command secondary).
3. Phase 2 (Type A — integration). План: package scripts/devDependencies, configs, hooks, gate manifests.
4. Phase 3 (Type B — финальные корректировки). Аналогично `Application Skeleton`.

## 5. Universal "Корректировки" rule

Каждый managed step **обязан** заканчиваться открытой Type B фазой корректировок. Это обеспечивает resume-by-default (SSOT 308) единообразно для всех шагов и устраняет состояние "что делает Core с пользовательским сообщением после завершения шага", которое сейчас не определено для `Application Skeleton` и `Quality Gates`.

**Зависимость от accept этого design layer.** Это правило расширяет существующий SSOT и становится обязательным только после accept этого design-документа. До этого момента mandatory repair завершает материализационную/интеграционную фазу terminal `handoff to user phase` decision с сообщением "step done, use Start step <next> to continue", **без** open-ended correction phase. Mandatory repair и этот design layer не должны читаться как противоречащие — они описывают разные точки во времени.

Из фазы корректировок возможен повторный переход в Type A через тот же пользовательский command, что и первичный B→A. Multi-cycle B→A→B...A→B — допустимое поведение плана.

## 6. Boundary note — rollover / session transition не вводит новый тип фазы

Type A / Type B phase model применяется одинаково по обе стороны session transition. Rollover, autocompact и любая Core-инициированная пересборка provider session — это **session transport transition**, а не новый тип фазы. Цель transition — реконструировать prompt envelope текущей фазы из Core state и active stage todo-plan, чтобы resumed session оставалась в той же фазе (Type A или Type B), не теряла initial managed workflow context и продолжала текущий microtask без вырождения в плоский provider continuation.

Конкретный shape rollover envelope (initial managed workflow contract/context block without cold-start one-shot task mode/reset instructions + Continuation Mode marker + inline текст active stage todo-plan + managed context bundle + current microtask state + last user-visible assistant message + current user/Core continuation command) специфицируется в **mandatory repair** (Gap R). Этот design layer не вводит нового rollover-контракта и не пересматривает уже зафиксированный SSOT 336; он только подтверждает, что Type A / Type B классификация фаз применяется по обе стороны session transition без изменения phase identity.

Из этого следует, что после rollover:

- если фаза была Type A на source session — target session получает rollover envelope с current Core-led microtask state, и обработчик arbitration продолжает план как до rollover;
- если фаза была Type B на source session — target session получает rollover envelope с last user-visible assistant message и current user message; candidate microtask lifecycle (раздел 2) восстанавливается из Core runtime-state surface, не из provider history.

В обоих случаях Continuation Mode marker даёт явный сигнал агенту, что это resumption, не fresh start, без необходимости угадывать состояние из истории.

## 7. Триггеры B→A (UI primary, typed command secondary)

Каждый переход B→A триггерится явным пользовательским command. Primary path — UI-action; secondary accessibility/headless path — typed acceptance command, который проходит через **тот же** Core command handler, что и UI command, и принимается Core только в acceptance-eligible Type B state (т.е. фаза должна реально быть в позиции, где переход в Type A валиден).

Set commands и соответствующих UI-действий:

- `Diagram Modules` → команда "Применить структуру" → UI-кнопка на карточке `product-parts.index.md`. Триггерит корректирующую `diagram-modules.structure-apply` operation.
- `Application Skeleton` → команда "Принять и материализовать" → UI-кнопка на карточке черновика контракта. Триггерит первичную или корректирующую `application-skeleton.materialize` operation (различает по состоянию файлов).
- `Quality Gates` → команда "Принять и интегрировать" → UI-кнопка на карточке черновика gates. Аналогично.

**Disabled / blocked states (минимальный набор для проектирования).** UI-кнопка должна быть disabled когда:

- последний draft-revision ещё не закоммичен (есть unstaged owned changes у текущего draft);
- Core занят другим managed phase (исполняется Type A, ожидается terminal event);
- активная фаза уже выполняется (повторный клик не должен порождать дубликат);
- последний artifact validator run завершился неудачей (нужно сначала исправить blocker);
- есть dirty out-of-owner files в workspace (Core blocked);
- workspace в `BLOCKED` состоянии (расширение существующего lifecycle).

При disabled-состоянии кнопка отображает причину и (если применимо) ссылку на required action — например, "review out-of-owner changes", "complete current phase", "re-run validator". Действия типа `discard` / `revert` остаются отдельным explicit user-confirmed flow и не предлагаются автоматически как required action в этом design layer.

Typed-command secondary path использует тот же финальный список фраз, что в mandatory repair (`"Подтверждаю контракт"`, `"Принимаю контракт"`, `"Утверждаю контракт"`) **только для contract-acceptance states** (`Application Skeleton` contract review и `Quality Gates` contract review), плюс step-specific фразы, добавленные при раскатке этого design layer (`"Принять и материализовать"`, `"Принять и интегрировать"`, `"Применить структуру"`). Для `Diagram Modules` structure apply generic contract phrases не валидны: там принимается только step-specific command `"Применить структуру"`. Расширенный список валиден только когда фаза находится в acceptance-eligible state — в противном случае Core отклоняет command с пояснением.

## 8. Каталог корректирующих операций

Type A — это семейство операций. Каждая операция описывается:

- источником плана (источниковые артефакты);
- целевыми артефактами (что меняется);
- порядком и составом микрозадач;
- правилами валидации каждого результата;
- шаблоном корректирующего сообщения при failed-валидации (без ownership leak).

Минимальный каталог для design layer:

- `diagram-modules.primary-generation` — already implemented in existing runtime. Mandatory repair preserves it without changes.
- `diagram-modules.structure-apply` — новая. Корректирующая генерация product parts по обновлённому индексу (delta-apply: добавить, обновить, удалить).
- `application-skeleton.materialize` — новая. Первичная и корректирующая материализация (различает по состоянию files).
- `quality-gates.integrate` — новая. Первичная и корректирующая интеграция.

Каталог расширяется по мере появления новых managed steps.

## 9. SSOT-добавки

Этот design layer требует расширения `WorkflowSteps_Overview.md` следующими формулировками:

- явное определение Type A / Type B (раздел 2 настоящего документа), включая candidate microtask lifecycle и его границу с `todo-plan.md`;
- сценарии трёх managed steps в этих терминах (раздел 4);
- правило universal "Корректировки" (раздел 5);
- boundary note про rollover (раздел 6) — rollover не вводит нового типа фазы; envelope shape — собственность mandatory repair Gap R;
- описание триггеров B→A (UI primary, typed command secondary через тот же Core command handler) с disabled/blocked states (раздел 7);
- упоминание каталога корректирующих операций как расширяемого design surface (раздел 8).

Эти добавки **не пересматривают** существующие формулировки SSOT; они их детализируют.

## 10. Open Questions

- Должна ли первичная фаза `Diagram Modules` (Type A primary-generation) обслуживаться той же UI-кнопкой, что и корректирующая `structure-apply`, или это два разных UI-сценария? (Сейчас primary запускается автоматом по `Start step`, без кнопки.)
- Допустимо ли в Phase 3 (Корректировки) `Diagram Modules` корректировать текстовое содержание одного product-part в Type B без структурной проверки ядра, или требуется триггер `structure-apply` даже для текстовых правок?
- Как UI-кнопка должна различать первичный и корректирующий сценарий `application-skeleton.materialize` — авто-detection по состоянию файлов или explicit user choice?
- Детальный набор disabled/blocked states (раздел 7) и UX-форма отображения причины блокировки.
- Конкретная runtime-state surface для candidate microtask lifecycle (раздел 2): где она хранится между turns, как взаимодействует с session storage и Plan Orchestrator, как восстанавливается после reconnect и rollover (раздел 6), и какой audit kind/storage используется для dropped candidates.
- Каков порядок развёртывания design layer — все три шага одновременно или последовательно (`Application Skeleton` → release → `Quality Gates` → release → `Diagram Modules` corrective)?

## 11. Связанные документы

- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md` — текущий SSOT, расширяется этим design layer.
- `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Runtime_Contract_Conformance.md` — mandatory repair, prerequisite для этого design layer; содержит rollover envelope spec (Gap R) и section 12 с post-release retest findings (R1/R2/R3).
- `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md` — архитектура skeleton, контекст по фазам.
- `doc/SolidWorks-WorkFlow/Plans/Managed_Workspace_Lifecycle_From_Diagram_Modules.md` — managed lifecycle контекст.

## 12. Prerequisites surfaced by 2026-05-10 retest

Mandatory repair release (VSIX 1.2.218) revealed three runtime regressions in the shipped Application Skeleton path. Each regression is a **prerequisite** for any of the design surfaces in sections 2–8 of this layer. Until they are repaired in runtime, none of this design layer can be implemented even partially without producing inconsistent behaviour. Active fix is Phase 10 in `doc/TODO/todo-plan.md`; see also `Managed_Workflow_Runtime_Contract_Conformance.md` section 12 for the same findings from the mandatory-repair perspective.

**R1 — Stage advance writer for `workspace.plan.md`.** The bundle builder reads `activeStage` from `workspace.plan.md`, but no caller updates that file when the workflow advances between managed steps. Without this writer, the `## Managed Workflow Context Bundle` block in section 6 boundary note (Continuation Mode + initial managed workflow contract/context block) cannot identify the live stage in resumed sessions; section 2 candidate microtask lifecycle has no anchor for "current Type B phase".

**R2 — Acceptance phrase recognition that survives natural user input.** Section 7 of this design layer defines step-specific acceptance commands ("Принять и материализовать", "Принять и интегрировать", "Применить структуру") as the typed-command secondary path that goes through the same Core command handler as the UI-button primary path. The mandatory repair shipped only the generic phrases as exact-match strings; real users type the verb plus contextual filler and the matcher returns null. A normalised contains-keyword recogniser scoped to the acceptance-eligible Type B state is the precondition for both the mandatory generic phrases and any future step-specific phrases this layer would add. False-positive guards from section 7 (recognition only in acceptance-eligible state, rejection of conflicting verbs) carry over unchanged.

**R3 — Application Skeleton materialization continuation dispatcher and completion observer.** Section 4 of this design layer treats Phase 2 (Application Skeleton materialization) as a Type A operation with a Core-led microtask plan. Section 5 of this design layer extends Phase 3 (Корректировки) as another open-ended Type B feeding back into Type A through the same B→A trigger. Both depend on a working Application Skeleton primary materialization path. The mandatory repair did not wire the materialization continuation dispatcher (parallel to `sendDiagramModulesContinuationIfReady`) or the completion observer that updates Core's progress state from `application-skeleton-map.json` after the agent's reply. Without these, Type A primary materialization never completes, and Type B Phase 3 never opens — section 5 universal "Корректировки" rule cannot exist.

**Open Question 5 implication.** Section 10 lists the runtime-state surface for candidate microtask lifecycle as an open question. R1/R2/R3 fixes do not implement this surface; they only restore the preconditions that any candidate microtask lifecycle would need (live `activeStage`, working acceptance trigger, working Type A primary materialization). The candidate microtask state itself remains designed-only and stays out of Phase 10 scope. A subsequent scope must answer Open Question 5 before this design layer can ship.
