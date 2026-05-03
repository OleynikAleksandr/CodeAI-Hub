# Plan Orchestrator — Architecture

**Status:** accepted rev1 — approved by user on 2026-05-03
**Created:** 2026-05-03
**Owner:** Process automation / Git hooks / Codex execution lifecycle
**Scope:** заменить ручное ведение session reports и ручные отметки прогресса в `doc/TODO/todo-plan.md` на детерминированный Plan Orchestrator, который управляет состоянием active plan, commit workflow, recovery и closeout.

---

## 1. Problem

Текущий процесс держится на дисциплине пользователя и агента:

- агент вручную читает последний `doc/Sessions/SessionXXX.md`;
- агент вручную восстанавливает context из session report;
- агент вручную меняет статусы задач в `todo-plan.md`;
- агент вручную вписывает commit hashes;
- агент вручную решает, когда архивировать plan и session report.

Это слабое место. Человек и агент могут забыть обновить план, ошибиться в hash, пропустить обязательный документ или закрыть scope до user acceptance.

Для долгих execution cycles более надёжная модель такая же, как у Documentation Tree fast synthetic rollover: не просить предыдущего агента писать свободный отчёт, а восстанавливаться из детерминированного состояния, которое поддерживается автоматически.

---

## 2. Target Behavior

### 2.1 Start of session

Новый агент с нулевым контекстом читает только:

```text
doc/TODO/todo-plan.md
```

Дальше:

- если `Execution Scope Status: ACTIVE`, `todo-plan.md` является единственным recovery owner;
- если `Execution Scope Status: NONE`, active scope отсутствует, агент обсуждает с пользователем новый scope;
- если `Execution Scope Status: BLOCKED`, агент читает blocker reason и не продолжает реализацию до снятия blocker;
- session reports не участвуют в recovery path.

`SystemArchitecture.md` и `Docs_Index.md` читаются только когда active plan отсутствует или когда active plan явно указывает их в `Recovery Pack`.

### 2.2 During implementation

Агент не редактирует progress/hash руками.

Единственный штатный путь commit workflow:

```bash
npm run plan:commit -- "fix: example"
```

Plan Orchestrator:

1. читает active plan;
2. валидирует текущую задачу и expected commit message;
3. проверяет staged diff и declared scope;
4. переводит текущую задачу в `DONE`;
5. переводит paired `Git Commit` в transaction state;
6. запускает обычный `git commit` без обхода Husky;
7. после успешного commit получает hash;
8. записывает hash в active plan;
9. переводит paired commit в `DONE`;
10. переводит следующую задачу в `IN_PROGRESS`;
11. снимает transaction debt.

### 2.3 Closeout

Session reports удаляются из обязательного процесса.

Closeout делает Plan Orchestrator:

- требует explicit user acceptance;
- архивирует завершённый active plan;
- создаёт reset-state `doc/TODO/todo-plan.md`;
- обновляет planning-doc disposition;
- обновляет `Docs_Index.md` при перемещении planning-docs;
- создаёт committed closeout snapshot, но не создаёт `doc/Sessions/SessionXXX.md`.

Исторические `doc/Sessions/*.md` остаются как legacy archive, но `AGENTS.md` больше не должен ссылаться на них как на recovery mechanism.

---

## 3. Core Design Decisions

### 3.1 Active plan is machine-managed execution state

`doc/TODO/todo-plan.md` становится active execution state, а не ручным markdown-журналом.

Скрипты владеют:

- task status transitions;
- commit hash insertion;
- current task pointer;
- branch/head binding;
- plan transaction debt;
- closeout archive/reset.

Агент владеет только смысловой работой:

- код;
- документация;
- verification evidence;
- planning-doc discussions;
- объяснение пользователю.

### 3.2 Active plan should not self-reference Git commit hash inside the same commit

Commit hash неизвестен до создания commit object. Поэтому hash текущего commit нельзя надёжно записать в tracked файл внутри этого же commit.

Recommended implementation:

- active `doc/TODO/todo-plan.md` выводится из tracked Git state и становится ignored local execution state;
- committed history сохраняется через archived/snapshot plans;
- closeout archive всегда tracked;
- optional stream/tooling-checkpoint snapshots tracked через explicit `npm run plan:snapshot`.

Если проект решит оставить active plan tracked, Orchestrator обязан использовать two-commit model: feature commit, затем отдельный docs commit с hash. Это менее удобно и хуже автоматизируется.

### 3.3 Crash consistency through plan debt

Git commit и update active plan - две разные операции. Между ними возможен crash.

Для атомарности используется sentinel:

```text
.git/codeai-plan-debt
```

Он создаётся перед transaction и снимается только после полной записи hash/status/next pointer.

Если process умер после успешного commit, следующий `pre-commit` / `pre-push` блокирует работу и требует:

