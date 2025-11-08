# Development TODO Plan

## Phase 2 — Diagnostics & Session UX (owner: Codex, updated: 2025-11-09)
- _Note (2025-11-09): Release 1.1.169 собран (fix keepalive focus loops + idle grace). Дальше — диагностика портов и UI-parity._
- [TODO] Surface CLI/SDK readiness in RuntimeStatusReporter and the UI so users immediately see degraded providers (ref: `doc/TODO/todo-roadmap.md#Diagnostics & Workspace Control`).
- [TODO] Add manual workspace selector + prevent empty VS Code windows from overwriting `workspace-path` (ref: `doc/TODO/todo-roadmap.md#Diagnostics & Workspace Control`).
- [TODO] Launcher webview should consume unified JSONL history and support refresh/restore flows identical to VSIX (ref: `doc/TODO/todo-roadmap.md#Session Experience & Launcher Parity`).

## Phase 1 — Runtime Hardening (owner: Codex, updated: 2025-11-07)
- [DONE] Auto-shutdown + dynamic port ownership across extension and launcher.
- [DONE] Provider isolation so CLI crashes no longer terminate the orchestrator.
- [DONE] Unified session slug validation for VSIX and launcher JSONL.
