# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/BugRegistry.md`
  - `doc/Sessions/Session011.md`
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
2. [DONE] Git Commit: `chore(release): package vsix v1.1.655` (hash: `95ba3c7a`)

---

## Phase 230 — Wait copy overlay pulse fix + Release v1.1.656 (owner: Codex, updated: 2026-02-23)

**Goal:** Починить пульсацию locked wait copy в input: анимация `textarea::placeholder` не отрабатывала в Webview, поэтому переносим текст в overlay-элемент и анимируем opacity; собрать релиз `v1.1.656`.

### Stream 0: UI overlay pulse
1. [DONE] Перенести locked wait copy из `textarea::placeholder` в overlay-элемент поверх textarea + скрыть placeholder в wait-copy режиме (scope: `src/client/ui/src/session/input-panel.tsx`, `media/session-view.css`; expected commit: `fix(ui): pulse locked wait copy overlay`).
2. [DONE] Git Commit: `fix(ui): pulse locked wait copy overlay` (hash: `c30698ea`)

### Stream 1: Webview rebuild
1. [DONE] Пересобрать webview bundle после UI изменений (scope: `media/react-chat.js`; expected commit: `chore(build): rebuild webview after wait copy overlay`).
2. [DONE] Git Commit: `chore(build): rebuild webview after wait copy overlay` (hash: `d92e3fae`)

### Stream 2: Release notes v1.1.656
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под `v1.1.656` (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): v1.1.656 notes`).
2. [DONE] Git Commit: `docs(release): v1.1.656 notes` (hash: `85f37683`)

### Stream 3: Release build-all v1.1.656
1. [DONE] Прогнать `./scripts/build-all.sh` (поднимет версии до `1.1.656`, соберёт unified tarball’ы) (scope: release manifests + package versions; expected commit: `chore(release): build-all v1.1.656`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.656` (hash: `45d9d9bb`)

### Stream 4: Package VSIX v1.1.656
1. [DONE] Прогнать `./scripts/build-release.sh --use-current-version` и проверить `codeai-hub-1.1.656.vsix` (scope: `doc/Sessions/Session009.md`, `doc/TODO/todo-plan.md`; expected commit: `chore(release): package vsix v1.1.656`).
2. [DONE] Git Commit: `chore(release): package vsix v1.1.656` (hash: `50ef05e6`)

---

## Phase 231 — Tune wait copy pulse + Release v1.1.657 (owner: Codex, updated: 2026-02-23)

**Goal:** Подстроить анимацию locked wait copy в input: замедлить пульсацию в 2 раза и снизить максимум яркости (opacity 5% → 50%, 1000ms); собрать релиз `v1.1.657`.

### Stream 0: UI pulse tune
1. [DONE] Замедлить пульсацию и изменить диапазон opacity (scope: `media/session-view.css`; expected commit: `fix(ui): tune locked wait copy pulse`).
2. [DONE] Git Commit: `fix(ui): tune locked wait copy pulse` (hash: `18de446d`)

### Stream 1: Release notes v1.1.657
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под `v1.1.657` (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): v1.1.657 notes`).
2. [DONE] Git Commit: `docs(release): v1.1.657 notes` (hash: `8ede5a5c`)

### Stream 2: Release build-all v1.1.657
1. [DONE] Прогнать `./scripts/build-all.sh` (поднимет версии до `1.1.657`, соберёт unified tarball’ы) (scope: release manifests + package versions; expected commit: `chore(release): build-all v1.1.657`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.657` (hash: `ff14f53d`)

### Stream 3: Package VSIX v1.1.657
1. [DONE] Прогнать `./scripts/build-release.sh --use-current-version` и проверить `codeai-hub-1.1.657.vsix` (scope: `doc/Sessions/Session010.md`, `doc/TODO/todo-plan.md`; expected commit: `chore(release): package vsix v1.1.657`).
2. [DONE] Git Commit: `chore(release): package vsix v1.1.657` (hash: `d631911c`)

---

## Phase 232 — Tune wait copy pulse range + Release v1.1.658 (owner: Codex, updated: 2026-02-23)

