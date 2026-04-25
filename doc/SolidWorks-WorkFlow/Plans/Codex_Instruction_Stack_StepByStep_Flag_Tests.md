# Codex Instruction Stack Step-by-Step Flag Tests

**Status:** approved for execution  
**Date:** 2026-04-25  
**Branch:** `codex/claude-instruction-stack-tests`  
**Version at start:** `1.2.70`  
**Scope:** Codex App Server instruction-stack tuning through the existing Settings -> General native request capture path  
**Out of scope:** provider tool declarations, MCP/tool allowlists, sandbox policy changes, approval policy changes, normal workflow behavior outside diagnostic flag experiments

## 0. Goal

Claude instruction-stack evidence is closed in release `1.2.70`. The next goal is to reach an equivalent level of control for Codex App Server: understand which App Server flags can remove irrelevant provider/project instruction noise and which flags can inject a narrow CodeAI Hub workflow-agent frame without changing the system tool contract.

This scope is intentionally step-by-step. We test one new Codex flag or one minimal flag combination at a time.

Update after the first X8 retest: the native capture artifact did not include the provider-home rollout records where Codex stores `turn_context.user_instructions` and the `AGENTS.md` response item. Before testing any instruction flag, the diagnostic artifact itself must be fixed so a single `.jsonl` / `.md` shows the full Codex request context. The next release is therefore an observability baseline release with **no instruction-stack flag enabled**.

For every tested flag:

1. Codex changes the diagnostic capture path only.
2. Codex builds a new release package.
3. User installs/runs the package and creates a new native request capture log.
4. Codex analyzes the new `.jsonl`, `.md`, and provider-home rollout JSONL.
5. Codex records whether the flag works, is partial, is a no-op, is rejected, or is unsafe.
6. Only after that do we choose the next flag.

Normal workflow defaults must not change until the evidence says which Codex mechanism is safe.

## 1. Baseline Evidence From 2026-04-25 Capture

Input logs:

- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T07-09-11-514Z-codex-native-request.jsonl`
- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T07-09-11-514Z-codex-native-request.md`
- provider-home rollout path from `thread/start` response: `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/04/25/rollout-2026-04-25T09-09-14-019dc378-9c4e-79b2-bd96-55970ae0aaef.jsonl`

Observed baseline:

- `thread/start` request currently sends `cwd`, `approvalPolicy`, `sandbox`, `model`, `persistExtendedHistory`.
- `thread/start` does not send `baseInstructions`, `developerInstructions`, or `config`.
- `thread/start` response reports `instructionSources` containing `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/AGENTS.md`.
- Native `response.create.instructions` is the default Codex base prompt, length about `14732`, sha256 `478e8a11b180adb2659f21aba51744711f79f665039bb0bc4a13d3c051fcb76c`.
- Provider-home rollout `turn_context.user_instructions` contains project `AGENTS.md`, length about `20885`, sha256 `5beabb3ca4f216b6f77d7b356454f7c42a289bf8da09d4510bb4cd74de210f39`, with `truncation_policy.limit = 10000`.
- Native captured WebSocket frame is an early/service frame: `input: []`, `generate: false`.
- The real workflow first user prompt is reliable in `Provider Diagnostic Context` as `codex_app_server_turn_start_request.payload.input[0].text`.
- Tool declarations are unchanged in baseline: count `18`, sha256 `da2d0ac0a715d42d58bd01c37bbe56b2770e9b0d9d197e582f9705f3408aaec0`.

Key conclusion: Codex analysis must compare three layers, not only the native WebSocket body:

- App Server diagnostic context: `thread/start`, `thread/resume`, `turn/start`.
- Native provider request: `response.create.instructions`, `tools`, early/full frame shape.
- Provider-home rollout JSONL: `base_instructions`, `turn_context.user_instructions`, `collaboration_mode`.

Current diagnostic requirement: the capture artifact must embed the provider-home rollout JSONL as `codex_provider_home_rollout_context`, so the markdown/jsonl artifact contains the full `AGENTS.md` / `user_instructions` layer without requiring manual lookup of a second file.

## 2. Test Protocol

Each flag experiment must preserve this invariant:

- workflow first user prompt remains built by CodeAI Hub and visible in `turn/start.input[0].text`;
- tool declaration count and hash stay stable unless a test is explicitly rejected as unsafe;
- approval and sandbox policy stay unchanged;
- normal workflow send path is not changed before diagnostic evidence is accepted;
- raw provider prompts remain local sensitive artifacts and are not copied into git.

For every new capture, record:

- release version / VSIX path;
- selected Codex model, reasoning effort, scenario;
- `thread/start` request and response diff;
- `turn/start` request diff;
- native `response.create.instructions` length/hash/headings;
- native tool count/hash;
- provider-home `turn_context.user_instructions` length/hash and whether it includes `AGENTS.md`;
- provider-home `collaboration_mode.settings.developer_instructions`;
- final decision: `works`, `partial`, `no-op`, `rejected`, or `unsafe`.

## 3. Flag Order

### X8 — Disable project AGENTS via inline config

Flag:

```json
{
  "config": {
    "project_doc_max_bytes": 0
  }
}
```

Target surface:

- diagnostic `thread/start` only.

Expected result:

- `thread/start` request contains `config.project_doc_max_bytes = 0`;
- `thread/start` response no longer lists project `AGENTS.md` in `instructionSources`, or lists no project instruction source;
- provider-home `turn_context.user_instructions` disappears or no longer contains project `AGENTS.md`;
- native `response.create.tools` hash remains `da2d0ac0a715d42d58bd01c37bbe56b2770e9b0d9d197e582f9705f3408aaec0`;
- workflow prompt remains in `turn/start.input[0].text`.

