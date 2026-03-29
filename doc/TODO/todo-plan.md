# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Session191.md`, `doc/SolidWorks-WorkFlow/Plans/ProviderFeedbackRollback_Architecture.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Текущий baseline релиз: `1.1.836`.
- Scope этого плана: откатить provider-feedback logging scope как лишний runtime-specific код, который не дал полезного exact-level signal в SDK logs, сохранить исторические документы релиза `1.1.836` и выпустить новый rollback baseline.
- Каждая микро-задача должна затрагивать не более 3 файлов; `doc/TODO/todo-plan.md` обновляется вместе с каждой подзадачей.
- После каждой микро-задачи обязателен отдельный `Git Commit:` пункт с фактическим hash после коммита.
- Husky hooks, `check-architecture.sh` и release checklist не обходить.

---

## Phase 98 — Provider Feedback Rollback Scope (owner: Oleksandr, updated: 2026-03-29)

### Stream: Planning and rollback boundary
1. [DONE] Зафиксировать rollback scope: удалить provider-feedback logging code и active SSOT-пункты, которые не дают полезного exact-level signal, но сохранить исторические session/release документы как факт релиза `1.1.836`. Scope: `doc/SolidWorks-WorkFlow/Plans/ProviderFeedbackRollback_Architecture.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs(plan): define provider feedback rollback`
2. [DONE] Git Commit: `docs(plan): define provider feedback rollback` (hash: `58c234a2`)

## Phase 99 — Provider Feedback Rollback Execution (owner: Oleksandr, updated: 2026-03-29)

### Stream: Revert provider logging seams by provider
3. [DONE] Откатить Gemini thought-feedback seam и связанные тесты через `git revert`, не переписывая исторические release/session документы. Scope: `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`, `packages/Gemini_Module/src/messaging/message-processor.test.ts`. Expected commit: `revert: remove gemini provider thought feedback`
4. [DONE] Git Commit: `revert: remove gemini provider thought feedback` (hash: `b652d3c6`)
5. [DONE] Откатить Gemini model-feedback seam и связанные тесты через `git revert`, сохранив rollback-plan актуальным. Scope: `packages/Gemini_Module/src/logging/session-logger.ts`, `packages/Gemini_Module/src/messaging/gemini-system-event-normalizer.ts`, `packages/Gemini_Module/src/messaging/message-processor.test.ts`. Expected commit: `revert: remove gemini provider model feedback`
6. [DONE] Git Commit: `revert: remove gemini provider model feedback` (hash: `59a72fdf`)
7. [DONE] Откатить Claude provider-feedback seam и связанные тесты через `git revert`. Scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/messaging/provider-feedback.ts`, `packages/Claude_Module/src/messaging/provider-feedback.test.ts`. Expected commit: `revert: remove claude provider feedback`
8. [DONE] Git Commit: `revert: remove claude provider feedback` (hash: `58d39c1d`)
9. [IN_PROGRESS] Откатить Codex provider-feedback seam и связанные тесты через `git revert`. Scope: `packages/Codex_Module/src/logging/session-logger.ts`, `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`, `packages/Codex_Module/src/logging/session-logger.test.ts`. Expected commit: `revert: remove codex provider feedback`
10. [TODO] Git Commit: `revert: remove codex provider feedback` (hash: `TBD`)

### Stream: SSOT and release sync after rollback
11. [TODO] Синхронизировать текущие SSOT/release документы с rollback baseline: убрать active-architecture ссылки на provider-feedback scope, обновить `README.md`, `CHANGELOG.md`, `doc/Sessions/Session192.md` и related docs под новый релиз rollback. Scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, provider module docs, `README.md`, `CHANGELOG.md`, `doc/Sessions/Session192.md`. Expected commit: `docs(release): prepare provider feedback rollback`
12. [TODO] Git Commit: `docs(release): prepare provider feedback rollback` (hash: `TBD`)

## Phase 100 — Rollback Release Build (owner: Oleksandr, updated: 2026-03-29)

### Stream: Clean-tree build and packaging after rollback
13. [TODO] На чистом дереве выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, проверить новый VSIX rollback-релиза и зафиксировать результаты в session report. Scope: release scripts, version/manifests from build scripts, `doc/Sessions/Session192.md`. Expected commit: `chore: release provider feedback rollback`
14. [TODO] Git Commit: `chore: release provider feedback rollback` (hash: `TBD`)
