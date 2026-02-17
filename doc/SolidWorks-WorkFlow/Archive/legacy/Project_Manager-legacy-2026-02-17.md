# Project Manager (CEF UI) — Architecture & Contracts

**Status:** Active
**Updated:** 2026-02-17 (release 1.1.622)
**Owner:** Oleksandr

---

## 0) Purpose

`Project Manager` — основной UI‑клиент CodeAI Hub для FLOW:
- отображает Workflow Tree (узлы, статусы, downstream-гейтинг через `OUTDATED`);
- управляет сессиями и артефактами в рамках выбранного workspace;
- подключается к Core по WebSocket и работает по snapshot-first контракту.

На период FLOW:
- `project-manager` — единственный активный UI‑клиент Core (сессии/артефакты/гейтинг);
- `vscode-webview` — Settings‑only.

Канонические документы:
- Workspace Runtime (wire + lock): `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Description → Reviewer: `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`
- Dialog routing (messages vs status): `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`

Архивный концепт (не contract, не источник правды):
- `doc/SolidWorks-Flow/Archive/Drafts/WorkflowTree_UI_Architecture.md`

---

## 1) Delivery / Runtime

Project Manager доставляется как UI bundle (`.tar.bz2`) и устанавливается в:
- `~/.codeai-hub/packages/ui/project-manager/<version>/` + symlink `current`

Источник версий/sha1:
- `assets/ui/manifest.json`

CEF Launcher читает `config/project-manager.json` и открывает `file://.../.codeai-hub/packages/ui/project-manager/current/index.html`.
См. launcher спецификацию: `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`.

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

Контракт (source of truth): `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`.

## 4.1) Dialog History Source Of Truth (UI)

Project Manager показывает историю сообщений через WS bridge `dialog:*` по `dialogId`:
- `dialog:list` / `dialog:open` — метаданные диалога + runtime binding (`latestSessionId`)
- `dialog:history` — история сообщений из unified-session JSONL `<dialogId>.jsonl`
- `dialog:send` — отправка user turn (Core сам маршрутизирует в текущий provider segment)

Core читает историю из unified-session storage:
- `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl`
- `<workspaceKey>` = `sanitize(workspacePath)` (пример: `/Users/.../CodeAI-Hub` → `-Users-...-CodeAI-Hub`)

Где:
- `providerSessionId` используется для resume/focus сессии (provider-native id).
- `dialogId` используется как basename JSONL файла UI-истории и **не меняется** при rollover/resume (иначе после рестарта Core история будет “обрезана” до последнего сегмента).

Provider-home (`~/.codeai-hub/providers/<provider>/home/`) используется провайдерами для их собственных CLI logs/rollouts и не является источником UI истории сообщений.

Hybrid binding (норма для панели Sessions в PM):
- **Messages** (лента диалога) — всегда по `dialogId`
- **Status/Usage/Lock/Models** — по runtime `sessionId` (best‑effort `latestSessionId` из `dialog:list/open`)

Примечание: `GET /api/v1/sessions/:sessionId/history` остаётся legacy/compat и не должен быть каноном для PM.

Требование на будущее: для всех следующих агентов Project Manager ожидает, что Core будет выдавать стабильный `dialogId` и писать историю в один накопительный JSONL, независимо от количества provider сегментов.

---

## 5) Sessions / Input Lock UX

UI не вычисляет lock эвристиками. Блокировка ввода определяется **только** снапшотом:
- `turnState`, `resumeMode`, `finalTurnCompleted`, `continuityLockActive`, `continuityLockReason`.

Continuity/rollover (handoff) — отдельный pipeline:
- решение о rollover принимает Core по token usage;
- continuity report пишет агент;
- unlock в rollover-path разрешён только после bootstrap assistant answer в новом segment.

Контракты:
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`

### 5.1 Continuity Failure UX (no-stuck-input)

Если continuity rollover не может завершить handoff (после retry-policy), Core обязан:
- снять `continuityLock` (reason: `resume_failed`) и вернуть `resumeMode` к `resume_in_place`;
- эмитить `stream_event.data.kind=continuity_failed` (причина + контекст) и `flow_node_rollover phase=failed` (error string);
- гарантировать `turn_state=idle` для исходной сессии, даже если провайдер не прислал `turn_completed` для internal turns.

Project Manager должен показать причину в UI и не держать input заблокированным:
- shared `InputPanel` показывает placeholder `Continuity failed: <reason: error>` когда input unlocked и получена failure-информация;
- при активном lock (snapshot-first) placeholder остаётся \"resuming\" до unlock.

---

## 6) Workflow Tree & Artifacts

Workflow Tree — единственная “ось” прогресса. Канон:
- один Step = один канонический артефакт (source of truth);
- `Edit` upstream узла помечает downstream как `OUTDATED`.

См.:
- `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md` (актуальный contract для `Description`)
- `doc/SolidWorks-Flow/Archive/Drafts/WorkflowTree_UI_Architecture.md` (концепт, не contract)

---

## 7) Webview note (Settings-only)

Встроенный VS Code webview UI работает в settings-only режиме и не является основным клиентом сессий.
Реализация: `src/client/ui/src/app-host.tsx` (`SETTINGS_ONLY_MODE`).
