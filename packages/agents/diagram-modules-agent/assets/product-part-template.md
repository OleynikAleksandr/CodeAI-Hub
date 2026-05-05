# Product Part: Local Runtime

## Identity

| Field | Value |
| ----- | ----- |
| Part ID | `example-local-runtime` |
| Product Part | `Local Runtime` |
| Purpose | Runs the main orchestration and workspace processing logic |

## Purpose

Runs the main orchestration and workspace processing logic.
The runtime coordinates staged workflow execution, workspace-level lifecycle and provider session bridging.

## Owned Clusters

### `runtime-orchestration`

**Purpose:** Coordinates staged workflow execution and workspace-level lifecycle.

| `module-id` | Responsibility |
| --- | --- |
| `workflow-step-runner` | Executes the active workflow step and routes staged transitions |
| `workflow-state-store` | Persists current workflow progress and staged artifact readiness |

## Standalone Modules

| `module-id` | Responsibility |
| --- | --- |
| `provider-session-bridge` | Connects provider turns with the runtime session lifecycle |

## Simple Relations

| From | To | Type | Label |
| --- | --- | --- | --- |
| `workflow-step-runner` | `workflow-state-store` | async-event | workflow-step-result |
| `workflow-state-store` | `provider-session-bridge` | async-event | workflow-state-snapshot |

## Assumptions / Open Questions

- This staged file is the semantic source of truth for one materialized Product Part.
- Keep ownership lists synchronized with the nested Cluster and standalone Module blocks.
- Relations are optional and should stay sparse; do not block the file on cross-part wiring.

<!--
Language rule:
- The runtime `Workflow runtime language contract` is authoritative for user-facing prose language.
- Descriptive prose in this artifact follows the configured `Artifacts for the User` language, not the language of examples or internal instructions.
- Keep Product Part, Cluster, and Module names/titles in canonical English.
- Keep ids, DSL headers, field names, file names, and staged status tokens exactly as defined by the staged contract.
- Translate only descriptive prose such as Purpose, Responsibility, notes, assumptions / open questions, and other free-text explanations.

Canonical authoring rules:
- Title line must be exactly `# Product Part: <Product Part Title>`
- File materializes exactly one Product Part
- Identity table must include Part ID (lowercase-kebab-case), Product Part, and Purpose
- Purpose section expands the one-liner from Identity into a short paragraph
- Owned Clusters section uses `### \`cluster-id\`` headers, each with a **Purpose:** line and a module table
- Standalone Modules section contains a single module table
- Module table columns: `module-id` | Responsibility
- Do not mirror sibling Product Parts; each part file owns only its subtree
- Use a cluster only for a real subsystem boundary, not as a decorative grouping
- Keep the module standalone unless there is a confirmed subsystem boundary that requires a separate cluster

Patch-friendly authoring contract:
- Keep this Markdown as UTF-8 text with LF line endings and no trailing spaces.
- Keep exactly one blank line around generated/comment or runtime `agent-fill` blocks when they are present.
- If a runtime draft contains `<!-- agent-fill -->`, replace only the sentinel line `_CODEAI_AGENT_FILL_SENTINEL: replace this line with draft content._` inside that block.
- Do not rewrite generated/comment blocks while filling user-facing prose.
-->
