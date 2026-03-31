# Session 017 — Description: ↻ Restart attempt (one-shot recovery)

**Date:** 2026-02-24 10:02 (CET)
**Branch:** main
**Version:** 1.1.663

---

# 1. Work Done in This Session

## Work summary
- Заархивирован текущий `doc/TODO/todo-plan.md` (Phase 237) и создан новый план под Phase 238: аварийный ↻ Restart attempt для one-shot Description.
- Зафиксирован контракт обсуждения: Description = job/no-resume; ↻ не перезапускает Core; restart = новая попытка с confirm + игнор late results от старых attempt’ов.
- Core: реализован “accept only latest attempt” (run-scoped draft paths + игнор late artifacts) и прокинут run-scoped draft path в reviewer prompt-pack.
- PM/UI: добавлены ↻ Restart attempt в `questionnaire.md` header и в UI сессии (вместо Stop/Play) + confirm и перезапуск попытки через новую сессию без рестарта Core.
- Пересобран webview bundle (`media/react-chat.js`).

## Git commits
- `36a68606 docs(session): start Session017 and Phase 238 plan`
- `0f11f66a docs(contracts): description restart attempt contract`
- `00fce612 feat(core): gate description by attemptId`
- `19629d9e feat(pm): write description draft to runs`
- `b0735af5 feat(pm): restart description attempt from questionnaire artifact`
- `835aedea feat(ui): restart attempt control for description`
- `f3d2021e feat(pm): restart description attempt from session UI`
- `3e8cd3e0 chore(build): rebuild webview after description restart attempt`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
5. `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`
6. `doc/TODO/todo-plan.md` (THIS PLAN)
7. `doc/Sessions/Archive/Session017.md` (THIS REPORT)

## Plans for next session
- Smoke test: завис/падение Description mid-turn → ↻ Restart attempt → новый draft принимается, старые late artifacts игнорируются, reviewer стартует один раз.
- Проставить версию релиза для BUG-2026-02-24-01 после `build-all.sh`/`build-release.sh` и переноса артефактов в `doc/tmp/releases/`.
