# Facade Map

## Metadata
- Version: 1
- Stage: diagram_facades
- Revision: 00000000
- Updated: 2026-03-16T00:00:00Z

## Facades

### Facade: example-facade
- Id: example-facade
- Module: example-module
- Kind: class
- Visibility: public
- Methods:
  - execute(input): Output
- Ports:
  - In: http from api-gateway
- Contract Targets:
  - contracts/example-facade.md
- Code Targets:
  - packages/example-module/src/example-facade.ts
- Origin: agent
- Status: proposed
- Notes: Здесь кратко поясняется внешний смысл facade, а не детали внутренней реализации

## Facade Relations

### Facade Relation: api-gateway__sync-call__example-facade
- Id: api-gateway__sync-call__example-facade
- From: api-gateway
- To: example-facade
- Type: sync-call
- Label: POST /execute
- Origin: agent
- Status: proposed
- Notes: Показывайте только те facade relations, которые действительно помогают понять boundary map системы