**Goal:** Подстроить диапазон пульсации locked wait copy в input до opacity 20% → 40% (период 1000ms); собрать релиз `v1.1.658`.

### Stream 0: UI pulse range
1. [DONE] Изменить диапазон opacity пульсации (scope: `media/session-view.css`; expected commit: `fix(ui): tune locked wait copy pulse range`).
2. [DONE] Git Commit: `fix(ui): tune locked wait copy pulse range` (hash: `5415ba47`)

### Stream 1: Release notes v1.1.658
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под `v1.1.658` (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): v1.1.658 notes`).
2. [DONE] Git Commit: `docs(release): v1.1.658 notes` (hash: `80521560`)

### Stream 2: Release build-all v1.1.658
1. [DONE] Прогнать `./scripts/build-all.sh` (поднимет версии до `1.1.658`, соберёт unified tarball’ы) (scope: release manifests + package versions; expected commit: `chore(release): build-all v1.1.658`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.658` (hash: `394319a6`)

### Stream 3: Package VSIX v1.1.658
1. [DONE] Прогнать `./scripts/build-release.sh --use-current-version` и проверить `codeai-hub-1.1.658.vsix` (scope: `doc/Sessions/Session011.md`, `doc/TODO/todo-plan.md`; expected commit: `chore(release): package vsix v1.1.658`).
2. [DONE] Git Commit: `chore(release): package vsix v1.1.658` (hash: `0c5b3f02`)
---

## Phase 233 — Session input Play/Stop button + Release v1.1.659 (owner: Codex, updated: 2026-02-23)

**Goal:** Добавить в Session UI одну toggle-кнопку рядом с input: Play (дублирует Enter) → Stop (принудительный restart Core, чтобы прервать turn) и обязательная разблокировка input; собрать релиз `v1.1.659`.

### Stream 0: UI Play/Stop button
1. [DONE] Добавить toggle-кнопку (▶/■) справа от поля ввода: ▶ отправляет как Enter, ■ делает `Restart Core` и форс-разблокирует input (scope: `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/input-play-stop-button.tsx`, `media/session-view.css`; expected commit: `feat(ui): add play/stop session input button`).
2. [DONE] Git Commit: `feat(ui): add play/stop session input button` (hash: `6b81a1a9`)

### Stream 1: Webview rebuild
1. [DONE] Пересобрать webview bundle после UI изменений (scope: `media/react-chat.js`; expected commit: `chore(build): rebuild webview after input play/stop`).
2. [DONE] Git Commit: `chore(build): rebuild webview after input play/stop` (hash: `7d7bccb3`)

### Stream 2: Release notes v1.1.659
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под `v1.1.659` (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): v1.1.659 notes`).
2. [DONE] Git Commit: `docs(release): v1.1.659 notes` (hash: `39fb2edf`)

### Stream 3: Release build-all v1.1.659
1. [DONE] Прогнать `./scripts/build-all.sh` (поднимет версии до `1.1.659`, соберёт unified tarball’ы) (scope: release manifests + package versions; expected commit: `chore(release): build-all v1.1.659`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.659` (hash: `2ac01bf7`)

### Stream 4: Package VSIX v1.1.659
1. [DONE] Прогнать `./scripts/build-release.sh --use-current-version` и проверить `codeai-hub-1.1.659.vsix` (scope: `doc/Sessions/Session012.md`, `doc/TODO/todo-plan.md`; expected commit: `chore(release): package vsix v1.1.659`).
2. [DONE] Git Commit: `chore(release): package vsix v1.1.659` (hash: `2abf61d1`)

---

## Phase 234 — Stop Core on ■ + Resume-on-send + Release v1.1.660 (owner: Codex, updated: 2026-02-23)

**Goal:** Заменить поведение ■: вместо быстрого restart Core делать остановку Core, а следующая отправка (Enter/▶) должна сначала запускать Core, затем отправлять сообщение пользователя после восстановления соединения; улучшить выравнивание/иконку и собрать релиз `v1.1.660`.

