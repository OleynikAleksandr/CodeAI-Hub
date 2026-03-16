# Module Map

## Metadata
- Version: 1
- Stage: diagram_modules
- Revision: 00000000
- Updated: 2026-03-16T00:00:00Z

## Modules

### Module: example-module
- Id: example-module
- Kind: service
- Title: Example Module
- Responsibility: Short one-line responsibility statement
- Inputs:
  - inbound-event
- Outputs:
  - outbound-event
- Contract Targets:
  - contracts/example-module-facade.md
- Code Targets:
  - packages/example-module/
- Origin: agent
- Status: proposed

## Relations

### Relation: source-module__sync-call__example-module
- Id: source-module__sync-call__example-module
- From: source-module
- To: example-module
- Type: sync-call
- Label: execute()
- Criticality: medium
- Origin: agent
- Status: proposed
