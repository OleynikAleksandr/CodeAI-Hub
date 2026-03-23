# Module Inventory

## Metadata
- Version: 2
- Stage: diagram_modules
- Revision: 00000000
- Updated: 2026-03-23T00:00:00Z

## Product Parts

### Product Part: example-local-runtime
- Id: example-local-runtime
- Title: Local Runtime
- Purpose: Runs the main orchestration and workspace processing logic.
- Clusters:
  - runtime-orchestration
- Standalone Modules:
  - provider-session-bridge
Notes:
This staged file should materialize exactly one Product Part. Do not mirror sibling Product Parts here.

### Cluster: runtime-orchestration
- Id: runtime-orchestration
- Title: Runtime Orchestration
- Purpose: Coordinates staged workflow execution and workspace-level lifecycle.
- Product Part: example-local-runtime
- Modules:
  - workflow-step-runner
  - workflow-state-store
Notes:
Use a cluster only for a real subsystem boundary, not as a decorative grouping.

#### Module: workflow-step-runner
- Id: workflow-step-runner
- Kind: service
- Title: Workflow Step Runner
- Responsibility: Executes the active workflow step and routes staged transitions.
- Product Part: example-local-runtime
- Cluster: runtime-orchestration
- Inputs:
  - workflow-step-request
- Outputs:
  - workflow-step-result
- Contract Targets:
  - contracts/workflow-step-runner.md
- Code Targets:
  - packages/example-local-runtime/
- Origin: agent
- Status: proposed

#### Module: workflow-state-store
- Id: workflow-state-store
- Kind: store
- Title: Workflow State Store
- Responsibility: Persists current workflow progress and staged artifact readiness.
- Product Part: example-local-runtime
- Cluster: runtime-orchestration
- Inputs:
  - workflow-step-result
- Outputs:
  - workflow-state-snapshot
- Contract Targets:
  - contracts/workflow-state-store.md
- Code Targets:
  - packages/example-local-runtime/
- Origin: agent
- Status: proposed

### Module: provider-session-bridge
- Id: provider-session-bridge
- Kind: adapter
- Title: Provider Session Bridge
- Responsibility: Connects provider turns with the runtime session lifecycle.
- Product Part: example-local-runtime
- Inputs:
  - workflow-state-snapshot
- Outputs:
  - provider-turn-dispatched
- Contract Targets:
  - contracts/provider-session-bridge.md
- Code Targets:
  - packages/provider-session-bridge/
- Origin: agent
- Status: proposed
Notes:
Keep the module standalone unless there is a confirmed subsystem boundary that requires a separate cluster.

## Simple Relations

### Relation: workflow-step-runner__async-event__workflow-state-store
- Id: workflow-step-runner__async-event__workflow-state-store
- From: workflow-step-runner
- To: workflow-state-store
- Type: async-event
- Label: workflow-step-result
- Criticality: medium
- Origin: agent
- Status: proposed

### Relation: workflow-state-store__async-event__provider-session-bridge
- Id: workflow-state-store__async-event__provider-session-bridge
- From: workflow-state-store
- To: provider-session-bridge
- Type: async-event
- Label: workflow-state-snapshot
- Criticality: low
- Origin: agent
- Status: proposed

## Assumptions / Open Questions
- This staged file is the semantic source of truth for one materialized Product Part.
- Keep ownership lists synchronized with the nested Cluster and standalone Module blocks.
- Relations are optional and should stay sparse; do not block the file on cross-part wiring.

<!--
Authoring checklist before finalizing:
- Header stays exactly '# Module Inventory'
- File contains exactly one Product Part block
- Product Part Clusters list matches nested Cluster blocks
- Product Part Standalone Modules list matches standalone Module blocks
- Every Cluster and Module declares the same Product Part as its owner
-->
