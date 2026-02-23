# Session 013 — Stop Core on ■ + Resume-on-send + Release v1.1.660

**Date:** 2026-02-23 17:55 (CET)
**Branch:** main
**Version:** 1.1.660

---

# 1. Work Done in This Session

## Work summary
- Session UI: ■ теперь делает остановку Core (вместо быстрого restart), input сразу unlock; следующий Enter/▶ сначала запускает Core и затем отправляет сообщение пользователя после ~2s задержки.
- Session UI: визуально подстроили выравнивание плашки кнопки к инпуту и сделали знак ■ заметнее (больше, поверх красного фона).
- Release: обновили контракт `SessionUI_Behavior.md`, пересобрали webview bundle, обновили `README.md`/`CHANGELOG.md`, прогнали `build-all` и `build-release --use-current-version`.

## Build / verification
- `./scripts/build-all.sh`: ✅ success; артефакты в `~/.codeai-hub/releases/` и копия в `doc/tmp/releases/`.
- `./scripts/build-release.sh --use-current-version`: ✅ success.

VSIX path (local): `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.660.vsix`
VSIX sha256: `b448d20b8774b141318c80534835da35de612da69db7223bc1d6b1322611cf60`

## Git commits
- `b0e9f24a feat(core): add core stop request`
- `6ed0518b fix(ui): pause auto-start after core stop`
- `51f7482b fix(ui): stop button stops core`
- `fb9e5607 fix(ui): tune stop button visuals`
- `f994394e docs(contracts): document stop-core button behavior`
- `7e95ba2e chore(build): rebuild webview after stop-core button`
- `379a1d3e docs(release): v1.1.660 notes`
- `08a4f38b chore(release): build-all v1.1.660`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session013.md` (THIS REPORT)

## Plans for next session
- Проверить на длинном ответе, что ■ действительно останавливает Core (turn прерывается) и что Enter/▶ после остановки запускает Core и отправляет сообщение без залипания input.
