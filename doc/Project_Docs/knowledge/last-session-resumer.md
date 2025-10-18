# Last Session Resumer Architecture Notes

**Scope:** sdk-session-resumer-module
**Initial plan:** `doc/tmp/LastSession_TODO_Plan.md`
**Status:** Implemented (see Session 018–021)

---

## Design Goals
- Resume the most recent finished session when “Last Session” is triggered.
- Avoid altering active sessions; the feature only applies when no session is active.
- Honour architectural constraints: micro-classes <300 lines, facade orchestration, cluster-based modules.

## Module Structure
```
src/extension-module/sdk-session-resumer-module/
├── SDKSessionResumerFacade.ts
└── micro-classes/
    ├── SessionFileScanner.ts
    ├── LastSessionFinder.ts
    ├── ActiveSessionValidator.ts
    ├── ResumeSessionOrchestrator.ts
    └── SessionRestorationHandler.ts
```

### Responsibilities
- **SDKSessionResumerFacade** — entry point; validates state, orchestrates resume steps, emits telemetry.
- **SessionFileScanner** — enumerates JSONL files in `~/.claude/projects/<project>/`, filters valid session files, returns metadata.
- **LastSessionFinder** — selects the most recently modified JSONL file, extracts the legacy sessionId.
- **ActiveSessionValidator** — checks `SDKSessionRegistry` to block resume when any session is active.
- **ResumeSessionOrchestrator** — wraps SDK call `resume: oldSessionId`, waits for the new session to initialise, returns the new sessionId.
- **SessionRestorationHandler** — persists new session metadata, notifies UI (e.g., emits `session:restored`).

## Key Constraints & Rules
- **Resume creates a new session**: old JSONL is copied by SDK, we treat only the new session/file as active.
- **UI Button Disabled when active sessions exist**: enforcement via `ActiveSessionValidator`, optional UI disable state.
- **JSONL ownership**: PathResolver gained `getProjectDirPath()` to share logic across dialog parser and resumer.
- **Error handling**: safe fallbacks when no files exist, handle fs permission errors, log warnings.

## Implementation Notes
- Refactored `SDKSessionLifecycle` to extract resume-specific logic into micro-class helper (ensure class stays <300 lines).
- `MessageProviderRefactored`, `SDKManagerFacade`, `DirectSDKManagerRefactored`, `PathResolver` received minimal surfacing changes for integration.
- `MultiSessionResumerFacade` allows restoring multiple tabs on startup by reusing this module with parallel resumes.
- Tests cover file scanning, resume orchestrator edge cases, UI integration (manual).

## Future Work
- Expose session list selector (SessionSelector) for “Old Sessions”.
- Add UI component for picking historical sessions.
- Optional caching for large project directories.

---
*Prepared from the completed plan in `doc/tmp/LastSession_TODO_Plan.md`.*
