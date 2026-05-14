# Workflow New Step Rollout Guardrails (SSOT)

**Status:** Active
**Updated:** 2026-05-14
**Owner:** Oleksandr + Codex
**Scope:** minimum rules for adding a new workflow step or retrofitting an already released one without split truth, asymmetry, or restart regressions.

**2026-05-14 rewrite suspension:** release `1.2.249` managed-orchestration retrofit is retired as active runtime guidance during the orchestration-cluster rewrite. Generated child-plan lifecycle, `workspace.plan.md` `acceptedCommits`, Core post-turn repair/acceptance dispatch, and provider-visible managed feedback are not canonical truth for new work. Technical Documentation Tree stages remain fail-closed until the new cluster provides the replacement lifecycle.

---

## 1. Core law

Workflow step считается поддерживаемым только как полный contract, а не как частично добавленная кнопка, prompt, artifact path или dialog shell.

Один released step обязан одновременно иметь:

- canonical `stageId`;
- canonical semantic artifact contract;
- canonical readiness / `READY-DONE-OUTDATED-ERROR` semantics;
- canonical continuity binding;
- canonical workspace restore truth;
- canonical orchestration lifecycle, when the step writes tracked artifacts;
- Project Manager parity;
- regression tests;
- packaged release validation.

Если хотя бы один слой отсутствует, шаг считается `INCOMPLETE`.

For future managed trunk steps starting with `Diagram Modules`, the full contract must be redefined by the new orchestration cluster before those steps are re-enabled. The retired generated child-plan/post-turn lifecycle must not be treated as the current implementation contract.

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
6. canonical completion truth for sidebar LED/status surfaces.

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

- sidebar stage node with three-color indicator (gray/orange/green);
- blocked/help/empty-state surfaces;
- artifact open/select path;
- session reopen path;
- workspace auto-select (last active non-idle stage);
- startup restore.

For future managed technical root stages, the green indicator must mean completed state from canonical workflow-state, not "some artifact exists". During the rewrite, these stages remain fail-closed until the new cluster owns their lifecycle.

Инвариант навигации:

- tree stage click;
- branch node click (for Development Tree nodes);
- workspace auto-select;
- startup restore

должны приходить к одному и тому же `activeStage + session + artifact`.

Trunk stages являются leaf nodes в sidebar (секция Documentation Tree). Development Tree branch nodes (Product Part / Cluster / Module) проецируются в отдельной секции sidebar как collapsible nodes.

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
- `Application Skeleton`
- `Quality Gates Baseline`

For the future managed orchestration cluster, regression matrix must also cover:

1. bootstrap creates only the current executable microtask plus paired `Git Commit:`;
2. Core rejection creates a repair microtask plus paired `Git Commit:` before provider-visible feedback;
3. failed repair attempts are committed as artifact changes or tracked attempt evidence;
4. acceptance commits precede materialization/integration continuations;
5. final materialization/integration commits open the persistent user-return idle anchor, even when the stage needed multiple materialization/integration task commits;
6. repairable owned-stage failures never produce wait-only provider instructions;
7. post-completion user-return revisions create concrete `revisionN` task pairs;
8. downstream blockers do not recolor completed upstream stage LEDs.

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
7. Managed lifecycle steps use the new orchestration-cluster contract; the retired generated child-plan/post-turn lifecycle is not an acceptable active implementation.
8. User-facing copy локализована через canonical ownership.
9. Есть regression tests на identity, artifact path, gating/hydration, startup restore, stale-state self-heal, duplicate continuity handling, Core rejection/repair, and completed-stage LED boundaries.
10. Packaged release подтверждает, что исправление работает вне source-tree happy path.

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
