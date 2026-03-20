# System Architecture (SSOT) — SolidWorks-WorkFlow

**Scope:** каноническое описание системы CodeAI Hub целиком (уровень System).

## 0) Start here (восстановление контекста)

1. `doc/SolidWorks-WorkFlow/Docs_Index.md`
2. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
3. `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
4. `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
5. `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
6. `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
7. `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
8. `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
9. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
10. `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
11. `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
12. `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
13. `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
14. Provider modules: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
15. `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`

## 1) Компоненты системы (верхний уровень)

- **Core Orchestrator** (Node.js сервис): бизнес‑логика, turn lifecycle, routing, continuity.
- **Core Supervisor**: управление runtime, запуск/перезапуск и version attach.
- **Project Manager (CEF UI bundle)**: Workflow Tree + Sessions/Artifacts + stage/session routing UX.
- **UI bundles**: `project-manager`, `vscode-webview`.
- **CEF Launcher**: локальный клиент для Project Manager.
- **Providers**: Claude/Codex/Gemini модули (CLI/SDK контуры).

## 2) SSOT уровни (иерархия документов)

- System SSOT (этот файл): глобальные инварианты и карта.
- Cluster SSOT: `doc/SolidWorks-WorkFlow/Clusters/*`.
- Module SSOT: `doc/SolidWorks-WorkFlow/Modules/*`.
- Contract SSOT: `doc/SolidWorks-WorkFlow/Contracts/*` (точечные механизмы).

## 3) Глобальные инварианты (must-not-break)

1. **Snapshot-first lock contract**: состояние input определяется только snapshot‑сигналами (`turnState`, continuity lock flags и т.п.).
   - Канон: `WorkspaceRuntime.md`, `SessionUI_Behavior.md`, `SessionInputLock_SSOT_StateMachine.md`.
2. **Dialogs vs status split**: история/диалог (`dialogId`) независим от live status/usage (`sessionId`); routing обязателен после restart/reconnect.
   - Канон: `Dialogs_And_Continuity_Routing.md`.
3. **Session continuity**: rollover/handoff обязаны быть надёжны и не залипать UI в working.
   - Канон: `SessionContinuity.md`.
   - Threshold-driven continuity для flow/document nodes разрешён только на post-turn boundary: `token_usage` не является сигналом завершения turn-а и не может немедленно прерывать активный one-shot turn.
4. **Workflow navigation SSOT**: любой route в workflow stage (Toolbar/Tree/auto-select/dialog-intent) обязан синхронизировать `activeStage`; подсветка Toolbar, открытая session и header правой панели не могут расходиться.
   - Канон: `ProjectManager_WorkflowNavigation_SSOT.md`.
5. **Provider-home isolation**: provider state изолирован под `~/.codeai-hub/providers/<id>/home` (где применимо), без смешения с терминальным HOME.
   - Канон: provider docs в `doc/SolidWorks-WorkFlow/Modules/*`.
6. **Response-mode diagnostics split**: shaping live Codex turn-ов (`strict` / `hybrid` / `debug_raw`) не может быть единственным местом, где существует provider output; raw provider logs остаются диагностическим SSOT до любых UI/history фильтров.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`.
7. **Provider dialog segment preservation**: если provider runtime фактически отдает несколько assistant-replies внутри одного пользовательского turn-а, provider normalization layer не имеет права схлопывать их в один post-factum blob; допустим только fallback aggregate-path, когда streamed segment boundaries не были отданы вообще.
   - Канон: `doc/SolidWorks-WorkFlow/Modules/Gemini.md`.
8. **Workspace-scoped stream replay**: stateful session signals (`token_usage`, `usage_limits`), которые могут прийти до attach/rebind workspace scope, обязаны иметь replay-safe transport path после websocket connect и после смены scope; single-shot delivery для таких сигналов недопустим.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`, `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`.
9. **Provider-order-safe continuity arbitration**: Core обязан одинаково корректно обрабатывать оба event order-а (`token_usage -> turn_completed` и `turn_completed -> token_usage`); trailing usage может завершать уже начатую post-turn arbitration, а cached usage обязан быть turn-scoped и очищаться после решения.
   - Канон: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`, `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`.

## 4) Где искать правду в коде (high-signal)

- Extension entry: `src/extension.ts`
- Core: `packages/core/`
- Project Manager UI: `src/client/project-manager/`
- Shared Session UI: `src/client/ui/src/`
- General Settings response mode UI: `src/client/ui/src/components/settings/general-response-mode/`
- Provider modules: `packages/Claude_Module/`, `packages/Codex_Module/`, `packages/Gemini_Module/`
- Codex response policy runtime: `packages/Codex_Module/src/response-policy/`

## 5) Workflow Boundary (Description, 2026-03-01)

- Шаг `description` зафиксирован как single-agent file-first flow:
  - pre-submit: `questionnaire.md` + user Help,
  - post-submit: единая resume-сессия,
  - SSOT-артефакт: `Final_Description.md`.
- `Final_Description.md` должен формироваться сразу после чтения анкеты (первичный черновик), чтобы пользователь обсуждал уже существующий документ.
- `Final_Description.md` должен содержать не только описание идеи, но и базу для следующего шага `virtual_simulation`:
  - 2–4 сценария (актор/цель → действие → ожидаемый результат → критерий успеха),
  - ограничения/допущения,
  - ключевые сущности/термины.
- Product-visible contract шага не использует `description.md`, manual restart или встроенный reviewer; internal compat для legacy draft допустим только как non-SSOT fallback.
- Standalone Reviewer вынесен в deferred-модуль и не входит в базовый workflow 1→6.

## 6) Runtime Templates Boundary (Description + Virtual Simulation)

Каноничные bundled templates в `.codeai-hub/templates/description/`:
- `questionnaire-template.md` — pre-submit анкета.
- `description-template.md` — user-facing Help для pre-submit и post-submit (`Artifacts/Help`).
- `description-collector-prompt.md` — инструкции Description Agent (file-first, краткий контекст workflow, ограничения, DoD).

Каноничный bundled prompt для `.codeai-hub/templates/virtual_simulation/`:
- `virtual-simulation-prompt.md` — инструкции Virtual Simulation Agent.

Инвариант: `Virtual Simulation` работает в режиме prompt-only. Отдельный artifact template (`virtual-simulation-template.md`) в runtime не поставляется и не отправляется агенту.

Канонические документы:
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`

