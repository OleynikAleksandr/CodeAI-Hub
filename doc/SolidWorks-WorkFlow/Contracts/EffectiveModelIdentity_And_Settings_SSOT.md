# Effective Model Identity And Settings SSOT - Contract (SSOT)
 
**Status:** Implemented on `main`
**Updated:** 2026-06-21
**Owner:** Oleksandr + Codex
**Last metadata audit:** 2026-06-18 on `main` (`v1.2.545`; original validation: `v1.2.101`)

---

## 1. Назначение

Этот контракт фиксирует ownership effective model identity для новой и уже существующей logical session во всём runtime stack CodeAI Hub.

Ключевая идея:

- `modelId` в transport/runtime/UI contract означает полную effective model identity, а не только base model.
- `reasoning` и `thinking` являются частью identity, а не декоративным metadata.
- persisted settings snapshot is workspace-scoped once a workspace is active: Project Manager/workflow sessions use `.codeai-hub/<workspaceSlug>/runtime/settings/settings.json`; the global `~/.codeai-hub/settings/settings.json` file is only a bootstrap/default seed for first workspace materialization or contexts without an active workspace.
- после создания logical session source of truth для next-turn identity становится `session.modelBinding`; live Settings saves не переписывают уже bound session.
- legacy `~/.codeai-hub/settings/claude.json` is not part of the supported runtime contract anymore: no live read/write path may depend on it.
- `ModelInvocationProfile` controls the provider process/session/turn envelope around that identity; it is a separate contract from effective model identity.

Этот документ применим ко всем provider-цепочкам, где Core вычисляет applied turn config и передаёт его provider runtime на следующий turn.

---

## 2. Scope

Контракт покрывает:

- resolution effective identity из explicit selection / persisted settings snapshot into `session.modelBinding`;
- creation, serialization and mutation of session-scoped model binding;
- persistence and inheritance of bound identity across continuity restore and threshold-created continuation sessions;
- delivery applied turn config от Core к provider modules;
- runtime/UI sync для label/model display;
- provider-specific last-mile adaptation без локального ownership над identity.
- compatibility between effective identity changes and the active model invocation profile.

Контракт не покрывает:

- provider-native raw reasoning stream shape;
- UI layout;
- session continuity rollout scheduling mechanics beyond preserving bound identity;
- translation/localization logic;
- provider process startup flag implementation details;
- provider debugging telemetry beyond applied identity semantics.

---

## 3. Canonical Terms

### 3.1. `baseModelId`

Provider baseline identifier, который может быть использован как часть effective identity, но не является полной identity itself.

### 3.2. `modelId`

Canonical runtime identity. Должен включать всё, что меняет фактическое поведение следующего turn-а:

- base model;
- reasoning level;
- thinking level;
- любой provider-specific payload, который реально меняет next-turn behavior.

### 3.3. `applied turn config`

Provider-neutral payload, вычисленный Core-ом из `session.modelBinding` или new-session settings seed и отправленный в provider path как authoritative next-turn instruction.

### 3.4. `settings snapshot`

Persisted user-facing settings state, из которого Core вычисляет default identity for a new session binding and presentation/localization policy. In an active workspace this is `.codeai-hub/<workspaceSlug>/runtime/settings/settings.json`. Global `~/.codeai-hub/settings/settings.json` is a seed/compat path only; it must not be treated as live Project Manager truth after workspace activation.
Provider modules могут читать local settings только как fallback/continuity helper, но не как source of truth for a bound session identity.
Settings snapshot reads may be cached only as short, path-scoped read-through snapshots. Core-owned settings save/reset/default-materialization paths must invalidate the canonical path immediately after write; provider-local fallback caches are bounded helpers and never become a second settings owner.

Provider connection settings that are intentionally global are not effective model identity. The current explicit case is native GLM: `providers.glmNative.apiKey` and `providers.glmNative.baseUrl` live in `~/.codeai-hub/settings/settings.json` so new workspaces reuse the same Z.AI connection, while workspace settings still own `defaultModel`, `reasoningEffort`, `thinkingEnabled` and reasoning display defaults for new sessions.

Provider launch surfaces are settings writers, not independent identity owners. Workflow start cards and Development Tree start/fix cards must persist selected provider/model/reasoning values through the same scoped settings path before session creation; Core then resolves the new binding from Settings. Connection settings that are globally scoped, such as native GLM `apiKey` / `baseUrl`, remain global and must not be copied into workspace launch payload truth.

