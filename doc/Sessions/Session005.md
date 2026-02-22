# Session 005 — Task timer SSOT in Core + Release v1.1.652

**Date:** 2026-02-22 20:09 (CET)
**Branch:** main
**Version:** 1.1.652

---

# 1. Work Done in This Session

## Work summary
- Перенесли SSOT таймера в Core (node-level per `workspaceRoot + nodeId`) и добавили его в `workspace:snapshot` как `taskTimer { totalSeconds, runningSinceMs }`.
- Project Manager: применяем `taskTimer` из workspace snapshot в `SessionStatusInfo.taskTimer`.
- Session UI: убрали localStorage-таймер как SSOT; total/turn теперь отображаются из `status.taskTimer` (total статичен во время lock; turn overlay тикает от `runningSinceMs`).
- Обновили контракт `SessionTaskTimer_UI.md` под Core SSOT.
- Пересобрали webview bundle.
- Собрали релиз: `build-all` (version bump до `1.1.652`) + `build-release --use-current-version`.

## Build / verification
- `npm run typecheck:webview`: ✅ success.
- `npm run build:webview`: ✅ success.
- `./scripts/build-all.sh`: ✅ success; артефакты в `~/.codeai-hub/releases/` и копия в `doc/tmp/releases/`.
- `./scripts/build-release.sh --use-current-version`: ✅ success.

VSIX path (local): `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.652.vsix`

## Git commits
- `b23dfd6a feat(core): add task timers to workspace snapshots`
- `2892e13c feat(pm): sync task timers from workspace snapshots`
- `eb06161e feat(ui): read task timers from core snapshots`
- `eafd74e4 docs(contracts): move task timer SSOT to core`
- `62879666 chore(build): rebuild webview after core task timer`
- `650195f4 docs(release): v1.1.652 notes`
- `b57157ec chore(release): build-all v1.1.652`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/SessionTaskTimer_UI.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session005.md` (THIS REPORT)

## Plans for next session
- Визуально подтвердить в Project Manager: таймеры total/turn не сбрасываются при смене workspace, multi-tab, и при перезагрузке Project Manager; верхний/нижний таймеры выровнены по одному right anchor.
- Решить, нужно ли сохранять total при перезапуске Core; если да — спроектировать persistence в Core.
