# Module Inventory

## Metadata
- Version: 2
- Stage: diagram_modules
- Revision: 00000000
- Updated: 2026-03-21T00:00:00Z

## Product Parts

### Product Part: example-ide-shell
- Id: example-ide-shell
- Role: shell
- Title: IDE Shell
- Purpose: Gives the user entry into the product from inside the IDE
- Clusters:
  - example-user-workspace
- Standalone Modules:
  - activity-timeline
- Notes: Product Part is the top-level ownership layer for clusters and standalone modules

### Cluster: example-user-workspace
- Id: example-user-workspace
- Title: User Workspace
- Purpose: Coordinates how the user enters, opens, and works inside a project workspace
- Product Part: example-ide-shell
- Modules:
  - workspace-intake
  - workspace-session-state
- Notes: A cluster is a real subsystem container with modules inside it, not just a visual label or a hidden ownership workaround

#### Module: workspace-intake
- Id: workspace-intake
- Kind: service
- Title: Workspace Intake
- Responsibility: Starts and validates workspace entry into the application
- Product Part: example-ide-shell
- Cluster: example-user-workspace
- Inputs:
  - user-open-workspace-request
- Outputs:
  - workspace-opened
- Contract Targets:
  - contracts/workspace-intake.md
- Code Targets:
  - packages/example-user-workspace/
- Origin: agent
- Status: proposed
- Notes: This module stays inside the cluster because it is part of the same workspace subsystem boundary

#### Module: workspace-session-state
- Id: workspace-session-state
- Kind: store
- Title: Workspace Session State
- Responsibility: Keeps the current workspace session readable and consistent for the rest of the product
- Product Part: example-ide-shell
- Cluster: example-user-workspace
- Inputs:
  - workspace-opened
- Outputs:
  - workspace-session-summary
- Contract Targets:
  - contracts/workspace-session-state.md
- Code Targets:
  - packages/example-user-workspace/
- Origin: agent
- Status: proposed

#### Module: activity-timeline
- Id: activity-timeline
- Kind: adapter
- Title: Activity Timeline
- Responsibility: Shows the user a readable timeline of important project activity outside the workspace subsystem
- Product Part: example-ide-shell
- Inputs:
  - workspace-session-summary
- Outputs:
  - timeline-updated
- Contract Targets:
  - contracts/activity-timeline.md
- Code Targets:
  - packages/activity-timeline/
- Origin: agent
- Status: proposed
- Notes: This module remains standalone because the current inventory does not justify grouping it into a larger subsystem

## Simple Relations

### Relation: workspace-intake__async-event__workspace-session-state
- Id: workspace-intake__async-event__workspace-session-state
- From: workspace-intake
- To: workspace-session-state
- Type: async-event
- Label: workspace-opened
- Criticality: medium
- Origin: agent
- Status: proposed

### Relation: workspace-session-state__async-event__activity-timeline
- Id: workspace-session-state__async-event__activity-timeline
- From: workspace-session-state
- To: activity-timeline
- Type: async-event
- Label: workspace-session-summary
- Criticality: low
- Origin: agent
- Status: proposed

## Assumptions / Open Questions
- This inventory is the semantic source of truth for the step; runtime layout is generated separately.
- If a top-level ownership contour is visible but the current DSL cannot express it directly, preserve real product parts, clusters, and modules instead of inventing decorative boundaries.
