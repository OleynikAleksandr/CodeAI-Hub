# Session 091 — Fix: UI bundles install (ERR_FILE_NOT_FOUND)

**Date:** 2026-02-19 08:50 (CET)
**Branch:** main
**Version:** 1.1.640

---

# 1. Work Done in This Session

## Work summary
- Диагностика релиза `1.1.639`: VS Code Settings UI и Launcher UI не загружались из-за `ERR_FILE_NOT_FOUND` по пути `~/.codeai-hub/packages/ui/*/current/*`.
- Root cause: `UIBundleInstaller` распаковывал UI tarball’ы с лишней верхней директорией (`project-manager-<ver>/...`), но `resolveUIBundlePath()` ожидает файлы прямо в `.../current/`.
- Fix: распаковка UI tarball’ов с `stripComponents: 1` + чистый reinstall + проверка required-file (`index.html`/`react-chat.js`) перед пропуском установки.
- Workaround (для уже установленного `1.1.639`): перепривязать `current` symlink на вложенную директорию, чтобы `current/index.html` существовал.
- Release: `./scripts/build-all.sh` → `1.1.640`; `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.640.vsix`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `5feb54c9 fix(ui): extract ui bundles without nested dir`
- `2ea8c512 docs(changelog): add v1.1.640 ui installer fix`
- `9bc31775 feat(release): v1.1.640 - fix ui bundle install`
- `aa0a67ec docs(bug-registry): record ui bundle install regression`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/BugRegistry.md`
6. `doc/Sessions/Session091.md` (THIS REPORT)

## Plans for next session
- Установить `codeai-hub-1.1.640.vsix` и подтвердить manual verify для `BUG-2026-02-19-01`.
- Вернуться к `BUG-2026-02-18-07`: проверить в `1.1.640`, что во время rollover/switch placeholder переключается на “resuming…”, а не остаётся “working…”.