### Stream 0: Core stop request (Supervisor)
1. [DONE] Добавить webview message `core:stop-request` и публичный `CoreProcessManager.stop()` (scope: `src/extension-module/home-view-message-router.ts`, `src/extension-module/core/core-process-manager.ts`, `src/client/ui/src/core-bridge/supervisor-requests.ts`; expected commit: `feat(core): add core stop request`).
2. [DONE] Git Commit: `feat(core): add core stop request` (hash: `b0e9f24a`)

### Stream 1: UI stop semantics (no auto-start)
1. [DONE] Core bridge: при ручной остановке Core не вызывать Supervisor auto-start, пока пользователь не отправит сообщение (scope: `src/client/ui/src/core-bridge/core-bridge.ts`, `src/client/ui/src/core-bridge/core-bridge-reconnect.ts`; expected commit: `fix(ui): pause auto-start after core stop`).
2. [DONE] Git Commit: `fix(ui): pause auto-start after core stop` (hash: `6ed0518b`)
3. [DONE] Session UI: ■ останавливает Core и форс-разблокирует input; следующая отправка запускает Core и отправляет сообщение после задержки (scope: `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/input-panel-placeholders.ts`; expected commit: `fix(ui): stop button stops core`).
4. [DONE] Git Commit: `fix(ui): stop button stops core` (hash: `51f7482b`)

### Stream 2: UI visuals
1. [DONE] Подправить выравнивание кнопки и визуал ■ (больше, поверх красного фона) (scope: `media/session-view.css`, `src/client/ui/src/session/input-play-stop-button.tsx`; expected commit: `fix(ui): tune stop button visuals`).
2. [DONE] Git Commit: `fix(ui): tune stop button visuals` (hash: `fb9e5607`)

### Stream 3: Contract update
1. [DONE] Обновить контракт Session UI под новое поведение кнопки ■ (scope: `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`; expected commit: `docs(contracts): document stop-core button behavior`).
2. [DONE] Git Commit: `docs(contracts): document stop-core button behavior` (hash: `f994394e`)

### Stream 4: Webview rebuild
1. [DONE] Пересобрать webview bundle после UI изменений (scope: `media/react-chat.js`; expected commit: `chore(build): rebuild webview after stop-core button`).
2. [DONE] Git Commit: `chore(build): rebuild webview after stop-core button` (hash: `7e95ba2e`)

### Stream 5: Release notes v1.1.660
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под `v1.1.660` (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): v1.1.660 notes`).
2. [DONE] Git Commit: `docs(release): v1.1.660 notes` (hash: `379a1d3e`)

### Stream 6: Release build-all v1.1.660
1. [DONE] Прогнать `./scripts/build-all.sh` (поднимет версии до `1.1.660`, соберёт unified tarball’ы) (scope: release manifests + package versions; expected commit: `chore(release): build-all v1.1.660`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.660` (hash: `08a4f38b`)

### Stream 7: Package VSIX v1.1.660
1. [DONE] Прогнать `./scripts/build-release.sh --use-current-version` и проверить `codeai-hub-1.1.660.vsix` (scope: `doc/Sessions/Session013.md`, `doc/TODO/todo-plan.md`; expected commit: `chore(release): package vsix v1.1.660`).
2. [DONE] Git Commit: `chore(release): package vsix v1.1.660` (hash: `e16b31f8`)

---

## Phase 235 — Stop ■ must actually stop Core + Release v1.1.661 (owner: Codex, updated: 2026-02-23)

**Goal:** Исправить поведение ■: кнопка должна реально останавливать Core (как `POST /api/v1/shutdown` из `codeai-core-control.js`), а UI не должен оставлять placeholder “Agent is working…” после stop; собрать релиз `v1.1.661`.

### Stream 0: Stop core via shutdown endpoint
1. [DONE] Stop: при нажатии ■ отправлять `POST /api/v1/shutdown` в Core (и только потом разблокировать UX), чтобы текущий turn реально прерывался; placeholder после stop должен отражать остановку (scope: `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/core-bridge/core-shutdown.ts` (new), `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`; expected commit: `fix(ui): stop button shuts down core`).
2. [DONE] Git Commit: `fix(ui): stop button shuts down core` (hash: `90ac41e6`)

