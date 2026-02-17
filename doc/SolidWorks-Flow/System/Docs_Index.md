# Документация CodeAI Hub — единый индекс (SolidWorks-Flow)

**Status:** Active (index)
**Updated:** 2026-02-17 (release 1.1.622)

Эта папка (`doc/SolidWorks-Flow/`) — **единый поток документации** проекта.

## Операционная пометка (2026-02-11)

- Gemini подтверждён как рабочий для сценария `Description(one-shot) -> Reviewer(resume)`.
- Дальнейшие Gemini‑модификации временно поставлены на паузу до появления надёжной telemetry remaining context window.
- Источник правды по статусу/ограничениям: `doc/SolidWorks-Flow/Stacks/Gemini_CLI_Module.md`.

---

## Структура

```
doc/SolidWorks-Flow/
├── README.md
├── System/
│   ├── SystemArchitecture.md          # ⭐ Source of truth (система целиком)
│   ├── Docs_Index.md                  # Этот индекс
│   └── DocMaintenancePolicy.md        # Правила актуальности/archiving документов
├── Archive/
│   └── Drafts/
│       ├── AgentPackages_Architecture.md
│       ├── ProjectStructureMap.md
│       └── WorkflowTree_UI_Architecture.md
├── Stacks/                            # Документация по модулям
│   ├── CoreOrchestrator.md
│   ├── Claude.md
│   ├── Codex_SDK_Module.md
│   ├── Gemini_CLI_Module.md
│   ├── Launcher_CEF_Module.md
│   ├── Project_Manager.md
│   └── UI_Modules.md
├── Workflow/
│   ├── FacadeClassDiagram_DesignAndMaintenance.md  # Реестр подхода: как не делать «релиз в пустоту»
│   └── Workflow_CLI_Steps_And_Watcher_Architecture.md
├── Architecture/                      # UI/UX Workflow Tree
│   ├── DescriptionNode_ReviewSession_Architecture.md
│   └── Dialogs_And_Continuity_Routing_Refactor.md
├── WorkspaceRuntime/
│   ├── WorkspaceRuntime.md
├── SessionContinuity/
│   └── SessionContinuity.md
└── knowledge/
    ├── README.md
    ├── guides/
    │   ├── ProviderSetupGuide.md
    │   └── Local_Artifacts_Workflow.md
    ├── model-reference/
    │   ├── Claude_Model_Aliases.md
    │   ├── Codex_Model_Selection.md
    │   └── Gemini_Model_Selection.md
    └── kb/
        ├── codex-thinking-display.md
```

---

## Ключевые документы

| Документ | Описание |
|----------|----------|
| `System/SystemArchitecture.md` | **Источник правды** по архитектуре системы |
| `System/DocMaintenancePolicy.md` | Политика актуализации/archiving и SSOT-правила для документации |
| `Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md` | File-first workflow + watcher |
| `Workflow/FacadeClassDiagram_DesignAndMaintenance.md` | Протокол диагностики и поддержки диаграммы фасадов (реальные кейсы фиксов) |
| `Architecture/DescriptionNode_ReviewSession_Architecture.md` | Канон `Description → Reviewer` |
| `WorkspaceRuntime/WorkspaceRuntime.md` | Multi-workspace runtime + lock/unlock контракты |
| `SessionContinuity/SessionContinuity.md` | Continuity rollover + единая UI-история через `dialogId` (обязательно для всех следующих агентов) |
| `Architecture/Dialogs_And_Continuity_Routing_Refactor.md` | Канон routing: messages по `dialogId`, status/usage/lock по runtime `sessionId` |
