# Model Invocation Profiles And Template Sync Architecture

**Status:** Accepted for execution  
**Created:** 2026-04-28  
**Owner:** Oleksandr + Codex  
**Planning source:** Session 020 discussion and follow-up clarification  

---

## 1. Problem

CodeAI Hub currently has several model invocation surfaces that grew independently:

- Codex workflow agents use `codex app-server` with a CodeAI Hub-owned workflow `baseInstructions`, App Server startup flags, and per-turn reasoning settings.
- Codex GPT translation engines use `codex exec` from `packages/translation`, with a temporary `CODEX_HOME`, translation instructions, and a different feature/config surface.
- Claude Haiku translation is provider-owned and already uses a translation-specific SDK profile.
- Provider Native Request Capture is diagnostic, but it currently captures only workflow scenarios: `Description`, `Virtual Simulation`, and `Diagram Modules`.
- Runtime templates under `~/.codeai-hub/templates` are user-editable in practice, but the current sync path can overwrite user edits during startup/update.

This makes it hard to answer and control, in one place, which instructions, flags, tools, and model parameters are applied to a model for a specific step or translation call.

---

## 2. Goals

1. Introduce a provider-neutral `ModelInvocationProfile` resolution layer.
2. Keep internal flags/tools/sandbox/approval code-owned and not user-editable.
3. Make text instructions user-editable through real `.md` templates under `~/.codeai-hub/templates`.
4. Support separate effective profiles for:
   - workflow agents by provider/model/tree/step/agent role;
   - translation engines by provider/model;
   - future Documentation Tree and Development Tree steps.
5. Move Codex GPT translation engines onto `codex app-server` with a dedicated translation profile.
6. Treat Provider Native Request Capture as diagnostic mode over real profiles, not as a separate invocation purpose.
7. Protect user-modified templates during extension updates with preserve/replace/review choices.

---

## 3. Non-Goals

- Do not let users edit process flags, tools, MCP settings, sandbox, approval policy, or process-profile keys.
- Do not introduce a separate `diagnostic` model invocation purpose.
- Do not automatically recreate provider threads/sessions when the user tries to switch to an incompatible model inside an active turn/session.
- Do not make `packages/translation` depend directly on `packages/Codex_AppServer_Module`.
- Do not design Gemini-specific invocation controls beyond keeping the contract extensible.

---

## 4. Core Terms

### 4.1. Invocation Purpose

The profile selector has only two invocation purposes:

```ts
type ModelInvocationPurpose = "workflow-agent" | "translation";
```

Provider Native Request Capture is not a purpose. It records the real provider-native request for one selected profile.

### 4.2. Diagnostic Capture Scenario

Settings -> General -> Provider Native Request Capture should expose scenarios:

```text
Description
Virtual Simulation
Diagram Modules
Translation
```

The scenario maps to a real profile:

```text
Description        -> purpose="workflow-agent", tree="documentation", stepId="description"
Virtual Simulation -> purpose="workflow-agent", tree="documentation", stepId="virtual_simulation"
Diagram Modules    -> purpose="workflow-agent", tree="documentation", stepId="diagram_modules"
Translation        -> purpose="translation"
```

Capture must show what would actually be sent for that workflow step or translation profile.

### 4.3. Model Invocation Selector

The resolver input should be explicit and small:

```ts
interface ModelInvocationSelector {
  readonly providerId: "codex" | "claude" | "gemini";
  readonly modelId: string;
  readonly purpose: "workflow-agent" | "translation";
  readonly tree?: "documentation" | "development";
  readonly stepId?: string;
  readonly agentRole?: string;
}
```

`tree`, `stepId`, and `agentRole` are required only for workflow-agent profiles.

---

## 5. Profile Shape

The effective profile should be split by lifecycle boundary.

### 5.1. Process Profile

Code-owned, not user-editable:

- App Server process args / startup flags.
- MCP/tool enablement.
- sandbox/approval defaults.
- process pool key.

