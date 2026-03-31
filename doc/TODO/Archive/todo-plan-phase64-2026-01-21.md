# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase несколько Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
2. `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/Core/SessionContinuity_Architecture.md`
4. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
5. `doc/Sessions/Archive/Session027.md`
6. `doc/TODO/Archive/todo-plan-phase63-2026-01-21.md` (архив предыдущего плана)
7. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 64 — Project Manager: Resume Session = Focus + History (owner: Oleksandr, updated: 2026-01-21)

### Stream: Design — UX контракт “Resume без дублей”
1. [DONE] Docs: зафиксировать контракт клика по `Session` в дереве: (а) если сессия с тем же `providerId + providerSessionId` уже существует в списке — НЕ создавать новую, а фокус/активация; (б) если не существует — создать/resume и сразу подгрузить историю из JSONL (unified-session). Дополнительно: “закрыть сессию” в UI = скрыть локально (не удалять session record в Core) — scope: `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`; expected commit message: `docs(project-manager): define resume focus + history rules`
2. [DONE] Git Commit: `docs(project-manager): define resume focus + history rules` (hash: 1afae7f5)

### Stream: Fix — фокус на существующую сессию (не создавать новую)
1. [DONE] Fix(project-manager): клик по `Session` в дереве должен диспатчить intent “focus/resume by providerId+providerSessionId”, а не напрямую вызывать `session:create` — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `fix(project-manager): request focus/resume from tree click`
2. [DONE] Git Commit: `fix(project-manager): request focus/resume from tree click` (hash: da6a9f14)

3. [DONE] Fix(project-manager): обработать intent “focus/resume”: если сессия с тем же `providerId+providerSessionId` уже есть в списке — активировать её (фокус) и показать; иначе — вызвать `session:create` и после создания активировать новую (resume) — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit message: `fix(project-manager): focus existing session by providerSessionId`
4. [DONE] Git Commit: `fix(project-manager): focus existing session by providerSessionId` (hash: 5feb9a82)

### Stream: Fix — “закрыть” = скрыть (не удалять session record в Core)
1. [DONE] Fix(project-manager): кнопка close у сессии должна скрывать её локально (и не вызывать `session:delete`), чтобы повторный клик по дереву мог вернуть ТУ ЖЕ сессию с тем же `session.id` — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit message: `fix(project-manager): close hides session (no delete)`
2. [DONE] Git Commit: `fix(project-manager): close hides session (no delete)` (hash: 84b94441)

