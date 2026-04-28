# Codex Translation-Only Profile Hardening Architecture

**Status:** Draft for discussion  
**Created:** 2026-04-28  
**Owner:** Oleksandr + Codex  
**Planning source:** follow-up to release `1.2.99` Model Invocation Profiles scope  

---

## 1. Problem

Release `1.2.99` split Codex model invocation into two profile purposes:

- `workflow-agent`;
- `translation`.

Codex GPT translation engines (`codex-gpt-5.4-mini` and `codex-gpt-5.3-codex-spark`) now go through a provider-owned App Server translation path, but the translation process profile still reuses the same disabled-tool startup args as the workflow documentation profile.

That is better than the pre-profile baseline, but not strict enough for a translation engine:

- translation calls receive source text directly in `turn/start.input`;
- the output is captured from the assistant final answer;
- the translator does not need to inspect the project, patch files, browse the web, ask the user questions, or plan work;
- provider-visible tool/system instructions create unnecessary behavioural surface and can encourage the model to behave like an agent instead of a translator.

The next scope should harden the Codex translation profile so GPT-5.4 Mini and GPT-5.3 Codex Spark behave as translation-only engines.

---

## 2. Goals

1. Make the Codex translation instructions minimal and translation-only for:
   - `gpt-5.4-mini`;
   - `gpt-5.3-codex-spark`.
2. Ensure the translation profile differs from the workflow profile at the instruction boundary.
3. Reduce provider-visible tool/system surface for translation as far as the current Codex App Server supports.
4. Treat Native Request Capture `Translation` as the verification path for the exact provider-native request.
5. Preserve current public translation engine ids:
   - `codex-gpt-5.4-mini`;
   - `codex-gpt-5.3-codex-spark`.
6. Preserve the Spark rule: omit explicit `summary` for `gpt-5.3-codex-spark`.

---

## 3. Non-Goals

- Do not change workflow-agent Codex instructions in this scope.
- Do not change Claude or Gemini translation profiles in this scope.
- Do not remove the shared `codex exec` fallback unless a later release explicitly retires it.
- Do not introduce a new invocation purpose. The purpose remains `translation`.
- Do not give users editable flags/tools/sandbox/approval controls through templates.
- Do not claim that a tool is removed unless provider-native capture proves it.

---

## 4. Current Facts

### 4.1 Release `1.2.99` baseline

Current Codex translation runtime:

- `processProfileKey = "codex:translation"`;
- `approvalPolicy = "never"`;
- `sandbox = "read-only"`;
- `persistExtendedHistory = false`;
- `config.project_doc_max_bytes = 0`;
- `effort = "low"`;
- `summary = "none"` for non-Spark;
- summary omitted for Spark.

Current source files:

- `packages/Codex_AppServer_Module/src/translation/codex-translation-prompt-profile.ts`;
- `packages/Codex_AppServer_Module/src/translation/codex-app-server-translation-service.ts`;
- `packages/core/src/translation/codex-app-server-translation-engine.ts`;
- `packages/Codex_AppServer_Module/src/diagnostics/codex-native-translation-capture-profile.ts`;
- `packages/core/src/provider-network-capture/native-request-capture-facade.ts`.

### 4.2 Current tool-profile evidence

The validated documentation workflow tool-profile experiment removed most non-workflow tools, but the remaining provider-visible tool list was:

- `exec_command`;
- `write_stdin`;
- `update_plan`;
- `request_user_input`;
- `apply_patch`;
- `web_search`;
- `view_image`.

`request_user_input` has no confirmed removal knob yet. Any attempt to remove it must be evidence-gated by fresh provider-native capture.

### 4.3 Translation does not need Read/Write tools

For the current translation engine path, file read/write tools are not required:

- the source text is passed directly in the user prompt;
- the translated text is returned as assistant output;
- the temporary workspace is an isolation boundary, not a file contract;
- localization marker preservation is a text transformation problem.

If a future artifact/document translation mode needs file-in/file-out behaviour, that should be a separate `artifact-translation` or document adapter scope, not the default short-text translation engine profile.

Therefore the target tool surface for this scope is stricter than "read/write only":

```text
Target: no provider-visible tools for translation turns.
Fallback if App Server cannot remove all tools: keep the smallest proven residual set, document it, and keep instructions explicitly tool-free.
```

---

## 5. Proposed Translation Instruction Contract

The translation system/base instructions should be short and imperative:

```text
You are a translation-only engine for CodeAI Hub.
Translate only the supplied source text into the requested target language.
Return only the translated text.
Do not answer questions, explain, summarize, add commentary, or perform workflow-agent work.
Do not use tools, shell commands, files, patches, web search, planning, or user-input requests.
Preserve placeholders, ids, Markdown structure, code spans, file paths, product/provider/model names, and localization marker lines exactly unless the surrounding natural-language text must be translated.
```

For structured localization requests, keep the existing marker rule:

```text
Preserve every line that starts with __CODEAI_HUB_LOCALIZATION_ENTRY__ exactly.
Translate only the text between START and END markers.
Do not remove, rename, reorder, or merge markers.
```

