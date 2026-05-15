# Preliminary Steps And Diagram Modules Runtime Orchestration Planning

**Status:** active planning source for the next implementation scope.
**Created:** 2026-05-15.
**Owner:** Oleksandr + Codex.
**Scope:** подключить к новому `Managed Workflow Orchestration` cluster первые три trunk steps: `Description`, `Virtual Simulation`, `Diagram Modules`.

## 1. Цель Среза

Следующий релиз должен дать визуально проверяемый runtime-срез:

1. `Description` остается provider-direct шагом, но его start/read-model/session restore policy берется из `ManagedWorkflowOrchestrationFacade`.
2. `Virtual Simulation` остается provider-direct шагом с тем же orchestrator-owned start/read-model/session restore policy.
3. `Diagram Modules` перестает быть preview-only boundary и получает первый полноценный managed сценарий:
   - Phase 1 — Core-gated agent work для создания diagram artifacts;
   - Phase 2 — user-led review;
   - Phase 3 — persistent user return open boundary.

После расширения scope 2026-05-15 `Application Skeleton` и `Quality Gates` также подключены к managed-dispatch boundary, но найденный в release `1.2.258` дефект относится к первой сложной Phase 1 `Diagram Modules`: Core открыл provider session, но не создал managed scaffold и не продолжил multi-turn sequence после первого `product-parts.index.md`.

Release `1.2.259` исправил первый continuation gap частично: после принятого `product-parts.index.md` Core отправил continuation prompt для `project-manager`, но пользовательский acceptance снова заблокирован. Остались два runtime-defect:

- startup scaffold не появляется в фактическом provider workspace при старте `Diagram Modules`, поэтому нет `doc/TODO/workspace.plan.md`, stage `todo-plan.md` и managed task/commit структуры;
- rejected Product Part получает только user-visible Core diagnostic (`Product Part artifact has invalid heading`) и не превращается в provider-visible repair prompt, поэтому агент останавливается и не исправляет текущий artifact.

Новый repair stream обязан проверить именно runtime path, а не только unit-level scaffold installer: установка scaffold должна происходить до первого provider prompt в том workspace, где агент пишет `.codeai-hub/.../diagram_modules`. Rejection path обязан иметь одно из трех явных решений после каждого provider turn: provider repair prompt, next Product Part continuation prompt или Phase 2 review.

Release `1.2.260` подтвердил, что scaffold, multi-turn Product Part sequence, repair dispatch и финальное review message работают, но обнаружил следующий lifecycle-defect: Core не ведет созданные `doc/TODO/workspace.plan.md` и `doc/TODO/stages/diagram-modules/todo-plan.md` после accepted subturn. Stage plan остается на единственной initial index task, Product Part microtasks и paired `Git Commit` lines не создаются, hashes не записываются, а Phase 2 user review не появляется в managed stage plan. Этот дефект означает, что provider orchestration уже работает, но Core-owned plan/commit boundary не подключен к post-turn arbitration.

## 2. Архитектурное Решение

Работа идет через существующий cluster:

- public facade: `ManagedWorkflowOrchestrationFacade`;
- registry: `ManagedWorkflowStepRegistry`;
- step controllers: `description`, `virtual_simulation`, `diagram_modules`;
- state machine/effects/read model behind the facade.

`remote-bridge`, Project Manager и provider adapters не должны импортировать внутренние step controller classes напрямую. Для внешнего кода единственный вход — facade и public contract types.

## 3. Provider-Direct Preliminary Steps

`Description` и `Virtual Simulation` не получают managed Git/phase lifecycle в этом scope.

Их контракт:

- `startPolicy = provider_direct`;
- PM показывает обычную карточку старта/существующую session;
- Core создает provider session обычным transport path;
- orchestrator read model сообщает PM, что эти шаги зарегистрированы в новом cluster;
- completed upstream artifact не должен превращать текущий шаг в read-only preview card.

Definition of done:

- после submit анкеты видна реальная `Description` session;
- после появления `Final_Description.md` видна карточка старта `Virtual Simulation`;
- после появления `virtual-simulation.md` видна карточка старта `Diagram Modules`;
- старый preview-lock не применяется к первым двум шагам.

## 4. Diagram Modules Managed Scenario