```bash
npm run plan:repair
```

### 3.4 Hooks enforce the process, Orchestrator performs the work

Hooks не должны пытаться выполнять всю бизнес-логику самостоятельно.

- `plan:commit` выполняет штатный transition.
- Hooks блокируют попытки работать мимо Orchestrator или продолжать после inconsistent state.

---

## 4. Required Scripts

### 4.1 `npm run plan:status`

Read-only command.

Outputs:

- plan schema version;
- execution scope status;
- branch/head binding;
- current task id;
- expected commit message;
- debt status;
- next required action.

### 4.2 `npm run plan:validate`

Read-only validator used by hooks and humans.

Checks:

- `todo-plan.md` exists;
- machine state block is parseable;
- status is one of `NONE`, `ACTIVE`, `BLOCKED`, `ACCEPTED_PENDING_CLOSEOUT`;
- active scope has exactly one current task;
- each implementation task has paired `Git Commit`;
- paired commit has expected message;
- no duplicate task ids;
- branch/head binding matches current repository state;
- no open `.git/codeai-plan-debt` unless command runs in repair mode.

### 4.3 `npm run plan:commit -- "<message>"`

Main orchestrator command.

Checks before commit:

- active plan status is `ACTIVE`;
- current task is `IN_PROGRESS`;
- expected commit message equals CLI message;
- staged files match task declared scope;
- verification evidence is present or explicitly marked `not required`;
- documentation sync field is present when task type requires docs.

Actions:

- creates `.git/codeai-plan-debt`;
- marks task `DONE`;
- marks paired commit transaction as `PENDING`;
- runs `git commit -m "<message>"`;
- reads `git rev-parse --short HEAD`;
- writes hash to active plan;
- marks paired commit `DONE`;
- advances next task pointer;
- removes `.git/codeai-plan-debt`;
- prints next required action.

### 4.4 `npm run plan:repair`

Crash recovery command.

Reads `.git/codeai-plan-debt`, `HEAD`, `git log -1 --pretty=%s`, and active plan.

Supported repairs:

- commit succeeded but hash was not written;
- hash was written but next pointer was not advanced;
- task status changed but paired commit remained `PENDING`;
- branch/head mismatch caused by interrupted checkout/rebase.

If repair cannot prove a single safe transition, it leaves status `BLOCKED` and prints exact manual recovery instructions.

### 4.5 `npm run plan:snapshot`

Creates a tracked snapshot of active plan at explicit checkpoints:

- stream boundary;
- tooling verification boundary;
- before risky refactor;
- before user acceptance wait;
- before closeout.

Snapshots should live under:

```text
doc/TODO/Snapshots/
```

Snapshot filenames include timestamp, branch, and last recorded commit.

### 4.6 `npm run plan:closeout`

Closeout command.

Inputs:

- scope/checkpoint label;
- explicit user acceptance text;
- planning-doc disposition list.

Actions:

- validates no incomplete task remains;
- validates required final streams were accepted;
- archives active plan into `doc/TODO/Archive/`;
- creates reset-state `doc/TODO/todo-plan.md`;
- updates `Docs_Index.md` where planning-docs moved or changed disposition;
- prints files that must be committed.

---

## 5. Hook Contract

### 5.1 `pre-commit`

Add `npm run plan:hook:pre-commit` before existing gates.

Blocks when:

- `.git/codeai-plan-debt` exists;
- active plan exists but commit is not launched through Plan Orchestrator;
- active plan branch/head binding is stale;
- staged files exceed declared task scope;
- current task is not ready for commit;
- paired commit item is missing.

Then existing gates still run:

- `./scripts/check-architecture.sh`;
- `npm run lint`;
- `npm run check:knip`;
- staged formatting.

### 5.2 `commit-msg`

Extend existing `.husky/commit-msg`.

Current `scripts/check-commit-message.sh` keeps removing forbidden Claude co-author trailers.

New plan validator also checks:

- commit message equals active task expected commit message;
- no direct commit is allowed for active scope unless Orchestrator transaction environment is present;
- closeout/snapshot commits use an allowed plan command context.

### 5.3 `post-commit`

New hook.

Runs `npm run plan:hook:post-commit`.

Responsibilities:

- if commit was launched by Orchestrator, finalize hash/status/next pointer;
- if finalization fails, leave `.git/codeai-plan-debt`;
- never amend commit;
- never create another commit.

### 5.4 `pre-push`

Add `npm run plan:hook:pre-push` before existing duplication/link checks.

Blocks when:

- plan debt exists;
- active plan is inconsistent;
- acceptance/closeout state is partially closed;
- active branch does not match plan binding.

Then existing checks still run:

- `npm run check:dup`;
- `npm run check:links`.

### 5.5 Optional lifecycle hooks

