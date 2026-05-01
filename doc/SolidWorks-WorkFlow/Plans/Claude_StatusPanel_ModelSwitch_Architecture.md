# Claude Status Panel Model Switch — Planning Doc

**Status:** Draft for user review
**Owner:** Claude provider / Core / Project Manager UI
**Planning intake:** `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Planning_Intake.md`

## 1. Problem

Status Panel already renders provider-tinted model and reasoning/thinking chips. Codex sessions can use those chips to change the next-turn model/reasoning identity inside the same logical session. Claude sessions still show the chips as status-only/no-op.

The user-facing goal is to make Claude chips actionable without breaking the effective model identity contract:

- model/thinking changes must belong to the logical session, not to global Settings;
- live Settings saves must not overwrite an already bound Claude session;
- the next outbound Claude turn must receive the exact Core-confirmed model/thinking identity;
- provider-native evidence must prove what the Claude Agent SDK actually sends.

## 2. Current Facts From Context Recovery

### 2.1 Core/UI facts

- `Session.modelBinding` is the SSOT for existing session identity.
- `SessionRequestHandlerAppliedTurnConfig` already resolves `source = "session_binding"` when the current session has a binding.
- `session:model:update` is the runtime/UI signal that Project Manager must trust.
- Codex implementation already created provider-neutral Core seam types in `session-request-handler-model-switch-types.ts`, but the active public command is still Codex-specific.
- `SessionStatusPanel.md` explicitly says Claude/Gemini chips are no-op until provider strategy exists.

### 2.2 Claude provider facts

- Claude runtime uses one SDK `query(...)` invocation per user/internal turn.
- For existing provider sessions, `ClaudeSDKManager.buildQueryOptions(...)` passes `resume = session.sessionId`.
- Current next-turn model comes from applied turn config first:
  - `readAppliedClaudeModelId(turnOptions)` -> `options.model`;
  - otherwise workspace default.
- Current next-turn thinking comes from applied turn config first:
  - `thinkingEnabled=true` -> `thinking: { type: "adaptive", display: "summarized" }` plus `effort`;
  - `thinkingEnabled=false` -> `thinking: { type: "disabled" }`;
  - otherwise settings snapshot fallback.
- Claude sessions keep `settingSources: []`, so filesystem settings/`CLAUDE.md` must not become a hidden identity owner.
- Claude model aliases in UI are currently `sonnet`, `opus`, `haiku`; Anthropic resolves the latest concrete model behind the alias.

### 2.3 Existing implementation gap

The shared UI/Core registry exposes Claude thinking effort `xhigh`, but Claude provider runtime readers currently accept only `low | medium | high | max` in:

- `packages/Claude_Module/src/provider/claude-applied-turn-config.ts`
- `packages/Claude_Module/src/session/types.ts`
- `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`

This planning scope must not ignore that drift. Either `xhigh` is proven provider-safe and threaded through the Claude provider, or the Claude picker must not offer it for targets where runtime will silently downgrade/drop it.

## 3. Decision

Implement Claude Status Panel switching as a **config-only next-turn session binding mutation**, not as an in-flight SDK runtime mutation.

The baseline path:

1. User selects Claude alias and thinking mode/effort in Status Panel.
2. Core validates the target against a Claude capability registry.
3. Core atomically replaces `Session.modelBinding` with:
   - provider `claudeCodeCli`;
   - `baseModelId = target alias`;
   - effective `modelId = "<alias> thinking:off"` or `"<alias> reasoning:<effort>"`;
   - `thinkingEnabled`;
   - optional `reasoningEffort`.
4. Core broadcasts `session:model:update` immediately.
5. Core does **not** call `adapter.sendMessage` during switch.
6. The next user turn uses existing outbound dispatch:
   - applied config source is `session_binding`;
   - Claude SDK query options receive `model`, `thinking`, and `effort`;
   - `resume` preserves the provider session if native evidence confirms this is safe.

