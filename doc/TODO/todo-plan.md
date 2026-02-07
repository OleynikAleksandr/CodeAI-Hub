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
5. `doc/Sessions/Session104.md`
6. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 101 — Turn-End Continuity Lock Atomicity (owner: Oleksandr, updated: 2026-02-07)

### Stream: eliminate unlock gap before continuity relock + release
1. [DONE] Docs(design): утвердить архитектурный контракт атомарного turn-end lock arbitration и синхронизировать cross-links в continuity/system docs (scope: `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_TurnEnd_AtomicLock_Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs(continuity): define turn-end atomic lock arbitration contract`)
2. [DONE] Git Commit: `docs(continuity): define turn-end atomic lock arbitration contract` (hash: b96c6485)
3. [DONE] Feat(core-arbitration): перенести проверку threshold/continuity decision перед unlock на границе `turn_completed` (без sequence `unlock -> relock`) (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): decide continuity before turn-end unlock`)
4. [DONE] Git Commit: `fix(core): decide continuity before turn-end unlock` (hash: b58d7904)
5. [DONE] Feat(core-guard): добавить server-side guard для send в old session при `rollover pending` (queue/reject policy по контракту) (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.types.ts`; expected commit message: `fix(core): guard old-session sends while rollover pending`)
6. [DONE] Git Commit: `fix(core): guard old-session sends while rollover pending` (hash: a0ce89e9)
7. [DONE] Fix(pm-stream): исключить transient unlock в PM snapshot между `turn_completed` и continuity-lock при pending decision (scope: `src/client/project-manager/components/sessions/token-usage-stream.ts`; expected commit message: `fix(pm): avoid transient unlock during continuity decision`)
8. [DONE] Git Commit: `fix(pm): avoid transient unlock during continuity decision` (hash: 7c0ebcf1)
9. [DONE] Fix(ui-lock): выровнять effective lock predicate в SessionView/InputPanel на период continuity decision pending (scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/input-panel.tsx`; expected commit message: `fix(ui): keep input locked until continuity decision resolves`)
10. [DONE] Git Commit: `fix(ui): keep input locked until continuity decision resolves` (hash: 3a57a123)
11. [DONE] Test(core): добавить регрессионные тесты на отсутствие `unlock -> relock` и на send guard в old session (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit message: `test(core): cover turn-end continuity lock atomicity`)
12. [DONE] Git Commit: `test(core): cover turn-end continuity lock atomicity` (hash: 2119f937)
13. [DONE] Test(pm-ui): добавить регрессионные тесты, что поле не становится enabled в transition window (scope: `src/client/project-manager/components/sessions/token-usage-stream.test.ts`, `src/client/ui/src/session/input-panel.test.tsx`; expected commit message: `test(ui): prevent transient unlock between turn end and continuity lock`)
14. [DONE] Git Commit: `test(ui): prevent transient unlock between turn end and continuity lock` (hash: 777e4be9)
15. [DONE] Docs(release): синхронизировать `README.md`, `CHANGELOG.md` и новый session report под итог Phase 101 (scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/Session104.md`; expected commit message: `docs(release): prepare notes for turn-end lock atomicity release`)
16. [DONE] Git Commit: `docs(release): prepare notes for turn-end lock atomicity release` (hash: 56e80735)
17. [DONE] Release: выполнить `./scripts/build-all.sh` после закрытия всех задач Stream и чистого дерева (scope: repo-wide automated release files; expected commit message: `chore(release): build-all after turn-end lock atomicity`)
18. [DONE] Git Commit: `chore(release): build-all after turn-end lock atomicity` (hash: a24af8f2)
19. [DONE] Release: выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/артефакты и зафиксировать пути в session report (scope: repo-wide release artifacts + docs; expected commit message: `chore(release): build vsix after turn-end lock atomicity`)
20. [DONE] Git Commit: `chore(release): build vsix after turn-end lock atomicity` (hash: 863fb0f4)

---

## Phase 102 — Continuity Unlock + ACK Normalization Hotfix (owner: Oleksandr, updated: 2026-02-07)

