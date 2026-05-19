# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-claude-code-provider-planning-2026-05-19",
  "branch": "main",
  "baseHead": "5902a324f",
  "lastRecordedCommit": "5902a324f",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Kimi_Claude_Code_Provider_Planning_RU.md",
  "currentTaskId": "phase0-kimi-claude-code-planning-intake",
  "expectedCommitMessage": "docs: plan kimi claude code provider experiment",
  "debt": {
    "expectedCommitMessage": "docs: plan kimi claude code provider experiment",
    "preCommitHead": "5902a324f",
    "stage": "commit_pending",
    "taskId": "phase0-kimi-claude-code-planning-intake"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Kimi_Claude_Code_Provider_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading перед каждым фиксом:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Каждая подзадача должна затрагивать не более 3 файлов/пакетов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Гейты через Husky не обходить.
- Новый эксперимент называется `kimi-claude-code`: Kimi 2.6 / Kimi Code работает через Claude Code-compatible runtime/protocol, а не через Codex App Server.
- Текущий Codex-based spike уже откатан коммитом `5902a324f`; не восстанавливать `kimi-codex` код без отдельного нового решения.
- Перед product integration сначала доказать live compatibility Claude Code CLI/SDK с Kimi Code Anthropic-compatible endpoint.
- **Release Build Confirmation Gate:** после targeted verification остановиться и отдельно спросить пользователя, собирать ли release.
- `Scope Closeout` выполняется только после явного acceptance пользователя.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-05-19)
### Stream: Kimi-Claude-Code Planning Source
1. [DONE] `phase0-kimi-claude-code-planning-intake` Создать planning-документ для экспериментального провайдера `kimi-claude-code`, который использует Claude Code-compatible runtime/protocol и Kimi Code Anthropic-compatible endpoint для `kimi-for-coding`, и добавить его в Docs Index — scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Kimi_Claude_Code_Provider_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan kimi claude code provider experiment`.
2. [PENDING] Git Commit: `docs: plan kimi claude code provider experiment` (hash: TBD)

## Phase 1 — User Planning Acceptance (owner: User, updated: 2026-05-19)
### Stream: Planning Review
1. [TODO] `phase1-kimi-claude-code-planning-review` Пользователь проверяет planning-документ и подтверждает, начинать ли implementation scope или скорректировать архитектуру до нарезки задач — scope: без изменения файлов; expected commit: none.

## Phase 2 — Implementation Plan Slicing (owner: Codex, updated: 2026-05-19)
### Stream: Implementation Slicing
1. [TODO] `phase2-kimi-claude-code-implementation-slicing` Нарезать implementation scope по принятому planning-документу на микрозадачи ≤3 файлов/пакетов, включая feasibility probe, runtime shell, Core/UI integration, targeted verification, release gate, user acceptance и closeout — scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/Kimi_Claude_Code_Provider_Planning_RU.md`; expected commit: `docs: slice kimi claude code implementation plan`.
2. [TODO] Git Commit: `docs: slice kimi claude code implementation plan` (hash: TBD)

## Phase 3 — Feasibility Spike Placeholder (owner: Codex, updated: 2026-05-19)
### Stream: Claude Code Runtime Probe
1. [TODO] `phase3-kimi-claude-code-live-probe` Placeholder until Phase 2 slicing: prove Claude Code-compatible runtime can call Kimi Code Anthropic endpoint with `kimi-for-coding`, CodeAI-owned system prompt/tool policy, isolated provider home, and categorized failure output — scope: TBD by slicing; expected commit: TBD.
2. [TODO] Git Commit: `TBD` (hash: TBD)

## Phase 4 — Release Build Confirmation Gate (owner: Codex, updated: 2026-05-19)
### Stream: Release Build Confirmation Gate
1. [TODO] `phase4-kimi-claude-code-release-confirmation` Placeholder: after implementation and targeted verification, stop and request explicit user confirmation before release notes/version bump/release scripts — scope: без изменения файлов; expected commit: none.

## Phase 5 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-19)
### Stream: Native Kimi vs Kimi-Claude-Code Retest
1. [TODO] `phase5-kimi-claude-code-user-retest` Placeholder: пользователь устанавливает релиз и сравнивает native `Kimi` vs `Kimi-Claude-Code` на одинаковом workflow step — scope: без изменения файлов; expected commit: none.

## Phase 6 — Scope Closeout (owner: Codex, updated: 2026-05-19)
### Stream: Scope Closeout
1. [TODO] `phase6-kimi-claude-code-closeout` Placeholder: после явного acceptance архивировать active plan, disposition planning source, обновить Docs Index и связанные ссылки — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive, doc/SolidWorks-WorkFlow/Plans, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close kimi claude code provider experiment scope`.
2. [TODO] Git Commit: `docs: close kimi claude code provider experiment scope` (hash: TBD)
3. [TODO] `phase6-kimi-claude-code-post-closeout-anchor` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle. Scope: handoff only; expected commit: none.
