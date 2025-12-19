# Quality Gate Manager — Архитектурная Диаграмма (v2.0)

```mermaid
flowchart TD
    %% Стилизация
    classDef user fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#000
    classDef git fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#000
    classDef watcher fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px,color:#000
    classDef agent fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#000
    classDef tools fill:#eceff1,stroke:#37474f,stroke-width:1px,color:#000

    subgraph "Dev Environment"
        User[User / Dev Agent]:::user
        File[File System<br/>src/Feature.ts]:::user
    end

    subgraph "Git State"
        HEAD[Git HEAD<br/>(Clean State)]:::git
        Diff[Git Diff<br/>(Dirty / Drafts)]:::git
    end

    subgraph "Quality System"
        Watcher[Watcher Script<br/>(Polling git diff)]:::watcher
        
        subgraph "Isolated Execution Context (.codeai/quality-agent/)"
            Protocol[QUALITY_PROTOCOL.md]:::tools
            QAgent[Daemon Quality Agent<br/>(Codex / Claude)]:::agent
        end
        
        Tools[Tools:<br/>Ultracite, TSC, Arch-Check]:::tools
    end

    %% Поток
    User -->|Edit & Save| File
    File -.->|Changes| Diff
    
    Watcher -->|Detects Diff| QAgent
    
    QAgent -->|1. Read| Protocol
    QAgent -->|2. Run Checks| Tools
    Tools -->|Context (node_modules)| File
    
    QAgent -->|3. Fix Issues| File
    QAgent -->|4. Verify Fix| Tools
    
    QAgent -->|5. Success?| Commit[Git Commit]:::git
    Commit -->|Update| HEAD
    Commit -->|Clear| Diff

    %% Обратная связь
    QAgent -->|Failure?| Report[Create Quality Task]:::user

    %% Связи для красоты
    HEAD ~~~ Diff
```
