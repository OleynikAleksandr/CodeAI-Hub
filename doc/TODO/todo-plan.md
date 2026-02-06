# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Gates после каждой микрозадачи**: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка/тест затронутых пакетов.
- После зелёных гейтов — Git Commit, затем сразу обновляем статусы/хеши в `doc/TODO/todo-plan.md`.
- Любые изменения логики/архитектуры синхронно отражаются в документации (`doc/Project_Docs/**`) в том же коммите.
- Любая фаза завершается только после чистого `git status` и фиксации session report.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/SessionContinuity/SessionContinuity_Architecture.md`
3. `doc/Project_Docs/SessionContinuity/VirtualConversation_SeamlessContinuity_Architecture.md`
4. `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`
5. `doc/TODO/todo-plan.md` (THIS FILE)
6. `doc/Sessions/Session097.md`
7. `doc/Sessions/Session098.md`

---

## Phase 99 — Flow Node Continuity Input Lock Contract (Variant 2) (owner: Oleksandr, updated: 2026-02-06)

### MVP Definition (must)
- Исключить окно разблокировки ввода пользователя между `new_session_created` и фактическим завершением bootstrap-turn в новой continuity session.
- Ввести явный stream-контракт `continuity_lock` как source-of-truth блокировки ввода в PM/UI.
- Сохранять подкапотное поведение rollover (без user-facing сообщений и без показа internal ack).
- Гарантировать снятие lock в success/failure/timeout сценариях (без deadlock в UI).

### Stream: core continuity lock contract
1. [DONE] Feat(core-contract): добавить контракт stream-event `data.kind=continuity_lock` и helper-эмиттер в `SessionRequestHandler` (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `feat(core): add continuity_lock stream contract`)
2. [DONE] Git Commit: `feat(core): add continuity_lock stream contract` (hash: c1f7cffb)
3. [DONE] Feat(core-rollover): интегрировать lock-lifecycle в flow-node rollover (`locked` на trigger/report/bootstrap, хранение rollover-id/target-session context) (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `feat(core): wire continuity lock lifecycle into flow-node rollover`)
4. [DONE] Git Commit: `feat(core): wire continuity lock lifecycle into flow-node rollover` (hash: 42233ceb)
5. [DONE] Feat(core-rollover): реализовать deterministic unlock (`resume_ready` на first bootstrap completion, `resume_failed`/`resume_timeout` fallback) (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): unlock continuity lock on bootstrap completion and fallback`)
6. [DONE] Git Commit: `fix(core): unlock continuity lock on bootstrap completion and fallback` (hash: 6c1c92e6)