## 6.1) Diagram DSL Artifact Boundary (Phase 1, 2026-03-16)

- Workflow шаги `Diagram Modules` и `Diagram Facades` больше не используют Mermaid `.mmd` как SSOT.
- Канонические semantic artifacts:
  - `.codeai-hub/<workspaceSlug>/diagram_modules/module-inventory.md`
  - `.codeai-hub/<workspaceSlug>/diagram_facades/facade-map.md`
- Канонические auxiliary artifacts:
  - `*.flow.json` для layout/view state;
  - `facade-map.agent-baseline.md` для facade diff/merge path.
- Agent instructions и templates для этих шагов поставляются из `packages/agents/diagram-modules-agent/assets/` и `packages/agents/diagram-facades-agent/assets/`, а не из `packages/core/src/templates/source/*.mmd`.
- Runtime обязан считать `.md` artifact единственным product-visible SSOT, а `*.flow.json` трактовать как non-semantic sidecar.

Канонические документы:
- `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`

## 6.2) Diagram Visual Shell Boundary (Phase 2, 2026-03-16)

- Project Manager для `Diagram Modules` и `Diagram Facades` теперь рендерит канонические DSL artifacts через diagram-first visual shell на базе React Flow.
- Правый panel contract для diagram stages = `Artifacts | Source | Help`:
  - `Artifacts` показывает саму диаграмму;
  - `Source` показывает read-only canonical `.md`;
  - `Help` показывает guidance по шагу.
- Visual shell не владеет semantic state:
  - source of truth остаётся `module-inventory.md` / `facade-map.md`;
  - shell работает как projection layer `Markdown DSL -> domain model -> flow nodes/edges`, но владеет только layout/view state.
- `*.flow.json` остаётся non-semantic sidecar:
  - хранит positions/viewport для visual shell;
  - пишется отдельно через `workspace-file-write`;
  - не меняет содержимое канонического `.md`;
  - не показывается пользователю как primary artifact.
- Если sidecar отсутствует или не совпадает по `Revision`, shell обязан взять стартовые координаты из собственной domain projection и затем позволить пользователю вручную корректировать layout прямо в React Flow.
- Product contract для diagram layout теперь `manual-layout first`:
  - AI/DSL задаёт semantic structure диаграммы;
  - пользовательская композиция принадлежит `*.flow.json`;
  - автоматический layout engine не определяет финальный пользовательский вид диаграммы.
- Browser/UI bundle не должен зависеть от Node-only imports ради рендера diagram artifacts; для `Revision` browser-safe parsing path может переиспользовать уже записанное поле `- Revision:` из канонического Markdown DSL.

Канонические документы:
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`

## 6.3) Module Semantic Source Boundary (Phase 3, 2026-03-16)

- `Diagram Modules` keeps semantic truth in `module-inventory.md`, not in the visible graph canvas.
- Видимый UI больше не содержит inline-редакторов для module entities и relations.
- `module-inventory.md` is the canonical semantic SSOT for `Diagram Modules`; runtime строит visual projection напрямую из inventory и не требует отдельный raw map artifact в workspace.
- Graph canvas continues to allow manual layout edits, and those changes remain in `module-map.flow.json` only.
- Provenance and merge handling stay in the agent/runtime path, not in the visible surface.

Канонические документы:
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`