Kimi and OpenCode provider settings are split by runtime:

- `providers.kimi` belongs to the native Kimi ACP/CLI provider.
- `providers.glmOpenCode` belongs to the OpenCode wrapper provider and may target `zai-coding-plan/glm-5.2` or `kimi-for-coding/k2p7`.

They must remain separate persisted defaults because they run under different provider process/session/turn envelopes: native Kimi defaults to `kimi-k2.7-code` and also supports `kimi-k2.7-code-highspeed`, while OpenCode defaults to `zai-coding-plan/glm-5.2`.

Native Kimi effective identity is the selected Kimi model id only. `providers.kimi.thinkingEnabled` is a backward-compatible legacy field that is normalized to enabled and no longer drives a Kimi CLI flag, Settings control, launch-card control, or session binding metadata. `providers.kimi.thinkingDisplaySyncEnabled` remains presentation-only and is excluded from effective identity.

Presentation-only/runtime-localization fields, such as `thinkingDisplaySyncEnabled`, `reasoningEngineId` / `reasoningLanguage` (the dedicated reasoning translation pair after the UI/Reasoning translation split) и их deprecated legacy aliases `translationEngineId` / `messagesForTheUserLanguage`, live in the same persisted settings snapshot / applied-config envelope but are intentionally excluded from effective identity resolution. Они управляют visible thinking presentation и target language for translated reasoning/thought bubbles, and must not mutate `modelId` or applied turn config identity. Both legacy aliases are threaded with the same resolved value as the canonical reasoning fields until the provider adapters finish migrating.

Claude thinking defaults are seed/default-materialization behavior, not a migration of bound sessions. When a settings snapshot is new or missing `providers.claude.thinking.enabled`, UI/Core normalization defaults it to `true` and keeps the default effort value. An explicit saved `enabled: false` remains authoritative, and existing `session.modelBinding` values are not recomputed from the new default.

### 3.5. `ModelInvocationProfile`

Provider-neutral profile resolved by Core before a provider call. It describes the provider process/session/turn envelope for a selected model and purpose:

- process profile: startup flags, tool/system-tool policy, sandbox, approval policy;
- session profile: base/system instruction stack, persistence policy, provider config overrides;
- turn profile: model, reasoning/thinking effort, summary policy, output schema and prompt payload.

Allowed purposes are only `workflow-agent` and `translation`. `diagnostic` is not a purpose; Provider Native Request Capture is a one-shot diagnostic mode over a real workflow-agent or translation profile.

### 3.6. `session.modelBinding`

Frozen logical-session identity snapshot. It contains provider id, effective `modelId`, optional `baseModelId`, reasoning/thinking metadata and timestamps. Core creates it before `session:created` from explicit create selection or Settings defaults, serializes it with `Session`, and uses it for existing turns. The only normal mutation path is explicit `switch_model`.

### 3.7. Continuity-inherited binding

Clone of an existing `session.modelBinding` assigned to a restored or threshold-created continuation session. The clone keeps provider id, effective `modelId`, optional `baseModelId`, reasoning/thinking metadata and display identity, but receives a new session key and `source = "continuity_inherited"`. It must not be recomputed from current Settings defaults.

---

## 4. Runtime Contract

### 4.1. Core owns resolution

Core обязана вычислять effective turn config through the session binding path:

- active workspace new session: resolve `session.modelBinding` from explicit selection or the workspace runtime settings file;
- unscoped/bootstrap new session: resolve `session.modelBinding` from explicit selection or the global seed `~/.codeai-hub/settings/settings.json`;
- existing session: read identity from serialized `Session.modelBinding`;
- restored session: hydrate identity from continuity index/segment `modelBinding`;
- threshold-created continuation session: clone the previous binding as a continuity-inherited binding;
- explicit switch: replace `Session.modelBinding` and broadcast the updated effective identity.

Core then:

- attaches applied config to outbound provider send path;
- emits `session:model:update` with the effective identity that the provider will actually use next;
- сохраняет публичный `modelId` как effective identity;
- не требует от UI или provider module догадок о следующем turn-е.
- if `settings.json` is absent at startup/bootstrap time, Core materializes a fresh normalized canonical snapshot there instead of falling back to any legacy filename.

### 4.2. Providers are last-mile adapters

Provider modules получают already-resolved applied turn config and may only:

- stage it into provider-native runtime shape;
- apply provider-specific compatibility adjustments;
- preserve effective identity semantics in their own logs/traces.

