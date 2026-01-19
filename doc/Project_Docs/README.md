# Project Docs — Единый источник правды

**Last Updated:** 2026-01-19

Эта папка содержит **актуальные** проектные документы CodeAI Hub.

---

## Структура

```
doc/Project_Docs/
├── README.md                    # Этот навигатор
├── SystemArchitecture/          # Системная архитектура
│   ├── SystemArchitecture.md    # ⭐ ГЛАВНЫЙ ДОКУМЕНТ (source of truth)
│   ├── ProjectStructureMap.md   # Визуальная карта компонентов
│   └── UnifiedSessionArchitecture.md
├── Stacks/                      # Документация по модулям
│   ├── CoreOrchestrator.md
│   ├── Claude.md
│   ├── Codex_SDK_Module.md
│   ├── Gemini_CLI_Module.md
│   ├── Launcher_CEF_Module.md
│   └── UI_Modules.md
├── Workflow_CLI_Steps_And_Watcher_Architecture.md  # Workflow file-first
├── AgentPackages_Architecture.md                   # Agent packages
└── knowledge/                   # Практические руководства
    ├── ProviderSetupGuide.md
    └── Local_Artifacts_Workflow.md
```

---

## Ключевые документы

| Документ | Описание |
|----------|----------|
| `SystemArchitecture/SystemArchitecture.md` | **Источник правды** — вся архитектура в одном месте |
| `Workflow_CLI_Steps_And_Watcher_Architecture.md` | File-first workflow + watcher |
| `AgentPackages_Architecture.md` | Agent packages и точки интеграции |

---

## Stacks (модульная документация)

| Стек | Документ |
|------|----------|
| Core Orchestrator | `Stacks/CoreOrchestrator.md` |
| Claude Provider | `Stacks/Claude.md` |
| Codex Provider | `Stacks/Codex_SDK_Module.md` |
| Gemini Provider | `Stacks/Gemini_CLI_Module.md` |
| CEF Launcher | `Stacks/Launcher_CEF_Module.md` |
| UI Modules | `Stacks/UI_Modules.md` |

---

## Вне этой папки

| Папка | Описание |
|-------|----------|
| `doc/SolidWorks-Flow/` | UI/UX Workflow Tree (SolidWorks-подобная визуализация) |
| `doc/TODO/` | Планы разработки |
| `doc/Sessions/` | Отчёты сессий |
| `doc/Knowledge/` | База знаний (tips, troubleshooting) |

---

## Правила

1. **Один источник правды** — `SystemArchitecture.md` содержит всю архитектуру
2. **Нет дублирования** — детали модулей только в `Stacks/`
3. **Актуальность** — документы обновляются в том же коммите, что и код