Why not `Query.setModel(...)` as the primary design:

- Current CodeAI Hub Claude architecture is one `query(...)` per turn, not one long-lived streaming-input query per dialog.
- After a turn completes, there is no durable `Query` object that represents the next idle turn.
- Switching through `query(... options ...)` matches the existing architecture and the effective model identity contract.
- `Query.setModel(...)` remains a future option only if CodeAI Hub later redesigns Claude around streaming input / long-lived query instances.

## 4. Claude Same-Session Strategy

### 4.1 Proposed same-session definition

"Same-session switch" for Claude means:

- same CodeAI Hub logical `Session.id`;
- same `dialogId` / dialog history;
- same Claude provider session id where `resume` is available;
- next Claude `query(...)` carries the new `model` and `thinking/effort` options while also carrying `resume = previous provider session id`.

No user-message replay is triggered by the switch itself.

### 4.2 Required native evidence

Before release, implementation must prove the baseline with native capture or provider-home JSONL evidence:

- Start or resume a Claude session on `sonnet` with thinking enabled.
- Switch to `opus` with a different effort.
- Send the next user turn.
- Verify the provider request has the target `model` and `thinking/effort`.
- Verify the request still resumes the intended session/history path.
- Switch thinking off and verify `thinking: disabled` is sent.
- Verify no filesystem settings source reappears in the SDK request.

If native evidence shows the SDK ignores changed `model` or thinking on `resume`, the implementation plan must switch to a fallback design before code is shipped.

### 4.3 Fallback if same-session evidence fails

Fallback is a separate provider-session handoff, not a silent retry:

- keep the same visible dialog only if the handoff path can preserve history safely;
- otherwise create a new Claude provider session and bootstrap with a provider-neutral transcript packet;
- do not mutate old provider JSONL/history in place;
- do not hide the behavior behind the same "same-session" UX copy.

This fallback is not the baseline implementation. It exists only as a documented decision point if the evidence disproves resume-with-new-options.

## 5. Capability Registry

Claude needs a runtime/provider registry plus UI mirror, similar in shape to the accepted Codex precedent but with Claude-native semantics.

### 5.1 Runtime registry

New provider-owned file:

- `packages/Claude_Module/src/types/claude-model-capabilities.ts`

Export through:

- `packages/Claude_Module/src/types/index.ts`
- `packages/Claude_Module/src/index.ts`

Proposed descriptor:

```ts
interface ClaudeModelCapabilities {
  readonly modelId: "sonnet" | "opus" | "haiku";
  readonly displayName: string;
  readonly supportsThinking: boolean;
  readonly thinkingEffortOptions: readonly ClaudeThinkingEffort[];
  readonly defaultThinkingEffort: ClaudeThinkingEffort;
  readonly supportsThinkingDisplaySummarized: boolean;
}
```

Initial expected policy, pending native evidence:

- all aliases support `thinkingEnabled=false`;
- all aliases support `low | medium | high | max`;
- `xhigh` is allowed only if native evidence proves provider/runtime acceptance and the provider code is updated to carry it without downgrading;
- if `xhigh` is kept as "Opus only; fallback elsewhere", that fallback must be explicit in the registry and visible in tests.

### 5.2 UI mirror

Existing `src/types/claude-model-registry.ts` should either:

- mirror the runtime registry fields and get alignment tests, or
- become a thin UI descriptor layer generated from / tested against runtime model ids.

The UI must not offer a thinking effort that Core/provider will discard.

## 6. Core Contract

### 6.1 Command shape

Use a provider-specific public command for this scope:

- `session:claude:model-switch`

Reasoning:

- Codex already shipped `session:codex:model-switch`.
- Claude is the first additional provider strategy, but Gemini remains unverified.
- A public generic `session:model-switch` can be introduced after Claude is accepted and the shared command semantics are proven across at least two providers.

Payload:

```ts
interface ClaudeModelSwitchRequestPayload {
  readonly sessionId: string;
  readonly targetModelId: "sonnet" | "opus" | "haiku";
  readonly targetReasoningEffort?: ClaudeThinkingEffort;
  readonly thinkingEnabled: boolean;
}
```

### 6.2 Handler behavior

New handler:

- `packages/core/src/remote-bridge/handlers/session-request-handler-claude-model-switch.ts`

Behavior:

1. Resolve session by `sessionId`.
2. Ignore/log if provider is not `claudeCodeCli`.
3. Validate target via provider-owned Claude capabilities.
4. Build `Session.modelBinding` atomically.
5. Call `SessionManager.setModelBinding(...)`.
6. Broadcast `session:model:update` synchronously.
7. Stop. No resend, no provider adapter call.

No Claude equivalent of Codex `pendingModelSwitchInjection` is required in the baseline.

### 6.3 Existing Core pieces to reuse

- `SessionRequestHandlerAppliedTurnConfig.resolveFromSessionBinding(...)`
- `buildProviderEffectiveModelId(...)`
- `SessionModelBinding` persistence/continuity path
- `session:model:update`
- Status Panel PM callback plumbing

### 6.4 Core pieces that need change

- Generalize provider-neutral switch seam types so Claude can use `thinkingEnabled` and `ClaudeThinkingEffort`, not Codex-only `CodexModelSwitchReasoningEffort`.
- Add validator entry in `incoming-message-validator.ts`.
- Add router scope guard in `remote-bridge-message-router.ts`.
- Add handler owner wiring in `session-request-handler.ts`.
- Add tests proving switch does not call adapter send.

## 7. Claude Provider Contract

### 7.1 Applied config consumption

The provider must consume the binding-derived applied config without falling back to settings:

- `modelId/baseModelId` -> SDK `options.model`;
- `thinkingEnabled=false` -> SDK `options.thinking = { type: "disabled" }`;
- `thinkingEnabled=true` -> SDK `options.thinking = { type: "adaptive", display: "summarized" }`;
- `reasoningEffort` -> SDK `options.effort`.

### 7.2 Required provider fixes

Implementation must reconcile Claude effort types across:

- `src/types/claude-model-registry.ts`
- `packages/core/src/config/provider-defaults-resolver.ts`
- `packages/core/src/remote-bridge/handlers/settings-request-handler-claude-thinking.ts`
- `packages/core/src/config/provider-turn-config-resolver.ts`
- `packages/Claude_Module/src/provider/claude-applied-turn-config.ts`
- `packages/Claude_Module/src/session/types.ts`
- `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`

The accepted invariant from `Modules/Claude.md` says effort whitelist updates must move in lockstep. This scope must preserve that rule.

### 7.3 Native request capture

Existing Claude native capture already mirrors selected model and applied thinking options. This scope should extend it or add a Core integration probe so capture can prove **post-switch next-turn** behavior, not only Settings-card diagnostic behavior.

## 8. UI Contract

### 8.1 Status Panel behavior

For Claude sessions:

- model chip opens a Claude model picker (`Sonnet`, `Opus`, `Haiku`);
- reasoning/thinking chip opens a Claude thinking picker;
- thinking picker includes `Off` plus registry-approved efforts;
- selecting a model preserves current thinking mode/effort if target supports it;
- selecting an effort implies `thinkingEnabled=true`;
- selecting `Off` sets `thinkingEnabled=false` and clears effort in the binding.

For Codex sessions, current behavior remains unchanged.

For Gemini sessions, chips remain no-op/disabled until a Gemini strategy exists.

### 8.2 UI files

Expected touchpoints:

- `src/client/ui/src/session/status-panel.tsx`
- `src/client/ui/src/session/status-panel-model-picker.tsx`
- `src/client/ui/src/session/session-view.tsx`
- `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`
- `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`
- `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`
- `src/client/project-manager/api.ts`
- `src/client/project-manager/core-stream-message-types.ts`

