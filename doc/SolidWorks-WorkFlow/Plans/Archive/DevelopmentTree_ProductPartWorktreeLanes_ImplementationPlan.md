# Реализация Product Part worktree lanes

**Статус:** archived completed implementation planning source, закрыт релизом `1.2.509` после user acceptance 2026-06-13.
**Родительские директивы:** `DevelopmentTree_DownstreamExecutionRefactor_Architecture.md` и `DevelopmentTree_UserGateReviewCursor_Architecture.md`.
**Цель среза:** перевести pre-code Product Part agents из main workspace в отдельные deterministic `git worktree` lanes без попытки реализовать весь будущий cluster/module/code runner.

## 1. Проблема

После принятия `Diagram Modules` Core запускает Product Part sessions параллельно в main workspace. Эти agents пока создают только документы, но всё равно загрязняют main Git working tree. Из-за этого следующий managed Documentation Tree step (`Application Skeleton` или `Quality Gates Baseline`) может быть заблокирован dirty-Git guard, хотя фактической опасности для кода ещё нет.

Branch-only модель не решает проблему: ветка изолирует историю, но не изолирует checkout/index. Для параллельной agent work нужен отдельный `git worktree`.

## 2. Цели

- Каждый planned Product Part получает отдельный lane worktree сразу после accepted `Diagram Modules`.
- Main workspace остаётся orchestration/merge surface и не получает dirty files от Product Part agents.
- Project Manager продолжает показывать Product Part sessions в основном Development Tree, даже если session физически живёт в lane worktree.
- Каждый Product Part agent создаёт `ProductPartDevelopmentBrief` в своём lane.
- User review gates предъявляются последовательно через Core-owned cursor; secondary Product Parts идут раньше lead order-plan.
- После acceptance Core последовательно переносит accepted brief из lane в main workspace как checkpoint, сохраняя lane commit provenance.
- Lead Product Part получает `DevelopmentOrderPlan.v2` turn только после accepted checkpoint всех Product Part briefs и с полным текстом briefs inline.

## 3. Вне области

- Cluster/module worktree runner.
- Генерация production code.
- Code-ready merge gates для cluster/module/code execution.
- Поддержка migration старых тестовых workspace состояний. Текущие FinderWidget-style workspace можно очищать до questionnaire и прогонять заново.
- Lane-aware dirty ownership внутри main workspace. Main не должен принимать параллельные agent writes.

## 4. Модель lane

Core создаёт для каждого Product Part deterministic branch + worktree pair.

Минимальный runtime contract:

```text
main workspace
  -> accepted Diagram Modules checkpoint
  -> Core creates product-part lanes
  -> Documentation Tree steps can continue from clean Git

product-part lane worktree
  -> agent session home
  -> ProductPartDevelopmentBrief draft
  -> local lane commits
  -> user review through main Project Manager projection

accepted checkpoint
  -> Core validates lane artifact path
  -> Core copies or merges accepted brief into main sequentially
  -> Core records provenance: part id, lane path, lane branch, lane commit
```

Первый implementation slice может использовать controlled copy + main commit вместо raw `git merge --no-ff`, если это лучше вписывается в managed commit lifecycle. Это допустимо только если checkpoint явно сохраняет lane commit hash/provenance.

## 5. Lifecycle

1. User accepts `Diagram Modules`.
2. Core reads accepted `product-parts.index.md` and planned Product Part ids.
3. Core creates one lane worktree per Product Part from the accepted main checkpoint.
4. Core dispatches Product Part brief turn in each lane.
5. Project Manager renders lane sessions under main Development Tree Product Part nodes.
6. When a lane reaches user review, Core puts the node into queued/active user gate order.
7. User accepts secondary Product Part brief first.
8. Core validates allowed output, records accepted decision, then sequentially checkpoints the accepted brief back to main.
9. After all Product Part briefs are accepted and checkpointed, Core dispatches lead `DevelopmentOrderPlan.v2` turn with inline accepted briefs.
10. Clear/undo before checkpoint removes lane worktree/branch/session state. Clear/undo after checkpoint uses Core-owned sequential revert/cleanup.

## 6. Review cursor rules

Product Part lane execution may be parallel, but user input remains sequential.

Ordering:

1. Ready non-lead Product Part brief gates.
2. Ready lead Product Part brief gate.
3. Lead `DevelopmentOrderPlan.v2` gate after all briefs are accepted/checkpointed.

Queued gates are visible but read-only. Only the active gate has user input enabled and animated attention marker. This is the same cursor model used for Documentation Tree review steps.

## 7. Clear/undo contract

Before accepted checkpoint:

- stop active provider turn if needed;
- remove lane session projection;
- remove lane worktree;
- delete lane branch if it is Core-created and unmerged;
- leave main workspace unchanged.

After accepted checkpoint:

- revert or clear the Core-owned checkpoint commit in main through existing managed Git rollback flow;
- remove lane worktree/session state after main rollback succeeds;
- never delete unrelated user branches or worktrees.

## 8. Verification

Targeted tests for this slice:

- accepting `Diagram Modules` starts every Product Part lane for any number of Product Parts;
- main `git status` remains clean immediately after Product Part lane dispatch;
- `Application Skeleton` can start while Product Part lanes are running;
- Product Part sessions are visible from the main Project Manager tree;
- secondary Product Part brief acceptance checkpoints brief into main before lead order-plan dispatch;
- lead prompt contains full inline accepted briefs;
- clear/undo removes lane state before checkpoint and reverts checkpoint after acceptance.

## 9. Implementation slicing

1. Runtime helper for deterministic Product Part lane paths, branch names, create/delete checks.
2. Bootstrap refactor: Product Part brief sessions start in lanes but project into main Development Tree.
3. Accepted brief checkpoint: sequential copy/merge to main with provenance and lead barrier integration.
4. Clear/undo lane cleanup.
5. Targeted verification and release build gate.
