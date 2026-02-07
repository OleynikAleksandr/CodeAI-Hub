# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Gates после каждой микрозадачи**: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка/тест затронутых пакетов.
- После зелёных гейтов — Git Commit, затем сразу обновляем статусы/хеши в `doc/TODO/todo-plan.md`.
- Любые изменения логики/архитектуры синхронно отражаются в документации (`doc/Project_Docs/**`) в том же коммите.
- Любая фаза завершается только после чистого `git status` и фиксации session report.
- **Критический non-regression**: нельзя ломать возможность открыть любую существующую сессию из дерева workspace после перезапуска Core/компьютера.
- **Workspace scope (CRITICAL)**: в Project Manager любые `session:*` события, вкладки и активная сессия должны быть строго scoped по выбранному `workspacePath` (абсолютный путь). `workspaceSlug` — metadata/workflow id, но не ключ изоляции.
- **Defence-in-depth (CRITICAL)**: даже при ошибке bridge или гонках событий UI не должен рендерить/фокусить/отправлять сообщения в out-of-scope сессию.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_InputLock_Contract_Architecture.md`
3. `doc/Project_Docs/SessionContinuity/FlowNodeContinuity_TurnEnd_AtomicLock_Architecture.md`
4. `doc/Sessions/Session109.md`
5. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 104 — Project Manager Workspace-Scoped Session/Event Isolation (owner: Oleksandr, updated: 2026-02-07)

### Stream: design contract for strict workspace isolation + persistence non-regression
1. [DONE] Docs(design): зафиксировать архитектурный контракт строгой workspace-изоляции для PM/Core (видимость только выбранного workspace; scope key = `workspacePath` absolute; scoped delivery всех `session:*` включая `session:created|message|history|binding|deleted|stream|error`; active session invariants + reconciliation; hard send guard; defence-in-depth UI-side filter; ordering: PM отправляет `workspace:scope:set` немедленно при выборе workspace и ДО `workspace-activate`/resume/create, повторяет на reconnect и сбрасывает при отсутствии выбранного workspace; race-avoidance: определить детерминированный способ не потерять resume/`session:created` при переключении scope, например через ack/handshake или через возврат resumed session в HTTP-ответе `workspace-activate`) и синхронизировать SystemArchitecture (scope: `doc/Project_Docs/SessionIsolation/ProjectManager_WorkspaceScopedSessionIsolation_Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs(architecture): define workspace-scoped session isolation contract for project manager`)
2. [DONE] Git Commit: `docs(architecture): define workspace-scoped session isolation contract for project manager` (hash: 5ae2d255)

### Stream: PM UI hard guards against cross-workspace session focus leaks
3. [DONE] Fix(pm-focus): убрать авто-фокус на `session:created` вне текущего workspace; активная сессия может меняться автоматически только для in-scope событий выбранного workspace (scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit message: `fix(pm): prevent cross-workspace auto-focus on foreign session-created events`)
4. [DONE] Git Commit: `fix(pm): prevent cross-workspace auto-focus on foreign session-created events` (hash: 9cb9b650)
5. [DONE] Fix(pm-guard): добавить deterministic reconciliation `activeSessionId` при смене workspace и render-guard (PM не рендерит active session вне выбранного workspace даже если `activeSessionId` указывает на неё); добавить hard send-guard от отправки в out-of-scope session (scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/sessions/session-message-sender.ts`; expected commit message: `fix(pm): enforce active-session scope reconciliation and out-of-scope guards`)
6. [DONE] Git Commit: `fix(pm): enforce active-session scope reconciliation and out-of-scope guards` (hash: 02b4ef57)
7. [DONE] Test(pm-ui): добавить регрессии на кейс «переключили workspace, прилетел foreign `session:created`, UI не показывает/не активирует чужую сессию и не даёт в неё отправить» (scope: `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`, `src/client/project-manager/components/sessions/session-stream.test.ts`; expected commit message: `test(pm): cover cross-workspace ghost-session prevention on stream events`)
8. [DONE] Git Commit: `test(pm): cover cross-workspace ghost-session prevention on stream events` (hash: 38f89788)

