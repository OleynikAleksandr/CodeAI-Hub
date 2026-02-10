# Project Manager (CEF UI) — Architecture & Contracts

**Status:** Active
**Updated:** 2026-02-10 (release 1.1.545)
**Owner:** Oleksandr

---

## 0) Purpose

`Project Manager` — основной UI‑клиент CodeAI Hub для FLOW:
- отображает Workflow Tree (узлы/статусы/OUTDATED);
- управляет сессиями и артефактами в рамках выбранного workspace;
- подключается к Core по WebSocket и работает по snapshot-first контракту.

На период FLOW:
- `project-manager` — единственный активный UI‑клиент Core (сессии/артефакты/гейтинг);
- `vscode-webview` — Settings‑only.

Канонические документы:
- Workspace Runtime (wire + lock): `doc/SolidWorks-Flow/WorkspaceRuntime/WorkspaceRuntime.md`
- Workflow Tree UI/UX: `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
- Description → Reviewer: `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`

---

## 1) Delivery / Runtime

Project Manager доставляется как UI bundle (`.tar.bz2`) и устанавливается в:
- `~/.codeai-hub/packages/ui/project-manager/<version>/` + symlink `current`

Источник версий/sha1:
- `assets/ui/manifest.json`

CEF Launcher читает `config/project-manager.json` и открывает `file://.../packages/ui/project-manager/current/index.html`.
См. launcher спецификацию: `doc/SolidWorks-Flow/Stacks/Launcher_CEF_Module.md`.

---

## 2) Source Layout (repo)

- UI entry (Project Manager): `src/client/project-manager/`
- Общие UI компоненты/Session UI (shared): `src/client/ui/src/`

Project Manager переиспользует `SessionView` и связанные компоненты из shared UI слоя.

---

## 3) Main Layout (Project Manager)

Иерархия панелей:

```
MainLayout
├── Sidebar
│   └── WorkspaceTree
└── MainArea
    ├── Toolbar
    ├── PanelContainer (resizable)
    │   ├── Sessions Panel
    │   │   └── SessionView (shared)
    │   └── Artifacts Panel
    │       └── WorkflowArtifactViewer
    └── StatusBar
```

Ключевые файлы (Project Manager):
- `src/client/project-manager/components/layout/main-layout.tsx`
- `src/client/project-manager/components/layout/main-area.tsx`
- `src/client/project-manager/components/layout/panel-container.tsx`
- `src/client/project-manager/components/layout/workspace-tree.tsx`
- `src/client/project-manager/components/layout/workflow-artifact-viewer.tsx`
- `src/client/project-manager/components/layout/toolbar.tsx`

Shared Session UI (используется и в PM, и в webview):
- `src/client/ui/src/session/session-view.tsx`
- `src/client/ui/src/session/dialog-panel.tsx`
- `src/client/ui/src/session/input-panel.tsx`
- `src/client/ui/src/session/status-panel.tsx`

---

## 4) Workspace Selection & Snapshot-first

Project Manager обязан работать в режиме snapshot-first:
- при выборе workspace выполняется `workspace:select`;
- Core отвечает `workspace:select:ack(applied)` и начинает пушить `workspace:snapshot`.

Контракт (source of truth): `doc/SolidWorks-Flow/WorkspaceRuntime/WorkspaceRuntime.md`.

---

## 5) Sessions / Input Lock UX

UI не вычисляет lock эвристиками. Блокировка ввода определяется **только** снапшотом:
- `turnState`, `resumeMode`, `finalTurnCompleted`, `continuityLockActive`, `continuityLockReason`.

Continuity/rollover (handoff) — отдельный pipeline:
- решение о rollover принимает Core по token usage;
- continuity report пишет агент;
- unlock в rollover-path разрешён только после bootstrap assistant answer в новом segment.

Контракты:
- `doc/SolidWorks-Flow/WorkspaceRuntime/WorkspaceRuntime.md`
- `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`

---

## 6) Workflow Tree & Artifacts

Workflow Tree — единственная “ось” прогресса. Канон:
- один Step = один канонический артефакт (source of truth);
- `Edit` upstream узла помечает downstream как `OUTDATED`.

См.:
- `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`

---

## 7) Webview note (Settings-only)

Встроенный VS Code webview UI работает в settings-only режиме и не является основным клиентом сессий.
Реализация: `src/client/ui/src/app-host.tsx` (`SETTINGS_ONLY_MODE`).
