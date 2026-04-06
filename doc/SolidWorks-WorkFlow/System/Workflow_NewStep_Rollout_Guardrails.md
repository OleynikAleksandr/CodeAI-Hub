# Workflow New Step Rollout Guardrails (SSOT)

**Status:** Active
**Updated:** 2026-04-06
**Owner:** Oleksandr + Codex
**Scope:** minimum rules for adding a workflow step without partial shells, split sources of truth, or restart regressions.

---

## 1. Core law

Новый workflow step нельзя внедрять как кнопку, prompt или artifact-path по отдельности. Поддерживаемый шаг существует только как полный contract:

- canonical `stageId`;
- canonical semantic artifact contract;
- canonical readiness / `READY-DONE-OUTDATED-ERROR` semantics;
- Project Manager parity;
- continuity + last-active + cold-start restore;
- localization ownership;
- tests + packaged release validation.

Если хотя бы один из этих слоёв отсутствует, шаг считается `INCOMPLETE`.

---

## 2. First move: clone a mature reference step

Сначала выбирается mature reference step с похожим UX/continuity profile, затем на новый шаг переносится весь rollout pattern:

- stage registries and order maps;
- artifact and validation paths;
- gating and cold-start hydration;
- PM toolbar/tree/panel/session behavior;
- continuity routing;
- localization surfaces;
- regression tests.

---

## 3. Questions that must be answered before code

До первого кодового изменения должен существовать planning/intake answer на вопросы:

1. Какой mature step является reference pattern?
2. Какой canonical `stageId` у нового шага?
3. Какие canonical input/output artifacts у шага?
4. Что делает шаг `READY`, `DONE`, `OUTDATED`, `ERROR`?
5. Какие exact PM surfaces должны вести себя identically to reference step?
6. Какие persistence paths используют тот же `stageId` на artifact, continuity и workflow уровне?
7. Какие cold-start tests и packaged checks доказывают, что шаг переживает restart?

---

## 4. One step = one canonical contract

### 4.1. Stage identity

Новый `stageId` обязан быть first-class во всех canonical registries.

- нельзя держать локальные hand-written normalizer/allowlist copies, если уже существует shared canonical normalizer;
- continuity root resolver, tracker, handoff path, dialog list/open/history, workflow-state hydration и PM restore обязаны использовать один shared stage normalization contract;
- новый шаг не имеет права silently normalizes-иться в `unknown`.

### 4.2. Artifacts

Canonical step artifacts живут только под `/.codeai-hub/<workspaceSlug>/<stageId>/...`.

Нужно заранее разделить:

- semantic artifacts;
- optional sidecar/view artifacts;
- validation rule;
- reopen/repair path.

### 4.3. Readiness

Gate шага обязан опираться на semantic readiness, а не на первый найденный файл.

Если upstream step строится staged/aggregate образом, rollout обязан иметь canonical progress snapshot, из которого cold start восстанавливает:

- `in_progress`;
- `completed`;
- downstream unlock state.

### 4.4. Persistence folders

Для одного официального шага должны быть синхронны три зоны:

- artifact folder: `/.codeai-hub/<workspaceSlug>/<stageId>/...`
- continuity folder: `/.codeai-hub/<workspaceSlug>/continuity/<stageId>/<rootSessionId>/...`
- workflow folder: `/.codeai-hub/<workspaceSlug>/workflow/...`

Если artifact живёт под canonical `stageId`, а continuity или workflow metadata используют другой effective stage, rollout сломан.

---

## 5. One source of truth for restore

При открытии workspace Project Manager не имеет права читать startup truth из разрозненных мест.

Startup restore строится только из canonical workspace state:

- `workflow-state`;
- `continuity`;
- `last-active` при необходимости.

Запрещено:

- поднимать startup `dialogIntent` из browser-local cache;
- выбирать stage отдельно для Toolbar и отдельно для Session panel;
- иметь разные startup routers для tree, toolbar, session panel и artifact panel.

Инвариант:

- `activeStage`, session route и selected artifact должны восстанавливаться из одного workspace-scoped источника истины.

---

## 6. Continuity guardrails

Новый шаг обязан корректно переживать reopen/restart.

Обязательные правила:

- continuity path обязан использовать canonical `stageId`, не `unknown`;
- root resolution не имеет права создавать fresh dialog/root, если для того же `workspace + stage + provider + providerSessionId` уже существует chain;
- dialog list/open path не имеет права предпочесть новый пустой duplicate entry вместо старого history-backed dialog;
- при наличии stale duplicates runtime restore и PM обязаны предпочесть history-backed dialog.

---

## 7. Project Manager parity

Новый шаг не считается добавленным, пока PM не доведён до parity с reference step.

Минимальный PM contract:

- toolbar label and button state;
- stage row in workflow tree;
- child artifact/session rows, если reference step их имеет;
- blocked/help/empty-state surfaces;
- artifact open/select path;
- session reopen path;
- auto-select priority on workspace open.

Инвариант навигации:

- toolbar click;
- tree stage click;
- tree artifact click;
- tree session click;
- workspace auto-select;
- startup restore

должны приходить к одному и тому же `activeStage + session + artifact`.

Child rows обязаны наследовать реальный stage-level `blocked/outdated/active` state, а не рисовать собственную выдуманную семантику.

---

## 8. Localization rule

Новый шаг не имеет права приносить user-facing text без явного ownership.

Обязательные surface categories:

- UI Labels
- UI Helper Text
- Messages for the User
- Artifacts for the User
- Internal Agent Instructions

Prompt остаётся internal surface. User-facing copy не может жить inline в React helper/component как source of truth.

---

## 9. Minimum acceptance checklist

Шаг считается готовым только если одновременно выполнены все пункты:

1. Новый `stageId` добавлен во все canonical registries без local drift.
2. Artifact contract и validation path работают end-to-end.
3. Gating основан на semantic readiness, а cold start восстанавливает корректный stage status.
4. PM parity с mature reference step достигнут.
5. Startup restore использует только workflow-state/continuity truth текущего workspace.
6. Continuity restore не уходит в `unknown`, не создаёт лишние roots и выбирает history-backed dialog.
7. Все user-facing surfaces локализованы через canonical ownership.
8. Есть regression tests на stage identity, artifact path, gating/hydration, PM startup restore и continuity duplicate handling.
9. Packaged release или VSIX smoke подтверждает, что шаг работает вне source-tree happy path.

Если хотя бы один пункт не выполнен, шаг не выпускается.

---

## 10. Related SSOT

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
