# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 73 — Continuity: avoid extra chains on open (owner: Oleksandr, updated: 2026-01-22)

### Stream: Lazy continuity chain activation
1. [DONE] Fix(core): не писать `.codeai-hub/.../continuity/.../chain.json` при простом open/attach; создавать/обновлять цепочку только при первом outbound сообщении в провайдера (user/system) — scope: `packages/core/src/session-continuity/session-continuity-facade.ts`, `packages/core/src/session-continuity/continuity-tracker.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): defer continuity chain until first message`
2. [DONE] Git Commit: `fix(core): defer continuity chain until first message` (hash: 83007e57)

3. [DONE] Docs: описать семантику “lazy continuity chain activation” — scope: `doc/SolidWorks-Flow/SessionContinuity/Core/SessionContinuity_Architecture.md`; expected commit message: `docs(continuity): document lazy chain activation`
4. [DONE] Git Commit: `docs(continuity): document lazy chain activation` (hash: cedab00a)

5. [DONE] Docs(session): зафиксировать результаты и гейты — scope: `doc/Sessions/Session045.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(session): Session045 continuity activation`
6. [DONE] Git Commit: `docs(session): Session045 continuity activation` (hash: 8e5c809f)

### Stream: Release build (1.1.473)
1. [DONE] Release: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests; expected commit message: `chore(release): build next version`
2. [DONE] Git Commit: `chore(release): build next version` (hash: cc3e13e0)

---

## Phase 74 — Session labels consistency (owner: Oleksandr, updated: 2026-01-22)

### Stream: Short labels (tabs + tree)
1. [DONE] Fix(ui): показывать `Description <Provider>` для description agent (не `Agent <Provider>`) и синхронизировать подписи в дереве Project Manager с табами — scope: `src/client/ui/src/session/session-tabs.tsx`, `src/client/project-manager/components/layout/workspace-tree.tsx`, `media/react-chat.js`; expected commit message: `fix(ui): align session labels`
2. [DONE] Git Commit: `fix(ui): align session labels` (hash: 441c0779)

### Stream: Release build (1.1.474)
1. [DONE] Docs(changelog): добавить entries для `1.1.473`/`1.1.474` — scope: `CHANGELOG.md`; expected commit message: `docs(changelog): v1.1.474`
2. [DONE] Git Commit: `docs(changelog): v1.1.474` (hash: 6dad7f6a)

3. [DONE] Release: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests; expected commit message: `chore(release): build next version`
4. [DONE] Git Commit: `chore(release): build next version` (hash: fa35c159)

5. [DONE] Docs(session): Session046 report + update todo-plan — scope: `doc/Sessions/Session046.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(session): Session046 session labels release`
6. [DONE] Git Commit: `docs(session): Session046 session labels release` (hash: 0d31db99)

---

## Phase 75 — Release 1.1.474 docs sync + push (owner: Oleksandr, updated: 2026-01-22)

### Stream: Docs alignment (release notes)
1. [DONE] Docs: обновить `README.md` и `doc/SolidWorks-Flow/System/SystemArchitecture.md` под релиз `1.1.474` (версии/артефакты/краткие изменения) — scope: `README.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update release docs for 1.1.474`
2. [DONE] Git Commit: `docs: update release docs for 1.1.474` (hash: 2392e652)

### Stream: SolidWorks-Flow sync
1. [DONE] Docs(flow): синхронизировать примеры/термины с текущими UI-лейблами (`Description Codex`, `Reviewer Codex`) — scope: `doc/SolidWorks-Flow/README.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`; expected commit message: `docs(flow): align session labels with UI`
2. [DONE] Git Commit: `docs(flow): align session labels with UI` (hash: 1729c6b9)

### Stream: Session report + push
1. [DONE] Docs(session): создать отчет `Session047` и обновить `todo-plan.md` с hash/verify — scope: `doc/Sessions/Session047.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(session): Session047 release docs sync`
2. [DONE] Git Commit: `docs(session): Session047 release docs sync` (hash: f25dff28)

3. [DONE] Push: `git push origin main` — scope: git; expected commit message: `chore: push release 1.1.474`