For Codex this is a hard boundary because tool surfaces are controlled at `codex app-server` process startup.

### 5.2. Session Profile

Mixed code-owned plus text-template-owned:

- base/system/developer instruction text;
- project-doc policy;
- history persistence;
- step-specific instruction fragments;
- translation-specific instruction fragments.

Text fragments can be user-editable `.md` templates. Flags and controls remain code-owned.

### 5.3. Turn Profile

Turn-level applied model controls:

- model;
- reasoning effort / thinking level;
- summary mode;
- output schema when applicable.

---

## 6. Effective Profile Contract

The resolver returns an effective profile:

```ts
interface EffectiveModelInvocationProfile {
  readonly selector: ModelInvocationSelector;
  readonly processProfileKey: string;
  readonly compatibleModelIds: readonly string[];
  readonly processProfile: {
    readonly approvalPolicy?: string;
    readonly sandbox?: string;
    readonly toolProfileKey: string;
  };
  readonly sessionProfile: {
    readonly baseInstructions: string;
    readonly config?: Record<string, unknown>;
    readonly persistExtendedHistory: boolean;
  };
  readonly turnProfile: {
    readonly effort?: string | null;
    readonly summary?: "detailed" | "none" | null;
    readonly omitSummary?: boolean;
  };
}
```

The actual TypeScript shape may be narrower per provider, but the boundary must preserve this lifecycle split.

---

## 7. Compatibility Rule For In-Turn Model Changes

Inside a current step/session/turn surface, CodeAI Hub should offer only models compatible with the current process/session profile.

A compatible model must keep:

- the same provider;
- the same `processProfileKey`;
- the same tool/MCP/flag profile;
- the same sandbox/approval policy;
- the same session-level system instructions;
- the same history/session behavior.

Changing to an incompatible profile is allowed only when starting a new session/step. This scope should not implement automatic thread recreation for incompatible in-turn model changes.

---

## 8. Text Template Boundary

User-editable template files may contain only text.

Allowed:

- workflow system instruction text;
- step instruction fragments;
- translation system instruction text;
- reference/help/artifact template text.

Not allowed:

- flags;
- tool enablement;
- MCP settings;
- sandbox;
- approval policy;
- process profile keys;
- arbitrary JSON/YAML parameter bags.

Suggested user template layout:

```text
~/.codeai-hub/templates/
  invocation/
    codex/
      workflow-agent.system.md
      translation.system.md
    claude/
      workflow-agent.system.md
      translation.system.md
  workflow_steps/
    documentation/
      description.system.md
      virtual_simulation.system.md
      diagram_modules.system.md
    development/
      <future-step>.system.md
```

Existing step templates such as `description/description-collector-prompt.md`, `virtual_simulation/virtual-simulation-prompt.md`, and `diagram_modules/diagram-modules-prompt.md` remain valid. Migration into system-layer fragments can happen incrementally.

---

## 9. Codex Profiles

### 9.1. Workflow Agent Profile

Current behavior should be preserved first:

- process flags remain the current documentation workflow App Server flags;
- `thread/start.baseInstructions` starts from the current `CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT`;
- `config.project_doc_max_bytes = 0`;
- `persistExtendedHistory = true`;
- workflow prompt remains the first user prompt until a later step-fragment migration is explicitly implemented.

### 9.2. Translation Profile

Codex GPT Translation Engines should move from `codex exec` to a provider-owned App Server translation service:

- `processProfileKey = "codex:translation"`;
- strict tool-disabled process profile, at least as restrictive as workflow;
- isolated temporary workspace;
- `approvalPolicy = "never"`;
- `sandbox = "read-only"`;
- `persistExtendedHistory = false`;
- translation-specific `baseInstructions`;
- `config.project_doc_max_bytes = 0`;
- `effort = "low"`;
- `summary = "none"` for non-Spark;
- summary omitted for `gpt-5.3-codex-spark`.

