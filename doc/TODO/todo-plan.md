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

## Required documents to review before work
1. `doc/Sessions/Session198.md`
2. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
3. `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
4. `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`
5. `doc/SolidWorks-WorkFlow/Plans/Gemini_StalledTurn_And_TerminalAnswer_Architecture.md`
6. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 1 — Gemini stalled turn and terminal answer contract (owner: Oleksandr, updated: 2026-03-30)

Goal: устранить сценарий, в котором Gemini turn визуально заканчивается translated thoughts без финального user-visible assistant answer и без явного terminal failure.

### Stream: Session Report
1. [DONE] Docs: создать `doc/Sessions/Session199.md` как отчёт текущей сессии по расследованию Gemini stall, planning-доку и старту execution plan, чтобы следующая сессия могла восстановить контекст без потерь. Scope: `doc/Sessions/Session199.md`. Expected commit: `docs: add Session 199 report for gemini stalled turn investigation`
2. [DONE] Git Commit: `docs: add Session 199 report for gemini stalled turn investigation` (hash: `f2651b1d`)

### Stream: Docs Gate
3. [DONE] Docs: согласовать и при необходимости уточнить planning-док по Gemini stalled turn, включая invariant "turn не может завершаться только размышлениями". Scope: `doc/SolidWorks-WorkFlow/Plans/Gemini_StalledTurn_And_TerminalAnswer_Architecture.md`. Expected commit: `docs(architecture): approve gemini stalled turn terminal answer contract`
4. [DONE] Git Commit: `docs(architecture): approve gemini stalled turn terminal answer contract` (hash: `ba84659a`)

### Stream: Gemini Terminality Separation
5. [IN_PROGRESS] Gemini_Module: отделить `thinking`/translated thoughts от terminal assistant answer и перестать считать `assistant + tag=thinking` финальным streamed answer. Scope: `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`, `packages/Gemini_Module/src/session/gemini-turn-runner.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.ts`. Expected commit: `fix(gemini): separate thinking messages from terminal assistant answer`
6. [TODO] Git Commit: `fix(gemini): separate thinking messages from terminal assistant answer` (hash: TBD)

### Stream: Gemini Stalled Turn Policy
7. [TODO] Gemini_Module: сделать stalled-turn outcome Gemini-specific — если terminal answer уже был, late silent gap не должен ломать turn; если были только thoughts, timeout обязан вести к explicit failure. Scope: `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`, `packages/Gemini_Module/src/session/gemini-turn-runner.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.ts`. Expected commit: `fix(gemini): gate stalled turn outcome by terminal answer presence`
8. [TODO] Git Commit: `fix(gemini): gate stalled turn outcome by terminal answer presence` (hash: TBD)

### Stream: Failure Visibility In History
9. [TODO] Core: materialize-ить recoverable Gemini `turn_failed` в session/dialog history, чтобы после reload пользователь видел terminal failure рядом с последними thinking messages. Scope: `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`, `packages/core/src/remote-bridge/handlers/dialog-history-service.ts`. Expected commit: `fix(session): persist gemini stalled turn failures in history`
10. [TODO] Git Commit: `fix(session): persist gemini stalled turn failures in history` (hash: TBD)

### Stream: Regression Tests
11. [TODO] Tests: покрыть сценарии `thoughts-only stall`, `answer-then-stall`, `tool-followup with late thoughts` без моков terminal semantics. Scope: `packages/Gemini_Module/src/session/gemini-turn-runner.test.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`, `packages/core/src/remote-bridge/handlers/dialog-history-service.ts`. Expected commit: `test(gemini): cover terminal answer and stalled turn semantics`
12. [TODO] Git Commit: `test(gemini): cover terminal answer and stalled turn semantics` (hash: TBD)

### Stream: Verification
13. [TODO] Verification: прогнать таргетные тесты/сборки по Gemini и затронутому Core, затем зафиксировать результаты в docs/session report. Scope: `packages/Gemini_Module`, `packages/core`, `doc/Sessions/`. Expected commit: `docs: record gemini stalled turn verification results`
14. [TODO] Git Commit: `docs: record gemini stalled turn verification results` (hash: TBD)

### Stream: Release Build
15. [TODO] Release: после закрытия всех стримов и чистого дерева выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, проверить tarball/VSIX и зафиксировать результат в `doc/Sessions/`. Scope: release scripts + manifests + docs. Expected commit: `chore(release): build gemini stalled turn fix release`
16. [TODO] Git Commit: `chore(release): build gemini stalled turn fix release` (hash: TBD)
