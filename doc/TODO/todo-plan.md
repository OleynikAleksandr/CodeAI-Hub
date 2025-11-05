# Development TODO Plan — Unified Session Storage

## Legend
- TODO — task is planned
- IN_PROGRESS — work in progress
- DONE — task is complete

## Phase 1 — Storage writer bootstrap (owner: Codex, updated: 2025-11-05)
- [DONE] Design storage paths — workspace slug берём из `claudeProjectSlug`, файлы пишем в `~/.codeai-hub/sessions/{slug}/{provider}/{providerSessionId}.jsonl`
- [DONE] Implement writer facade — пакет `@codeai-hub/unified-session` создаёт `session-open`/`message`/`session-close` записи и поддерживает JSON-метаданные
- [DONE] Wire provider adapters — RemoteBridge подключает `UnifiedSessionStorage`, пишет user/thinking/assistant события после биндинга (Claude, Codex, Gemini)
- Commit: — IN_PROGRESS (expected: feat: unified-storage-writer)

## Phase 2 — Reader & refresh integration (owner: Codex, updated: 2025-11-05)
- [TODO] Implement reader API — load history from disk for a given workspace/provider/session
- [TODO] Hook refresh flow — hydrate session store in webview from unified JSONL on reload/resume
- [TODO] Add smoke tests/manual checklist — verify history persists after VS Code reload and core restart
- Commit: — TODO (expected: feat: unified-storage-reader)

## Backlog / Next types
- [TODO] Extend writer/reader with additional event types (tool calls, errors, system messages)
- [TODO] Combined session timelines (`combined/` folders) once multi-provider orchestration lands
