# Diagram Modules Core-Orchestrated Subturns

**Status:** Approved for execution planning
**Created:** 2026-05-09
**Approved:** 2026-05-09
**Implementation status:** In execution. Core subturn progress, continuation prompts, repair diagnostics, post-turn validation trigger, input lock, UI projection, and Claude micro-fragment filtering are implemented in the active release scope.
**Owner:** Oleksandr + Codex
**Related audit:** `doc/Claude_Diagram_Modules_Provider_Audit.md`
**Retest finding:** 2026-05-09 Claude retest showed Core still emitted legacy aggregate `0/4` failure feedback during a pending single-artifact subturn when the accepted index was waiting for a Core-owned managed commit. That stale aggregate feedback reached Claude before/alongside the continuation turn and caused Claude to create all Product Part files in one turn.

## 1. Problem

`Diagram Modules` сейчас даёт провайдеру слишком крупную атомарную задачу: за один рабочий turn агент должен сформировать `product-parts.index.md` и все `product-parts/<part-id>.md`. Для быстрых и дисциплинированных provider turns это может пройти, но на Claude workflow выявилась слабая архитектурная граница:

- Core может увидеть промежуточное filesystem-состояние, пока агент ещё пишет набор файлов;
- stale acceptance feedback попадает в очередь следующего provider turn;
- агент получает поздний feedback как актуальную команду и начинает лишние исправления;
- UI показывает уже следующий reasoning до того, как пользователь видит Core feedback;
- input lock может разблокироваться между provider turn и Core feedback turn;
- пользователю трудно понять, какой конкретно Product Part сейчас принят, какой проверяется и какой требует исправления.

Даже если freshness bug исправить отдельно, текущая модель остаётся слишком крупнозернистой. Для managed workflow лучше, чтобы Core управлял последовательностью маленьких provider turns, а не просил агента самостоятельно довести весь stage до конца.

## 2. Target Decision

`Diagram Modules` должен стать Core-orchestrated staged workflow:

```text
initial turn:
  provider creates product-parts.index.md only
  provider stops with readiness note
  Core validates index, commits, updates UI/tree

continuation turn 1:
  Core asks provider to materialize only product-parts/<first-id>.md
  provider writes only that file and stops
  Core validates, commits, updates UI/tree

continuation turn N:
  Core repeats the same loop for the next planned Product Part

finalization:
  Core validates aggregate 4/4 readiness
  Core unlocks downstream Diagram Modules outputs and visual map generation
```

Провайдер не выбирает следующий Product Part сам. Он выполняет только текущий `expectedArtifact`, пишет readiness note и ждёт следующего user/core message.

## 3. Prompt Contract Change

### 3.1. Initial prompt

Первый prompt остаётся содержательно богатым: Core всё ещё передаёт agent prompt, field reference, templates, upstream description/simulation context и managed workflow discipline. Но task section должен быть радикально другим:

- создать только `product-parts.index.md`;
- не создавать `product-parts/*.md`;
- не переходить к материализации Product Parts;
- не запускать Git commands;
- после записи index ответить короткой readiness note;
- ждать следующего сообщения Core от имени пользователя.

Ключевая формулировка для провайдера:

```text
This turn has exactly one target artifact:
.codeai-hub/<workspace-slug>/diagram_modules/product-parts.index.md

Do not create Product Part files in this turn.
Do not continue to the next Product Part by yourself.
When the target artifact is ready, stop and wait for Core feedback or the next Core instruction.
```

### 3.2. Continuation prompt for an accepted previous artifact

Если Core принял index или предыдущий Product Part, следующий provider turn должен начинаться как обычное user message от Core:

```text
Core accepted the previous Diagram Modules artifact.

Next target artifact:
.codeai-hub/<workspace-slug>/diagram_modules/product-parts/<part-id>.md

Materialize only Product Part "<part-id>".
Do not edit accepted Product Parts unless Core explicitly names them in this message.
Do not continue to the next Product Part.
When ready, stop with a content-readiness note.
```

### 3.3. Continuation prompt for validation failure

Если Core не принял текущий artifact, следующий turn не должен говорить "continue". Он должен быть repair turn:

```text
Core rejected the current Diagram Modules artifact.

Target artifact to repair:
.codeai-hub/<workspace-slug>/diagram_modules/product-parts/<part-id>.md

Fresh validation snapshot:
- snapshotHead: <hash>
- checkedAt: <timestamp>
- validator: <validator-name>

Errors:
1. <exact validator error>
2. <exact validator error>

Repair only this target artifact unless an error explicitly references another file.
Do not create or update the next Product Part.
When ready, stop with a content-readiness note.
```

Repair feedback must always be based on a fresh post-turn validation snapshot, not on a workflow-state poll captured while the provider was still writing.

