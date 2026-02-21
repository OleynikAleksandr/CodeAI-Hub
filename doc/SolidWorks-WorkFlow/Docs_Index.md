# SolidWorks-WorkFlow — Docs Index (SSOT навигация)

## 0) Start here (восстановление контекста)

1) `System/SystemArchitecture.md`
2) `Clusters/Project_Manager.md`
3) `Clusters/CoreOrchestrator.md`
4) `Modules/Claude.md`, `Modules/Codex.md`, `Modules/Gemini.md`, `Modules/Launcher_CEF.md`, `Modules/UI_Bundles.md`
5) `Contracts/` (только по ссылкам из документов выше)

## 1) Канонические документы (этот каталог)

### System
- `System/SystemArchitecture.md` — SSOT всей системы.

### Clusters
- `Clusters/Project_Manager.md` — SSOT подсистемы Project Manager.
- `Clusters/CoreOrchestrator.md` — SSOT подсистемы Core Orchestrator.

### Modules
- `Modules/Claude.md` — SSOT Claude provider module.
- `Modules/Codex.md` — SSOT Codex provider module.
- `Modules/Gemini.md` — SSOT Gemini provider module.
- `Modules/Launcher_CEF.md` — SSOT CEF Launcher module.
- `Modules/UI_Bundles.md` — SSOT UI bundles (Webview + Project Manager).

### Contracts
- `Contracts/Dialogs_And_Continuity_Routing.md` — routing диалогов + continuity.
- `Contracts/DescriptionNode_ReviewSession.md` — контракт шага `Description → Reviewer`.
- `Contracts/SessionContinuity.md` — continuity handoff/rollover contract.
- `Contracts/WorkspaceRuntime.md` — multi-workspace + snapshot-first + lock contract.
- `Contracts/ProviderSessionHome_IsolationAndRecovery.md` — session-home isolation + resume-first recovery contract.
- `Contracts/ProviderSessionHome_SnapshotEngine_Design.md` — design: Core module + snapshot engines (FS/Git) для session-home.
- `Contracts/Workflow_CLI.md` — CLI steps + watcher contract.
- `Contracts/FacadeClassDiagram_DesignAndMaintenance.md` — process: фасады/границы/диаграммы (required reading).

## 2) Текущие источники до завершения миграции (legacy)

До завершения миграции часть legacy путей всё ещё может встречаться в истории репозитория, но канон уже в `doc/SolidWorks-WorkFlow/`.

Правило на переходный период:
- Новые правки делаем **в новых SSOT‑файлах** (этот каталог),
- а старые документы постепенно превращаем в “обёртки‑редиректы” (ссылка на новый путь) и затем удаляем.
