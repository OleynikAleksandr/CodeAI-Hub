# Effective Model Identity And Settings SSOT - Contract (SSOT)

**Status:** Implemented on `main`
**Updated:** 2026-04-28
**Owner:** Oleksandr + Codex
**Validated on:** `main` (`v1.1.854`)

---

## 1. Назначение

Этот контракт фиксирует ownership effective model identity для новой и уже существующей logical session во всём runtime stack CodeAI Hub.

Ключевая идея:

- `modelId` в transport/runtime/UI contract означает полную effective model identity, а не только base model.
- `reasoning` и `thinking` являются частью identity, а не декоративным metadata.
- persisted settings snapshot в `~/.codeai-hub/settings/settings.json` остаётся source of truth для defaults/seed на новую session и для presentation-only flags.
- после создания logical session source of truth для next-turn identity становится `session.modelBinding`; live Settings saves не переписывают уже bound session.
- legacy `~/.codeai-hub/settings/claude.json` is not part of the supported runtime contract anymore: no live read/write path may depend on it.
- `ModelInvocationProfile` controls the provider process/session/turn envelope around that identity; it is a separate contract from effective model identity.

Этот документ применим ко всем provider-цепочкам, где Core вычисляет applied turn config и передаёт его provider runtime на следующий turn.

---

## 2. Scope

Контракт покрывает:

- resolution effective identity из explicit selection / persisted settings snapshot into `session.modelBinding`;
- creation, serialization and mutation of session-scoped model binding;
- delivery applied turn config от Core к provider modules;
- runtime/UI sync для label/model display;
- provider-specific last-mile adaptation без локального ownership над identity.
- compatibility between effective identity changes and the active model invocation profile.

Контракт не покрывает:

- provider-native raw reasoning stream shape;
- UI layout;
- session continuity rollout mechanics;
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

Persisted user-facing settings state, из которого Core вычисляет default identity for a new session binding and presentation/localization policy.
Provider modules могут читать local settings только как fallback/continuity helper, но не как source of truth for a bound session identity.

Presentation-only/runtime-localization fields, such as `thinkingDisplaySyncEnabled` and `messagesForTheUserLanguage`, live in the same persisted settings snapshot / applied-config envelope but are intentionally excluded from effective identity resolution. Они управляют visible thinking presentation и target language for translated reasoning/thought bubbles, and must not mutate `modelId` or applied turn config identity.

### 3.5. `ModelInvocationProfile`

Provider-neutral profile resolved by Core before a provider call. It describes the provider process/session/turn envelope for a selected model and purpose:

- process profile: startup flags, tool/system-tool policy, sandbox, approval policy;
- session profile: base/system instruction stack, persistence policy, provider config overrides;
- turn profile: model, reasoning/thinking effort, summary policy, output schema and prompt payload.

Allowed purposes are only `workflow-agent` and `translation`. `diagnostic` is not a purpose; Provider Native Request Capture is a one-shot diagnostic mode over a real workflow-agent or translation profile.

### 3.6. `session.modelBinding`

Frozen logical-session identity snapshot. It contains provider id, effective `modelId`, optional `baseModelId`, reasoning/thinking metadata and timestamps. Core creates it before `session:created` from explicit create selection or Settings defaults, serializes it with `Session`, and uses it for existing turns. The only normal mutation path is explicit `switch_model`.

---

## 4. Runtime Contract

### 4.1. Core owns resolution

Core обязана вычислять effective turn config through the session binding path:

- new session: resolve `session.modelBinding` from explicit selection or `~/.codeai-hub/settings/settings.json`;
- existing session: read identity from serialized `Session.modelBinding`;
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

### 4.4. Provider-specific examples

- **Codex**: `reasoningByModel` may require per-turn thread refresh, but the refresh still consumes Core-applied identity.
- **Gemini**: `thinking` входит в effective identity; `gpt-5.3-codex reasoning:xhigh` и `gpt-5.3-codex reasoning:high` are different runtime identities.
- **Claude**: `thinking` off remains `sonnet thinking:off`, while enabled Claude turns now expose explicit effort through identities such as `sonnet reasoning:high` and `sonnet reasoning:max`; this is how Session UI learns that the next Claude turn will use a different effort level.

### 4.5. Model invocation profile compatibility

Effective model identity answers "what model/effective reasoning will the next turn use". `ModelInvocationProfile` answers "under which provider process/session/turn envelope will it run". Core must keep these boundaries explicit.

Runtime rules:

- model switching inside an active turn/session may offer only models whose compatible model list matches the active process/session profile;
- changing to a model that requires different startup flags, system tools, sandbox, approval policy, or session-level instruction stack requires a new logical step/session;
- workflow-agent profiles require a workflow `stepId`; translation profiles do not;
- workflow-agent profiles may resolve tree/step-specific instruction fragments for Documentation Tree and future Development Tree steps;
- translation profiles use translation-specific instructions and tool policy, not workflow step prompts; Codex translation specifically resolves to `processProfileKey = "codex:translation"` and `toolProfileKey = "codex:translation-tools-minimal"`, a code-owned minimal/residual tool policy whose actual provider-visible tool surface must be proven by native capture before any "removed tool" claim is documented;
- user-editable templates may override text instruction fragments only; flags, system tools, sandbox and approval policy remain code-owned.

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

---

## 6. Code Map

- Core settings resolution:
  - `packages/core/src/config/index.ts`
  - `packages/core/src/config/provider-turn-config-resolver.ts`
  - `packages/core/src/config/provider-defaults-resolver.ts`
  - `packages/core/src/remote-bridge/handlers/settings-persistence-service.ts`
- Core session model binding:
  - `packages/core/src/session-model-binding/session-model-binding-facade.ts`
  - `packages/core/src/session-model-binding/session-model-binding-resolver.ts`
  - `packages/core/src/session-manager/index.ts`
- Core model invocation profiles:
  - `packages/core/src/model-invocation/model-invocation-profile-resolver.ts`
- Core outbound bridge:
  - `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`
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
