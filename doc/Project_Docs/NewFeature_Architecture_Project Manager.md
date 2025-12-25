# Project Manager & Multi-Workspace Architecture

**Version:** 2.2.0
**Date:** 2025-12-25
**Status:** Approved for Implementation
**Scope:** Core, Project Manager UI, Launcher

---

## 1. Problem Statement

Currently, the CodeAI Hub Core is tightly coupled to a single workspace path defined at process startup via environment variables (`CLAUDE_WORKSPACE_PATH`, etc.). This creates a "Singleton Workspace" architecture:
- To switch projects, the entire Core process must be restarted.
- Only one project can be active at a time.
- The "Project Manager" UI currently has no backend API to list or switch projects.
- The Launcher defaults to a hardcoded path if VS Code is not involved.

## 2. Solution Overview

We will transition to a **Multi-Tenant Session Architecture**:
1.  **Core as a Service**: The Core starts *without* a specific workspace context.
2.  **Session-Owned Context**: The `workspacePath` becomes a property of a `Session`, not the process.
3.  **Global Registry**: A persistent JSON file (`projects.json`) stores the list of known workspaces.
4.  **Project Manager UI**: Acts as the control center to manage this registry and spawn sessions in specific contexts.

---

## 3. Core Architecture Changes

### 3.1 Global Project Registry
A new service in Core responsible for persisting the list of workspaces.

- **Storage**: `~/.codeai-hub/state/projects.json`
- **Schema**:
```json
{
  "workspaces": [
    {
      "id": "uuid-v4",
      "name": "CodeAI-Hub",
      "path": "/Users/user/VSCODE/CodeAI-Hub",
      "lastUsed": "2025-12-25T10:00:00Z",
      "icon": "default"
    }
  ],
  "lastActiveWorkspaceId": "uuid-v4"
}
```

---

## 4. UI Architecture (Project Manager)

### 4.1 Layout Structure (7-Section Model)

```
┌─────────┬──────────────────────────────────────────────┐
│ Section │                  Section 2 (Main)             │
│    1    │ ┌────────────────────────────────────────────┐│
│ (Sidebar│ │       Section 3 (Toolbar / Header)     ⚙️  ││
│ List)   │ ├──────────────┬──────────────┬──────────────┤│
│         │ │   Section 4  │   Section 5  │   Section 6  ││
│  [+]    │ │              │              │              ││
│  Add    │ │   Project    │   Details    │   Stats      ││
│         │ │   Overview   │   or Logs    │              ││
│  Proj A │ │              │              │              ││
│  Proj B │ │              │              │              ││
│         │ ├──────────────┴──────────────┴──────────────┤│
│         │ │       Section 7 (Status Bar / Footer)      ││
│         │ └────────────────────────────────────────────┘│
└─────────┴──────────────────────────────────────────────┘
```

### 4.2 Section 1: Dynamic Sidebar (Workspace List)
- **Dynamic Width**: The sidebar width must automatically adjust to fit the length of workspace names (with sensible min/max constraints and ellipsis for extreme cases).
- **Add Workspace Button**: Fixed at the top/bottom of the list.
- **Workspace List**: Rendered as a vertical list of project names.

### 4.3 Section 3: Header (VS Code Style)
- **Title**: Displays the current view name (e.g., "Project Manager") or the active project name.
- **Settings Icon**: A gear icon placed **immediately to the right of the title**, matching the VS Code interface style. Clicking it opens the Settings overlay/window.

---

## 5. Implementation Plan

### Phase 1: Core Refactoring (The Foundation)
1.  **Refactor Config**: Make workspace paths optional in `CoreConfig`.
2.  **Refactor Session**: Inject `workspacePath` into Session state.
3.  **Refactor Tools**: Update `FileOperations` to use session context.
4.  **Implement Registry**: Create `ProjectRegistryService` and `projects.json`.

### Phase 2: Project Manager API
1.  Expose `projects/*` endpoints over TRPC/WebSocket.
2.  Update `session.create` to handle dynamic paths.

### Phase 3: Project Manager UI
1.  Implement **Sidebar** (Section 1) with dynamic width logic.
2.  Implement **Layout** with Header (Section 3), Panels (4-6), and Status Bar (Section 7).
3.  Implement **VS Code Style Settings icon** next to the title.
4.  Wire up "Open Session" button to trigger the new session API.