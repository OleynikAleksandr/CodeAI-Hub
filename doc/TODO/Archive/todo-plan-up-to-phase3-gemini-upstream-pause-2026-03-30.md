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
- **Релизный нюанс для этого scope:** перед `./scripts/build-all.sh` обязательно синхронизировать `README.md`, `CHANGELOG.md`, `doc/Sessions/Archive/Session199.md` и затронутые Gemini-архитектурные документы.

## Required documents to review before work
1. `doc/Sessions/Archive/Session199.md`
2. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
3. `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
4. `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`
5. `doc/SolidWorks-WorkFlow/Plans/Archive/Gemini_PostTool_TerminalLeg_Architecture.md`
6. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 1 — Gemini post-tool terminal leg and adaptive watchdog (owner: Oleksandr, updated: 2026-03-30)

Goal: устранить сценарий, в котором Gemini успевает создать `Final_Description.md`, но затем зависает на nested post-tool follow-up и падает по stalled timeout до финального ответа или точечных вопросов пользователю.

### Stream: Session Report
1. [DONE] Docs: обновить `doc/Sessions/Archive/Session199.md` пост-релизной валидацией `1.1.848`, зафиксировать новый provider session `3a6fb414-22d4-4a43-a7f9-7e5f5cb92d07`, `Final_Description.md` materialization и вывод о том, что последний assistant message был progress-output, а не terminal answer. Scope: `doc/Sessions/Archive/Session199.md`. Expected commit: `docs: record post-release gemini post-tool stall validation`
2. [DONE] Git Commit: `docs: record post-release gemini post-tool stall validation` (hash: `c1320c03`)

### Stream: Gemini Terminal Leg Contract
3. [DONE] Gemini_Module: отделить progress assistant output из leg с `tool_call_request` от terminal-leg answer, чтобы pre-tool текст не считался завершением всей tool chain. Scope: `packages/Gemini_Module/src/session/gemini-turn-runner.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/session/types.ts`. Expected commit: `fix(gemini): require terminal leg answer after tool chain`
4. [DONE] Git Commit: `fix(gemini): require terminal leg answer after tool chain` (hash: `61a9cc69`)

### Stream: Gemini Post-Tool Watchdog
5. [DONE] Gemini_Module: ввести Gemini-specific longer stalled window и phase-aware timeout policy для nested post-tool legs, чтобы follow-up после successful `write_file` не обрывался тем же базовым окном, что и initial leg. Scope: `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`, `packages/Gemini_Module/src/session/gemini-turn-runner.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.ts`. Expected commit: `fix(gemini): add adaptive post-tool stalled watchdog`
6. [DONE] Git Commit: `fix(gemini): add adaptive post-tool stalled watchdog` (hash: `ab437b7a`)

### Stream: Runtime Docs Sync
7. [DONE] Docs: синхронизировать новый terminal-leg contract и post-tool watchdog policy в архитектурных документах Gemini до regression tests. Scope: `doc/SolidWorks-WorkFlow/Modules/Gemini.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Gemini_PostTool_TerminalLeg_Architecture.md`. Expected commit: `docs(architecture): sync gemini post-tool terminal leg contract`
8. [DONE] Git Commit: `docs(architecture): sync gemini post-tool terminal leg contract` (hash: `691c6f57`)

### Stream: Regression Tests
9. [DONE] Tests: покрыть сценарии `progress -> write_file -> nested stall`, `progress -> write_file -> delayed final answer` и `terminal-leg answer -> late silent tail` без подмены terminal semantics translated thoughts. Scope: `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.test-helpers.ts`, `doc/TODO/todo-plan.md`. Expected commit: `test(gemini): cover post-tool terminal leg semantics`
10. [DONE] Git Commit: `test(gemini): cover post-tool terminal leg semantics` (hash: `a39e623e`)

### Stream: Verification
11. [DONE] Verification: прогнать таргетные сборки/тесты по Gemini и затронутому Core, повторно проверить Description flow expectations и зафиксировать результат в `doc/Sessions/Archive/Session199.md`. Scope: `packages/Gemini_Module`, `packages/core`, `doc/Sessions/Archive/Session199.md`. Expected commit: `docs: record gemini post-tool stall verification results`
12. [DONE] Git Commit: `docs: record gemini post-tool stall verification results` (hash: `6782e21b`)

### Stream: Release Docs Sync
13. [DONE] Release Docs: синхронизировать `README.md` и `CHANGELOG.md` под следующий patch release `1.1.849`, чтобы release-facing docs совпадали с post-tool Gemini remediation до запуска release scripts. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs(release): sync 1.1.849 release notes`
14. [DONE] Git Commit: `docs(release): sync 1.1.849 release notes` (hash: `1bbf3b19`)

