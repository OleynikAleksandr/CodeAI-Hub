# Project Docs (актуальные документы)

Эта папка содержит **актуальные** проектные документы, которые описывают текущую архитектуру и операционные договорённости CodeAI Hub.

## Структура
- `SystemArchitecture/` — системная архитектура и карты компонентов.
- `Stacks/` — стек‑документация по Core/UI/Launcher/провайдерам.
- `knowledge/` — минимальная база знаний для запуска/эксплуатации.

## Ключевые документы
- `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md` — системная архитектура (source of truth).
- `doc/Project_Docs/Workflow_CLI_Steps_And_Watcher_Architecture.md` — workflow file-first (no structured output) + watcher.
- `doc/Project_Docs/AgentPackages_Architecture.md` — архитектура agent packages и точки интеграции.

## Вне папки (дизайн‑доки)
- `doc/SolidWorks-Flow/` — SolidWorks‑подобная визуализация workflow (дерево разработки, статусы, “жёсткие” гейты).

## Архив
- `doc/Project_Docs/Archive/` — одноразовые дизайн‑доки завершённых рефакторингов (оставлены для истории). Если документ из `Archive/` начинает снова влиять на решения — его нужно либо актуализировать, либо перенести обратно в основной список.

## Что оставлено намеренно
- `doc/Project_Docs/knowledge/ProviderSetupGuide.md` — как установить и аутентифицировать CLI провайдеров.
- `doc/Project_Docs/knowledge/Local_Artifacts_Workflow.md` — офлайн‑цикл сборки, локальные артефакты, дисциплина релизов.