Decision rule:

- If X8 works, keep it as first accepted cleanup candidate.
- If X8 is rejected/no-op, test the nearest App Server/config equivalent before touching `baseInstructions`.

### X2 — Add thread developerInstructions

Flag:

```json
{
  "developerInstructions": "<short CodeAI Hub Description Agent frame>"
}
```

Target surface:

- diagnostic `thread/start` only.

Expected result:

- `thread/start` request contains `developerInstructions`;
- provider-home rollout shows a developer-role block or `collaboration_mode.settings.developer_instructions`;
- workflow prompt remains the first user message;
- native tools unchanged.

Decision rule:

- If X2 works, it becomes the preferred step-specific frame mechanism.
- If X2 is invisible or rewritten in an unsafe layer, test `collaborationMode.settings.developer_instructions` as secondary.

### X3 — Combine project-doc disable plus developerInstructions

Flag:

```json
{
  "config": {
    "project_doc_max_bytes": 0
  },
  "developerInstructions": "<short CodeAI Hub Description Agent frame>"
}
```

Expected result:

- no project `AGENTS.md` noise;
- developer frame visible;
- workflow prompt remains intact;
- tools unchanged.

Decision rule:

- If X3 works, it becomes the first practical Codex diagnostic profile candidate.

### X1 — Replace baseInstructions

Flag:

```json
{
  "baseInstructions": "<minimal CodeAI Hub Codex harness>"
}
```

Expected result:

- native `response.create.instructions` changes clearly;
- provider-home `base_instructions.text` changes clearly;
- tools remain unchanged.

Risk:

- This can remove useful Codex built-in harness instructions. It must not be accepted for product use until the replacement harness explicitly preserves tool, filesystem, shell, sandbox, persistence, and response-format rules.

### Later candidates

Only after X8/X2/X3/X1 evidence:

- `thread/resume.developerInstructions`;
- `thread/resume.baseInstructions`;
- `turn/start.collaborationMode.settings.developer_instructions`;
- `thread/start.config.project_doc_fallback_filenames = []`;
- `model_instructions_file`;
- suspected include flags such as `include_environment_context`, `include_permissions_instructions`, `include_apps_instructions`, `[skills] include_instructions = false`.

## 4. Implementation Boundary

Initial code changes must stay in the diagnostic capture path:

- `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`;
- focused tests near the existing Codex native capture diagnostics tests, if present;
- docs/todo updates for each tested flag.

Do not change normal `CodexAppServerFacade.createSession`, `resumeSession`, or `sendMessage` defaults until the diagnostic evidence is accepted and a separate productization task is planned.

## 5. Release Boundary

After every flag change:

1. Commit the code/docs for that single flag.
2. Prepare release notes / docs for the future version if required by release checklist.
3. Run the repository release flow required by the project.
4. Produce a new VSIX.
5. Record the VSIX path and commit hash in `doc/TODO/todo-plan.md`.
6. Wait for user-provided native request capture logs before choosing the next flag.

## 6. Related Documents

- `doc/SolidWorks-WorkFlow/Plans/Provider_Instruction_Stack_Tuning_Tests.md`
- `doc/SolidWorks-WorkFlow/Plans/Codex_AppServer_Capabilities_Analysis.md`
- `doc/SolidWorks-WorkFlow/Plans/CrossProvider_Common_Capabilities.md`
- `doc/SolidWorks-WorkFlow/Modules/Codex.md`
- `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

## 7. Evidence Log

### X8 retest — `project_doc_max_bytes = 0`

Release:

- VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-ClaudeTests/codeai-hub-1.2.71.vsix`
- Implementation commit: `6c3755d5f test: add codex project doc max bytes capture flag`
- Release commit: `15340d0ac chore: build codex project doc flag test release`

User retest logs:

- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T08-51-09-405Z-codex-native-request.jsonl`
- `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-04-25T08-51-09-405Z-codex-native-request.md`
- Provider-home rollout: `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/04/25/rollout-2026-04-25T10-51-12-019dc3d5-f6d1-7190-92d4-4a6479743c64.jsonl`

Comparison against baseline `2026-04-25T07-09-11-514Z`:

| Field | Baseline | X8 retest |
| --- | --- | --- |
| `thread/start.request.config` | absent | `{ "project_doc_max_bytes": 0 }` |
| `thread/start.response.instructionSources` | `[ "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/AGENTS.md" ]` | `[]` |
| provider-home `turn_context.user_instructions.length` | `20885` | `0` |
| provider-home `turn_context.user_instructions` includes project `AGENTS.md` | yes | no |
| native `response.create.instructions` sha256 | `478e8a11b180adb2659f21aba51744711f79f665039bb0bc4a13d3c051fcb76c` | unchanged |
| native tools count / sha256 | `18` / `da2d0ac0a715d42d58bd01c37bbe56b2770e9b0d9d197e582f9705f3408aaec0` | unchanged |
| workflow prompt length in `turn/start.input[0].text` | `12901` | `12901` |

Decision:

- `works` for its narrow target: inline App Server config `project_doc_max_bytes = 0` disables project `AGENTS.md` discovery in the diagnostic Codex native capture path.
- It does **not** change the default Codex base instructions. Native `response.create.instructions` staying identical is expected and desired for X8 because this flag only removes project/user instruction noise, not the built-in Codex harness.
- This result is not the next active baseline because the artifact required provider-home rollout lookup outside the markdown capture. Per user decision, X8 is removed from the diagnostic path before the next release. The next step is to rebuild a no-flag baseline where the markdown/jsonl artifact itself includes `codex_provider_home_rollout_context`; only after that do we resume flag testing.
