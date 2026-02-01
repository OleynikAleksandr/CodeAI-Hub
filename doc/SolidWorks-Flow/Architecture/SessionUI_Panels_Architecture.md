# Session UI — Panels Architecture

**Status:** Reference
**Updated:** 2026-02-01
**Owner:** Oleksandr

---

## 1. Overview

Документ описывает структуру UI-компонентов окна сессии (Session Window) в CodeAI Hub.

### Два контекста отображения

| Контекст | Root-компонент | Назначение |
|----------|----------------|------------|
| **Project Manager** | `main-layout.tsx` | Полный UI с деревом проекта, сессиями и артефактами |
| **Webview Client** | `app-host.tsx` | Встроенное окно сессии в VS Code |

---

## 2. Иерархия панелей (Project Manager)

```
MainLayout
├── Sidebar (левая панель)
│   └── WorkspaceTree (дерево проекта)
│
└── MainArea (основная область)
    ├── Toolbar (кнопки этапов workflow)
    ├── PanelContainer (две resizable панели)
    │   ├── Sessions Panel (левая)
    │   │   └── SessionView
    │   │       ├── SessionTabs
    │   │       ├── InfoPanel
    │   │       ├── DialogPanel (история сообщений)
    │   │       ├── InputPanel (ввод)
    │   │       └── StatusPanel (статус/токены)
    │   │
    │   └── Artifacts Panel (правая)
    │       └── WorkflowArtifactViewer
    │
    └── StatusBar
```

---

## 3. Ключевые файлы панелей сессии

| Панель | Файл | Строк | Назначение |
|--------|------|-------|------------|
| **SessionView** | `src/client/ui/src/session/session-view.tsx` | ~100 | Главный контейнер сессии |
| **SessionTabs** | `src/client/ui/src/session/session-tabs.tsx` | ~100 | Вкладки открытых сессий |
| **InfoPanel** | `src/client/ui/src/session/info-panel.tsx` | ~40 | ID сессии и статус подключения |
| **DialogPanel** | `src/client/ui/src/session/dialog-panel.tsx` | ~200 | История сообщений, thinking, автоскролл |
| **InputPanel** | `src/client/ui/src/session/input-panel.tsx` | ~65 | Форма ввода сообщений, drag-n-drop файлов |
| **InputTextarea** | `src/client/ui/src/session/input-textarea.tsx` | ~50 | Кастомная textarea с авторесайзом |
| **StatusPanel** | `src/client/ui/src/session/status-panel.tsx` | ~80 | Статус провайдеров и токены |
| **EmptyState** | `src/client/ui/src/session/empty-state.tsx` | ~30 | Заглушка при отсутствии сессий |
| **MarkdownContent** | `src/client/ui/src/session/markdown-content.tsx` | ~100 | Рендеринг markdown сообщений |

---

## 4. Интеграция с Project Manager

| Компонент | Файл | Назначение |
|-----------|------|------------|
| **ProjectManagerSessionView** | `src/client/project-manager/components/sessions/project-manager-session-view.tsx` | Обёртка SessionView с логикой PM (visibility, hydration, flow control) |
| **MainLayout** | `src/client/project-manager/components/layout/main-layout.tsx` | Главный layout (Sidebar + MainArea) |
| **MainArea** | `src/client/project-manager/components/layout/main-area.tsx` | Toolbar + PanelContainer + StatusBar |
| **PanelContainer** | `src/client/project-manager/components/layout/panel-container.tsx` | Resizable split (sessions + artifacts) |
| **Sidebar** | `src/client/project-manager/components/layout/sidebar.tsx` | Workspace selector + WorkspaceTree |
| **WorkspaceTree** | `src/client/project-manager/components/layout/workspace-tree.tsx` | Дерево проекта с этапами workflow |
| **Toolbar** | `src/client/project-manager/components/layout/toolbar.tsx` | Кнопки: Description, Virtual Simulation, Diagram Modules, Diagram Facades |
| **StatusBar** | `src/client/project-manager/components/layout/status-bar.tsx` | Информация о текущем workspace |
| **VerticalResizer** | `src/client/project-manager/components/resizer/vertical-resizer.tsx` | Изменение размеров панелей |