## 4. Core State Machine

Core needs an explicit subturn state for `Diagram Modules`.

Recommended states:

```text
index_pending
index_running
index_validating
index_accepted
part_pending(<part-id>)
part_running(<part-id>)
part_validating(<part-id>)
part_accepted(<part-id>)
part_repair_pending(<part-id>)
aggregate_validating
accepted
blocked
```

Core-owned invariants:

- exactly one `expectedArtifact` is active at a time;
- provider turn may write only the current `expectedArtifact`;
- Core validates only after provider turn completion;
- Core re-reads filesystem, Git status and current HEAD immediately before sending any feedback;
- Core commits accepted artifacts before sending the next Product Part instruction;
- UI input remains locked through provider turn, Core validation, managed commit and queued Core feedback dispatch;
- downstream unlock happens only after aggregate validation succeeds from a fresh snapshot.

## 5. Artifact Progress Model

The progress snapshot should distinguish index progress from per-part progress.

Recommended shape:

```ts
type DiagramModulesSubturnProgress = {
  stage: "diagram_modules";
  activeSubturn:
    | { kind: "index"; status: "pending" | "running" | "validating" | "accepted" | "repair_pending" }
    | { kind: "product_part"; partId: string; status: "pending" | "running" | "validating" | "accepted" | "repair_pending" }
    | { kind: "aggregate"; status: "validating" | "accepted" };
  plannedPartIds: string[];
  acceptedPartIds: string[];
  nextPartId: string | null;
  expectedArtifactPath: string | null;
  lastValidation: {
    snapshotHead: string;
    checkedAt: string;
    valid: boolean;
    diagnostics: string[];
  } | null;
};
```

This model should feed:

- stage card status;
- status panel;
- development tree Product Part nodes;
- diagram map rendering;
- provider continuation prompt builder;
- recovery after restart.

## 6. UI And Development Tree Behavior

User-visible behavior should mirror the Core state machine:

- after index acceptance, the graph/tree can show all planned Product Parts as pending nodes;
- each accepted Product Part becomes a completed/available tree node;
- the active Product Part is visibly marked as running/validating/repairing;
- repair feedback appears in the dialog before the next reasoning stream;
- input remains disabled while Core validation or Core feedback turn is pending;
- user should not need to type "continue" for normal stage progression.

The stage should feel like Core is simulating a careful user who reviews one artifact at a time.

## 7. Validation And Feedback Rules

Core must keep validation executable and specific:

- `product-parts.index.md` validation reports missing/duplicate/invalid Product Part ids and malformed table/field errors.
- Product Part validation reports exact template/field/section errors for the current `part-id`.
- Aggregate validation reports accepted count, planned count, and the next missing or invalid part.
- Feedback includes `snapshotHead`, `checkedAt`, `expectedArtifactPath`, validator name and exact diagnostics.
- Feedback is suppressed if a fresh snapshot shows the artifact is already accepted.
- Feedback is suppressed if Git HEAD/progress changed since the feedback candidate was created and a fresh read no longer matches the failure.

Feedback text must tell the agent whether it is a repair turn or a wait/no-op turn. A Core-owned dirty commit gate must not be phrased as a provider formatting problem.

Retest refinement:

- A `pending` Diagram Modules Product Part subturn is never a provider failure, even when Diagram Modules-owned files are dirty because Core has not committed the accepted previous artifact yet.
- During `pending` subturns, Core must not emit aggregate `0/N`, `1/N`, `2/N`, or `3/N` failure feedback to the provider.
- Aggregate missing-artifact feedback is valid only at final aggregate validation, not between Core-orchestrated Product Part turns.
- If a continuation prompt is sent, it must explicitly state that the current target artifact is authoritative and that previous aggregate feedback or already-written sibling files do not expand the turn scope.
- The continuation prompt must tell the provider that older aggregate missing-artifact feedback is superseded for this turn, so a late or stale `0/N` message cannot make Claude create all Product Part files at once.

## 8. Implementation Streams

### Stream A. Planning and prompt contract

Scope:

- update Diagram Modules prompt builder/task section so initial turn targets only `product-parts.index.md`;
- add continuation prompt builders for accepted previous artifact and repair turn;
- add tests that assert first prompt forbids Product Part file creation.

Likely files:

- prompt pack / prompt builder for `diagram_modules`;
- Diagram Modules prompt assets;
- focused prompt builder tests.

### Stream B. Core subturn state and persistence

Scope:

- add `DiagramModulesSubturnProgress` or equivalent internal state;
- persist active subturn and accepted part ids in managed workflow control plane;
- recover next expected artifact after restart.

Likely files:

- Diagram Modules progress handler;
- managed workflow state/control-plane writer;
- focused recovery tests.

### Stream C. Post-turn validation and feedback freshness

Scope:

- move Diagram Modules acceptance/repair decisions to post-turn validation boundary;
- re-read progress/Git/current HEAD immediately before feedback dispatch;
- suppress stale feedback;
- keep input locked while Core validation/feedback is pending.

Implemented notes:

- PM no longer triggers Core acceptance validation from intermediate artifact chunks. Artifact events may refresh the diagram surface, but `workflow-state` validation/continuation starts on `turn_completed`.
- Pending Product Part state is not emitted as Core failure feedback. It is the normal handoff point for the continuation prompt builder.
- Continuation turns explicitly mark the named Product Part target as the only authoritative scope for that turn and warn that older aggregate feedback or sibling files do not expand the scope.
- Repair feedback is artifact-scoped and starts with `Core rejected the current Diagram Modules artifact`, then includes target path, `snapshotHead`, `checkedAt`, validator and exact diagnostics.
- The session input is locked synchronously on `turn_completed` before async validation and remains blocked while Core dispatches feedback or the next continuation turn.

Likely files:

- workflow state service;
- managed documentation commit helper;
- acceptance feedback service;
- session turn completion/event router tests.

### Stream D. UI progress and development tree projection

Scope:

- show pending/active/accepted Product Part nodes from Core progress;
- ensure repair feedback is rendered before next reasoning;
- keep stage card/status panel aligned with subturn state.

Implemented notes:

- `DiagramModulesProgressSnapshot` is projected into sidebar Product Part nodes: accepted parts are active, current pending part is progress, and current repair part is blocked with a repair title.
- Claude one-character or short suffix display fragments such as `.`, `ceptance.`, and `Ференс.` are filtered before they become standalone dialog cards.

Likely files:

- workflow state client types;
- development tree projection/rendering;
- session dialog/core event ordering tests.

### Stream E. Provider-specific cleanup after Core refactor

Scope:

- coalesce or filter Claude `thinking_live` fragments so one-character chunks are not separate cards;
- align Claude workflow system prompt with Codex-level stage discipline;
- keep provider prompts as a second layer, not the primary correctness mechanism.

Likely files:

- Claude content stream handler;
- Claude workflow system prompt;
- Claude stream rendering tests.

## 9. Acceptance Criteria

Functional acceptance:

- Initial `Diagram Modules` turn creates only `product-parts.index.md`.
- Core validates index, commits it, updates Product Part nodes and sends the first Product Part instruction without user typing.
- Each provider turn targets exactly one Product Part.
- If validation fails, the next turn is a repair turn for the same artifact with exact diagnostics.
- If validation succeeds, Core commits before instructing the next Product Part.
- No stale feedback can be delivered after an accepted artifact commit.
- User input remains locked across provider turn, Core validation, managed commit and queued Core feedback.
- Aggregate acceptance happens only after all planned Product Parts are accepted from a fresh snapshot.

Regression acceptance:

- Codex still completes the stage without manual continuation.
- Claude no longer receives `0/4`, `1/4`, `2/4`, `3/4` stale feedback after already valid commits.
- Dialog ordering shows Core feedback before the reasoning that reacts to it.
- One-character Claude partial messages are not rendered as standalone dialog cards.

## 10. Verification Evidence

Updated 2026-05-09:

- Core progress and acceptance feedback tests passed: `npx tsx --test packages/core/src/remote-bridge/handlers/diagram-modules-progress.test.ts packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.ts`.
- Project Manager orchestration and tree projection tests passed: `npx tsx --test src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes-progress.test.ts`.
- Claude stream fragment regression test passed: `npx tsx --test packages/Claude_Module/src/messaging/claude-stream-event-router.live-text.test.ts`.
- Affected builds passed: `npm run typecheck:webview`, `npm run build --workspace packages/Claude_Module`, `npm run build --workspace packages/core`.

## 11. Release Decision

Updated 2026-05-09:

- User explicitly approved continuing without pauses through the new release build after targeted verification.
- Release assembly may proceed for the Diagram Modules Core-orchestrated subturn scope.

## 12. Non-Goals

- Do not rely on provider self-discipline as the only guard.
- Do not ask the user to manually continue each Product Part in the normal path.
- Do not make agents run Git commands for managed artifacts.
- Do not replace executable validators with prompt-only instructions.
- Do not delay the required Core freshness/input-lock fix just because the workflow is split into smaller subturns.

## 13. Open Questions

1. Should the index acceptance commit be separate from each Product Part commit, or should Core support optional squash at final stage acceptance?
2. Should the UI expose a user override to pause between Product Parts, or should normal progression always be automatic?
3. Should accepted Product Parts become read-only for provider repair turns unless Core explicitly grants a cross-file repair?
4. Should `module-map.flow.json` be generated after index acceptance as pending graph, or only after aggregate acceptance?
