# Session 015 — Start Core after Stop (CEF) + Release v1.1.662

**Date:** 2026-02-23 19:30 (CET)
**Branch:** main
**Version:** 1.1.662

---

# 1. Work Done in This Session

## Work summary
- CEF Launcher: добавили `codeai://core-start` и bridge `window.codeaiLauncher.ensureCoreRunning()` для запуска Core из UI без VS Code Supervisor API.
- Session UI: `requestCoreFromSupervisor()` теперь fallback’ится на Launcher bridge, поэтому Enter/▶ после stop (■) запускают Core и затем отправляют сообщение (через существующую задержку).
- Docs: обновили контракт `SessionUI_Behavior.md` и release notes.

## Build / verification
- `./scripts/build-all.sh`: ✅ success; артефакты в `~/.codeai-hub/releases/` и копия в `doc/tmp/releases/`.
- `./scripts/build-release.sh --use-current-version`: ✅ success.

VSIX path (local): `codeai-hub-1.1.662.vsix`
VSIX sha256: `071d225f09480e0739432657fea542b9c504edbc82ef742a10a9062a2ffb2ba9`

## Git commits
- `fd85b2c4 docs(todo): plan core start after stop v1.1.662`
- `27cc43f1 fix(launcher): start core via launcher bridge`
- `6eea0c91 docs(todo): mark launcher core-start bridge done`
- `26303a23 chore(build): rebuild webview after launcher core start bridge`
- `b0345229 docs(todo): mark webview rebuilt for launcher core start bridge`
- `fc8a5e56 docs(release): v1.1.662 notes`
- `25b00a0d docs(todo): mark v1.1.662 notes done`
- `ccceaac0 chore(release): build-all v1.1.662`
- `69ba01f2 docs(todo): mark build-all v1.1.662`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session015.md` (THIS REPORT)

## Plans for next session
- Ручной UX чек: ■ останавливает Core, а Enter/▶ в CEF реально запускают Core (без внешних скриптов) и новый запрос уходит.
- Если запуск Core иногда занимает >2s: добавить более явный UI feedback “Starting Core…” до восстановления соединения.
