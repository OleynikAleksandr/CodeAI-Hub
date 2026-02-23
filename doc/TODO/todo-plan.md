# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/BugRegistry.md`
  - `doc/Sessions/Session008.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Commit**: только после зелёных гейтов. После каждого коммита: обновить статусы и вписать hash.

---

## Phase 226 — Session task timers SSOT in Core + Release v1.1.652 (owner: Codex, updated: 2026-02-22)

**Goal:** Перенести SSOT таймера в Core и доставлять его в UI через workspace snapshots, чтобы таймеры не сбрасывались при multi-workspace/multi-tab использовании Project Manager и при перезагрузке Project Manager.

### Stream 0: Core snapshot timers
1. [DONE] Добавить `taskTimer` в Core workspace snapshots + вести node-level таймеры (scope: `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`, `packages/core/src/workspace-runtime/workspace-runtime-types.ts`, `packages/core/src/workspace-runtime/workspace-snapshot-builder.ts`; expected commit: `feat(core): add task timers to workspace snapshots`).
2. [DONE] Git Commit: `feat(core): add task timers to workspace snapshots` (hash: `b23dfd6a`)

### Stream 1: Project Manager snapshot propagation
1. [DONE] Протащить `taskTimer` через PM workspace snapshots и сохранить в `status.taskTimer` (scope: `src/client/project-manager/core-stream-message-types.ts`, `src/client/project-manager/components/sessions/session-stream.ts`, `src/types/session.ts`; expected commit: `feat(pm): sync task timers from workspace snapshots`).
2. [DONE] Git Commit: `feat(pm): sync task timers from workspace snapshots` (hash: `2892e13c`)

### Stream 2: Session UI rendering from Core
1. [DONE] Перевести Session UI на чтение таймеров из Core snapshot (`status.taskTimer`) и убрать localStorage SSOT (scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/task-timer.tsx`; expected commit: `feat(ui): read task timers from core snapshots`).
2. [DONE] Git Commit: `feat(ui): read task timers from core snapshots` (hash: `eb06161e`)

### Stream 3: Docs + webview rebuild
1. [DONE] Обновить контракт: SSOT таймера находится в Core, UI только отображает (scope: `doc/SolidWorks-WorkFlow/Contracts/SessionTaskTimer_UI.md`; expected commit: `docs(contracts): move task timer SSOT to core`).
2. [DONE] Git Commit: `docs(contracts): move task timer SSOT to core` (hash: `eafd74e4`)
3. [DONE] Пересобрать webview bundle (scope: `media/react-chat.js`; expected commit: `chore(build): rebuild webview after core task timer`).
4. [DONE] Git Commit: `chore(build): rebuild webview after core task timer` (hash: `62879666`)

### Stream 4: Release v1.1.652
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под `v1.1.652` (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): v1.1.652 notes`).
2. [DONE] Git Commit: `docs(release): v1.1.652 notes` (hash: `650195f4`)
3. [DONE] Прогнать `./scripts/build-all.sh` (поднимет версии до `1.1.652`, соберёт unified tarball’ы) (scope: release manifests + package versions; expected commit: `chore(release): build-all v1.1.652`).
4. [DONE] Git Commit: `chore(release): build-all v1.1.652` (hash: `b57157ec`)
5. [DONE] Прогнать `./scripts/build-release.sh --use-current-version` и проверить `codeai-hub-1.1.652.vsix` (scope: `doc/Sessions/Session005.md`, `doc/TODO/todo-plan.md`; expected commit: `chore(release): package vsix v1.1.652`).
6. [DONE] Git Commit: `chore(release): package vsix v1.1.652` (hash: `c650d372`)

---

## Phase 227 — One-shot Description turn timer + Release v1.1.653 (owner: Codex, updated: 2026-02-23)

**Goal:** Для one-shot сессий (resumeMode `no_resume`) показывать динамический turn timer во время выполнения, но не накапливать `totalSeconds`; собрать релиз `v1.1.653`.

### Stream 0: Core one-shot turn timer
1. [DONE] Поправить Core task timer: `no_resume` участвует в `runningSinceMs` (turn timer) пока сессия busy, но не добавляет в `totalSeconds` (scope: `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`; expected commit: `fix(core): show turn timer for no_resume sessions`).
2. [DONE] Git Commit: `fix(core): show turn timer for no_resume sessions` (hash: `2fb0920f`)

### Stream 1: Contract update
1. [DONE] Уточнить контракт: one-shot сессии показывают turn timer во время выполнения, total не накапливается (scope: `doc/SolidWorks-WorkFlow/Contracts/SessionTaskTimer_UI.md`; expected commit: `docs(contracts): clarify one-shot turn timer`).
2. [DONE] Git Commit: `docs(contracts): clarify one-shot turn timer` (hash: `ef5d269c`)

### Stream 2: Release notes v1.1.653
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под `v1.1.653` (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): v1.1.653 notes`).
2. [DONE] Git Commit: `docs(release): v1.1.653 notes` (hash: `c6eabbb2`)