The current picker is Codex-shaped. It should be generalized by provider or split into provider-specific option builders while keeping the visual component stable.

## 9. Persistence / Restart Semantics

Baseline inherits the accepted Codex trade-off:

- switch then PM reload while Core stays alive: binding survives in memory and UI update survives through runtime state;
- switch then next user turn: binding is persisted through normal continuity dispatch;
- switch then Core restart before next user turn: binding can be lost if it has not reached continuity storage yet.

This pre-turn restart gap is accepted for this scope unless user review requires persistence-before-turn. If fixed now, it must be a shared Core switch persistence follow-up, not a Claude-only sidecar.

## 10. Test Plan

- **Runtime registry unit:** Claude aliases known; unsupported aliases rejected; effort options match provider policy.
- **UI/runtime registry alignment:** UI mirror and provider runtime registry contain the same Claude aliases and compatible thinking effort options.
- **Core handler unit:** validates target, mutates `Session.modelBinding`, broadcasts `session:model:update`, does not call adapter send.
- **Applied config unit:** after switch, next outbound turn config has `source = "session_binding"`, target `modelId/baseModelId`, `thinkingEnabled`, and `reasoningEffort`; Settings defaults do not overwrite it.
- **Claude provider unit:** `ClaudeSDKManager.buildQueryOptions(...)` sends target `model`, `thinking`, and `effort` from applied turn config, including thinking off.
- **Effort parity tests:** `xhigh` is either threaded end-to-end or not offered; no silent drop.
- **PM/UI component tests:** Claude model and thinking selections dispatch the Claude switch command; non-Claude guard prevents accidental Codex/Gemini dispatch.
- **Native capture / provider-home evidence:** post-switch next turn proves actual Claude request carries selected model/thinking and keeps isolation (`settingSources: []`).
- **Targeted builds:** `npm run build --workspace=@codeai-hub/claude-module`, `npm run build --workspace=@codeai-hub/core`, `npm run build:project-manager`, `npm run typecheck:webview` as applicable.

## 11. Risks

1. **SDK resume semantics unknown until native evidence.** If `resume` ignores changed model/thinking, same-session strategy must stop.
2. **`xhigh` drift.** UI/Core currently know `xhigh`, but Claude provider readers do not. This can silently misrepresent selected thinking depth unless fixed or hidden.
3. **Alias resolution opacity.** `sonnet`/`opus`/`haiku` resolve to latest concrete models upstream; provider-home/native capture is the only proof of applied concrete behavior.
4. **Thinking display vs thinking identity.** `thinkingDisplaySyncEnabled` is presentation-only and must not be changed by Status Panel model switch unless explicitly designed.
5. **Over-generalizing public transport.** A generic public switch command before Gemini strategy could create misleading product surface.
6. **Pre-turn restart gap.** Same accepted Codex gap remains unless a shared persistence mechanism is added.

## 12. Non-goals

- Cross-provider switch / handoff.
- Gemini model/thinking switch.
- In-flight turn mutation.
- Long-lived Claude streaming input redesign.
- Runtime `Query.setModel(...)` integration.
- Session history sanitization or provider JSONL rewrite.
- User-facing changes to global Claude Settings.
- Release build before implementation todo-plan is approved.

## 13. Definition Of Done For This Scope

The implementation scope can be considered complete only when:

1. Claude Status Panel model/thinking picker changes the next-turn Claude identity for the same logical session.
2. Core emits immediate `session:model:update` and the UI updates without waiting for provider response.
3. Next Claude turn uses `source = "session_binding"` and ignores changed Settings defaults for that existing session.
4. Native evidence proves the Claude SDK request carries the selected model and thinking options.
5. Thinking off and at least one enabled effort are both verified.
6. `xhigh` is either supported end-to-end or not offered.
7. Codex behavior remains unchanged.
8. Gemini remains no-op/disabled with no misleading dispatch.
9. SSOT docs are updated in the same commits as code.
10. Release build is produced and user visual acceptance passes before closeout.
