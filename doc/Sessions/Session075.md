# Session 75 — Phase 91: Settings full-size hotfix (CSS precedence) + Release 1.1.499

**Date:** 2026-02-02 19:54 (CET)
**Branch:** main
**Version:** 1.1.499

---

# 1. Work Done in This Session

## Work summary
- Hotfix: исправлено перекрытие стилей `.settings-overlay` из `media/session-view.css` (этот файл подключается после `main-view.css`), из-за чего Settings оставался centered overlay.
- Settings в Webview теперь занимает **всю площадь Webview**, корректно реагирует на resize; вертикальная прокрутка сохраняется внутри Settings.
- Выполнен релизный пайплайн:
  - `./scripts/build-all.sh` → поднял версии до `1.1.499`, пересобрал Core/Providers/UI/Launcher и скопировал tarball’ы в `doc/tmp/releases/`.
  - `./scripts/build-release.sh --use-current-version` → собрал `codeai-hub-1.1.499.vsix` в корне репозитория.
- Актуализированы релизные документы под `1.1.499`.

## Artifacts (local)
- VSIX (root): `codeai-hub-1.1.499.vsix` (в `.gitignore`)
- Tarballs (`doc/tmp/releases/`):
  - `CodeAIHubLauncher-macos-arm64-1.1.499.tar.bz2`
  - `codeai-hub-core-darwin-arm64-1.1.499.tar.bz2`
  - `claude-module-1.1.499.tar.bz2`
  - `codex-module-1.1.499.tar.bz2`
  - `gemini-module-1.1.499.tar.bz2`
  - `vscode-webview-1.1.499.tar.bz2`
  - `project-manager-1.1.499.tar.bz2`

## Verification status
- ✅ Release gates прошли в рамках `build-release.sh` (architecture, typecheck/compile, SDK exclusions, links, duplication, VSIX packaging).
- ⏳ Manual verification (owner) требуется после установки **именно** `codeai-hub-1.1.499.vsix`:
  - `Open settings` → Settings занимает всю площадь Webview;
  - resize работает;
  - vertical scroll появляется только при необходимости;
  - нет горизонтального скролла по умолчанию.

## Git commits
(ВАЖНО: следующий запуск сессии восстанавливает контекст через `git show --stat <hash>` и `git show <hash>` по этому списку)
- `c4c787e0 docs(todo): add Phase 91 settings overlay hotfix plan`
- `07cc6982 fix(webview): make settings overlay full-size (session-view css)`
- `420b477e docs(todo): record Phase 91 settings overlay hotfix hash`
- `b57f71a1 chore(release): build-all next version`
- `4559e86a docs(todo): record Phase 91 build-all hash`
- `5bd366cc docs(todo): mark Phase 91 build-release done`
- `551de095 docs(todo): refine Phase 91 docs steps`
- `a0a43c7b docs: update release notes for settings full-size hotfix`
- `c70d50cb docs: bump Project Docs index for 1.1.499`
- `0fcb3140 docs(todo): record Phase 91 docs hashes`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Stacks/UI_Modules.md`
3. `doc/SolidWorks-Flow/WebviewSettings_FullSize_Layout_Architecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session075.md` (THIS REPORT)

## Plans for next session
- Установить `codeai-hub-1.1.499.vsix` и подтвердить, что Settings действительно full-size в Webview.
- После успешной проверки закрыть manual verification в `doc/TODO/todo-plan.md` отдельным коммитом.