### Stream: fix target-session unlock regression + normalize continuity ACK + release
1. [DONE] Docs(design): зафиксировать hotfix-контракт по снятию lock после `continuity_lock=unlocked` и унификации internal ACK-фразы во всех continuity templates (scope: `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_TurnEnd_AtomicLock_Architecture.md`, `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`; expected commit message: `docs(continuity): define unlock resolution and ack normalization hotfix contract`)
2. [DONE] Git Commit: `docs(continuity): define unlock resolution and ack normalization hotfix contract` (hash: TBD)
3. [TODO] Fix(pm-rollover): устранить залипание `blocked` в новой session после `continuity_lock=unlocked` при `rollover.phase=resume_sent` (scope: `src/client/project-manager/components/sessions/token-usage-stream.ts`; expected commit message: `fix(pm): clear rollover pending state after continuity unlock`)
4. [TODO] Git Commit: `fix(pm): clear rollover pending state after continuity unlock` (hash: TBD)
5. [TODO] Fix(ui-lock): синхронизировать lock-предикат SessionView с terminal-семантикой rollover после unlock (без вечного pending по `resume_sent`) (scope: `src/client/ui/src/session/session-view.tsx`; expected commit message: `fix(ui): resolve effective lock after rollover unlock`)
6. [TODO] Git Commit: `fix(ui): resolve effective lock after rollover unlock` (hash: TBD)
7. [TODO] Fix(core-templates): перевести continuity ACK на `Ready to continue working.` во всех трёх flow continuity templates (источник релизной синхронизации templatesDir) (scope: `packages/core/src/flow-node-continuity/template-loader.ts`, `assets/flow/continuity/create-report-doc.md`, `assets/flow/continuity/create-report-code.md`; expected commit message: `fix(core): normalize continuity ack phrase across all templates`)
8. [TODO] Git Commit: `fix(core): normalize continuity ack phrase across all templates` (hash: TBD)
9. [TODO] Fix(ui-filter): расширить фильтрацию internal continuity ACK (включая markdown-backtick вариант legacy token), чтобы служебная фраза не появлялась в диалоге (scope: `src/client/ui/src/session/virtual-conversation.tsx`; expected commit message: `fix(ui): suppress legacy continuity ack token variants in virtual conversation`)
10. [TODO] Git Commit: `fix(ui): suppress legacy continuity ack token variants in virtual conversation` (hash: TBD)
11. [TODO] Test(pm-ui): добавить регрессии на (a) unlock после `resume_sent + continuity_lock(unlocked)` и (b) suppression legacy/new ACK variants в virtual conversation (scope: `src/client/project-manager/components/sessions/token-usage-stream.test.ts`, `src/client/ui/src/session/input-panel.test.tsx`, `src/client/ui/src/session/virtual-conversation.test.tsx`; expected commit message: `test(ui): cover rollover unlock release and continuity ack suppression`)
12. [TODO] Git Commit: `test(ui): cover rollover unlock release and continuity ack suppression` (hash: TBD)
13. [TODO] Docs(release): синхронизировать `README.md`, `CHANGELOG.md` и новый session report под hotfix Phase 102 (scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/Session105.md`; expected commit message: `docs(release): prepare notes for continuity unlock and ack hotfix`)
14. [TODO] Git Commit: `docs(release): prepare notes for continuity unlock and ack hotfix` (hash: TBD)
15. [TODO] Release: выполнить `./scripts/build-all.sh` после закрытия всех задач Stream и чистого дерева (scope: repo-wide automated release files; expected commit message: `chore(release): build-all after continuity hotfix`)
16. [TODO] Git Commit: `chore(release): build-all after continuity hotfix` (hash: TBD)
17. [TODO] Release: выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/артефакты и зафиксировать пути в session report (scope: repo-wide release artifacts + docs; expected commit message: `chore(release): build vsix after continuity hotfix`)
18. [TODO] Git Commit: `chore(release): build vsix after continuity hotfix` (hash: TBD)