The old `CodexCliTranslationEngine` can remain as fallback until the App Server path is validated.

---

## 10. Claude And Gemini Mapping

Claude should use the same conceptual selector and profile contract:

- workflow-agent profiles map to SDK `systemPrompt`, tools, setting sources, thinking controls, and per-turn options;
- translation profiles map to translation-specific `systemPrompt`, `tools: []`, disabled thinking, and one-turn behavior.

Gemini keeps the same conceptual slots in the contract, but detailed Gemini implementation is deferred.

---

## 11. Provider Native Request Capture

Capture must consume the effective real profile:

- workflow scenarios use the workflow-agent profile for the selected step;
- translation scenario uses the translation profile;
- no `diagnostic` purpose is introduced.

For Codex, capture should keep using isolated temporary App Server processes and proxy env, but choose thread/start and turn/start payloads from the selected effective profile.

For `Translation`, capture can use a fixed small translation sample. The capture artifact must record that the scenario is `translation`, the selected provider/model, and the effective invocation profile metadata.

---

## 12. Protected Template Sync

Current `TemplateSyncService` overwrites existing files when bundled content differs. That must change before editable invocation templates are treated as a user feature.

Add a sync state file:

```text
~/.codeai-hub/templates/.template-sync-state.json
```

Track per-template metadata:

```json
{
  "id": "virtual-simulation-prompt",
  "category": "workflow_step_instructions",
  "path": "virtual_simulation/virtual-simulation-prompt.md",
  "installedFromVersion": "1.2.98",
  "lastBundledHash": "...",
  "lastInstalledUserHash": "...",
  "userDecision": "preserve_user",
  "status": "user_modified"
}
```

Sync rules:

1. If a file is missing, install bundled content.
2. If existing file hash equals the previous bundled hash, auto-update to the new bundled version.
3. If the user modified the file, do not overwrite it.
4. Put the new bundled candidate under `.incoming/<version>/...`.
5. Before overwrite, save a backup under `.backups/<timestamp>/...`.
6. Expose pending updates to Settings UI for explicit resolution.

Template update decisions must be grouped, not one global checkbox:

- Workflow Agent Instructions.
- Invocation System Instructions.
- Artifact Templates.
- Reference / Rules Templates.
- User Help Templates.
- Continuity Templates.

Per group/file decisions:

- preserve my edited files;
- replace with new bundled version;
- backup mine and replace;
- review file-by-file;
- per file: keep mine, use new bundled, open diff, reset later.

---

## 13. Module Boundaries

### Core

Owns:

- profile selector contract;
- settings-derived model/turn resolution;
- template sync and update state;
- translation facade composition;
- native request capture command facade and metadata;
- Settings/PM command bridge.

### Codex App Server Module

Owns:

- Codex process profile implementation;
- Codex workflow App Server session mapping;
- Codex App Server translation service;
- Codex native request capture profile mapping.

### Translation Package

Owns:

- provider-neutral translation facade and engine registry;
- fallback `CodexCliTranslationEngine` only while migration needs it;
- no direct dependency on provider runtime modules.

### UI / Project Manager

Owns:

- Settings UI controls for template update decisions;
- native request capture scenario option `Translation`;
- no persistence of capture scenario/model selectors as user defaults.

---

## 14. Verification Targets

Targeted verification during implementation:

- `npm run build --workspace=@codeai-hub/core`
- `npm run build --workspace=@codeai-hub/codex-module`
- `npm run build --workspace=@codeai-hub/translation`
- `npm run build:webview`
- `npm run typecheck:webview`
- focused Node tests for:
  - profile resolver;
  - template sync state/preserve behavior;
  - Codex App Server translation parsing/fallback;
  - native request capture translation scenario.

Husky gates remain mandatory for commits.

---

## 15. Documentation Updates Required During Implementation

When implementation changes runtime behavior, update these SSOT documents in the same commits:

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`

After the execution plan is completed, this planning document should either be archived or reduced into canonical SSOT updates.