### Stream 1: Webview rebuild
1. [DONE] Пересобрать webview bundle после UI изменений (scope: `media/react-chat.js`; expected commit: `chore(build): rebuild webview after core shutdown stop`).
2. [DONE] Git Commit: `chore(build): rebuild webview after core shutdown stop` (hash: `2d6d519b`)

### Stream 2: Release notes v1.1.661
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под `v1.1.661` (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): v1.1.661 notes`).
2. [DONE] Git Commit: `docs(release): v1.1.661 notes` (hash: `541f9c8d`)

### Stream 3: Release build-all v1.1.661
1. [DONE] Прогнать `./scripts/build-all.sh` (поднимет версии до `1.1.661`, соберёт unified tarball’ы) (scope: release manifests + package versions; expected commit: `chore(release): build-all v1.1.661`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.661` (hash: `61accb36`)

### Stream 4: Package VSIX v1.1.661
1. [DONE] Прогнать `./scripts/build-release.sh --use-current-version` и проверить `codeai-hub-1.1.661.vsix` (scope: `doc/Sessions/Session014.md`, `doc/TODO/todo-plan.md`; expected commit: `chore(release): package vsix v1.1.661`).
2. [DONE] Git Commit: `chore(release): package vsix v1.1.661` (hash: `57f9f68d`)

---

## Phase 236 — Enter/▶ must start Core after Stop (CEF) + Release v1.1.662 (owner: Codex, updated: 2026-02-23)

**Goal:** После ручного stop (■ → `POST /api/v1/shutdown`) Enter/▶ должны запускать Core и только потом отправлять новое сообщение **в Standalone Project Manager (CEF)** (где нет `acquireVsCodeApi`), без ручного запуска ядра через внешние скрипты; собрать релиз `v1.1.662`.

### Stream 0: Launcher core-start bridge + UI fallback
1. [DONE] Добавить bridge `window.codeaiLauncher.ensureCoreRunning()` и обработчик `codeai://core-start` в CEF Launcher; UI должен использовать этот bridge как fallback, если нет VS Code API (scope: `packages/cef-launcher/src/launcher_handler.cc`, `src/client/ui/src/core-bridge/supervisor-requests.ts`, `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`; expected commit: `fix(launcher): start core via launcher bridge`).
2. [DONE] Git Commit: `fix(launcher): start core via launcher bridge` (hash: `27cc43f1`)

### Stream 1: Webview rebuild
1. [DONE] Пересобрать webview bundle после изменений UI bridge (scope: `media/react-chat.js`; expected commit: `chore(build): rebuild webview after launcher core start bridge`).
2. [DONE] Git Commit: `chore(build): rebuild webview after launcher core start bridge` (hash: `26303a23`)

### Stream 2: Release notes v1.1.662
1. [TODO] Обновить `README.md` и `CHANGELOG.md` под `v1.1.662` (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): v1.1.662 notes`).
2. [TODO] Git Commit: `docs(release): v1.1.662 notes` (hash: TBD)

### Stream 3: Release build-all v1.1.662
1. [TODO] Прогнать `./scripts/build-all.sh` (поднимет версии до `1.1.662`, соберёт unified tarball’ы) (scope: release manifests + package versions; expected commit: `chore(release): build-all v1.1.662`).
2. [TODO] Git Commit: `chore(release): build-all v1.1.662` (hash: TBD)

### Stream 4: Package VSIX v1.1.662
1. [TODO] Прогнать `./scripts/build-release.sh --use-current-version` и проверить `codeai-hub-1.1.662.vsix` (scope: `doc/Sessions/Session015.md`, `doc/TODO/todo-plan.md`; expected commit: `chore(release): package vsix v1.1.662`).
2. [TODO] Git Commit: `chore(release): package vsix v1.1.662` (hash: TBD)
