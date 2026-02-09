# Документация CodeAI Hub — единый индекс (SolidWorks-Flow)

**Last Updated:** 2026-02-09 (release 1.1.538)

Эта папка (`doc/SolidWorks-Flow/`) — **единый поток документации** проекта.

## Операционная пометка (2026-02-09)

- Gemini подтверждён как рабочий для сценария `Description(one-shot) -> Reviewer(resume)`.
- Дальнейшие Gemini‑модификации временно поставлены на паузу до появления надёжной telemetry remaining context window.
- Источник правды по статусу/ограничениям: `doc/SolidWorks-Flow/Stacks/Gemini_Reviewer_Resume_Architecture.md`.

---

## Структура

```
doc/SolidWorks-Flow/
├── README.md
├── System/
│   ├── SystemArchitecture.md          # ⭐ Source of truth (система целиком)
│   ├── ProjectStructureMap.md         # Визуальная карта компонентов
│   ├── AgentPackages_Architecture.md  # Архитектура agent packages
│   └── Docs_Index.md                  # Этот индекс
├── Archive/
├── Stacks/                            # Документация по модулям
│   ├── CoreOrchestrator.md
│   ├── Claude.md
│   ├── Codex_SDK_Module.md
│   ├── Gemini_CLI_Module.md
│   ├── Gemini_Reviewer_Resume_Architecture.md
│   ├── Launcher_CEF_Module.md
│   ├── Project_Manager.md
│   └── UI_Modules.md
├── Workflow/
│   └── Workflow_CLI_Steps_And_Watcher_Architecture.md
├── Architecture/                      # UI/UX Workflow Tree
│   ├── WorkflowTree_UI_Architecture.md
│   ├── DescriptionNode_ReviewSession_Architecture.md
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
| `Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md` | File-first workflow + watcher |
| `Architecture/DescriptionNode_ReviewSession_Architecture.md` | Канон `Description → Reviewer` |
| `WorkspaceRuntime/WorkspaceRuntime.md` | Multi-workspace runtime + lock/unlock контракты |
