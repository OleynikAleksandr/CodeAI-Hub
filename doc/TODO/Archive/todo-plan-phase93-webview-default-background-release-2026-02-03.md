# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Gates после каждой микрозадачи**: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка затронутого пакета.
- После зелёных гейтов — Git Commit, затем сразу обновляем статусы/хеши в `doc/TODO/todo-plan.md` отдельным коммитом.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Stacks/UI_Modules.md`
3. `doc/SolidWorks-Flow/System/WebviewSettings_FullSize_Layout_Architecture.md`
4. `doc/Sessions/Session074.md`
5. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 90 — VS Code Webview Settings: full-size layout (owner: Oleksandr, updated: 2026-02-02)

### Stream: design + approval
1. [DONE] Docs(architecture): согласовать дизайн Settings full-size — scope: `doc/SolidWorks-Flow/System/WebviewSettings_FullSize_Layout_Architecture.md`; expected commit message: `docs: approve webview settings full-size layout architecture`
2. [DONE] Git Commit: `docs: approve webview settings full-size layout architecture` (hash: f6ee3167)

### Stream: implementation (webview)
3. [DONE] Fix(webview): обновить styles в `main-view.css` для full-size — scope: `media/main-view.css`; expected commit message: `fix(webview): make settings full-size in webview`
4. [DONE] Git Commit: `fix(webview): make settings full-size in webview` (hash: de3e2ae3)

### Stream: verification (manual)
5. [DONE] Verification(owner): подтверждено в VS Code (2026-02-02) на релизе `codeai-hub-1.1.500.vsix`: Settings занимает всю площадь Webview, resize ок, vertical scroll сохраняется. — scope: manual; expected commit message: `chore: verify webview settings full-size layout`
6. [DONE] Git Commit: `chore: verify webview settings full-size layout` (hash: b7025a8d)

### Stream: release build + docs sync (final)
7. [DONE] Release: `./scripts/build-all.sh` (1.1.498) — scope: scripts + manifests/lockfiles; expected commit message: `chore(release): build-all next version`
8. [DONE] Git Commit: `chore(release): build-all next version` (hash: 52779211)
9. [DONE] Release: `./scripts/build-release.sh --use-current-version` (1.1.498) — scope: scripts + VSIX; expected commit message: `chore(release): build VSIX for current version` (hash: N/A - VSIX in .gitignore) (hash: N/A - VSIX in .gitignore)
10. [DONE] Docs: sync release docs (1.1.498) — scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update release notes for webview settings layout`
11. [DONE] Git Commit: `docs: update release notes for webview settings layout` (hash: 300a697f)
12. [DONE] Docs(session): `doc/Sessions/Session074.md` — scope: `doc/Sessions/Session074.md`; expected commit message: `docs(session): add Session074 webview settings full-size release`
13. [DONE] Git Commit: `docs(session): add Session074 webview settings full-size release` (hash: c125db1f)

---

## Phase 91 — Hotfix: Settings full-size (override in session-view.css) + Release (owner: Oleksandr, updated: 2026-02-02)

### Stream: hotfix (webview css precedence)
1. [DONE] Fix(webview): привести `.settings-overlay` в `media/session-view.css` к full-size (session-view.css загружается после main-view.css и перекрывает layout) — scope: `media/session-view.css`; expected commit message: `fix(webview): make settings overlay full-size (session-view css)`
2. [DONE] Git Commit: `fix(webview): make settings overlay full-size (session-view css)` (hash: 07cc6982)

### Stream: release build + docs sync (final)
3. [DONE] Release: на чистом дереве запустить `./scripts/build-all.sh` и перенести tarball’ы в `doc/tmp/releases/` — scope: scripts + generated manifests/lockfiles; expected commit message: `chore(release): build-all next version`
4. [DONE] Git Commit: `chore(release): build-all next version` (hash: b57f71a1)
5. [DONE] Release: на чистом дереве запустить `./scripts/build-release.sh --use-current-version` и зафиксировать `codeai-hub-<version>.vsix` — scope: scripts + release artifacts; expected commit message: `chore(release): build VSIX for current version` (hash: N/A - VSIX in .gitignore)
6. [DONE] Docs: sync release docs (1.1.499): `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md` — scope: docs-only; expected commit message: `docs: update release notes for settings full-size hotfix`
7. [DONE] Git Commit: `docs: update release notes for settings full-size hotfix` (hash: a0a43c7b)
8. [DONE] Docs: update Project Docs index (1.1.499): `doc/SolidWorks-Flow/System/README.md` — scope: docs-only; expected commit message: `docs: bump Project Docs index for 1.1.499`
9. [DONE] Git Commit: `docs: bump Project Docs index for 1.1.499` (hash: c70d50cb)
10. [DONE] Docs(session): создать отчёт `doc/Sessions/Session075.md` (Phase 91 + релиз) — scope: `doc/Sessions/Session075.md`; expected commit message: `docs(session): add Session075 settings full-size hotfix release`
11. [DONE] Git Commit: `docs(session): add Session075 settings full-size hotfix release` (hash: 773e756a)

