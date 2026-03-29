# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Session190.md`, `doc/SolidWorks-WorkFlow/Plans/ProviderFeedback_ModelAndReasoning_Logging_Architecture.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Текущий baseline релиз: `1.1.835`.
- Scope этого плана: писать в SDK logs только provider-confirmed feedback по applied model/reasoning/thinking без подмены provider echo внутренним intent.
- Каждая микро-задача должна затрагивать не более 3 файлов; `doc/TODO/todo-plan.md` обновляется вместе с каждой подзадачей.
- После каждой микро-задачи обязателен отдельный `Git Commit:` пункт с фактическим hash после коммита.
- Husky hooks, `check-architecture.sh` и release checklist не обходить.

---

## Phase 91 — Provider Feedback Logging Scope Reset (owner: Oleksandr, updated: 2026-03-29)

### Stream: Planning and execution backlog for provider feedback
1. [DONE] Зафиксировать planning scope для provider-confirmed observability: нормализовать только тот feedback, который реально пришёл обратно из runtime Claude/Codex/Gemini, и разрезать реализацию на отдельные provider streams. Scope: `doc/SolidWorks-WorkFlow/Plans/ProviderFeedback_ModelAndReasoning_Logging_Architecture.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs(plan): define provider feedback scope`
2. [DONE] Git Commit: `docs(plan): define provider feedback scope` (hash: `53481807`)

## Phase 92 — Codex Provider Feedback Echo (owner: Oleksandr, updated: 2026-03-29)

### Stream: Promote raw turn_context into sdk-codex log
3. [DONE] Логировать в `sdk-codex-*.jsonl` только provider-confirmed raw `turn_context` feedback с реально наблюдаемыми `model` и `effort`, не смешивая это с внутренним message processor state. Scope: `packages/Codex_Module/src/logging/session-logger.ts`, `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`, `packages/Codex_Module/src/logging/session-logger.test.ts`. Expected commit: `feat(codex): log provider feedback`
4. [DONE] Git Commit: `feat(codex): log provider feedback` (hash: `25f848b8`)

## Phase 93 — Claude Provider Feedback Echo (owner: Oleksandr, updated: 2026-03-29)

### Stream: Normalize Claude model and thinking feedback
5. [DONE] Писать в `sdk-claude-*.jsonl` отдельные `provider_feedback` записи только по реально наблюдаемым provider signals: `message.model` и `thinking` blocks. Scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/messaging/provider-feedback.ts`, `packages/Claude_Module/src/messaging/provider-feedback.test.ts`. Expected commit: `feat(claude): log provider feedback`
6. [DONE] Git Commit: `feat(claude): log provider feedback` (hash: `ee63c5da`)

## Phase 94 — Gemini Provider Feedback Echo (owner: Oleksandr, updated: 2026-03-29)

### Stream: Persist Gemini provider feedback records
7. [DONE] Сохранять structured `logEvent(...)` в `sdk-gemini-*.jsonl` и нормализовать provider feedback для `model_info`. Scope: `packages/Gemini_Module/src/logging/session-logger.ts`, `packages/Gemini_Module/src/messaging/gemini-system-event-normalizer.ts`, `packages/Gemini_Module/src/messaging/message-processor.test.ts`. Expected commit: `feat(gemini): persist provider model feedback`
8. [DONE] Git Commit: `feat(gemini): persist provider model feedback` (hash: `b0db4fe2`)

### Stream: Capture Gemini thought usage feedback
9. [DONE] Дописать provider feedback для реально наблюдаемых `thought` и `finished.usageMetadata.thoughtsTokenCount`, без фиктивного echo `thinkingLevel`. Scope: `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`, `packages/Gemini_Module/src/messaging/message-processor.test.ts`. Expected commit: `feat(gemini): log provider thought feedback`
10. [DONE] Git Commit: `feat(gemini): log provider thought feedback` (hash: `1113f6cb`)

## Phase 95 — Documentation And Verification (owner: Oleksandr, updated: 2026-03-29)

### Stream: SSOT sync for provider feedback logging
11. [DONE] Синхронизировать SSOT-документацию с новым observability contract для provider-confirmed feedback logs. Scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`. Expected commit: `docs(observability): document provider feedback logs`
12. [DONE] Git Commit: `docs(observability): document provider feedback logs` (hash: `40d016f1`)

### Stream: Targeted verification of provider feedback logs
13. [DONE] Прогнать таргетные тесты затронутых провайдеров и зафиксировать, какие provider feedback записи реально появляются в SDK logs после тестового turn. Scope: provider package tests + log verification notes in session handoff if needed. Expected commit: `test(observability): verify provider feedback logs`
14. [TODO] Git Commit: `test(observability): verify provider feedback logs` (hash: `TBD`)
