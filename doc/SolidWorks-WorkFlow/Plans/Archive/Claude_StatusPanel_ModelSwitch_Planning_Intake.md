# Claude Status Panel Model Switch — Planning Intake

**Status:** Active planning intake for next session
**Owner:** next planning session
**Purpose:** create the full Claude provider planning-doc and then slice the implementation todo-plan.

## Why this intake exists

The Codex Status Panel model/reasoning switch scope is closed and accepted in release `1.2.118`. The next provider target is Claude. The goal is not to copy Codex behavior blindly, but to reuse the proven Core/UI seams and re-derive the provider-native Claude strategy from Claude SDK evidence.

## Required context for the next planning session

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
- `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- `doc/SolidWorks-WorkFlow/Plans/Claude_Agent_SDK_Capabilities_Analysis.md`
- `doc/SolidWorks-WorkFlow/Plans/CrossProvider_Common_Capabilities.md`
- `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_StatusPanel_ModelSwitch_Architecture.md`
- `doc/TODO/Archive/todo-plan-codex-status-panel-model-switch.md`

## Codex precedents to reuse

- Status Panel UI chips and picker placement are already implemented in `src/client/ui/src/session/status-panel.tsx` and `status-panel-model-picker.tsx`.
- PM/runtime/dialog callback plumbing already exists for Codex and can be generalized only after Claude strategy is specified.
- Core already has provider-neutral switch seam types and session-binding/applied-config ownership patterns.
- Same-session switching must keep `Session.modelBinding` as the next-turn identity source and must not fall back to Settings defaults.

## Codex precedents not safe to copy as-is

- Codex uses App Server `turn/start` payloads and `<model_switch>` injection; Claude uses the Anthropic Claude Agent SDK and must be verified separately.
- Codex reasoning is `effort` + `summary`; Claude visible thinking uses Claude-specific thinking controls and UI visibility semantics.
- Codex Spark taught that "omit unsupported provider-native field" can be wrong when the provider runtime defaults it back. Claude planning must verify provider-native defaults, not infer them.

## Required output of the next planning session

1. Create `doc/SolidWorks-WorkFlow/Plans/Claude_StatusPanel_ModelSwitch_Architecture.md`.
2. Define Claude model/thinking capability registry requirements.
3. Define whether Claude supports same-session model/thinking switch or needs a new provider session / resume handoff.
4. Define native request capture evidence needed before implementation.
5. Define exact Core/UI reuse points and Claude-specific files.
6. After user approval, replace the intake todo with a full implementation `doc/TODO/todo-plan.md`.

## Non-goals for this intake

- No Claude code changes are authorized by this intake alone.
- No release build is expected until the full Claude planning-doc and implementation todo-plan are approved.