## 6.4) Facade Semantic Source Boundary (Phase 4, 2026-03-16)

- `Diagram Facades` keeps semantic truth in the canonical Markdown artifact, not in the visible graph canvas.
- Видимый UI больше не содержит inline-редакторов для facade entities, methods, ports и relations.
- Semantic changes are expected to come from agent runs or direct canonical Markdown editing, then serialize back only into `facade-map.md`.
- Graph canvas continues to allow manual layout edits, and those changes remain in `facade-map.flow.json` only.
- Provenance and merge handling stay in the agent/runtime path, not in the visible surface.

Канонические документы:
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

## 6.5) Diagram Workflow Stabilization Boundary (Phase 5, 2026-03-16)

- Markdown DSL runtime обязан быть tolerant к platform-level text variance:
  - parser принимает UTF-8 BOM и CRLF line endings;
  - serializer нормализует multiline semantic blocks к canonical LF output.
- Shared diagram editor UX обязан сохранять визуальную непрерывность:
  - background refresh не должен очищать уже загруженный graph перед следующим успешным parse/load;
  - empty semantic graph обязан показывать explicit placeholder вместо silent blank canvas;
  - manual drag changes обязаны обновлять текущий React Flow canvas в реальном времени и сохраняться в `*.flow.json`;
  - visual shell не показывает auto-layout chrome или bottom-right minimap; из persistent controls остаются только drag для layout и левый нижний zoom/fit controls.
- Workflow tree child nodes для `Diagram Modules` и `Diagram Facades` обязаны наследовать актуальные stage-level `blocked/outdated` сигналы; поддеревья диаграмм не могут маскировать реальный gating state как постоянный `active`.
- Fresh toolbar bootstrap для шагов `Diagram Modules` / `Diagram Facades` обязан следовать тому же product contract, что и `Description -> Virtual Simulation`: если upstream canonical artifact уже существует, PM обязан разрешить ручной запуск следующего шага без дополнительного требования `upstream stage === completed` и без превращения `invalid/outdated` статуса upstream stage в hard blocker. Эти статусы остаются диагностическими, но не отменяют user-driven переход на следующий шаг.
- `WorkflowState` на cold start не может зависеть только от watcher-memory. При чтении `/workflow-state` Core обязан гидрировать canonical artifacts (`Final_Description.md`, `virtual-simulation.md`, `module-inventory.md`, `facade-map.md`) с диска, чтобы gating и stage snapshot оставались корректными после перезапуска Core / Project Manager.
- Diagram workflow contract не может ограничиваться только base prompt и template path. Для `diagram_modules` / `diagram_facades` runtime обязан сначала читать strict field-reference и merge-rules из synced visible templates под `~/.codeai-hub/templates/...`, а package assets использовать только как bundled-source fallback, чтобы генерируемый Markdown DSL не изобретал невалидные enum values и оставался parseable для visual shell.
- Для `Diagram Modules` canonical semantic checkpoint теперь `module-inventory.md`; downstream gating и `Diagram Facades` должны читать именно inventory, а visual graph обязан materialize cluster membership и standalone modules напрямую из него.
- Diagram workflow user surface не может подменять диаграмму raw Markdown source по умолчанию. При reopen/resume diagram stages Project Manager обязан возвращать пользователя в `Artifacts` (visual diagram), а `Source` оставлять вторичным debug view.
- Ordinary dialog reopen/recovery contract обязан сохранять identity continuity между PM, Core continuity и provider runtime. Если runtime по любой причине создает fresh provider session вместо обычного resume, новый binding должен быть immediately normalized в continuity/index до следующего outbound user turn, а PM не имеет права бесконечно повторять `createSession(old providerSessionId)` для того же continuity entry.
- `Diagram Modules` и `Diagram Facades` больше не должны навязывать пользователю inline semantic editors или bottom-right minimap. Product UX обязан опираться на:
  - AI-generated semantic structure в canonical `.md`;
  - top-level visual nodes с явными `nodeTypes`, без fake parent/child cluster nesting;
  - manual drag/editing внутри React Flow;
  - persisted user-owned positions в `module-map.flow.json` / `facade-map.flow.json`;
  - agent-driven semantic updates when new semantic content is needed.

Канонические документы:
- `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`

## 7) Codex Response Mode Boundary (2026-03-13)

- `Settings -> General` теперь владеет persisted policy `general.responsePolicy`; эта настройка не смешивается с `Core Controls`.
- Baseline default для workflow-сценариев: `hybrid`.
- `strict` оставляет editable schema/instruction contract для узких machine-readable turn-ов.
- `debug_raw` нужен для исследования новых моделей без baseline default schema pressure на обычные turn-ы.
- Raw provider rollouts и append-safe SDK JSONL являются диагностическими артефактами; dialog/history остаётся нормализованным display-слоем.
