# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "glm-claude-code-provider-replacement-2026-05-19",
  "branch": "main",
  "baseHead": "6a69c53c4",
  "lastRecordedCommit": "6a69c53c4",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/GLM_Claude_Code_Provider_Planning_RU.md",
  "currentTaskId": "phase0-glm-claude-code-planning-intake",
  "expectedCommitMessage": "docs: plan glm claude code provider replacement",
  "debt": {
    "expectedCommitMessage": "docs: plan glm claude code provider replacement",
    "preCommitHead": "6a69c53c4",
    "stage": "commit_pending",
    "taskId": "phase0-glm-claude-code-planning-intake"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/GLM_Claude_Code_Provider_Planning_RU.md`
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
- Новый provider scope заменяет эксперимент `kimi-claude-code` на `glm-claude-code`; native Kimi Wire provider (`kimiCode`) остается основным Kimi provider.
- До реализации full provider integration нужно сохранить возможность вписать Z.AI API key в isolated provider settings/config без пересечения с настоящим Claude Code home.
- **Release Build Confirmation Gate:** после targeted verification остановиться и отдельно спросить пользователя, собирать ли release.
- `Scope Closeout` выполняется только после явного acceptance пользователя.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-05-19)
### Stream: GLM-Claude-Code Planning Source
1. [DONE] `phase0-glm-claude-code-planning-intake` Создать planning-документ для замены экспериментального `kimi-claude-code` на `glm-claude-code`, включая provider-home isolation, Z.AI API-key settings/config, Claude Code-compatible endpoint, provider surfaces, diagnostics, verification and release gates — scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/GLM_Claude_Code_Provider_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan glm claude code provider replacement`.
2. [PENDING] Git Commit: `docs: plan glm claude code provider replacement` (hash: TBD)

## Phase 1 — User Planning Acceptance (owner: User, updated: 2026-05-19)
### Stream: Planning Review
1. [TODO] `phase1-glm-claude-code-planning-review` Пользователь проверяет planning-документ и подтверждает implementation slicing / replacement strategy — scope: без изменения файлов; expected commit: none.
