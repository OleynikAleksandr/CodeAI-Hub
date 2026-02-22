# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionTaskTimer_UI.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/BugRegistry.md`
  - `doc/Sessions/Session003.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Commit**: только после зелёных гейтов. После каждого коммита: обновить статусы и вписать hash.

---

## Phase 224 — Session UI: task timer semantics + remove force unlock (owner: Codex, updated: 2026-02-22)

**Goal:** Исправить поведение таймеров в UI сессий:
- **Total (накопительный):** показывается справа в футере (напротив `Press Enter...`) и **виден всегда**, даже когда ввод заблокирован.
- **Turn (текущий turn):** показывается в поле ввода (overlay) и **обнуляется при каждом начале нового turn**.
- **Format:** без анимации, текстом: `00h 00m 00s`.
- Удалить/отключить UI-кнопку force unlock (🔒/🔓), т.к. больше не нужна.

### Stream 0: Update contract
1. [DONE] Обновить контракт `SessionTaskTimer_UI.md` под новое поведение (total vs turn, placement, format) (scope: `doc/SolidWorks-WorkFlow/Contracts/SessionTaskTimer_UI.md`; expected commit: `docs(contracts): update session task timer semantics`).
2. [DONE] Git Commit: `docs(contracts): update session task timer semantics` (hash: `6596c983`)

### Stream 1: Timer components (text format)
1. [DONE] Убрать flip-анимацию и перейти на текстовый формат `00h 00m 00s`; подготовить total/turn таймеры (scope: `src/client/ui/src/session/task-timer.tsx`, `media/session-view.css`, `src/client/ui/src/session/task-timer-flip-clock.tsx`; expected commit: `feat(ui): switch task timers to text format`).
2. [DONE] Git Commit: `feat(ui): switch task timers to text format` (hash: `8fe06909`)

### Stream 2: Integration + remove force unlock toggle
1. [DONE] Встроить total в футер (всегда виден) и turn в overlay; удалить force unlock toggle из UI и связанный state (scope: `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/session-view.tsx`; expected commit: `feat(ui): fix timer placement and remove force unlock`).
2. [DONE] Git Commit: `feat(ui): fix timer placement and remove force unlock` (hash: `253860d3`)

### Stream 3: Verification (webview build)
1. [DONE] Прогнать `npm run typecheck:webview` и `npm run build:webview` (scope: `scripts/build-webview.js`; expected commit: `chore(build): rebuild webview after timer semantics fix`).
2. [DONE] Git Commit: `chore(build): rebuild webview after timer semantics fix` (hash: `446184b2`)

---

## Phase 225 — Release build for timer fixes (owner: Codex, updated: 2026-02-22)

**Goal:** Собрать тестовый релиз `v1.1.649` с исправленным поведением task timers (total/turn) и без force unlock.

### Stream 0: Release notes
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под `v1.1.649` (task timers: `00h 00m 00s`, total всегда виден, turn сбрасывается, удалить lock toggle) (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): v1.1.649 notes`).
2. [DONE] Git Commit: `docs(release): v1.1.649 notes` (hash: `7088ef93`)

### Stream 1: Build-all (unified artifacts)
1. [DONE] Запустить `./scripts/build-all.sh` (поднимет версии до `1.1.649`, соберёт unified tarball’ы) (scope: release manifests + package versions; expected commit: `chore(release): build-all v1.1.649`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.649` (hash: `e8423b40`)

### Stream 2: VSIX packaging + session report
1. [DONE] Запустить `./scripts/build-release.sh --use-current-version`; оформить `doc/Sessions/Session004.md` (scope: `doc/Sessions/Session004.md`, `doc/TODO/todo-plan.md`; expected commit: `chore(release): package vsix v1.1.649`).
2. [DONE] Git Commit: `chore(release): package vsix v1.1.649` (hash: `ca3615df`)
