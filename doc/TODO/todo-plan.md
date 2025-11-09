# Development TODO Plan


## Phase 3 — Port Ownership & Unified Sessions (owner: Codex, updated: 2025-11-09)
- _Note (2025-11-09): Release 1.1.174 builds on the ensure/attach separation, ensuring both clients reconnect to an existing core when the manifest matches and keep it alive until an explicit restart._
- [IN_PROGRESS] Harden port/lock sequencing so the launcher respects the manager lock, avoids killing owners, and VS Code attaches to the same core when the manifest version matches instead of reinstalling (`doc/TODO/todo-critical.md#Автоостановка и владение портом`).
  - Notes: release 1.1.174 already protects running sessions when versions match; remaining work is deterministic lock ownership and handling occupied ports from other processes.
- [TODO] Complete provider isolation so Claude/Codex/Gemini CLI failures degrade individual providers without terminating the orchestrator; propagate the degraded state to both UIs (`doc/TODO/todo-critical.md#Изоляция провайдеров`).
- [TODO] Validate unified session slug storage for both clients and document the JSONL paths/restore steps after launcher → VS Code handoffs (`doc/TODO/todo-critical.md#Регрессия в Unified Session`).