Опорный сценарий: `Diagram_Modules_Managed_Orchestration_Planning_RU.md`.

### Phase 1 — Diagram Modules Artifacts

**Тип:** Type A — Core-Gated Agent Work.

Core:

- до отправки первого provider prompt создает managed workspace scaffold:
  - `doc/TODO/workspace.plan.md`;
  - `doc/TODO/stages/diagram-modules/todo-plan.md`;
  - stage plan placeholders для следующих technical stages;
  - `scripts/plan-orchestrator/plan-cli.mjs`;
  - `.husky` hooks и `package.json` plan scripts, если они отсутствуют;
- создает managed runtime snapshot для `diagram_modules`;
- отправляет provider-visible стартовый prompt через orchestrator gateway на создание только `product-parts.index.md`;
- включает inline `Final_Description.md` и `virtual-simulation.md`;
- после terminal provider turn запускает deterministic validation текущего subturn;
- после каждого accepted subturn выполняет managed commit boundary: если workspace еще не является Git repo, Core инициализирует локальный Git repo и staging ограничивается только managed Diagram Modules/scaffold paths; если Git недоступен или commit boundary падает, Core блокирует продолжение и не отправляет следующий Product Part prompt;
- после successful commit обновляет `doc/TODO/stages/diagram-modules/todo-plan.md`: закрывает текущую microtask, записывает real hash в paired `Git Commit`, создает следующую Product Part microtask или Phase 2 user-review task;
- после successful commit обновляет `doc/TODO/workspace.plan.md`: `lastAcceptedCommitHash`, `lastAcceptedCommitMessage`, `acceptedCommits`;
- если index валиден, извлекает ordered Product Part ids и отправляет следующий provider-visible continuation prompt на первый отсутствующий `product-parts/<part-id>.md`;
- после каждого Product Part turn валидирует только named target и затем отправляет следующий Product Part prompt;
- после принятия последнего Product Part открывает Phase 2 и пишет user-visible Core message в managed session.

Agent:

- пишет только тот Diagram Modules artifact, который назван текущим Core prompt;
- не пишет child plan/task/hash state;
- не обещает Git commit, downstream unlock или Core acceptance от своего имени.

### Phase 2 — Diagram Modules User-Led Review

**Тип:** Type B — User-Led Review.

Core:

- пишет локализованное user-visible сообщение в managed session;
- освобождает поле ввода пользователя;
- классифицирует user input как acceptance, revision request или clarification/discussion;
- direct acceptance открывает Phase 3 без pseudo-hash;
- revision request отправляет provider prompt внутри текущей review task;
- валидная revision получает real commit hash и открывает следующий review task.

Агент работает только при user revision request.

### Phase 3 — Persistent Diagram Modules User Return

Core:

- создает persistent return-open state только после user acceptance в Phase 2;
- пишет пользователю понятное сообщение, что шаг завершен и к нему можно вернуться позже;
- не запускает future refactoring/revision workflow в этом scope.

## 5. Визуальные Признаки Для Теста

Пользователь после релиза проверяет:

1. `Description`: submit questionnaire создает и показывает session, а не read-only карточку.
2. `Virtual Simulation`: после completed Description появляется start card, старт создает реальную session.
3. `Diagram Modules`: после completed Virtual Simulation start card запускает orchestrator-owned managed session, а не preview-only placeholder.
4. После работы агента Diagram Modules Core пишет visible transition message для user-led review.
5. Фраза пользователя `подтверждаю` в review phase приводит к persistent return-open state, а не уходит в provider-пустоту.
6. В Project Manager stage становится завершенным только после Phase 3, а не после одной preview/validation записи.

## 6. Out Of Scope

- End-to-end runtime для `Application Skeleton`.
- End-to-end runtime для `Quality Gates`.
- Полный post-completion refactoring workflow в persistent return phase.
- Автоматическая реализация всех future Development Tree branches.

## 7. Документы Контекста

- `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
- `doc/SolidWorks-WorkFlow/Plans/Managed_Step_Orchestration/Diagram_Modules_Managed_Orchestration_Planning_RU.md`
- `doc/SolidWorks-WorkFlow/Plans/Archive/Managed_Workflow_Orchestration_Cluster_Planning.md`
