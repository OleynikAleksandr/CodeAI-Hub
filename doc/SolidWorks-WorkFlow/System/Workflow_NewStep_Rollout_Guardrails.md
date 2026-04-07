# Workflow New Step Rollout Guardrails (SSOT)

**Status:** Active
**Updated:** 2026-04-06
**Owner:** Oleksandr + Codex
**Scope:** minimum rules for adding a new workflow step or retrofitting an already released one without split truth, asymmetry, or restart regressions.

---

## 1. Core law

Workflow step считается поддерживаемым только как полный contract, а не как частично добавленная кнопка, prompt, artifact path или dialog shell.

Один released step обязан одновременно иметь:

- canonical `stageId`;
- canonical semantic artifact contract;
- canonical readiness / `READY-DONE-OUTDATED-ERROR` semantics;
- canonical continuity binding;
- canonical workspace restore truth;
- Project Manager parity;
- regression tests;
- packaged release validation.

Если хотя бы один слой отсутствует, шаг считается `INCOMPLETE`.

Это правило одинаково действует:

- для нового шага;
- для уже существующего released шага;
- для любого trunk retrofit перед добавлением следующего шага.

---

## 2. Retrofit law for existing steps

Нельзя двигаться к следующему trunk step, если уже выпущенные шаги хранятся и восстанавливаются по разным правилам.

Обязательный закон:

- все released trunk steps обязаны подчиняться одной и той же persistence / restore модели;
- если у раннего шага есть явный stage passport, поздние шаги не могут жить только на косвенной комбинации artifact file + continuity hints + UI heuristics;
- найденная асимметрия released steps превращается в отдельный retrofit scope и закрывается до rollout следующего trunk step.

Итоговый инвариант простой: система должна одинаково уметь ответить на вопрос `что это за шаг`, `какой у него главный artifact`, `какая сессия к нему относится` и `какой шаг сейчас активен в workspace`.

---

## 3. One step = one canonical step passport

У каждого workflow step обязан существовать один и тот же минимальный canonical passport.

Минимум:

1. canonical `stageId`;
2. canonical semantic artifact path(s);
3. canonical readiness/status snapshot;
4. canonical continuity binding (`root/dialog/providerSessionId`);
5. canonical active-stage pointer для workspace restore.

Этот passport может materialize-иться разными внутренними слоями, но user-visible truth не имеет права зависеть от догадок.

Запрещено:

- локально копировать stage normalizer / allowlist / order map, если уже существует shared canonical registry;
- нормализовать реальный шаг в `unknown`;
- держать artifact под одним `stageId`, continuity под другим, а workflow restore под третьим.

---

## 4. One startup truth per workspace

При открытии workspace Project Manager не имеет права собирать правду о текущем шаге из нескольких независимых источников.

Startup restore строится только из canonical workspace-scoped truth:

- workflow-state;
- continuity;
- last-active pointer, если он входит в canonical workflow-state model.

Запрещено:

- поднимать startup route из browser-local `dialogIntent` или других panel-local caches;
- выбирать один stage для toolbar/tree и другой для session panel;
- восстанавливать artifact selection, active stage и dialog route по разным правилам.

Инвариант:

- `activeStage`;
- opened session;
- selected artifact

должны восстанавливаться из одного workspace truth chain.

Continuity хранит историю диалога. Workflow-state хранит ответ на вопрос, какой шаг сейчас считается активным. Эти два слоя не имеют права противоречить друг другу.

---

## 5. Continuity guardrails

Новый или retrofit step обязан корректно переживать reopen / restart.

Обязательные правила:

- continuity path обязан использовать canonical `stageId`, не `unknown`;
- root resolution не имеет права создавать fresh dialog/root, если для того же `workspace + stage + provider + providerSessionId` уже существует chain;
- dialog list/open path не имеет права предпочесть новый пустой duplicate entry вместо старого history-backed dialog;
- при наличии stale duplicates runtime restore и PM обязаны предпочесть history-backed dialog;
- stale workspace metadata обязана self-heal-иться, если canonical artifact + continuity уже доказывают, что workspace дошёл до более позднего шага.

---

## 6. Project Manager parity

Шаг не считается добавленным, пока PM не доведён до parity с mature reference step.

Минимальный PM contract:

- toolbar label and button state;
- workflow tree stage row;
- child artifact/session rows, если они заявлены для данного шага;
- blocked/help/empty-state surfaces;
- artifact open/select path;
- session reopen path;
- workspace auto-select;
- startup restore.

Инвариант навигации:

- toolbar click;
- tree stage click;
- tree artifact click;
- tree session click;
- workspace auto-select;
- startup restore

должны приходить к одному и тому же `activeStage + session + artifact`.

Child rows обязаны наследовать реальный stage-level state. Они не могут рисовать собственную выдуманную семантику.

---

## 7. Tests and release gate

Формально исправляемый step обязан иметь формально проверяемый regression matrix.

Минимум:

1. artifact creation / change updates canonical step truth;
2. cold start восстанавливает правильный stage status;
3. cold start восстанавливает правильный active step;
4. PM открывает правильный session route;
5. PM открывает правильный artifact route;
6. stale legacy metadata self-heal-ится, если workspace уже продвинулся дальше;
7. duplicate continuity entries не уводят restore в пустой dialog.

Для trunk retrofit тестируется не только новый шаг, а вся текущая trunk chain:

- `Description`
- `Virtual Simulation`
- `Diagram Modules`

Release gate:

- regression tests green;
- targeted builds green;
- packaged VSIX smoke green.

Если packaged release не проверен, rollout не закрыт.

---

## 8. Minimum acceptance checklist

Шаг или retrofit wave считается готовым только если одновременно выполнены все пункты:

1. `stageId` добавлен во все canonical registries без local drift.
2. Artifact contract и validation path работают end-to-end.
3. Все released trunk steps в scope используют симметричную step-passport model.
4. Gating основан на semantic readiness, а не на случайном найденном файле.
5. Workflow-state и continuity не расходятся по active step truth после restart.
6. PM parity с mature reference step достигнут.
7. User-facing copy локализована через canonical ownership.
8. Есть regression tests на identity, artifact path, gating/hydration, startup restore, stale-state self-heal и duplicate continuity handling.
9. Packaged release подтверждает, что исправление работает вне source-tree happy path.

Если хотя бы один пункт не выполнен, rollout не выпускается.

---

## 9. Related SSOT

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
