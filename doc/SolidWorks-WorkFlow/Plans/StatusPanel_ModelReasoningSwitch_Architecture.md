# Status Panel Model/Reasoning Switch - Architecture

**Status:** Implemented; targeted verification and release pending
**Date:** 2026-04-29
**Branch:** `codex/status-panel-model-switcher`
**Owner:** Oleksandr + Codex
**Current version:** `1.2.111`

---

## 1. Problem

The Session Status Panel already renders two button-shaped chips under the input panel:

- current provider model;
- current reasoning/thinking level.

Before this scope, those chips were intentionally read-only. Users could change default provider model/reasoning only through Project Manager Settings. That changed `~/.codeai-hub/settings/settings.json`, but did not provide an ergonomic next-turn switch directly inside an active session.

The required behavior:

1. A user clicks the model chip.
2. UI shows available models for the current provider only.
3. User selects a model.
4. The card closes, the chip updates, settings are persisted, and the next user turn uses that model.
5. A user clicks the reasoning/thinking chip.
6. UI shows valid reasoning/thinking levels for the current provider and selected model.
7. User selects a level.
8. The chip updates, settings are persisted, and the next user turn uses that level.

Provider switching is out of scope for this panel.

---

## 2. Existing Contracts

The current architecture already separates global defaults from logical-session identity:

- `~/.codeai-hub/settings/settings.json` is the source of truth for provider defaults and new-session seed.
- `Session.modelBinding` is the source of truth for an already-created logical session.
- `modelId` means full effective identity, including reasoning/thinking modifiers.
- live Settings saves must not rewrite existing bound/runtime sessions by themselves.

Therefore a status-panel selection must do two operations:

1. persist the provider setting, so future new sessions use the same default;
2. explicitly replace the active session's `modelBinding`, so the next turn in this session uses the chosen identity.

Reading `settings.json` on every turn as the only model source is rejected because it would let a settings save in one session silently mutate other open sessions for the same provider.

---

## 3. Scope

### In scope

- Add model picker and reasoning/thinking picker to the Session Status Panel.
- Reuse existing provider registries and Settings state helpers.
- Persist the selected default model/reasoning to `settings.json` through the existing Core-owned `settings:save` path.
- Add a non-resend Core command that updates only `Session.modelBinding` and emits `session:model:update`.
- Keep provider fixed to the current session provider.
- Validate provider/model/reasoning compatibility before enabling choices.
- Add tests for UI option mapping, settings persistence intent, Core binding update, and provider applied-turn config.
- Update canonical docs and release artifacts.

### Out of scope

- Cross-provider switching from the status panel.
- New settings window behavior.
- Reworking workflow step provider selection.
- Changing invocation profiles beyond compatibility checks needed for current-provider model switching.
- Removing `session.modelBinding`.

---

## 4. Target Architecture

### 4.1 Shared UI module

Implemented as a small closed module under:

`src/client/ui/src/session/model-switcher/`

Implemented files:

- `session-model-switcher-facade.ts`
  - provider-neutral option resolver;
  - maps current `ModelInfo`, provider id, and Settings snapshot into model options and reasoning/thinking options;
  - filters Gemini thinking levels by selected model;
  - exposes stable value objects for picker UI.
- `session-model-picker-card.tsx`
  - compact card/popover with model options for the active provider;
  - compact card/popover with valid reasoning/thinking choices for current provider/model.

`status-panel.tsx` remains mostly presentational. It receives optional callbacks/props and renders the cards only when provided. It must not import Project Manager API directly.

### 4.2 Project Manager controller

Add a PM-side bridge module under:

`src/client/project-manager/components/sessions/`

Proposed files:

- `session-model-switch-controller.ts`
  - owns "user selection -> next Settings -> Core binding update" orchestration;
  - uses existing Settings state helpers rather than duplicating settings mutations;
  - validates active session/provider/model before sending Core commands.
- `use-session-model-switch.ts`
  - React hook that connects current session/snapshot/settings to `SessionView`;
  - exposes callbacks for model and reasoning selection.

Runtime and reopened-dialog session views should share the same hook shape. Dialog send currently carries only content, so updating `session.modelBinding` before send is the least invasive path.

### 4.3 Core command

Add a non-resend command, tentatively:

`session:model:set`

Payload:

```ts
{
  sessionId: string;
  targetModelId: string;
}
```

Behavior:

- find active session;
- resolve effective identity for the session provider using current canonical settings;
- update `Session.modelBinding`;
- emit `session:model:update` with serialized binding;
- do not resend the last user message;
- do not change provider.

Existing `dialog:switch:request` / `switch_model` remains a recovery/retry flow and keeps its resend behavior.

### 4.4 Settings persistence

No new settings fields are required for this scope.

Use existing fields:

- Claude: `providers.claude.defaultModel`, `providers.claude.thinking.enabled`, `providers.claude.thinking.effort`;
- Codex: `providers.codex.defaultModel`, `providers.codex.reasoningByModel`;
- Gemini: `providers.gemini.defaultModel`, `providers.gemini.thinkingLevelByModel`.

Ordering:

1. write settings through `settings:save`;
2. after the PM settings state receives/accepts the save, call `session:model:set` for the same session and selected base model;
3. let `session:model:update` update the visible chips.

Reasoning-only changes use the current base model and still call `session:model:set`, because reasoning/thinking is part of effective identity.

---

## 5. Compatibility Rules

### Codex

- Model list comes from `CODEX_SETTINGS_MODELS`.
- Reasoning levels come from `CODEX_REASONING_LEVELS`.
- Effective identity format remains `<baseModelId> reasoning:<level>`.

### Gemini

- Model list comes from `GEMINI_RECOMMENDED_MODELS`.
- Thinking levels must be filtered by `supportedThinkingLevels` on the selected model.
- Effective identity format remains `<baseModelId> thinking:<level>` when a level is set.

### Claude

- Model list comes from `CLAUDE_MODEL_ALIASES`.
- Reasoning picker includes `thinking off` plus enabled efforts.
- `xhigh` is accepted end-to-end by the provider-side applied-config and SDK manager paths.
- Effective identity remains `sonnet thinking:off` or `<alias> reasoning:<effort>`.

---

## 5.1. Implementation Status

Implemented in the active `v1.2.112` cycle:

- Core transport command `session:model:set` and non-resend binding mutation path.
- Provider compatibility fixes/tests for Claude `xhigh`, Codex selected `effort`, and Gemini selected thinking level.
- Shared UI model-switcher facade and picker cards.
- StatusPanel interactive model/reasoning chips with accessible dialog cards.
- Project Manager controller/hook that saves canonical Settings and updates the current logical session binding.
- Runtime and reopened-dialog SessionView wiring through the same hook.
- Canonical docs updated in `SystemArchitecture.md`, `EffectiveModelIdentity_And_Settings_SSOT.md`, and `SessionStatusPanel.md`.

Pending after this document update:

- consolidated targeted verification commit;
- release docs preparation;
- `build-all.sh`;
- `build-release.sh --use-current-version`;
- final archive of this planning-doc and todo-plan.

---

## 6. Code Surfaces To Audit/Touch

### UI and PM

- `src/client/ui/src/session/status-panel.tsx`
- `src/client/ui/src/session/session-view.tsx`
- `src/client/ui/src/session/model-info-builder.ts`
- `src/client/ui/src/app-host/use-settings-models-sync.ts`
- `src/client/project-manager/api.ts`
- `src/client/project-manager/core-stream-message-types.ts`
- `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`
- `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`
- `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`
- `src/client/project-manager/components/settings/use-project-manager-settings.ts`

### Core

- `packages/core/src/remote-bridge/session-stream-contracts.ts`
- `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts`
- `packages/core/src/remote-bridge/remote-bridge-message-router.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`
- `packages/core/src/session-model-binding/*`

### Provider last mile

- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`
- `packages/Gemini_Module/src/provider/gemini-applied-turn-config.ts`
- `packages/Claude_Module/src/provider/claude-applied-turn-config.ts`
- `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`

### Documentation

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`

---

## 7. Test Strategy

### Unit tests

- `session-model-switcher-facade` resolves provider-specific model and reasoning options.
- Gemini options are filtered per model.
- Claude `xhigh` compatibility is explicit.
- `status-panel` invokes model/reasoning callbacks and renders picker state.
- PM controller produces correct settings mutations for Claude/Codex/Gemini.
- Core `session:model:set` updates `Session.modelBinding`, emits `session:model:update`, and does not resend any message.

### Integration/behavior tests

- Existing `switch_model` recovery path still resends the last user message.
- Normal next `session:message` after `session:model:set` uses the updated binding.
- Reopened dialog mode uses the same binding update path before `dialog:send`.
- Runtime label updates from `session:model:update` and preserves binding-owned snapshots.

### Provider proof

- Codex native request capture or focused provider test verifies selected `model` and `effort` in `turn/start`.
- Gemini provider test verifies selected model and thinking level reach runtime override.
- Claude provider test verifies selected alias/thinking effort reaches SDK query options.

---

## 8. Definition of Done

- Status panel buttons are interactive for current-provider model and reasoning/thinking.
- Settings save and active-session binding update are both performed.
- Next turn uses the selected identity without requiring a new session.
- Other open sessions are not silently mutated by this selection.
- Provider compatibility tests pass.
- Canonical docs are updated.
- `doc/TODO/todo-plan.md` is completed and archived.
- Release build is produced via the project release checklist.
