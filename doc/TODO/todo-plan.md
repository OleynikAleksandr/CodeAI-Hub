# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Gates после каждой микрозадачи**: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка затронутого пакета.
- После **каждого** коммита обновляем `doc/TODO/todo-plan.md` (статус + hash) отдельным `docs(todo): ...` коммитом.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/Stacks/UI_Modules.md`
3. `doc/Project_Docs/WebviewSettings_FullSize_Layout_Architecture.md` (THIS DESIGN)
4. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 90 — VS Code Webview Settings: full-size layout (owner: Oleksandr, updated: 2026-02-02)

### Stream: design + approval
1. [DONE] Docs(architecture): согласовать дизайн Settings full-size (убрать centered overlay, занять всю площадь Webview, сохранить vertical scroll) — scope: `doc/Project_Docs/WebviewSettings_FullSize_Layout_Architecture.md`, `doc/TODO/todo-plan.md`, `doc/TODO/Archive/*`; expected commit message: `docs: approve webview settings full-size layout architecture`
2. [DONE] Git Commit: `docs: approve webview settings full-size layout architecture` (hash: f6ee3167)

### Stream: implementation (webview)
3. [DONE] Fix(webview): Settings рендерится как full-size view (100% width/height) вместо centered overlay; vertical scroll сохранён — scope: `media/main-view.css`; expected commit message: `fix(webview): make settings full-size in webview`
4. [DONE] Git Commit: `fix(webview): make settings full-size in webview` (hash: de3e2ae3)

### Stream: verification (manual)
5. [TODO] Verification(owner): `Open settings` → Settings занимает всю площадь Webview; resize работает; vertical scroll при необходимости; нет горизонтального скролла — scope: manual; expected commit message: `chore: verify webview settings full-size layout`
6. [TODO] Git Commit: `chore: verify webview settings full-size layout` (hash: TBD)

### Stream: release build + docs sync (final)
7. [DONE] Release: на чистом дереве запустить `./scripts/build-all.sh` и перенести tarball’ы в `doc/tmp/releases/` — scope: scripts + generated manifests/lockfiles; expected commit message: `chore(release): build-all next version`
8. [DONE] Git Commit: `chore(release): build-all next version` (hash: 52779211)
9. [DONE] Release: на чистом дереве запустить `./scripts/build-release.sh --use-current-version` и зафиксировать `codeai-hub-<version>.vsix` — scope: scripts + release artifacts; expected commit message: `chore(release): build VSIX for current version` (hash: N/A - VSIX in .gitignore)
10. [DONE] Docs: актуализировать релизные документы (строго после сборки): `README.md`, `CHANGELOG.md`, при необходимости `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md` — scope: docs-only; expected commit message: `docs: update release notes for webview settings layout`
11. [DONE] Git Commit: `docs: update release notes for webview settings layout` (hash: 300a697f)
12. [DONE] Docs(session): создать отчёт `doc/Sessions/Session074.md` (Phase 90 + релиз) — scope: `doc/Sessions/Session074.md`; expected commit message: `docs(session): add Session074 webview settings full-size release`
13. [DONE] Git Commit: `docs(session): add Session074 webview settings full-size release` (hash: c125db1f)
