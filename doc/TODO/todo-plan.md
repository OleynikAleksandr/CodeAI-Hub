# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Gates после каждой микрозадачи**: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка затронутого пакета.
- После зелёных гейтов — Git Commit, затем сразу обновляем статусы/хеши в `doc/TODO/todo-plan.md` отдельным коммитом.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/Stacks/UI_Modules.md`
3. `doc/Project_Docs/WebviewSettings_FullSize_Layout_Architecture.md`
4. `doc/Sessions/Session074.md`
5. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 90 — VS Code Webview Settings: full-size layout (owner: Oleksandr, updated: 2026-02-02)

### Stream: design + approval
1. [DONE] Docs(architecture): согласовать дизайн Settings full-size — scope: `doc/Project_Docs/WebviewSettings_FullSize_Layout_Architecture.md`; expected commit message: `docs: approve webview settings full-size layout architecture`
2. [DONE] Git Commit: `docs: approve webview settings full-size layout architecture` (hash: f6ee3167)

### Stream: implementation (webview)
3. [DONE] Fix(webview): обновить styles в `main-view.css` для full-size — scope: `media/main-view.css`; expected commit message: `fix(webview): make settings full-size in webview`
4. [DONE] Git Commit: `fix(webview): make settings full-size in webview` (hash: de3e2ae3)

### Stream: verification (manual)
5. [BLOCKED] Verification(owner): в VS Code UI не изменился (окно осталось centered). Root cause: `.settings-overlay` перекрывается стилями из `media/session-view.css` (он подключается после `main-view.css`). — scope: manual; expected commit message: `chore: verify webview settings full-size layout`
6. [TODO] Git Commit: `chore: verify webview settings full-size layout` (hash: TBD)

### Stream: release build + docs sync (final)
7. [DONE] Release: `./scripts/build-all.sh` (1.1.498) — scope: scripts + manifests/lockfiles; expected commit message: `chore(release): build-all next version`
8. [DONE] Git Commit: `chore(release): build-all next version` (hash: 52779211)
9. [DONE] Release: `./scripts/build-release.sh --use-current-version` (1.1.498) — scope: scripts + VSIX; expected commit message: `chore(release): build VSIX for current version` (hash: N/A - VSIX in .gitignore)
10. [DONE] Docs: sync release docs (1.1.498) — scope: `README.md`, `CHANGELOG.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: update release notes for webview settings layout`
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
5. [TODO] Release: на чистом дереве запустить `./scripts/build-release.sh --use-current-version` и зафиксировать `codeai-hub-<version>.vsix` — scope: scripts + release artifacts; expected commit message: `chore(release): build VSIX for current version`
6. [TODO] Docs: актуализировать релизные документы (строго после сборки): `README.md`, `CHANGELOG.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md` — scope: docs-only; expected commit message: `docs: update release notes for settings full-size hotfix`
7. [TODO] Git Commit: `docs: update release notes for settings full-size hotfix` (hash: TBD)
8. [TODO] Docs(session): создать отчёт `doc/Sessions/Session075.md` (Phase 91 + релиз) — scope: `doc/Sessions/Session075.md`; expected commit message: `docs(session): add Session075 settings full-size hotfix release`
9. [TODO] Git Commit: `docs(session): add Session075 settings full-size hotfix release` (hash: TBD)