Provider modules must not:

- become an alternate source of truth for next-turn identity;
- derive authoritative identity from local settings reads when Core already supplied applied config;
- rewrite `modelId` back into base-model-only form.

### 4.3. UI/PM sync

Project Manager и shared UI должны отображать applied config, а не собственную догадку.

Это означает:

- label sync происходит после Core-confirmed applied config events;
- initial runtime/dialog snapshots prefer `SessionRecord.modelBinding` when present and mark the resulting `ModelInfo.source` as `binding`;
- `session:model:update` используется как runtime identity signal;
- `useSettingsModelsSync()` may refresh settings-owned snapshots only; it must preserve `binding` and `runtime` model sources.
- display logic не восстанавливает `reasoning/thinking` из локального speculation path.

### 4.4. Continuity binding persistence

Session continuity must preserve the model chosen at logical session start:

- outbound user turns store the current `session.modelBinding` into continuity segment/index data;
- if `session.modelBinding` changes after the initial continuity segment was persisted, the next outbound turn refreshes the matching latest segment's `modelBinding` instead of leaving the switch memory-only;
- dialog list and materialized runtime placeholders include the persisted binding before provider hydration;
- post-threshold rollover uses the previous session binding as the inherited binding for the new provider session;
- SDK `model_info` events may confirm compatible runtime state, but an unbound SDK/base-model event must not replace a binding-owned identity;
- changing Settings after a session starts can affect only future new sessions, not restored dialogs, existing sessions, or continuation sessions created by `Remaining context threshold (%)`.

### 4.5. Provider-specific examples

- **Codex**: `reasoningByModel` may require per-turn thread refresh, but the refresh still consumes Core-applied identity.
- **Gemini**: `thinking` входит в effective identity; `gemini-3-pro-preview thinking:high` and `gemini-3-pro-preview thinking:low` are different runtime identities.
- **Claude**: `thinking` off remains `sonnet thinking:off`, while enabled Claude turns now expose explicit effort through identities such as `sonnet reasoning:high` and `sonnet reasoning:max`; this is how Session UI learns that the next Claude turn will use a different effort level.
- **Kimi**: native Kimi ACP is model-only in CodeAI Hub. Settings/start cards/status-line model picker may choose `kimi-k2.7-code` or `kimi-k2.7-code-highspeed`; they must not show a reasoning on/off or effort picker.
- **GLM Native**: global connection settings are outside identity, while workspace defaults carry `glm-5.2` plus `thinkingEnabled` and `reasoningEffort`. UI choices are `off`, `high`, and `max`; legacy cross-provider labels must normalize before reaching runtime.

### 4.6. Model invocation profile compatibility

Effective model identity answers "what model/effective reasoning will the next turn use". `ModelInvocationProfile` answers "under which provider process/session/turn envelope will it run". Core must keep these boundaries explicit.

Runtime rules:

- model switching inside an active turn/session may offer only models whose compatible model list matches the active process/session profile;
- changing to a model that requires different startup flags, system tools, sandbox, approval policy, or session-level instruction stack requires a new logical step/session;
- workflow-agent profiles require a workflow `stepId`; translation profiles do not;
- workflow-agent profiles may resolve tree/step-specific instruction fragments for Documentation Tree and future Development Tree steps;
- translation profiles use translation-specific instructions and tool policy, not workflow step prompts; Codex translation specifically resolves to `processProfileKey = "codex:translation"` and `toolProfileKey = "codex:translation-tools-minimal"`, a code-owned minimal/residual tool policy whose actual provider-visible tool surface must be proven by native capture before any "removed tool" claim is documented;
- user-editable templates may override text instruction fragments only; flags, system tools, sandbox and approval policy remain code-owned.

### 4.7. Capture-scoped reasoning override

Provider Native Request Capture Workbench is allowed one explicit diagnostic exception: `settings:native-request-capture` may carry `reasoning?: string | null` to compare artifacts by `(step, provider, model, reasoning)` without writing persisted Settings or mutating `session.modelBinding`.

Rules:

- Core must apply this value only inside the one-shot native capture command after the normal applied-turn-config resolver has produced its snapshot.
- The override may alter the provider-facing `appliedTurnConfig` passed to `captureNativeRequest(...)` and the emitted capture artifact metadata, but it must not call settings save/update handlers and must not broadcast `session:model:update`.
- PM/UI may persist the selector as Workbench sticky state, but that sticky state is not Settings SSOT and cannot seed normal sessions.
- A missing or `null` override means "use the resolved Settings/session capture snapshot as-is".