---

## 5. Правая панель (Artifacts)

| Компонент | Файл | Назначение |
|-----------|------|------------|
| **WorkflowArtifactViewer** | `src/client/project-manager/components/layout/workflow-artifact-viewer.tsx` | Просмотр артефактов workflow |
| **DescriptionQuestionnairePanel** | `src/client/project-manager/components/description/description-questionnaire-panel.tsx` | Анкета описания проекта |

---

## 6. Webview Client (встроенное окно)

```
AppHost
├── ActionBar
│
├── SessionRegion
│   ├── FlowWizardPicker (выбор этапа)
│   ├── ProviderPicker (выбор провайдера)
│   ├── IdeaQuestionnairePanel (анкета идеи)
│   │
│   └── SessionView
│       ├── SessionTabs
│       ├── InfoPanel
│       └── Content
│           ├── DialogPanel
│           ├── InputPanel
│           └── StatusPanel
│
├── Settings Overlay
└── Loading Indicator
```

| Компонент | Файл | Назначение |
|-----------|------|------------|
| **AppHost** | `src/client/ui/src/app-host.tsx` | Главный контейнер (сессии, настройки, подключение к Core) |
| **SessionRegion** | `src/client/ui/src/app-host/session-region.tsx` | Контейнер для SessionView + пикеры |
| **ProviderPicker** | `src/client/ui/src/provider-picker.tsx` | Выбор провайдера для новой сессии |
| **IdeaQuestionnairePanel** | `src/client/ui/src/app-host/idea-questionnaire-panel.tsx` | Сбор информации о идее проекта |

---

## 7. Визуальная схема (Project Manager)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              MainLayout                                  │
├──────────────────┬──────────────────────────────────────────────────────┤
│                  │                      MainArea                         │
│     Sidebar      ├──────────────────────────────────────────────────────┤
│                  │  Toolbar: [Description] [Virtual Sim] [Modules] [F]  │
│  ┌────────────┐  ├─────────────────────────┬────────────────────────────┤
│  │ Workspace  │  │                         │                            │
│  │  Selector  │  │    Sessions Panel       │    Artifacts Panel         │
│  └────────────┘  │                         │                            │
│                  │  ┌───────────────────┐  │  ┌──────────────────────┐  │
│  ┌────────────┐  │  │   SessionTabs     │  │  │                      │  │
│  │            │  │  ├───────────────────┤  │  │  WorkflowArtifact    │  │
│  │ Workspace  │  │  │   InfoPanel       │  │  │      Viewer          │  │
│  │   Tree     │  │  ├───────────────────┤  │  │                      │  │
│  │            │  │  │                   │  │  │  - description.md    │  │
│  │ ├─Descr    │  │  │   DialogPanel     │  │  │  - questionnaire.md  │  │
│  │ │ └─Final  │  │  │   (messages)      │  │  │  - diagrams          │  │
│  │ │ └─Review │  │  │                   │  │  │                      │  │
│  │ ├─VirtSim  │  │  ├───────────────────┤  │  │                      │  │
│  │ └─Facades  │  │  ├───────────────────┤  │  │                      │  │
│  │            │  │  │   InputPanel      │  │  │                      │  │
│  └────────────┘  │  ├───────────────────┤  │  │                      │  │
│                  │  │   StatusPanel     │  │  └──────────────────────┘  │
│                  │  └───────────────────┘  │                            │
│                  ├─────────────────────────┴────────────────────────────┤
│                  │  StatusBar: workspace info                           │
└──────────────────┴──────────────────────────────────────────────────────┘
```

---

## 8. Notes

- TodoPanel удалён (2026-02-01): чек-лист задач сессии больше не отображается в текущем UI.
- Все компоненты следуют принципу микро-классов (< 300 строк)
- Используется React hooks для управления состоянием
- SessionView переиспользуется в обоих контекстах (Project Manager и Webview Client)
- PanelContainer поддерживает resizable разделитель между панелями
