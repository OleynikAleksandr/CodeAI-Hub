# Application Skeleton Materialization Prompt Refactor

**Status:** Draft for discussion.
**Created:** 2026-05-06
**Owner:** Oleksandr + Codex
**Scope:** уточнить контракт шага `Application Skeleton`: агент должен сначала создать draft/accepted skeleton contract, а после explicit acceptance сам материализовать workspace skeleton и filesystem projection Development Tree. Отдельный materialization agent не вводится.

---

## 1. Почему появился этот refactor

Во время живого тестирования шагов `Application Skeleton` и `Quality Gates Baseline` стало видно, что текущая модель недостаточно явно отвечает на вопрос: кто и когда создает реальные файлы будущего приложения.

Предыдущая архитектурная версия разделяла:

- `Application Skeleton` как шаг выбора stack/layout и создания `application-skeleton.md` / `application-skeleton-map.json`;
- `Quality Gates Baseline` как шаг контракта команд качества;
- Core materialization как отдельную downstream-автоматизацию после accepted skeleton + gates.

Проблема такой модели: агент, который лучше всего понимает выбранный стек и mapping, завершает работу до физического создания skeleton. Затем другому слою или агенту нужно повторно получать контекст, интерпретировать решения и переносить их в файловую систему. Это создает лишний handoff и риск расхождения между контрактом и реальным workspace.

Новая цель: оставить два агентских шага, но сделать каждый из них ответственным за свою post-acceptance материализацию.

## 2. Главное решение

`Application Skeleton Agent` должен владеть полным циклом skeleton:

1. До acceptance он создает только draft artifacts:
   - `application-skeleton.md`;
   - `application-skeleton-map.json`.
2. Пользователь обсуждает и принимает контракт.
3. После explicit acceptance тот же агент материализует workspace skeleton:
   - industry-aligned project scaffold;
   - workspace/package roots;
   - source roots;
   - filesystem projection `Product Part -> Cluster -> Module`;
   - minimal placeholders/stubs only where they are part of the skeleton contract.
4. Агент обновляет `application-skeleton-map.json` до materialized state.

Отдельный `Workspace Materialization Agent` не нужен для этого цикла.

## 3. Почему не нужен отдельный materialization agent

Отдельный агент был бы оправдан, если бы материализация была независимой технической операцией без проектных решений. Здесь это не так.

`Application Skeleton Agent` уже знает:

- выбранный язык;
- framework/runtime;
- package manager;
- repo shape;
- source roots;
- application/workspace boundaries;
- mapping Development Tree на production paths;
- ограничения выбранного stack.

Именно он является самым подготовленным исполнителем для создания реального skeleton. Передача этой работы другому агенту потребовала бы повторного prompt context, дополнительной валидации и создала бы новое место для drift.

## 4. Роль Quality Gates Baseline

`Quality Gates Baseline Agent` получает уже материализованный skeleton.

Он должен владеть полным циклом gates:

1. До acceptance он создает только draft artifacts:
   - `quality-gates.md`;
   - `quality-gates.json`.
2. Пользователь обсуждает и принимает gate baseline.
3. После explicit acceptance тот же агент интегрирует gates в готовую файловую систему:
   - package scripts;
   - tool configs;
   - architecture gate scripts;
   - hooks;
   - minimal smoke verification;
   - machine-readable integrated state in `quality-gates.json`.

Отдельный gates integrator также не нужен: агент, который выбрал baseline, лучше всего понимает, какие конфиги и команды должны появиться.

## 5. Новая high-level цепочка

```text
Diagram Modules
  -> Application Skeleton
       A. draft skeleton contract
       B. user acceptance
       C. materialize workspace skeleton + Development Tree filesystem projection
       D. mark skeleton materialized
  -> Quality Gates Baseline
       A. draft gates contract
       B. user acceptance
       C. integrate gates/hooks/configs into materialized skeleton
       D. mark gates integrated
  -> Development Tree sessions
```

Development Tree sessions нельзя запускать после одного только accepted skeleton contract. Они доступны только после:

```text
application-skeleton-map.json accepted == true
AND application-skeleton-map.json materialized == true
AND quality-gates.json accepted == true
AND quality-gates.json integrated == true
```

## 6. Application Skeleton prompt boundary

Стартовый prompt `Application Skeleton` должен явно разделять две фазы.

### 6.1 Draft phase

В draft phase агент обязан:

- прочитать runtime-provided Diagram Modules artifacts;
- определить или исследовать подходящий stack;
- задать вопросы только если решение нельзя вывести из входных данных или research;
- создать `application-skeleton.md`;
- создать `application-skeleton-map.json`;
- оставить `accepted=false`;
- не создавать production files;
- не создавать package manifests, configs, hooks или source folders вне `.codeai-hub/.../application_skeleton/`.

### 6.2 Post-acceptance materialization phase

После явного пользовательского acceptance агент обязан:

- считать acceptance прямым сигналом к немедленной materialization в той же сессии;
- не спрашивать пользователя, переходить ли к materialization, если acceptance уже получен;
- перечитать accepted `application-skeleton-map.json`;
- создать project scaffold в workspace;
- создать filesystem projection Product Part / Cluster / Module inside the chosen scaffold;
- создать minimal stubs только если они объявлены в accepted contract;
- не писать business/feature implementation code;
- не запускать Product Part / Cluster / Module sessions;
- обновить materialization metadata в `application-skeleton-map.json`;
- сообщить created/updated paths и verification result.

## 7. Что именно значит "materialize skeleton"

Минимальная материализация skeleton включает:

- root/workspace manifest для выбранного stack;
- package/workspace roots;
- source roots;
- runtime/app entry placeholders, если они нужны для выбранного framework;
- directory projection для каждого accepted Product Part;
- directory projection для каждого Cluster внутри Product Part;
- directory projection для каждого Module внутри Cluster;
- optional `README.md` / contract note в крупных roots, если это нужно для ориентации будущих агентов;
- stable `codePath` mapping в `application-skeleton-map.json`.

Материализация не включает:

- реализацию функций модулей;
- бизнес-логику;
- полноценные фасады модулей, если они должны проектироваться на branch-level `Module Design`;
- тесты бизнес-поведения;
- quality gate configs, если они принадлежат следующему шагу.

## 8. Machine-readable contract changes

`application-skeleton-map.json` должен различать contract acceptance и filesystem materialization.

Минимальные поля:

```json
{
  "schema": "codeai-application-skeleton-v1",
  "accepted": false,
  "reviewState": "draft",
  "materialized": false,
  "materializationState": "not_started",
  "workspaceRoot": ".",
  "repoShape": "monorepo",
  "packageManager": "npm",
  "stack": {
    "languages": [],
    "frameworks": [],
    "runtimes": []
  },
  "productParts": [],
  "materializedPaths": [],
  "deferredMaterialization": []
}
```

Allowed `materializationState`:

- `not_started`;
- `in_progress`;
- `materialized`;
- `failed`;
- `outdated`.

`accepted=true` без `materialized=true` означает: contract принят, но downstream Development Tree sessions еще заблокированы.

## 9. UI/Core gating changes

UI и Core должны различать:

- artifact available;
- contract accepted;
- filesystem materialized.

Для `Application Skeleton`:

- `Quality Gates Baseline` можно запускать только после `materialized=true`, потому что gates должны интегрироваться в реальные manifests/config roots;
- если `accepted=true`, но `materialized=false`, UI должен показывать шаг как ожидающий materialization, а не как полностью завершенный;
- Start/Resume action должен возвращать пользователя в ту же Application Skeleton session для post-acceptance materialization.

Для Development Tree:

- branch sessions остаются disabled до integrated Quality Gates;
- read-only Development Tree preview из Diagram Modules может отображаться раньше;
- production code folders появляются на Application Skeleton materialization phase;
- neutral draft/spec mirror под `.codeai-hub/.../development_tree/materialized/` и node sessions появляются только после integrated gates.

## 10. Prompt testing protocol for this scope

После изменения prompt'а шаг нужно проверять живым прогоном по методике `WorkflowStep_PromptTesting_Methodology.md`.

Проверка 1: first run до acceptance.

Ожидаемое поведение:

- агент анализирует Diagram Modules artifacts;
- выбирает или исследует stack;
- создает draft contract + map;
- не пишет production files;
- не пытается запускать Quality Gates или Development Tree sessions;
- финальные вопросы касаются только real open decisions.

Проверка 2: acceptance turn.

Ожидаемое поведение:

- пользователь подтверждает skeleton;
- агент понимает, что теперь должен материализовать filesystem;
- агент создает реальные folders/manifests согласно accepted map;
- агент обновляет `materialized=true`;
- агент не выходит в бизнес-код.

Проверка 3: downstream gating.

Ожидаемое поведение:

- Quality Gates становится доступен только после materialized skeleton;
- Development Tree branch sessions остаются disabled до integrated quality gates.

## 11. Implementation questions for next planning slice

Перед нарезкой implementation plan нужно уточнить:

1. Где в runtime сейчас определяется accepted state Application Skeleton.
2. Как UI должен отображать `accepted=true/materialized=false`.
3. Может ли существующая Application Skeleton session быть resumed для post-acceptance materialization turn.
4. Какие fields уже читает Development Tree gate и какие нужно добавить.
5. Нужно ли менять existing `Application_Skeleton_Architecture.md` полностью или оставить его как parent plan с этим refinement как overriding child plan.

## 12. Definition of Done for this phase

Planning phase считается готовой, когда:

- пользователь согласовал, что Application Skeleton agent владеет post-acceptance skeleton materialization;
- Quality Gates agent владеет post-acceptance gates integration;
- отдельный materialization agent не вводится;
- prompt boundary для Application Skeleton описан;
- machine-readable materialization state описан;
- следующий implementation plan можно нарезать на prompt, schema, runtime gating, UI state и live-test streams.