### Stream: Fix — подгрузка истории для вновь созданной/resume сессии
1. [DONE] Fix(project-manager): при `session:created` обязательно подгружать историю из unified-session (JSONL), чтобы resume открывал полный диалог, а не пустое окно — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/sessions/status-hydrator.ts`; expected commit message: `fix(project-manager): load history for newly created sessions`
2. [DONE] Git Commit: `fix(project-manager): load history for newly created sessions` (hash: 130ff166)

### Stream: Hotfix — Project Manager UI bootstrap (verification 1.1.462)
1. [DONE] Fix(project-manager): устранить проблему старта Project Manager (ошибка `handleSessionHistory`/TDZ при загрузке bundle) + убрать внешний `<link href="styles.css">` (стили инлайнятся) — scope: `packages/ui/project-manager/index.html`; expected commit message: `fix(project-manager): prevent bootstrap crash in release bundle`
2. [DONE] Git Commit: `fix(project-manager): prevent bootstrap crash in release bundle` (hash: faf002a1)

3. [DONE] Fix(claude-module): убрать runtime-зависимость от `@codeai-hub/idea-collector`, чтобы override-пакет в `~/.codeai-hub/providers/**` не падал без `node_modules` — scope: `packages/Claude_Module/src/messaging/idea-collector-structured-output.ts`, `packages/Claude_Module/package.json`; expected commit message: `fix(claude-module): remove runtime dependency on idea-collector`
4. [DONE] Git Commit: `fix(claude-module): remove runtime dependency on idea-collector` (hash: 1431b22f)

5. [DONE] Release(build): собрать verification build 1.1.462 (tarballs + VSIX) — scope: `scripts/build-all.sh`, `scripts/build-release.sh`, `doc/tmp/releases/*-1.1.462.tar.bz2`, `codeai-hub-1.1.462.vsix`; expected commit message: `chore(release): build 1.1.462 verification`
6. [DONE] Git Commit: `chore(release): build 1.1.462 verification` (hash: dac79bdf)

### Stream: Fix — Reviewer resume без дублей + понятный label
1. [DONE] Fix(core): при `session:create` с `providerSessionId` (resume) сразу заполнять `binding.providerSessionId` (status может оставаться `pending`), чтобы UI мог матчить сессию до первого ответа провайдера и не создавать дубль (и лишние папки continuity) — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/session-manager/index.ts`; expected commit message: `fix(core): seed providerSessionId on resume create`
2. [DONE] Git Commit: `fix(core): seed providerSessionId on resume create` (hash: 5cef0854)

3. [DONE] Fix(project-manager): дедупликация повторных resume-кликов пока биндинг `providerSessionId` не подтверждён (in-flight map по ключу `workspacePath+providerId+providerSessionId+stage+runSlug`) — scope: `src/client/project-manager/components/sessions/session-resume-intent.ts`; expected commit message: `fix(project-manager): dedupe resume while binding pending`
4. [DONE] Git Commit: `fix(project-manager): dedupe resume while binding pending` (hash: b7b9510a)

5. [DONE] Fix(core): не допускать регресса `description.sessionKind` из `reviewer` в `collector` при апдейтах snapshot (сохранять reviewer-метку, если она уже была установлена) — scope: `packages/core/src/workflow/description/description-step-store.ts`; expected commit message: `fix(core): prevent description sessionKind regression`
6. [DONE] Git Commit: `fix(core): prevent description sessionKind regression` (hash: 399e9943)

7. [DONE] Fix(project-manager): сделать label сессии в ветке Description человекочитаемым (`Reviewer session · <provider>`), с fallback (если `finalPath` есть — считать сессию reviewer) — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `fix(project-manager): label reviewer session in tree`
8. [DONE] Git Commit: `fix(project-manager): label reviewer session in tree` (hash: 373b8af7)

### Stream: Refactor — авто-переключение Questionnaire → Draft → Final (Description)
1. [DONE] Fix(project-manager): в ветке Description показывать только один актуальный документ: `finalPath` (если есть) иначе `draftPath`, иначе `questionnairePath` — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `fix(project-manager): collapse description artifacts to latest`
2. [DONE] Git Commit: `fix(project-manager): collapse description artifacts to latest` (hash: 98f2d7f0)

3. [DONE] Fix(project-manager): при появлении `draftPath` автоматически переключать центральную зону с анкеты на `description.md` (draft) и скрывать анкету; при появлении `finalPath` — автоматически переключать на финальный документ (без кнопок Back) — scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/services/workflow-state-client.ts`; expected commit message: `fix(project-manager): auto-open description draft/final artifacts`
4. [DONE] Git Commit: `fix(project-manager): auto-open description draft/final artifacts` (hash: 29ca94c5)

5. [TODO] Verify(manual): когда появляется draft (`description.md`) — анкета исчезает (в ветке и в центральной зоне) и автоматически открывается draft; когда появляется финал — draft исчезает и автоматически открывается финал — scope: no files; expected commit message: `docs: record description artifact auto-switch verification`
6. [TODO] Git Commit: `docs: record description artifact auto-switch verification` (hash: TBD)

### Stream: Fix — Description Agent resume без дублей + понятный label
1. [TODO] Fix(core): при `session:create` с `providerSessionId` (resume) и уже существующей сессии (same `workspacePath + initiativeSlug + stage + providerId + providerSessionId`) не создавать новую, а переиспользовать существующую (rebroadcast `session:created` + `session:binding`) — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): dedupe session:create resume for description agent`
2. [TODO] Git Commit: `fix(core): dedupe session:create resume for description agent` (hash: TBD)

3. [DONE] Fix(project-manager): label для collector-сессии в ветке Description сделать человекочитаемым (`Description agent session · <provider>`) — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `fix(project-manager): label description agent session in tree`
4. [DONE] Git Commit: `fix(project-manager): label description agent session in tree` (hash: 9cde5d7e)


### Stream: Fix — Pre-binding resume click (no duplicate sessions)
1. [DONE] Fix(project-manager): при повторном `session:created` (rebroadcast existing) не создавать дубликат в списке сессий и не сбрасывать snapshot; вместо этого обновлять существующую запись по `session.id` и фокусить её — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit message: `fix(project-manager): dedupe rebroadcasted session created`
2. [DONE] Git Commit: `fix(project-manager): dedupe rebroadcasted session created` (hash: 3d323a83)

3. [TODO] Verify(manual): клик по `Description agent session` в дереве ДО первого ответа агента не создаёт дубль окна/строки сессии — scope: no files; expected commit message: `docs: record description pre-binding click verification`
4. [TODO] Git Commit: `docs: record description pre-binding click verification` (hash: TBD)

### Stream: Fix — vscode-webview: no duplicate sessions on rebroadcast
1. [DONE] Fix(vscode-webview): при повторном `session:created` для уже существующей сессии (тот же `session.id`) не добавлять дубликат и не сбрасывать snapshot; обновлять существующий record и сохранять историю — scope: `src/client/ui/src/app-host/session-store.ts`; expected commit message: `fix(vscode-webview): dedupe rebroadcasted session created`
2. [DONE] Git Commit: `fix(vscode-webview): dedupe rebroadcasted session created` (hash: 18f69a47)

3. [TODO] Verify(manual): клик по `Description agent session` в дереве Project Manager не открывает пустой дубль сессии в `vscode-webview` (React-панель VS Code) — scope: no files; expected commit message: `docs: record vscode-webview session dedupe verification`
4. [TODO] Git Commit: `docs: record vscode-webview session dedupe verification` (hash: TBD)



### Stream: Release build — 1.1.463 (verification)
1. [DONE] Release(build): собрать verification build 1.1.463 (tarballs + VSIX) из clean tree — scope: `scripts/build-all.sh`, `scripts/build-release.sh`, `doc/tmp/releases/*-1.1.463.tar.bz2`, `codeai-hub-1.1.463.vsix`; expected commit message: `chore(release): build 1.1.463 verification`
2. [DONE] Git Commit: `chore(release): build 1.1.463 verification` (hash: 57fe9581)

3. [DONE] Docs(release): обновить `README.md` + `CHANGELOG.md` под 1.1.463 (описать фикс дублей pre-binding click) — scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs(release): update 1.1.463 notes`
4. [DONE] Git Commit: `docs(release): update 1.1.463 notes` (hash: af7dde74)

5. [DONE] Docs(arch): обновить `doc/SolidWorks-Flow/System/SystemArchitecture.md` (versions table) под 1.1.463 — scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(arch): bump SystemArchitecture to 1.1.463`
6. [DONE] Git Commit: `docs(arch): bump SystemArchitecture to 1.1.463` (hash: 45d8fbab)

7. [DONE] Docs(todo): зафиксировать релиз 1.1.463 в плане (DONE+hash) — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record 1.1.463 verification release`
8. [DONE] Git Commit: `docs(todo): record 1.1.463 verification release` (hash: f763cbc9)




### Stream: Release build — 1.1.464 (verification)
1. [DONE] Release(build): собрать verification build 1.1.464 (tarballs + VSIX) из clean tree — scope: `scripts/build-all.sh`, `scripts/build-release.sh`, `doc/tmp/releases/*-1.1.464.tar.bz2`, `codeai-hub-1.1.464.vsix`; expected commit message: `chore(release): build 1.1.464 verification`
2. [DONE] Git Commit: `chore(release): build 1.1.464 verification` (hash: 2fadabfd)

3. [DONE] Docs(release): обновить `README.md` + `CHANGELOG.md` под 1.1.464 (описать фикс дублей в vscode-webview) — scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs(release): update 1.1.464 notes`
4. [DONE] Git Commit: `docs(release): update 1.1.464 notes` (hash: cf894518)

5. [DONE] Docs(arch): обновить `doc/SolidWorks-Flow/System/SystemArchitecture.md` (versions table) под 1.1.464 — scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs(arch): bump SystemArchitecture to 1.1.464`
6. [DONE] Git Commit: `docs(arch): bump SystemArchitecture to 1.1.464` (hash: 066d11aa)

7. [DONE] Docs(todo): зафиксировать релиз 1.1.464 в плане (DONE+hash) — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record 1.1.464 verification release`
8. [DONE] Git Commit: `docs(todo): record 1.1.464 verification release` (hash: 4827093a)
### Stream: Verification
1. [TODO] Verify(manual): клик по строке `Session · <provider>` (Reviewer) не создаёт дубль; если сессия уже есть — только фокус; если скрыта — показывается снова; если это первый resume после перезапуска — открывается с полной историей (из JSONL), не пустая — scope: no files; expected commit message: `docs: record resume focus + history verification`
2. [TODO] Git Commit: `docs: record resume focus + history verification` (hash: TBD)