---

## Phase 92 — Webview: Settings-only background uses VS Code theme + Release (owner: Oleksandr, updated: 2026-02-02)

### Stream: UI polish (settings-only)
1. [DONE] Fix(webview): заменить чёрный фон стартового экрана (карточка с кнопкой `Open settings`) на цвет из VS Code theme variables — scope: `src/client/ui/src/app-host/settings-only-host.tsx`, `src/core/webview-module/webview-html-generator.ts`; expected commit message: `fix(webview): align settings-only background with VS Code theme`
2. [DONE] Git Commit: `fix(webview): align settings-only background with VS Code theme` (hash: 2ca30a9c)

### Stream: release build + docs sync (final)
3. [DONE] Release: на чистом дереве запустить `./scripts/build-all.sh` и перенести tarball’ы в `doc/tmp/releases/` — scope: scripts + generated manifests/lockfiles; expected commit message: `chore(release): build-all next version`
4. [DONE] Git Commit: `chore(release): build-all next version` (hash: f3fdd6ab)
5. [DONE] Release: на чистом дереве запустить `./scripts/build-release.sh --use-current-version` и зафиксировать `codeai-hub-<version>.vsix` — scope: scripts + release artifacts; expected commit message: `chore(release): build VSIX for current version` (hash: N/A - VSIX in .gitignore)
6. [DONE] Docs: sync release docs (strictly after build): `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md` — scope: docs-only; expected commit message: `docs: update release notes for settings-only theme background`
7. [DONE] Git Commit: `docs: update release notes for settings-only theme background` (hash: 082e49f8)
8. [DONE] Docs: update Project Docs index (new release): `doc/SolidWorks-Flow/System/README.md` — scope: docs-only; expected commit message: `docs: bump Project Docs index for latest release`
9. [DONE] Git Commit: `docs: bump Project Docs index for latest release` (hash: 568cad79)
10. [DONE] Docs(session): создать отчёт `doc/Sessions/Session076.md` (Phase 92 + релиз) — scope: `doc/Sessions/Session076.md`; expected commit message: `docs(session): add Session076 settings-only theme background release`
11. [DONE] Git Commit: `docs(session): add Session076 settings-only theme background release` (hash: a886febd)

---

## Phase 93 — Webview: default background rgb(24,24,24) + Release (owner: Oleksandr, updated: 2026-02-03)

### Stream: UI polish (webview background)
1. [DONE] Fix(webview): поставить дефолтный фон Webview как у большинства расширений (`rgb(24, 24, 24)`) — scope: `src/client/ui/src/app-host/settings-only-host.tsx`, `src/core/webview-module/webview-html-generator.ts`, `media/react-chat.js`; expected commit message: `fix(webview): set default webview background to rgb(24,24,24)`
2. [DONE] Git Commit: `fix(webview): set default webview background to rgb(24,24,24)` (hash: b222a0ed)

### Stream: release build + docs sync (final)
3. [DONE] Release: на чистом дереве запустить `./scripts/build-all.sh` и перенести tarball’ы в `doc/tmp/releases/` — scope: scripts + generated manifests/lockfiles; expected commit message: `chore(release): build-all next version`
4. [DONE] Git Commit: `chore(release): build-all next version` (hash: c6e0f7cd)
5. [DONE] Release: на чистом дереве запустить `./scripts/build-release.sh --use-current-version` и зафиксировать `codeai-hub-<version>.vsix` — scope: scripts + release artifacts; expected commit message: `chore(release): build VSIX for current version` (hash: N/A - VSIX in .gitignore)
6. [DONE] Docs: sync release docs (strictly after build): `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md` — scope: docs-only; expected commit message: `docs: update release notes for webview default background`
7. [DONE] Git Commit: `docs: update release notes for webview default background` (hash: 93c928ee)
8. [DONE] Docs: update Project Docs index (new release): `doc/SolidWorks-Flow/System/README.md` — scope: docs-only; expected commit message: `docs: bump Project Docs index for latest release`
9. [DONE] Git Commit: `docs: bump Project Docs index for latest release` (hash: 068a2919)
10. [DONE] Docs(session): создать отчёт `doc/Sessions/Session077.md` (Phase 93 + релиз) — scope: `doc/Sessions/Session077.md`; expected commit message: `docs(session): add Session077 webview default background release`
11. [DONE] Git Commit: `docs(session): add Session077 webview default background release` (hash: 7c996699)