### Stream: pm/ui lock consumption
7. [DONE] Refactor(types-ui): расширить `SessionStatusInfo` и default snapshot полем `continuityLock` (scope: `src/types/session.ts`, `src/client/ui/src/session/helpers.ts`; expected commit message: `refactor(ui): add continuity lock state to session snapshot`)
8. [DONE] Git Commit: `refactor(ui): add continuity lock state to session snapshot` (hash: 167bd828)
9. [DONE] Feat(pm-stream): научить `token-usage-stream` обрабатывать `continuity_lock` и не терять lock при фазах rollover/new session switch (scope: `src/client/project-manager/components/sessions/token-usage-stream.ts`; expected commit message: `feat(pm): consume continuity lock stream events`)
10. [DONE] Git Commit: `feat(pm): consume continuity lock stream events` (hash: 9541d337)
11. [DONE] Fix(ui-input): блокировать `InputPanel` при активном continuity lock и показывать continuation placeholder на период bootstrap (scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/input-panel.tsx`; expected commit message: `fix(ui): keep input locked during continuity bootstrap`)
12. [DONE] Git Commit: `fix(ui): keep input locked during continuity bootstrap` (hash: f4bd3144)
13. [DONE] Fix(ui-queue): маршрутизировать submit во время continuity lock в queued-send path (без потери пользовательского текста) (scope: `src/client/ui/src/session/session-view-helpers.tsx`; expected commit message: `fix(ui): queue messages while continuity lock is active`)
14. [DONE] Git Commit: `fix(ui): queue messages while continuity lock is active` (hash: cbe1e3b7)

### Stream: tests and verification
15. [DONE] Test(core): добавить регрессионный тест последовательности lock/unlock для flow-node rollover old->new session (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit message: `test(core): cover continuity lock lifecycle across session rollover`)
16. [DONE] Git Commit: `test(core): cover continuity lock lifecycle across session rollover` (hash: f278d0ad)
17. [DONE] Test(pm-ui): добавить регрессионный тест, что ввод остаётся заблокированным до unlock-события (scope: `src/client/project-manager/components/sessions/token-usage-stream.test.ts`, `src/client/ui/src/session/input-panel.test.tsx`; expected commit message: `test(ui): guard input lock during continuity session switch`)
18. [DONE] Git Commit: `test(ui): guard input lock during continuity session switch` (hash: 1fb2a1ba)
19. [DONE] Verify(qa): прогнать обязательные Gates + таргетные команды (`build --workspace core`, `build:project-manager`, `build:webview`, `typecheck:webview`) и зафиксировать результаты в документах (scope: repo-wide commands + docs); expected commit message: `chore(qa): verify continuity lock contract gates`)
20. [DONE] Git Commit: `chore(qa): verify continuity lock contract gates` (hash: 30399b11)

#### QA results (2026-02-06)
- `./scripts/check-architecture.sh`: PASS (warnings only; 22 файлов в зоне 250-300 строк, нарушений >300 нет).
- `npx ultracite check`: PASS.
- `npx ts-prune`: PASS (baseline report unchanged).
- `npx jscpd --threshold 3 ...`: PASS (`2.41%`).
- `npm run check:links`: PASS.
- `npm run build --workspace @codeai-hub/core`: PASS.
- `npm run build:project-manager`: PASS.
- `npm run build:webview`: PASS.
- `npm run typecheck:webview`: PASS.
- `npm run test --workspace @codeai-hub/core`: PASS (`3/3`).
- `npx tsx --test src/client/project-manager/components/sessions/token-usage-stream.test.ts src/client/ui/src/session/input-panel.test.tsx`: PASS (`6/6`).

### Stream: wrap-up and release-readiness
21. [DONE] Docs(system): синхронизировать `SystemArchitecture.md` и continuity docs под новый `continuity_lock` контракт (scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/SessionContinuity/SessionContinuity_Architecture.md`; expected commit message: `docs(system): document continuity lock contract`)
22. [IN_PROGRESS] Git Commit: `docs(system): document continuity lock contract` (hash: TBD)
23. [TODO] Docs(session): подготовить следующий session report с таймлайном событий lock/unlock и QA выводом (scope: `doc/Sessions/Session099.md`; expected commit message: `docs(session): add Session099 continuity lock implementation report`)
24. [TODO] Git Commit: `docs(session): add Session099 continuity lock implementation report` (hash: TBD)

### Stream: phase-complete release build
25. [TODO] Docs(release): перед релизной сборкой актуализировать `README.md` и `CHANGELOG.md` под итог Phase 99 (scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs(release): prepare notes for continuity lock release`)
26. [TODO] Git Commit: `docs(release): prepare notes for continuity lock release` (hash: TBD)
27. [TODO] Release: выполнить `./scripts/build-all.sh` после закрытия всех Stream Phase 99 и чистого дерева (scope: repo-wide automated release files; expected commit message: `chore(release): build-all after phase99 continuity lock`)
28. [TODO] Git Commit: `chore(release): build-all after phase99 continuity lock` (hash: TBD)
29. [TODO] Release: выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/артефакты и зафиксировать пути в session report (scope: repo-wide release artifacts + docs; expected commit message: `chore(release): build vsix after phase99 continuity lock`)
30. [TODO] Git Commit: `chore(release): build vsix after phase99 continuity lock` (hash: TBD)
