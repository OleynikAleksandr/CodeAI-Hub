# Session 014 — Stop ■ via shutdown endpoint + Release v1.1.661

**Date:** 2026-02-23 18:49 (CET)
**Branch:** main
**Version:** 1.1.661

---

# 1. Work Done in This Session

## Work summary
- Session UI: ■ теперь реально останавливает Core через `POST /api/v1/shutdown` (как в `codeai-core-control.js`), поэтому активный turn прерывается, а не просто разблокируется input.
- Session UI: после stop больше не остаётся вводный placeholder “Agent is working…”, вместо него показывается copy про остановленный Core.
- Release: обновили `README.md`/`CHANGELOG.md`, пересобрали webview bundle, прогнали `build-all` и `build-release --use-current-version`.

## Build / verification
- `./scripts/build-all.sh`: ✅ success; артефакты в `~/.codeai-hub/releases/` и копия в `doc/tmp/releases/`.
- `./scripts/build-release.sh --use-current-version`: ✅ success.

VSIX path (local): `codeai-hub-1.1.661.vsix`
VSIX sha256: `ee832b8cd19c8a02be60cf2bf1913f934b3614883ff1590f19d9a2801e6978da`

## Git commits
- `999f4eb8 docs(todo): plan stop shutdown fix v1.1.661`
- `90ac41e6 fix(ui): stop button shuts down core`
- `6cd66933 docs(todo): mark core shutdown stop done`
- `2d6d519b chore(build): rebuild webview after core shutdown stop`
- `139e94d9 docs(todo): mark webview rebuilt for stop fix`
- `541f9c8d docs(release): v1.1.661 notes`
- `202c1fad docs(todo): mark v1.1.661 notes done`
- `61accb36 chore(release): build-all v1.1.661`
- `2eeeb61f docs(todo): mark build-all v1.1.661`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session014.md` (THIS REPORT)

## Plans for next session
- Ручная проверка UX: длинный ответ → ■ должен гасить stream немедленно (turn прерывается), UI показывает, что Core остановлен, и Enter/▶ после stop запускает Core и отправляет новое сообщение без “Agent is working…” залипания.
