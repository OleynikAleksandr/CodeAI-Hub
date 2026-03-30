# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream, в каждом Stream — микро-задачи.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если scope вырастает больше 3 файлов, подзадачу необходимо дробить до начала правок.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run build --workspace <package>`, при необходимости `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: после зелёных гейтов — Git Commit с максимально релевантным описанием и немедленный апдейт статусов/хешей в этом файле.
- **Принцип**: никаких моков в тестах. Тесты должны работать с реальными объектами/данными.
- **Real-time Документация**: изменения логики/контрактов должны синхронно попадать в `doc/` в том же коммите.
- **Релизный нюанс для этого scope:** перед `./scripts/build-all.sh` обязательно синхронизировать `README.md`, `CHANGELOG.md`, `doc/Sessions/Session199.md` и затронутые Gemini-архитектурные документы.

## Required documents to review before work
1. `doc/Sessions/Session199.md`
2. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
3. `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
4. `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`
5. `doc/SolidWorks-WorkFlow/Plans/Gemini_PostTool_TerminalLeg_Architecture.md`
6. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 1 — Gemini post-tool terminal leg and adaptive watchdog (owner: Oleksandr, updated: 2026-03-30)

Goal: устранить сценарий, в котором Gemini успевает создать `Final_Description.md`, но затем зависает на nested post-tool follow-up и падает по stalled timeout до финального ответа или точечных вопросов пользователю.

### Stream: Session Report
1. [DONE] Docs: обновить `doc/Sessions/Session199.md` пост-релизной валидацией `1.1.848`, зафиксировать новый provider session `3a6fb414-22d4-4a43-a7f9-7e5f5cb92d07`, `Final_Description.md` materialization и вывод о том, что последний assistant message был progress-output, а не terminal answer. Scope: `doc/Sessions/Session199.md`. Expected commit: `docs: record post-release gemini post-tool stall validation`
2. [DONE] Git Commit: `docs: record post-release gemini post-tool stall validation` (hash: `c1320c03`)

### Stream: Gemini Terminal Leg Contract
3. [DONE] Gemini_Module: отделить progress assistant output из leg с `tool_call_request` от terminal-leg answer, чтобы pre-tool текст не считался завершением всей tool chain. Scope: `packages/Gemini_Module/src/session/gemini-turn-runner.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/session/types.ts`. Expected commit: `fix(gemini): require terminal leg answer after tool chain`
4. [DONE] Git Commit: `fix(gemini): require terminal leg answer after tool chain` (hash: `61a9cc69`)

### Stream: Gemini Post-Tool Watchdog
5. [DONE] Gemini_Module: ввести Gemini-specific longer stalled window и phase-aware timeout policy для nested post-tool legs, чтобы follow-up после successful `write_file` не обрывался тем же базовым окном, что и initial leg. Scope: `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`, `packages/Gemini_Module/src/session/gemini-turn-runner.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.ts`. Expected commit: `fix(gemini): add adaptive post-tool stalled watchdog`
6. [DONE] Git Commit: `fix(gemini): add adaptive post-tool stalled watchdog` (hash: `ab437b7a`)

### Stream: Runtime Docs Sync
7. [DONE] Docs: синхронизировать новый terminal-leg contract и post-tool watchdog policy в архитектурных документах Gemini до regression tests. Scope: `doc/SolidWorks-WorkFlow/Modules/Gemini.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/Gemini_PostTool_TerminalLeg_Architecture.md`. Expected commit: `docs(architecture): sync gemini post-tool terminal leg contract`
8. [TODO] Git Commit: `docs(architecture): sync gemini post-tool terminal leg contract` (hash: TBD)

### Stream: Regression Tests
9. [TODO] Tests: покрыть сценарии `progress -> write_file -> nested stall`, `progress -> write_file -> delayed final answer` и `terminal-leg answer -> late silent tail` без подмены terminal semantics translated thoughts. Scope: `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`, `packages/Gemini_Module/src/session/gemini-turn-runner.test.ts`, `doc/TODO/todo-plan.md`. Expected commit: `test(gemini): cover post-tool terminal leg semantics`
10. [TODO] Git Commit: `test(gemini): cover post-tool terminal leg semantics` (hash: TBD)

### Stream: Verification
11. [TODO] Verification: прогнать таргетные сборки/тесты по Gemini и затронутому Core, повторно проверить Description flow expectations и зафиксировать результат в `doc/Sessions/Session199.md`. Scope: `packages/Gemini_Module`, `packages/core`, `doc/Sessions/Session199.md`. Expected commit: `docs: record gemini post-tool stall verification results`
12. [TODO] Git Commit: `docs: record gemini post-tool stall verification results` (hash: TBD)

### Stream: Release Preparation
13. [TODO] Release: перед финальной сборкой синхронизировать `README.md`, `CHANGELOG.md`, `doc/Sessions/Session199.md` и при необходимости связанные Gemini docs, затем на чистом дереве выполнить `./scripts/build-all.sh`. Scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/Session199.md`. Expected commit: `chore(release): prepare gemini post-tool stall fix release`
14. [TODO] Git Commit: `chore(release): prepare gemini post-tool stall fix release` (hash: TBD)

### Stream: Release VSIX
15. [TODO] Release: на чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, проверить release markers и `codeai-hub-<version>.vsix`, затем зафиксировать финальный результат в `doc/Sessions/Session199.md` и `doc/TODO/todo-plan.md`. Scope: packaging + docs. Expected commit: `chore(release): finalize gemini post-tool stall fix release`
16. [TODO] Git Commit: `chore(release): finalize gemini post-tool stall fix release` (hash: TBD)
