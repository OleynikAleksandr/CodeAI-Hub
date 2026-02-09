# SolidWorks-Flow (CodeAI Workflow)

Эта папка содержит дизайн‑документы по **SolidWorks‑подобному Workflow Tree** для разработки ПО с использованием AI‑агентов.

Цель — описать UI/UX и правила “жёсткой” последовательности шагов (как в CAD), чтобы разработка не превращалась в хаотичное перемещение по задачам как в голом Git.

## Структура
- `Architecture/` — архитектура и правила Workflow Tree (узлы, статусы, зависимости, “rebuild/simulation”).
- `SessionContinuity/` — дизайн бесконечных сессий узлов (continuity/rollover).
- `Rebuild/` — дизайн пропагации rebuild (OUTDATED/impacted узлы).

## Обновления
- 2026-02-09 (release 1.1.538): Gemini path `Description(one-shot) -> Reviewer(resume)` подтверждён рабочим; дальнейшие Gemini-модификации временно поставлены на паузу до внедрения надёжной telemetry remaining context window.
- 2026-02-01 (release 1.1.480): Session UI: удалён TodoPanel; документы синхронизированы с текущим UI.
- 2026-02-01 (release 1.1.493): Session history: восстановление диалога после рестарта Core/Project Manager и при multi-workspace (unified-session workspace scoping).
- 2026-01-22 (release 1.1.474): подписи session-узлов в Workflow Tree и табах унифицированы и укорочены: `Description <Provider>` / `Reviewer <Provider>`.
- 2026-01-17: шаги Описание/Virtual Simulation/Диаграмма модулей/Диаграмма фасадов разделены, сущность Idea выведена из терминологии.
- 2026-01-16 (release 1.1.424): Spec/Plan/Execute выровнены по оси модуля, Orchestration остаётся вложенным шагом.

## Принципы
- MVP: “полный SolidWorks” (Workflow Tree Workbench) реализуется в `project-manager` (CEF) и является единственным активным UI‑клиентом Core на период разработки FLOW.
- `vscode-webview` используется только для Settings (Settings‑only, без сессий/чатов/подключения к Core).
- `web-client` — legacy UI (PWA/CEF), принят план полного удаления вместе со сборкой/инсталляторами/ссылками (Phase 65).
- Верхний уровень всегда `Repo (Assembly)`.
- Рабочий контекст задачи — `Workspace (Project)`.
- Реализация ведётся в кластерно‑модульной архитектуре:
  - Модуль = “деталь”, наружу — только `*facade`.
  - Внутри — микро‑классы (≤300 строк) и строгая декомпозиция.