### Stream 3: Release build-all v1.1.653
1. [DONE] Прогнать `./scripts/build-all.sh` (поднимет версии до `1.1.653`, соберёт unified tarball’ы) (scope: release manifests + package versions; expected commit: `chore(release): build-all v1.1.653`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.653` (hash: `c9690093`)

### Stream 4: Package VSIX v1.1.653
1. [DONE] Прогнать `./scripts/build-release.sh --use-current-version` и проверить `codeai-hub-1.1.653.vsix` (scope: `doc/Sessions/Session006.md`, `doc/TODO/todo-plan.md`; expected commit: `chore(release): package vsix v1.1.653`).
2. [DONE] Git Commit: `chore(release): package vsix v1.1.653` (hash: `1fbd5ca7`)

---

## Phase 228 — Provider-colored locked wait copy + Release v1.1.654 (owner: Codex, updated: 2026-02-23)

**Goal:** Окрасить две locked-надписи в input (“working”/“resuming”) в provider-цвет динамического turn timer с opacity 80%; собрать релиз `v1.1.654`.

### Stream 0: UI locked wait copy tint
1. [DONE] Окрасить locked placeholder-тексты в input в provider-цвет + opacity 80% (scope: `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/helpers.ts`, `media/session-view.css`; expected commit: `fix(ui): color locked input wait copy`).
2. [DONE] Git Commit: `fix(ui): color locked input wait copy` (hash: `e35a58f7`)

### Stream 1: Webview rebuild
1. [DONE] Пересобрать webview bundle после UI изменений (scope: `media/react-chat.js`; expected commit: `chore(build): rebuild webview after wait copy tint`).
2. [DONE] Git Commit: `chore(build): rebuild webview after wait copy tint` (hash: `84989936`)

### Stream 2: Release notes v1.1.654
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под `v1.1.654` (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): v1.1.654 notes`).
2. [DONE] Git Commit: `docs(release): v1.1.654 notes` (hash: `d3e45559`)

### Stream 3: Release build-all v1.1.654
1. [DONE] Прогнать `./scripts/build-all.sh` (поднимет версии до `1.1.654`, соберёт unified tarball’ы) (scope: release manifests + package versions; expected commit: `chore(release): build-all v1.1.654`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.654` (hash: `8a14fce7`)

### Stream 4: Package VSIX v1.1.654
1. [DONE] Прогнать `./scripts/build-release.sh --use-current-version` и проверить `codeai-hub-1.1.654.vsix` (scope: `doc/Sessions/Session007.md`, `doc/TODO/todo-plan.md`; expected commit: `chore(release): package vsix v1.1.654`).
2. [DONE] Git Commit: `chore(release): package vsix v1.1.654` (hash: `64ac7ae6`)

---

## Phase 229 — Pulsing locked wait copy + Release v1.1.655 (owner: Codex, updated: 2026-02-23)

**Goal:** Добавить пульсацию opacity 5% → 80% (500ms) для locked working/resuming placeholder’ов в input; собрать релиз `v1.1.655`.

### Stream 0: UI pulse
1. [DONE] Добавить пульсацию placeholder opacity (5% → 80%, 500ms) для locked wait copy (scope: `media/session-view.css`; expected commit: `fix(ui): pulse locked input wait copy`).
2. [DONE] Git Commit: `fix(ui): pulse locked input wait copy` (hash: `dd769c8d`)

### Stream 1: Release notes v1.1.655
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под `v1.1.655` (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): v1.1.655 notes`).
2. [DONE] Git Commit: `docs(release): v1.1.655 notes` (hash: `5d28a148`)

### Stream 2: Release build-all v1.1.655
1. [DONE] Прогнать `./scripts/build-all.sh` (поднимет версии до `1.1.655`, соберёт unified tarball’ы) (scope: release manifests + package versions; expected commit: `chore(release): build-all v1.1.655`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.655` (hash: `379c2314`)

### Stream 3: Package VSIX v1.1.655
1. [DONE] Прогнать `./scripts/build-release.sh --use-current-version` и проверить `codeai-hub-1.1.655.vsix` (scope: `doc/Sessions/Session008.md`, `doc/TODO/todo-plan.md`; expected commit: `chore(release): package vsix v1.1.655`).
2. [TODO] Git Commit: `chore(release): package vsix v1.1.655` (hash: TBD)
