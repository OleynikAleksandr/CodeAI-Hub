# Session-Scoped Model Binding - Architecture Plan

**Status:** Draft for discussion  
**Created:** 2026-04-28  
**Owner:** Oleksandr + Codex  
**Scope type:** design intake before `todo-plan.md`  
**Related release baseline:** `1.2.99`

---

## 1. Problem

Session UI currently derives the model label from live Project Manager settings and later converges through `session:model:update` events. Core also resolves the outbound applied turn config from the current `~/.codeai-hub/settings/settings.json` for every send when no explicit `targetModelId` is present.

That means Settings behaves as a live global model source for already-existing workflow sessions. Product behavior must change:

- opening or starting a workflow step/session captures the selected provider model for that concrete session;
- the bottom session info panel must show that captured model for that session, even after Settings changes;
- subsequent workflow steps may bind a different model;
- future `Start Step` UX must be able to choose a model without mutating the global Settings default;
- this scope is session-scoped only, not turn-scoped.

---

## 2. Current Evidence

### UI path

- `src/client/ui/src/session/helpers.ts`
  - `createInitialSnapshot(...)` builds `status.models` from `buildModelInfoList(session.providerIds, settings)`.
- `src/client/ui/src/app-host/use-settings-models-sync.ts`
  - listens to Settings changes and rewrites snapshot model info for current sessions.
- `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`
  - hydrates every session snapshot from current settings.
  - calls `useSettingsModelsSync(sessions, settings, setSnapshots)`.
- `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`
  - dialog restore/materialization also seeds model info from current settings.
- `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`
  - applies Core `session:model:update`, but this is runtime UI state only and is not a persistent session binding.

### Core path

- `packages/core/src/session-manager/index.ts`
  - `Session` has provider/session/stage fields, but no model binding.
- `packages/core/src/remote-bridge/session-stream-contracts.ts`
  - `SerializedSession` has no model binding.
  - `session:create` payload has no model selection field.
- `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`
  - `resolveForProvider(...)` reads the current shared `settings.json` on send.
  - without `targetModelId`, source is `settings_snapshot`.
- `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`
  - broadcasts `session:model:update` from the applied config, so the label reflects the model Core just resolved.

Conclusion: a UI-only fix is insufficient. The actual provider turn must also use a session-bound identity.

---

## 3. Target Product Contract

1. Settings default model is only a seed for a new session binding.
2. A session binding stores the full effective model identity:
   - provider id;
   - base model id;
   - effective `modelId`;
   - reasoning/thinking level fields that participate in identity.
3. Existing sessions do not change model identity when Settings changes.
4. New workflow step/session creation uses either:
   - explicit session model selection from the future `Start Step` picker; or
   - current Settings default as fallback seed.
5. Session UI displays the session-bound identity.
6. Core outbound sends use the session-bound identity.
7. Explicit session model switch is the only allowed mutation path for an existing session binding.
8. ModelInvocationProfile compatibility remains enforced: in-session switching may offer only compatible models for the active provider process/session profile.

---

## 4. Proposed New Module

Create a new Core-owned module:

`packages/core/src/session-model-binding/`

Facade:

- `session-model-binding-facade.ts`
  - single external entry point for binding creation, lookup, update, serialization, and migration.

Internal responsibilities:

- resolve initial binding from Settings snapshot or explicit requested model;
- keep effective identity calculation aligned with `provider-turn-config-resolver.ts`;
- persist binding under a logical session key, not only an ephemeral runtime id;
- expose binding lookup for outbound sends;
- expose serialized binding for `session:created` and `core:state`;
- emit/broadcast model identity updates when a binding is created or explicitly changed.

Candidate data shape:

```ts
type SessionModelBinding = {
  readonly providerId: string;
  readonly baseModelId?: string;
  readonly effectiveModelId: string;
  readonly reasoningEffort?: string;
  readonly thinkingEnabled?: boolean;
  readonly thinkingLevel?: string;
  readonly source:
    | "settings_default"
    | "start_step_selection"
    | "switch_request"
    | "legacy_backfill";
  readonly boundAt: string;
  readonly updatedAt: string;
};
```

The public transport may use `modelId` for `effectiveModelId` to stay consistent with the existing contract.

---

## 5. Binding Key

The binding must survive runtime session materialization, dialog restore, stop/rebind, and continuity drift. Therefore the preferred binding key is the logical workflow/dialog identity:

- workspace root / workspace slug;
- stage id;
- run slug or session kind when present;
- provider id;
- continuity root / dialog id when known.

Runtime `session.id` can remain an index/alias, but it should not be the only persistence key. This matches the existing split where Project Manager may store snapshots under dialog ids while Core broadcasts runtime session ids.

Open design point: implementation can start with a facade that accepts both `sessionId` and logical context, then persists under the strongest available key.

---

## 6. Core Flow

### Session creation

Extend the create-session pipeline with optional model selection:

- Project Manager API payload:
  - `targetModelId?: string | null`, or
  - `modelSelection?: { providerId: string; modelId: string }`.
- Core `session:create` contract carries the same field.
- `SessionRequestHandlerSessionResolution` passes the requested selection to bootstrap.
- `SessionShellFactory` / session bootstrap asks `SessionModelBindingFacade` to create or restore the binding before `session:created` is broadcast.
- `SerializedSession` includes the binding, or Core emits an immediate binding/model update event after `session:created`.

When no explicit model is provided, the facade reads current Settings once and stores that effective identity as `settings_default`.

### Outbound sends

Change the applied-turn-config path so it can resolve by session:

- `attachToTurnOptions({ sessionId, providerId, targetModelId, turnOptions })`
- if `targetModelId` is provided, update/override through the explicit switch path;
- otherwise read `SessionModelBindingFacade.getBinding(sessionId, providerId)`;
- only if no binding exists, perform `legacy_backfill` from current Settings and store it.

The resulting `AppliedProviderTurnConfig.source` should grow beyond `settings_snapshot | switch_request`, for example:

- `session_binding`;
- `start_step_selection`;
- `legacy_backfill`;
- `switch_request`.

### Existing switch path

`SessionRequestHandlerSessionActions` already has `switch_model`. That path should become the explicit mutation path for a session binding instead of only calling provider adapter overrides and broadcasting a UI event.

---

## 7. UI Flow

### Snapshot creation

`SessionRecord` should include serialized model binding data when Core knows it. Then:

- `createInitialSnapshot(...)` prefers `session.modelBindings` over Settings;
- Settings is used only for unbound placeholders or new-session seed UI;
- `ModelInfo.source` should add a new value such as `"session"` or `"binding"`.

### Settings sync

`useSettingsModelsSync(...)` must stop rewriting bound or runtime-confirmed sessions. It can remain only for:

- unbound pending shells;
- legacy sessions with no binding yet;
- non-session settings display surfaces.

Once a session has source `"session"` / `"binding"` / `"runtime"`, Settings changes must not change its model label.

### Runtime updates

`useRuntimeModelSync(...)` remains the Core-confirmed runtime identity convergence path, but it should not be treated as a global Settings sync. It updates only the matching logical session/runtime session.

If Core emits binding data with `session:model:update`, the event should include enough source metadata for UI to avoid later Settings overwrites.

---

## 8. Future Start Step Picker

This design leaves a direct extension point for the future UX:

1. User clicks `Start Step`.
2. UI opens a model picker filtered by:
   - selected provider;
   - active `ModelInvocationProfile` compatible model list;
   - provider registry model catalog.
3. UI sends `session:create` with explicit model selection.
4. Core stores that identity as `start_step_selection`.
5. Settings defaults remain unchanged.

This should also support the current behavior with no picker: absence of explicit selection means "bind current Settings default once".

---

## 9. Persistence And Migration

New sessions:

- binding is created at session creation before the first send;
- binding is persisted alongside logical workflow/dialog session state.

Existing sessions:

- if a persisted binding exists, it wins;
- if no binding exists but a last known runtime model is available, backfill from it;
- otherwise backfill from current Settings once and mark source `legacy_backfill`.

Backfill is intentionally explicit so old sessions have deterministic behavior after upgrade instead of continuing to drift silently.

---

## 10. Verification Plan

Targeted tests:

- Core: creating session A under model X stores binding X; changing Settings to Y does not change session A outbound applied config.
- Core: creating session B after Settings changes binds Y.
- Core: `session:model:update` carries the same effective identity used by outbound send.
- Core: resume/dialog materialization keeps persisted binding instead of current Settings.
- UI: two sessions with the same provider can display different model labels simultaneously.
- UI: `useSettingsModelsSync` does not rewrite bound/runtime sessions after Settings changes.
- UI: unbound legacy/pending placeholder still has a safe fallback.

Manual scenario:

1. Set Codex model to GPT 5.3.
2. Start/open `description`.
3. Confirm bottom panel shows GPT 5.3.
4. Change Settings to GPT 5.4 mini.
5. Confirm `description` still shows GPT 5.3.
6. Start/open `virtual_simulation`.
7. Confirm `virtual_simulation` shows GPT 5.4 mini.
8. Send a message in both sessions and verify provider-native/applied config uses each bound identity.

---

## 11. Expected Implementation Streams

### Stream A - Core binding contract

- Add `session-model-binding` module/facade.
- Extend Core session serialization/create payload types.
- Add targeted tests for binding creation and serialization.

### Stream B - Applied turn config integration

- Make outbound send resolution prefer session binding over live Settings.
- Update `session:model:update` source semantics.
- Add tests proving Settings changes do not mutate old session sends.

### Stream C - PM/UI binding display

- Extend `SessionRecord` / `ModelInfo` source handling.
- Make initial snapshots prefer binding data.
- Restrict `useSettingsModelsSync` to unbound fallback cases.
- Add two-session model-label tests.

### Stream D - Docs and future picker hook

- Update `SystemArchitecture.md`, `EffectiveModelIdentity_And_Settings_SSOT.md`, `Modules/Session_UI/README.md` or panel docs.
- Document future `Start Step` explicit selection payload.
- Prepare `todo-plan.md` only after this planning doc is accepted.

---

## 12. Open Questions For Discussion

1. Binding key: confirm that the product meaning of "session" is logical workflow/dialog session, not only runtime `session.id`.
2. Existing sessions after upgrade: should legacy backfill use current Settings when no runtime proof exists, or should UI mark them as unknown until next send?
3. Explicit model switch: should existing `switch_model` be exposed as session-scoped model change in this scope, or reserved for the later `Start Step` picker work?
4. Identity scope: reasoning/thinking must freeze with the model per current SSOT; confirm that presentation-only toggles such as visible reasoning summaries remain Settings-driven and are not part of this binding.

---

## 13. Acceptance Criteria

- Settings changes no longer change model labels for existing bound sessions.
- Settings changes no longer change actual outbound model identity for existing bound sessions.
- Different workflow steps can hold different models for the same provider.
- The implementation has a facade-owned Core module instead of scattering binding state through UI controllers.
- Future `Start Step` model picker can use the same explicit model-selection payload without redesign.
- Documentation is updated before implementation commits.