`post-checkout`, `post-merge`, `post-rewrite` can warn or set blocked state when branch/head binding changes.

They should not mutate plan destructively. Their job is to make branch mismatch visible early.

---

## 6. New `todo-plan.md` Template

The file keeps human-readable Markdown, but the top block is machine-owned.

Example:

````markdown
# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plan-orchestrator-2026-05-03",
  "branch": "main",
  "baseHead": "0debb4a32",
  "lastRecordedCommit": "0debb4a32",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md",
  "currentTaskId": "phase1.stream1.task1",
  "expectedCommitMessage": "feat: add plan state parser",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Recovery Pack

- **Execution Scope Status:** ACTIVE
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md`
- **Current task:** `phase1.stream1.task1`
- **Next action:** implement plan state parser
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md`

## Phase 1 - Parser and Validator

### Stream 1 - Plan State Parser

1. [IN_PROGRESS] `phase1.stream1.task1` Add parser for `codeai-plan-state` block.
   - scope: `scripts/plan-orchestrator/*`, tests
   - verification: `npm run plan:validate`
   - docs: not required
   - expected commit: `feat: add plan state parser`
2. [TODO] `phase1.stream1.commit1` Git Commit: `feat: add plan state parser` (hash: TBD)
````

Rules:

- scripts own the JSON state block;
- scripts own status/hash/current pointer;
- agent may edit task descriptions only before implementation begins or through approved planning update;
- every task id is stable;
- every implementation task has exactly one paired commit item.

---

## 7. AGENTS.md Changes

Remove the session report lifecycle as an active rule:

- no required search for latest `doc/Sessions/SessionXXX.md`;
- no `Execution Scope Status` recovery from session report;
- no requirement to read commit list from session report;
- no creation of new `SessionXXX.md` at closeout.

Replace with:

1. At session start, read `doc/TODO/todo-plan.md`.
2. If status is `ACTIVE`, follow its `Recovery Pack`.
3. If status is `NONE`, read base SSOT and discuss new scope.
4. If status is `BLOCKED`, run `npm run plan:status` and follow blocker instructions.
5. Never manually update task statuses or commit hashes. Use Plan Orchestrator commands.
6. Never run `git commit` directly while active plan is `ACTIVE`; use `npm run plan:commit -- "<message>"`.
7. Closeout uses `npm run plan:closeout`, not session reports.

Existing historical `doc/Sessions/` files remain in the repository/workspace as legacy history only.

---

## 8. Migration Plan

### Phase 1 - Read-only validator

- Add plan parser/validator.
- Add `plan:status` and `plan:validate`.
- Keep current manual process.
- No hook blocking yet.

### Phase 2 - Commit orchestrator

- Add `plan:commit`.
- Add transaction debt file.
- Add `plan:repair`.
- Keep hooks advisory only.

### Phase 3 - Hook enforcement

- Wire `pre-commit`, `commit-msg`, `post-commit`, `pre-push`.
- Block direct commit while active plan is `ACTIVE`.
- Preserve existing architecture/lint/knip/dup/link gates.

### Phase 4 - AGENTS.md simplification

- Remove session report lifecycle.
- Install new plan-first recovery lifecycle.
- Replace `todo-plan.md` template.

### Phase 5 - Active plan tracking decision

- Decide whether to `git rm --cached doc/TODO/todo-plan.md` and add it to `.gitignore`.
- If active plan becomes ignored, add mandatory tracked snapshots and closeout archive flow.
- If active plan stays tracked, document two-commit hash recording model.

Recommended path: ignored active plan plus tracked snapshots/archive.

---

## 9. Risks And Controls

| Risk | Control |
| --- | --- |
| Active plan lost locally | tracked snapshots at stream/tooling-checkpoint boundaries; closeout archive |
| Branch switched with stale plan | branch/head binding plus hook blocking |
| Script crash after commit | `.git/codeai-plan-debt` plus `plan:repair` |
| Agent bypasses Orchestrator | `pre-commit` and `commit-msg` block direct commit |
| Hook becomes too strict | Phase 1/2 advisory rollout before enforcement |
| Markdown parser fragility | machine-owned JSON state block with schema version |
| False confidence about task quality | scripts require verification/docs evidence but do not decide semantic correctness |

---

## 10. Acceptance Criteria

- A new session can recover active work by reading only `doc/TODO/todo-plan.md`.
- A direct `git commit` is blocked while active plan is `ACTIVE`.
- `npm run plan:commit -- "<message>"` updates status/hash/current pointer automatically.
- Simulated crash after commit leaves `.git/codeai-plan-debt`; `plan:repair` completes recovery.
- `pre-push` blocks if plan debt or inconsistent state exists.
- `AGENTS.md` no longer describes session reports as recovery mechanism.
- Closeout archives the plan and resets `doc/TODO/todo-plan.md` without creating a session report.