### Stream: Release Build-All
15. [DONE] Release Build: на чистом дереве выполнить `./scripts/build-all.sh`, зафиксировать version bump и появление `1.1.849` tarball-артефактов, затем подготовить clean baseline для VSIX packaging. Scope: release/version files + generated manifests/artifacts. Expected commit: `chore(release): prepare 1.1.849 artifacts`
16. [DONE] Git Commit: `chore(release): prepare 1.1.849 artifacts` (hash: `495e9d60`)

### Stream: Release VSIX
17. [DONE] Release VSIX: на чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, проверить release markers и `codeai-hub-1.1.849.vsix`, затем синхронизировать `doc/Sessions/Archive/Session199.md` и `doc/TODO/todo-plan.md` с финальным результатом упаковки. Scope: packaging output + `doc/Sessions/Archive/Session199.md` + `doc/TODO/todo-plan.md`. Expected commit: `chore(release): finalize 1.1.849 vsix`
18. [DONE] Git Commit: `chore(release): finalize 1.1.849 vsix` (hash: `e0572eb2`)

---

## Phase 2 — Gemini deferred final flush deduplication and release 1.1.850 (owner: Oleksandr, updated: 2026-03-30)

Goal: устранить гонку, при которой финальный Gemini answer уже получен один раз от provider, но runtime дублирует его из-за отложенного flush translated thoughts и fallback aggregate emit.

### Stream: Architecture Intake
19. [DONE] Docs: зафиксировать duplicate-final-answer root cause и новый final flush contract Gemini в planning-доке, затем расширить текущий `todo-plan` новым Phase под remediation и релиз `1.1.850`. Scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Gemini_PostTool_TerminalLeg_Architecture.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs(architecture): define gemini final flush dedup contract`
20. [DONE] Git Commit: `docs(architecture): define gemini final flush dedup contract` (hash: `0e1b72d2`)

### Stream: Deferred Flush Plumbing
21. [DONE] Gemini_Module: добавить явный deferred-flush/drain для translated thoughts и final assistant segment, чтобы ordering внутри finished leg оставался deterministic до возврата из message processor. Scope: `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`, `packages/Gemini_Module/src/messaging/message-processor.ts`, `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`. Expected commit: `fix(gemini): serialize final segment flush after translated thoughts`
22. [DONE] Git Commit: `fix(gemini): serialize final segment flush after translated thoughts` (hash: `13b66272`)

### Stream: Turn Runner Finalization
23. [DONE] Gemini_Module: дождаться deferred Gemini dialog emits до снятия assistant segment listener, чтобы fallback aggregate emit не дублировал реальный terminal answer. Scope: `packages/Gemini_Module/src/session/gemini-turn-runner.ts`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `fix(gemini): await deferred final segment before fallback`
24. [DONE] Git Commit: `fix(gemini): await deferred final segment before fallback` (hash: `a0620fa4`)

### Stream: Regression Tests
25. [DONE] Tests: покрыть сценарий late translated thinking перед final answer и убедиться, что финальный assistant segment materialize-ится ровно один раз без aggregate duplicate. Scope: `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`, `doc/TODO/todo-plan.md`. Expected commit: `test(gemini): cover translated thought final answer dedup`
26. [DONE] Git Commit: `test(gemini): cover translated thought final answer dedup` (hash: `d1d99e02`)

### Stream: Verification
27. [DONE] Verification: прогнать таргетную сборку Gemini и focused regression tests, затем зафиксировать результаты дедупликации в session report до релизной подготовки. Scope: `packages/Gemini_Module`, `doc/Sessions/Archive/Session199.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs: record gemini final answer dedup verification`
28. [DONE] Git Commit: `docs: record gemini final answer dedup verification` (hash: `9c0586a5`)

### Stream: Release Docs Sync
29. [DONE] Release Docs: синхронизировать `README.md` и `CHANGELOG.md` под patch release `1.1.850`, чтобы release-facing docs отражали Gemini final answer deduplication до запуска release scripts. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs(release): sync 1.1.850 release notes`
30. [DONE] Git Commit: `docs(release): sync 1.1.850 release notes` (hash: `7eb2bffb`)