### Stream: Core/Bridge scoped delivery for multi-workspace high-concurrency stability
9. [DONE] Feat(bridge-protocol): добавить протокол workspace scope для PM клиента (`workspace:scope:set` с ключом `workspacePath` absolute + опциональным `workspaceSlug` как metadata) и соответствующие типы сообщений PM/Core (scope: `src/client/project-manager/core-stream-message-types.ts`, `src/client/project-manager/api.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit message: `feat(bridge): add workspace scope message contract for project manager clients`)
10. [DONE] Git Commit: `feat(bridge): add workspace scope message contract for project manager clients` (hash: 3745f892)
11. [DONE] Feat(core-delivery): реализовать scoped delivery/broadcast `session:*` событий по workspace scope клиента (без влияния на unscoped каналы: проекты/настройки/статус; при отсутствии scope — default безопасное поведение: не слать `session:*` в PM) (scope: `packages/core/src/remote-bridge/handlers/websocket-manager.ts`, `packages/core/src/remote-bridge/index.ts`; expected commit message: `fix(core): scope session event delivery by selected workspace for pm clients`)
12. [DONE] Git Commit: `fix(core): scope session event delivery by selected workspace for pm clients` (hash: 1952b667)
13. [DONE] Feat(pm-scope-sync): при выборе workspace отправлять в Core актуальный scope немедленно и ДО `workspace-activate`; повторять `workspace:scope:set` после reconnect (initial handshake) и сбрасывать scope при отсутствии выбранного workspace (scope: `src/client/project-manager/components/layout/main-layout.tsx`, `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `feat(pm): sync selected workspace scope to core bridge`)
14. [DONE] Git Commit: `feat(pm): sync selected workspace scope to core bridge` (hash: c12afc43)
15. [TODO] Test(core-bridge): покрыть тестами scoped delivery при конкурентных сессиях в нескольких workspace (никаких cross-workspace `session:created/session:stream` утечек в PM scope) (scope: `packages/core/src/remote-bridge/handlers/websocket-manager.test.ts`, `packages/core/src/remote-bridge/index.test.ts`; expected commit message: `test(core): validate workspace-scoped bridge delivery under concurrent sessions`)
16. [TODO] Git Commit: `test(core): validate workspace-scoped bridge delivery under concurrent sessions` (hash: TBD)

### Stream: non-regression — reopen/resume sessions after restart must remain intact
17. [TODO] Test(non-regression): покрыть reopen/resume из дерева после перезапуска (workspace selection -> `workspace:scope:set` -> `workspace-activate` -> deterministic resume/visibility reviewer session); зафиксировать, что изоляция не ломает текущий path `workspace-activate` + `reviewer-session-visibility` + resume intent (scope: `src/client/project-manager/components/sessions/reviewer-session-visibility.test.ts`, `packages/core/src/remote-bridge/handlers/workspace-activate-service.test.ts`; expected commit message: `test(non-regression): preserve workspace-tree reopen and reviewer resume after restart`)
18. [TODO] Git Commit: `test(non-regression): preserve workspace-tree reopen and reviewer resume after restart` (hash: TBD)
19. [DONE] Fix(non-regression): добавить явный `workspace:scope:set -> workspace:scope:ack` handshake перед `pm:session:resume` (focus/create только после `ack(applied)` в нужный `workspacePath`) и унифицировать scope-sync helper для `workspace-activate` и resume ordering (scope: `src/client/project-manager/services/workspace-scope-handshake.ts`, `src/client/project-manager/components/layout/workspace-scope-sync.ts`, `src/client/project-manager/components/sessions/session-resume-intent.ts`; expected commit message: `fix(non-regression): keep restart resume compatibility with scoped workspace isolation`)
20. [DONE] Git Commit: `fix(non-regression): keep restart resume compatibility with scoped workspace isolation` (hash: f6120a0b)

### Stream: release build (Phase 104)
21. [TODO] Docs(release): синхронизировать `README.md`, `CHANGELOG.md` и новый session report под итог Phase 104 (scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/Session110.md`; expected commit message: `docs(release): prepare notes for workspace-scoped session isolation release`)
22. [TODO] Git Commit: `docs(release): prepare notes for workspace-scoped session isolation release` (hash: TBD)
23. [TODO] Release: выполнить `./scripts/build-all.sh` после закрытия всех задач Stream и чистого дерева (scope: repo-wide automated release files; expected commit message: `chore(release): build-all after workspace-scoped session isolation`)
24. [TODO] Git Commit: `chore(release): build-all after workspace-scoped session isolation` (hash: TBD)
25. [TODO] Release: выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/артефакты и зафиксировать пути в session report (scope: repo-wide release artifacts + docs; expected commit message: `chore(release): build vsix after workspace-scoped session isolation`)
26. [TODO] Git Commit: `chore(release): build vsix after workspace-scoped session isolation` (hash: TBD)
