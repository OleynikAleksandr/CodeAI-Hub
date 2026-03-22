# Module Inventory

## Metadata
- Version: 2
- Stage: diagram_modules
- Revision: 00000000
- Updated: 2026-03-21T00:00:00Z

## Product Parts

### Product Part: example-ide-shell
- Id: example-ide-shell
- Title: IDE Shell
- Purpose: Даёт пользователю вход в продукт из IDE
- Clusters:
  - example-user-workspace
- Standalone Modules:
  - activity-timeline
- Notes: Здесь при необходимости кратко поясняется ownership; списки `Clusters` и `Standalone Modules` должны совпадать с вложенными блоками ниже

### Cluster: example-user-workspace
- Id: example-user-workspace
- Title: User Workspace
- Purpose: Координирует вход пользователя в проектный workspace и работу внутри него
- Product Part: example-ide-shell
- Modules:
  - workspace-intake
  - workspace-session-state
- Notes: Здесь можно кратко пояснить, почему это реальная subsystem boundary, а не декоративная группа

#### Module: workspace-intake
- Id: workspace-intake
- Kind: service
- Title: Workspace Intake
- Responsibility: Запускает и проверяет вход пользователя в workspace
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

#### Module: workspace-session-state
- Id: workspace-session-state
- Kind: store
- Title: Workspace Session State
- Responsibility: Хранит текущее состояние workspace session в понятном и согласованном виде
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

### Module: activity-timeline
- Id: activity-timeline
- Kind: adapter
- Title: Activity Timeline
- Responsibility: Показывает пользователю понятную timeline важных событий вне workspace subsystem
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
- Notes: Оставляйте module standalone, пока нет подтверждённой причины группировать его в отдельный cluster

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
- Этот inventory — semantic source of truth шага; runtime layout строится отдельно.
- Если верхний ownership contour уже понятен, materialize-ьте его как реальный `Product Part`, а не прячьте в notes или декоративные boundaries.

<!--
Authoring checklist before finalizing:
- Product Part header matches Product Part Id
- Product Part Clusters list exactly matches nested Cluster blocks
- Product Part Standalone Modules list exactly matches standalone Module blocks directly inside that Product Part
- Every Cluster declares the same Product Part as its owner
- Every Module declares Product Part and, when applicable, Cluster consistent with its position
-->
