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
2. `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`
3. `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_TurnEnd_AtomicLock_Architecture.md`
4. `doc/TODO/Archive/todo-plan-phase100-continuity-ux-release-2026-02-06.md`
5. `doc/Sessions/Session103.md`
6. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 101 — Turn-End Continuity Lock Atomicity (owner: Oleksandr, updated: 2026-02-07)

### Stream: eliminate unlock gap before continuity relock + release
1. [TODO] Docs(design): утвердить архитектурный контракт атомарного turn-end lock arbitration и синхронизировать cross-links в continuity/system docs (scope: `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_TurnEnd_AtomicLock_Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs(continuity): define turn-end atomic lock arbitration contract`)
2. [TODO] Git Commit: `docs(continuity): define turn-end atomic lock arbitration contract` (hash: TBD)
3. [TODO] Feat(core-arbitration): перенести проверку threshold/continuity decision перед unlock на границе `turn_completed` (без sequence `unlock -> relock`) (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): decide continuity before turn-end unlock`)
4. [TODO] Git Commit: `fix(core): decide continuity before turn-end unlock` (hash: TBD)
5. [TODO] Feat(core-guard): добавить server-side guard для send в old session при `rollover pending` (queue/reject policy по контракту) (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.types.ts`; expected commit message: `fix(core): guard old-session sends while rollover pending`)
6. [TODO] Git Commit: `fix(core): guard old-session sends while rollover pending` (hash: TBD)
7. [TODO] Fix(pm-stream): исключить transient unlock в PM snapshot между `turn_completed` и continuity-lock при pending decision (scope: `src/client/project-manager/components/sessions/token-usage-stream.ts`; expected commit message: `fix(pm): avoid transient unlock during continuity decision`)
8. [TODO] Git Commit: `fix(pm): avoid transient unlock during continuity decision` (hash: TBD)
9. [TODO] Fix(ui-lock): выровнять effective lock predicate в SessionView/InputPanel на период continuity decision pending (scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/input-panel.tsx`; expected commit message: `fix(ui): keep input locked until continuity decision resolves`)
10. [TODO] Git Commit: `fix(ui): keep input locked until continuity decision resolves` (hash: TBD)
11. [TODO] Test(core): добавить регрессионные тесты на отсутствие `unlock -> relock` и на send guard в old session (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit message: `test(core): cover turn-end continuity lock atomicity`)
12. [TODO] Git Commit: `test(core): cover turn-end continuity lock atomicity` (hash: TBD)
13. [TODO] Test(pm-ui): добавить регрессионные тесты, что поле не становится enabled в transition window (scope: `src/client/project-manager/components/sessions/token-usage-stream.test.ts`, `src/client/ui/src/session/input-panel.test.tsx`; expected commit message: `test(ui): prevent transient unlock between turn end and continuity lock`)
14. [TODO] Git Commit: `test(ui): prevent transient unlock between turn end and continuity lock` (hash: TBD)
15. [TODO] Docs(release): синхронизировать `README.md`, `CHANGELOG.md` и новый session report под итог Phase 101 (scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/Session103.md`; expected commit message: `docs(release): prepare notes for turn-end lock atomicity release`)
16. [TODO] Git Commit: `docs(release): prepare notes for turn-end lock atomicity release` (hash: TBD)
17. [TODO] Release: выполнить `./scripts/build-all.sh` после закрытия всех задач Stream и чистого дерева (scope: repo-wide automated release files; expected commit message: `chore(release): build-all after turn-end lock atomicity`)
18. [TODO] Git Commit: `chore(release): build-all after turn-end lock atomicity` (hash: TBD)
19. [TODO] Release: выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/артефакты и зафиксировать пути в session report (scope: repo-wide release artifacts + docs; expected commit message: `chore(release): build vsix after turn-end lock atomicity`)
20. [TODO] Git Commit: `chore(release): build vsix after turn-end lock atomicity` (hash: TBD)
