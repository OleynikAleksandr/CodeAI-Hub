# Runtime Reliability Review Remediation — Checklist and Lessons

## Назначение

Этот документ обобщает два внешних review-пакета и два remediation/refactoring цикла, которые были выполнены по ним:

- Review A: `/Users/oleksandroliinyk/Downloads/message (1).txt`
- Review B: `/Users/oleksandroliinyk/Downloads/review.txt`
- Refactoring A: Session027 / release `1.2.103`, `Runtime_Stability_Remediation_Architecture.md`
- Refactoring B: Session034 / release `1.2.111`, `Runtime_Reliability_Followup_Architecture.md`

Цель документа — не заменить archived planning-docs, а дать будущему агенту короткую operational карту: почему второе review могло найти похожие проблемы после первого remediation, какие классы дефектов были реально закрыты, какие claims были частично неверны, и как не повторить ошибку "всё устранено" без точной границы acceptance criteria.

## Канонические ссылки

- First remediation scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Runtime_Stability_Remediation_Architecture.md`
- First execution plan: `doc/TODO/Archive/todo-plan-phase5-runtime-stability-remediation.md`
- Follow-up remediation scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Runtime_Reliability_Followup_Architecture.md`
- Follow-up execution plan: `doc/TODO/Archive/todo-plan-phase5-runtime-reliability-followup.md`
- Runtime system SSOT: `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
- Workspace/runtime contract: `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Continuity contract: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Provider recovery contract: `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`

## Timeline

### Session027 / release `1.2.103`

Original review focus:
- Project Manager WebSocket lifecycle.
- PM/Core WebSocket boundary validation.
- Hot-path synchronous settings reads.
- Provider listener cleanup and teardown ownership.
- Silent Core Bridge best-effort catches.
- Runtime factory definite-assignment bypasses.

Implemented outcome:
- PM websocket `connect()` became idempotent for `OPEN` / `CONNECTING`, and disconnect became an explicit cleanup boundary.
- PM/Core websocket frames received owner-layer validators before dispatch.
- Settings/default/translation reads moved to path-scoped short TTL caches with invalidation after writes.
- Provider session listeners were cleaned up on close/session-id changes.
- Core Bridge best-effort hydration failures became sanitized diagnostics.
- `session-request-handler-runtime-core.ts` cyclic dependencies were moved to explicit deferred refs.

Release artifact:
- `codeai-hub-1.2.103.vsix`

### Session034 / release `1.2.111`

Follow-up review focus:
- Core-side WebSocket server/socket `error` events.
- Silent startup/workspace best-effort failures.
- Runtime map/timer teardown on `dispose()` / `stop()`.
- Legacy continuity monitor triggered-state cleanup.
- Unified-session writer close lifecycle and dead queue path.
- Remaining `continuityRolloverOrchestrator!` definite-assignment bypass.
- Core Bridge reconnect notification churn.
- Separate package/dead-code/facade-boundary cleanup.

Implemented outcome:
- `WebSocketManager` now owns server/client socket `error` events and clears replay/scope maps on stop.
- Startup settings priming and workspace-session side effects now log sanitized warnings.
- `SessionRuntime.dispose()` clears per-session entries.
- `ProviderRecoveryScheduler.dispose()` clears retry timers and is wired through `ProviderRegistry.dispose()` / `CoreOrchestrator.stop()`.
- Legacy `SessionContinuityFacade` handoff state resets on terminal failure/success paths, enabling retry after failure.
- `createSessionRequestHandlerRuntime` now uses an explicit deferred ref for `continuityRolloverOrchestrator`.
- `UnifiedSessionStorage.close()` retains the in-memory entry until writer close promises settle; dead `PendingSession.queue` / `flushQueue()` path was removed.
- Browser Core Bridge websocket `error` logs diagnostics and delegates reconnect state to the existing scheduler/dedupe path.
- Low-priority dependency/dead-code/facade-boundary work was explicitly deferred to a separate PeriodicAudit-style cycle.

Release artifact:
- `codeai-hub-1.2.111.vsix`

## Why Similar Issues Remained After Session027

The Session027 remediation was real, but its scope was narrower than the later review category labels.

Key reasons:

1. **Layer mismatch.** Session027 fixed PM/Core message validation and PM websocket lifecycle; Review B checked Core `WebSocketServer` / client socket `error` event ownership, which is a different layer.
2. **Acceptance criteria were local.** Session027 removed definite-assignment bypasses in `session-request-handler-runtime-core.ts`; Review B found a remaining bypass in the outer `session-request-handler-runtime.ts` factory.
3. **Some classes were mitigated, not globally eliminated.** Settings reads were cached, but synchronous reads could still exist on cache-miss or other provider-local fallback paths. A grep-only review can still flag the pattern even after hot-path risk is reduced.
4. **Best-effort diagnostics existed in one surface, not all surfaces.** Core Bridge browser hydration catches were fixed in Session027; startup/workspace constructor side effects were separate Core-side best-effort paths.
5. **Teardown ownership was incomplete.** Provider listener cleanup and websocket client cleanup were addressed earlier; runtime maps, provider recovery retry timers, and unified-session writer close ownership were follow-up lifecycle owners.
6. **Some Review B claims were partially stale or over-broad.** `rolloverStarted` cleanup was not simply "error-only"; successful cleanup runs through `SessionContinuityLockService.finalizePostBootstrapRolloverLifecycle()`. `initializeWriter()` did not have the exact concurrent double-writer race claimed because writer assignment is synchronous before `await`. Still, adjacent close/dead-queue risks were real.