---

## 5. Invariants

1. `settings.json` is the single source of truth for new-session defaults/seed; `session.modelBinding` is the single source of truth for an existing bound session.
2. `modelId` always means full effective identity.
3. `baseModelId` is auxiliary metadata and must not replace `modelId` in runtime contracts.
4. Reasoning/thinking changes are identity changes, not cosmetic decorations.
5. Core owns effective turn config resolution; providers only consume applied config.
6. UI must display Core-confirmed applied identity, not a locally guessed future state.
7. Provider-native runtime traces remain the proof of what was actually applied.
8. Presentation-only settings flags do not participate in effective identity resolution.
9. `~/.codeai-hub/settings/claude.json` is not an allowed fallback for normal runtime settings resolution or persistence.
10. `ModelInvocationProfile` is resolved separately from effective model identity and must not be inferred from UI labels.
11. `diagnostic` is not an invocation purpose; native request capture uses the selected workflow-agent or translation profile.
12. In-turn model switching must be filtered by process/session profile compatibility.
13. User-editable invocation templates may change instruction text only, never flags, tools, sandbox, or approval policy.
14. Live Settings saves must not rewrite existing bound/runtime session labels or outbound identities.
15. Continuity restore must hydrate `session.modelBinding` from persisted continuity data before the next user turn.
16. Threshold-created continuation sessions must inherit the previous binding and must not resolve current Settings defaults.
17. Unbound runtime/model SDK events must not overwrite an existing binding-owned UI/runtime identity.
18. Settings snapshot caches must be path-scoped, short-lived, and invalidated by Core write/reset/default-materialization paths; cache reuse is a performance detail and must not change settings ownership.
19. Capture-scoped reasoning override is a diagnostic-only exception; it may affect native capture artifacts for one command but must never write Settings, mutate `session.modelBinding`, or become a provider-local identity source.
20. Missing Claude thinking settings default to enabled for new/default snapshots only; explicit saved values and already-bound session identities remain authoritative.
21. Provider launch/start cards must persist provider/model and provider-supported reasoning selections through scoped Settings before session creation and must not pass one-shot model/reasoning payloads as a second source of truth. For Kimi, only the model selection is supported.

---

## 6. Code Map

- Core settings resolution:
  - `packages/core/src/config/index.ts`
  - `packages/core/src/config/json-file-snapshot-cache.ts`
  - `packages/core/src/config/provider-settings-snapshot.ts`
  - `packages/core/src/config/provider-turn-config-resolver.ts`
  - `packages/core/src/config/provider-defaults-resolver.ts`
  - `packages/core/src/remote-bridge/handlers/settings-persistence-service.ts`
  - `packages/core/src/session-translation/session-translation-policy-resolver.ts`
- Core session model binding:
  - `packages/core/src/session-model-binding/session-model-binding-facade.ts`
  - `packages/core/src/session-model-binding/session-model-binding-resolver.ts`
  - `packages/core/src/session-manager/index.ts`
- Core continuity binding persistence:
  - `packages/core/src/session-continuity/continuity-types.ts`
  - `packages/core/src/session-continuity/continuity-tracker.ts`
  - `packages/core/src/session-continuity/index-registry.ts`
  - `packages/core/src/session-continuity/session-continuity-facade.ts`
- Core model invocation profiles:
  - `packages/core/src/model-invocation/model-invocation-profile-resolver.ts`
- Core outbound bridge:
  - `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-flow-node-rollover.ts`
  - `packages/core/src/remote-bridge/handlers/session-continuity-materializer.ts`
  - `packages/core/src/remote-bridge/handlers/dialog-list-service.ts`
  - `packages/core/src/remote-bridge/types.ts`
- Provider adapters:
  - `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts` (consumes the applied-turn-config envelope under `CODEX_APPLIED_TURN_CONFIG_KEY` on `thread/start` / `thread/resume` / `turn/start`)
  - `packages/Gemini_Module/src/provider/gemini-applied-turn-config.ts`
  - `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`
- UI sync:
  - `src/extension-module/settings/settings-storage.ts`
  - `src/client/ui/src/session/model-info-builder.ts`
  - `src/client/ui/src/session/helpers.ts`
  - `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`
  - `src/client/ui/src/app-host/use-settings-models-sync.ts`

---

## 7. Related Docs

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