### Stream: Release Build-All
31. [DONE] Release Build: на чистом дереве выполнить `./scripts/build-all.sh`, зафиксировать version bump и fresh `1.1.850` tarball-артефакты, затем подготовить clean baseline для VSIX packaging. Scope: release/version files + generated manifests/artifacts. Expected commit: `chore(release): prepare 1.1.850 artifacts`
32. [DONE] Git Commit: `chore(release): prepare 1.1.850 artifacts` (hash: `be403511`)

### Stream: Release VSIX
33. [DONE] Release VSIX: на чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, проверить release markers и `codeai-hub-1.1.850.vsix`, затем синхронизировать `doc/Sessions/Archive/Session200.md` и `doc/TODO/todo-plan.md` с финальным результатом упаковки. Scope: packaging output + `doc/Sessions/Archive/Session200.md` + `doc/TODO/todo-plan.md`. Expected commit: `chore(release): finalize 1.1.850 vsix`
34. [DONE] Git Commit: `chore(release): finalize 1.1.850 vsix` (hash: `2160ba28`)

---

## Phase 3 — Gemini upstream pause closure and planning reset (owner: Oleksandr, updated: 2026-03-30)

Goal: синхронизировать session reports и active planning trail с фактом завершённого локального Gemini remediation на `1.1.850`, зафиксировать upstream pause и подготовить чистую точку входа для следующего утверждённого scope.

### Stream: Closure Intake
35. [DONE] Docs: расширить planning-док closure-note про `1.1.850` и upstream pause, закрыть пропущенный release commit `2160ba28` и добавить Phase 3 в active `todo-plan`. Scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Gemini_PostTool_TerminalLeg_Architecture.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs(architecture): note gemini upstream pause closure`
36. [DONE] Git Commit: `docs(architecture): note gemini upstream pause closure` (hash: `802ed541`)

### Stream: Session Reports Sync
37. [DONE] Docs: синхронизировать `doc/Sessions/Archive/Session200.md` с фактическим release-finalize commit и завести `doc/Sessions/Archive/Session201.md` как canonical report upstream pause, одновременно обновив статусы текущего `todo-plan`. Scope: `doc/Sessions/Archive/Session200.md`, `doc/Sessions/Archive/Session201.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs: sync gemini release and pause reports`
38. [DONE] Git Commit: `docs: sync gemini release and pause reports` (hash: `e67e4019`)

### Stream: Archive Active Gemini Plan
39. [DONE] Docs: перенести завершённый Gemini-focused `todo-plan` в `doc/TODO/Archive/` и создать новый placeholder `doc/TODO/todo-plan.md` с правилом, что следующий execution scope открывается только после нового approved planning-дока. Scope: `doc/TODO/Archive/todo-plan-up-to-phase3-gemini-upstream-pause-2026-03-30.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs: archive gemini todo plan after upstream pause`
40. [DONE] Git Commit: `docs: archive gemini todo plan after upstream pause` (hash: `d12d6a20`)

### Stream: Session Handoff
41. [DONE] Docs: создать `doc/Sessions/Archive/Session202.md` по итогам cleanup-сессии и закрыть hash bookkeeping в archived Gemini plan. Scope: `doc/Sessions/Archive/Session202.md`, `doc/TODO/Archive/todo-plan-up-to-phase3-gemini-upstream-pause-2026-03-30.md`. Expected commit: `docs: record session 202 handoff`
42. [TODO] Git Commit: `docs: record session 202 handoff` (hash: TBD)
