# CodeAI Hub — Project Structure Map

**Status:** ARCHIVED (superseded)
**Archived:** 2026-02-17
**Owner:** Oleksandr + Codex

Этот документ перенесён в `Archive/`, потому что визуальная карта встроена в системный SSOT:
- `doc/SolidWorks-Flow/System/SystemArchitecture.md` (раздел «Project Structure Map (visual)»)

---

## Visual Architecture

```mermaid
graph TD
    subgraph "Clients (UI Layer)"
        VSCode["VS Code Extension"]
        Launcher["CEF Launcher"]
        Webview["VS Code Webview"]
        ProjectManager["Project Manager"]
    end

    subgraph "Core Service (Business Logic)"
        Orchestrator["Core Orchestrator"]
        Supervisor["Core Supervisor"]
        Bridge["Remote Bridge"]
        SessionMgr["Session Manager"]
        Registry["Provider Registry"]
    end

    subgraph "Providers (AI Capabilities)"
        Claude["Claude Module"]
        Codex["Codex Module"]
        Gemini["Gemini Module"]
    end

    subgraph "Storage & State"
        Settings["Settings JSON"]
        Sessions["Session Logs (JSONL)"]
        Packages["Local Packages (~/.codeai-hub)"]
    end

    %% Client Connections
    VSCode -->|Spawns/Connects| Supervisor
    Launcher -->|Spawns/Connects| Supervisor
    Webview -->|WebSocket| Bridge
    ProjectManager -->|WebSocket| Bridge

    %% Core Internal Flow
    Supervisor -->|Manages| Orchestrator
    Orchestrator -->|Uses| SessionMgr
    Orchestrator -->|Uses| Registry
    Bridge -->|Exposes API| Orchestrator

    %% Provider Connections
    Registry -->|Loads| Claude
    Registry -->|Loads| Codex
    Registry -->|Loads| Gemini

    %% Data Flow
    SessionMgr -->|Reads/Writes| Sessions
    Orchestrator -->|Reads| Settings
    Supervisor -->|Installs/Reads| Packages
    
    %% Styling
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#000;
    classDef core fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#000;
    classDef provider fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px,color:#000;
    classDef storage fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#000;

    class VSCode,Launcher,Webview,ProjectManager client;
    class Orchestrator,Supervisor,Bridge,SessionMgr,Registry core;
    class Claude,Codex,Gemini provider;
    class Settings,Sessions,Packages storage;
```

Примечание: исторический «навигационный» текст удалён, чтобы не дублировать SSOT и не ломать `npm run check:links`.