This instruction text should become the code-owned translation baseline. User-editable `.md` template fragments may add text-only translation preferences, but must not change tools, sandbox, approval policy, process profile keys, or model compatibility.

---

## 6. Tool/System Surface Hardening Strategy

### 6.1 Process profile split

Keep `codex:translation` as a separate process profile. Stop treating it as a semantic alias of `codex:workflow-documentation`.

The translation process profile should own its own startup args/config list even if some entries initially match the workflow profile.

### 6.2 Evidence-gated tool removal

Investigate the current installed Codex App Server knobs for removing translation-unneeded tools:

- shell/command execution;
- patch/file mutation;
- planning/update-plan tool;
- web search;
- image/view helper;
- `request_user_input`.

Candidate sources:

- `codex app-server generate-ts`;
- `codex features list`;
- `config/read`;
- existing `--disable ...` feature flags;
- provider-native capture JSONL before/after each proposed flag/config change.

No implementation task should state "removed tool X" until Native Request Capture proves it in `body.tools`.

### 6.3 Safe fallback if zero tools is unsupported

If Codex App Server still exposes residual tools after all supported translation-safe knobs are applied:

1. Keep `approvalPolicy = "never"` and `sandbox = "read-only"`.
2. Keep `persistExtendedHistory = false` and `project_doc_max_bytes = 0`.
3. Keep translation instructions explicitly forbidding tools.
4. Document the residual provider-visible tools in `Modules/Codex_ProviderInvocationFlags.md`.
5. Add a follow-up deferred item for upstream/tool-knob investigation.

---

## 7. Expected Code Changes

### Core / shared profile layer

- Update `packages/core/src/model-invocation/model-invocation-profile-resolver.ts` so the Codex translation profile names a strict translation tool profile, not a workflow-derived tool profile.
- Keep compatible translation models limited to:
  - `gpt-5.4-mini`;
  - `gpt-5.3-codex-spark`.

### Codex App Server module

- Update `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process-profile.ts` so `codex:translation` owns an explicit translation startup profile.
- Update `packages/Codex_AppServer_Module/src/translation/codex-translation-prompt-profile.ts` with the minimal translation-only instruction contract.
- Update `packages/Codex_AppServer_Module/src/diagnostics/codex-native-translation-capture-profile.ts` only if the diagnostic translation sample must assert the new constraints.

### Tests

- Extend translation prompt profile tests for:
  - no workflow-agent language;
  - no planning/workflow behaviour;
  - tool-free instruction wording;
  - marker preservation;
  - Spark summary omission.
- Extend Codex process profile tests for a distinct translation process profile.
- Add or update native capture tests to assert `invocationPurpose = "translation"` still nulls workflow prompt.

### Documentation

Update in the same implementation commits:

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`;
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`;
- `doc/SolidWorks-WorkFlow/Modules/Codex_ProviderInvocationFlags.md`;
- `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`;
- `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md` if profile compatibility wording changes.

---

## 8. Verification Plan

Minimum verification:

- `npx ultracite check`;
- `npm run build --workspace=@codeai-hub/codex-app-server-module`;
- `npm run build --workspace=@codeai-hub/core`;
- `npm run build --workspace=@codeai-hub/translation`;
- focused tests:
  - `node --test packages/Codex_AppServer_Module/dist/translation/codex-translation-prompt-profile.test.js`;
  - `node --test packages/Codex_AppServer_Module/dist/translation/codex-app-server-translation-service.test.js`;
  - `node --test packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-service.test.js`;
  - `node --test packages/core/dist/translation/core-translation-facade-factory.test.js`;
  - `node --test packages/core/dist/model-invocation/model-invocation-profile-resolver.smoke.test.js`.

Provider-native verification:

1. Run Settings -> General -> Provider Native Request Capture -> Codex -> `Translation`.
2. Capture both `gpt-5.4-mini` and `gpt-5.3-codex-spark`.
3. Compare:
   - `body.instructions`;
   - `body.tools`;
   - `thread/start` diagnostic context;
   - `turn/start` diagnostic context;
   - Spark summary omission.
4. Record exact remaining provider-visible tools in the final docs.

---

## 9. Open Questions For Discussion

1. Should the target be strict zero provider-visible tools for translation, even if this requires deeper Codex App Server config investigation?
2. If zero tools is not currently possible, is the temporary fallback acceptable as long as the translation instructions forbid tools and capture documents the residual set?
3. Should user-editable `invocation/codex/translation.system.md` be allowed to add domain-specific translation style rules, or should Codex translation remain code-owned only for this first hardening release?
4. Should this scope include a release build immediately, or stop after targeted builds and native capture evidence?

---

## 10. Acceptance Criteria

- GPT-5.4 Mini and GPT-5.3 Codex Spark translation profiles use translation-only instructions.
- Workflow-agent instructions do not leak into translation `thread/start` or `turn/start`.
- Translation native capture shows no workflow prompt for the `Translation` scenario.
- Provider-visible tool surface is reduced as far as proven possible, with exact evidence recorded.
- If residual tools remain, docs explicitly name them and explain why they are still present.
- Spark continues to omit explicit `summary`.
- No active `todo-plan.md` is created until this planning document is accepted.