Rule for future closeout: never report "all review issues fixed" unless the report says exactly which findings are fixed, which are partially fixed, which are disproved, and which are deliberately deferred.

## Finding Matrix

| Theme | Review A / Session027 | Review B / Session034 | Current state |
| --- | --- | --- | --- |
| PM websocket lifecycle | Fixed idempotent connect and cleanup boundary | Not the main target | Closed in `1.2.103` |
| WebSocket frame validation | PM/Core validators before dispatch | Not the main target | Closed in `1.2.103` |
| Core WS error events | Not covered by first scope | Confirmed server/client `error` ownership gap | Closed in `1.2.111` |
| Sync settings I/O | Hot-path caching introduced | Pattern may still be seen by grep in bounded paths | Hot-path risk reduced; future review must inspect call path |
| Silent catches | Core Bridge browser diagnostics fixed | Startup/workspace best-effort catches confirmed | Closed in `1.2.103` + `1.2.111` by surface |
| Provider listener cleanup | Provider listener ownership fixed | Provider recovery retry timers confirmed | Closed in `1.2.103` + `1.2.111` by owner |
| Definite assignment | Runtime-core refs fixed | Outer rollover factory ref remained | Closed in `1.2.111` |
| Continuity state cleanup | Not in first scope | Legacy handoff triggered-state retry risk confirmed | Closed in `1.2.111`; production legacy handoff remains disabled |
| Unified-session lifecycle | Not in first scope | Close deletes entry before writer close; dead queue path | Closed in `1.2.111` |
| Facade/dependency/dead code | Not runtime-hardening scope | Real cleanup candidates, broad blast radius | Deferred to separate audit cycle |

## Review Triage Protocol

Use this protocol when a new review overlaps with an already completed remediation:

1. **Recover the exact old scope.** Read archived planning-doc, archived todo-plan, session report, and commit list.
2. **Classify each new claim.** Use one of: `confirmed`, `partially confirmed`, `disproved/stale`, `deferred`.
3. **Separate pattern match from runtime risk.** A grep hit is evidence, not proof. Trace ownership, lifecycle, and call frequency.
4. **Map by owner, not by keyword.** WebSocket lifecycle in PM, Core bridge, and `WebSocketServer` are separate owners.
5. **Check acceptance criteria drift.** "Definite assignment fixed" may mean one file, not the whole repo.
6. **Document deferrals explicitly.** Package dependency cleanup, dead code deletion, and facade-boundary refactors need their own planning-doc and package-lock strategy.
7. **Close with release evidence.** A remediation closeout must list targeted tests, release scripts, artifact version, and sha1 where relevant.

## Runtime Reliability Checklist

Before claiming a runtime reliability review is closed, verify:

- WebSocket owner has server-level and socket-level `error` handlers where Node `EventEmitter` semantics can crash the process.
- Invalid inbound transport frames are rejected at the owner boundary before downstream handlers.
- Best-effort startup/hydration/workspace paths either log sanitized diagnostics or have a documented reason for silence.
- Every `dispose()` / `stop()` clears owned timers, maps, replay caches, and listeners.
- Any retry scheduler has both per-key cancellation and lifecycle-wide disposal.
- Continuity state has explicit terminal cleanup for success, failure, timeout, and aborted paths.
- Writer/storage close does not delete ownership state before terminal writes/close promises settle.
- No new `!` definite-assignment assertions are introduced to bridge cyclic runtime wiring; use explicit deferred refs with clear initialization errors.
- Review claims about races are validated against actual assignment/await order.
- Low-priority cleanup is not mixed into runtime failure hardening unless it is required for the bug fix.

## Deferred Cleanup Backlog

The following items were intentionally left outside `1.2.111` and should be handled through `Checklists/PeriodicAudit.md` or a dedicated cleanup planning-doc:

- stale `lefthook` / `lint-staged` dependency entries and related lockfile impact;
- null-returning agent facade/package surfaces that require reachability proof before deletion;
- broad facade-boundary cleanup across `remote-bridge/handlers` and package `index.ts` surfaces;
- any large package/dependency cleanup that would obscure runtime regression analysis.

## Reporting Template For Future Reviews

Use this short shape in user-facing reports:

```markdown
## Scope recovered
- Previous remediation: <session/release/planning-doc>
- New review source: <file or PR/review link>

## Findings
| Finding | Status | Evidence | Action |
| --- | --- | --- | --- |
| <finding> | confirmed / partial / disproved / deferred | <file:line or doc> | <fix / no-op / new scope> |

## Why this was not already closed
- <specific scope/layer/acceptance reason>

## Verification
- <targeted tests/builds>
- <release artifact if built>
```
