# Development TODO Plan

## Legend
- TODO — task planned
- IN_PROGRESS — work in progress
- BLOCKED — external action required
- DONE — task complete

## Phase 10 — Core Orchestrator Architecture (owner: Codex, updated: 2025-10-24)
- [TODO] Capture functional and non-functional requirements for the autonomous core. — Aggregate expectations from doc/Project_Docs/SystemArchitecture/SystemArchitecture.md and RemoteCoreBridge notes; list user journeys the service must support.
- [TODO] Define module boundaries and responsibility map (Session Manager, Provider Registry, Module Loader, Remote UI Bridge, Config/Secrets, Telemetry). — Prepare high-level diagrams and outline the workspace structure.
- [TODO] Design the Remote UI Bridge contract (HTTP + WebSocket) shared by webview and standalone client. — Describe message schemas, auth scheme, error handling, streaming rules.
- [TODO] Update architecture/system documentation once the scheme is approved. — Apply changes to doc/Architecture/Architecture.md, doc/Project_Docs/SystemArchitecture/SystemArchitecture.md, and add a knowledge entry for the bridge contract.

## Phase 11 — Core Orchestrator Bootstrap (owner: Codex, updated: 2025-10-24)
- [TODO] Create workspace/package scaffold for the core orchestrator. — Set up packages/core/, tsconfig, linting, build scripts, and wire into npm workspaces.
- [TODO] Implement service entrypoint with module stubs and configuration loading. — Focus on lifecycle, logging, config discovery.
- [TODO] Integrate core download pipeline into the extension. — Extend manifest/post-install to fetch the core release, verify checksum, and display status in UI.

## Phase 12 — Remote UI Bridge Prototype (owner: Codex, updated: 2025-10-24)
- [TODO] Build WebSocket hub with basic auth and session state broadcasting.
- [TODO] Attach standalone web client to the bridge for live data, replacing local router when core is ready.
- [TODO] Add message validation, error handling, and diagnostic logging.

## Backlog / Parking Lot
- [TODO] Define provider module packaging strategy (versioning, distribution, sandboxing) once orchestrator skeleton exists.
- [TODO] Evaluate persistence options for session history and config (SQLite, JSONL, etc.).
