# Session 69 — Phase 86 preflight: clean plan + reading checklist

**Date:** 2026-02-02  (local)
**Branch:** main
**Version:** 1.1.493

---

# 1. Work Done in This Session

## Work summary
- Привели `doc/TODO/todo-plan.md` (Phase 86) к исполнению: удалили ранее выполненные пункты (bootstrap/design/session report), оставили только задачи, которые реально нужно выполнять в следующей сессии (spike → implementation → verification).
- Усилили preflight-контекст для Codex token usage по аналогии с Claude (/context):
  - подчеркнули различие между per-turn `usage` и context-window `used/limit` (source-of-truth: Codex CLI `/status`),
  - явно включили требования: throttling + in-flight lock и «internal-only» (не загрязнять UI/UnifiedSession history).
- Зафиксировали, что реализация будет делаться в следующей сессии (в этой — только план + подготовка материалов к чтению).

## Git commits
- `7b7e774c docs(todo): clean Phase 86 plan for execution`

---

# 2. Instructions for Next Session

## Required documents to review before work (read in this order)

### A) Architecture (source of truth)
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md` (multi-tenant: `workspacePath` — свойство Session, не глобальный)
2. `doc/Project_Docs/TokenUsage/CodexTokenUsage_Architecture.md` (APPROVED: source-of-truth — `/status` → `Context window: ... (used / limit)`)
3. `doc/Project_Docs/TokenUsage/ClaudeTokenUsage_Architecture.md` (pitfalls: totals по run ≠ context window; throttling; internal-only)

### B) Multi-workspace / history pitfalls (обязательно)
4. `doc/SolidWorks-Flow/knowledge/UnifiedSession_History_WorkspaceScoping.md` (главная ошибка: глобальный workspaceKey ломает history; всё привязано к Session)

### C) Session continuity / persistence
5. `doc/Sessions/Session065.md` (tokenUsage persistence/restore через continuity `chain.json`, без отдельного state файла)

### D) Контекст предыдущего решения
6. `doc/Sessions/Session068.md` (дизайн Codex token usage + первичный план Phase 86)
7. `doc/Sessions/Session069.md` (THIS REPORT)

### E) План исполнения (источник операционной правды)
8. `doc/TODO/todo-plan.md` (THIS FILE)

## Optional (high-signal code references for implementation)
- `packages/Claude_Module/src/messaging/message-processor.ts` (как сделан throttling + in-flight lock + `stream_event` с `tokenUsage` после turn)
- `packages/Claude_Module/src/sdk/claude-context-usage-reader.ts` и `packages/Claude_Module/src/sdk/claude-context-usage-snapshot.ts` (паттерн reader+parser)
- `packages/Codex_Module/src/messaging/message-processor.ts` (точка интеграции: `turn.completed`)

## Plans for next session
- Выполнить Phase 86 из `doc/TODO/todo-plan.md` (начиная со Stream: spike) строго микрозадачами ≤3 файлов + отдельный коммит после каждой микрозадачи.
- После реализации и верификации создать `doc/Sessions/Session070.md` (implementation + verification).
