# Session 41 — Phase 261 execution + release build v1.1.688

**Date:** 2026-02-26 14:50 (CET)
**Branch:** main
**Version:** 1.1.688

---

# 1. Work Done in This Session

## Work summary
- Полностью выполнен `Phase 261` из `doc/TODO/todo-plan.md`: закрыты Streams 0–5.
- Реализован recovery stale-running для cold start: при `workspace select` Core нормализует `turnState="running"` в `idle` в безопасном кейсе (`finalTurnCompleted=true`, без активного continuity bootstrap lock).
- Добавлены регрессионные тесты в `workspace-runtime-facade.test.ts`:
  - stale-running recovery на cold start;
  - restore persisted task timers при сценарии hydrate-before-select.
- Исправлено восстановление `taskTimer.totalSeconds`: persisted totals теперь подтягиваются даже если runtime-сессии гидратятся до первого `workspace select`.
- Синхронизированы SSOT-контракты:
  - `SessionInputLock_SSOT_StateMachine.md` (incremental stage `1.1.688`),
  - `SessionTaskTimer_UI.md` (per-workspace storage + hydrate-before-select rule).
- Выполнен release cycle:
  - `./scripts/build-all.sh` → unified version `1.1.688`;
  - `./scripts/build-release.sh --use-current-version` → собран `codeai-hub-1.1.688.vsix`.
- Таргетная верификация:
  - `npx tsx --test packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts` (green после фиксов),
  - `npm run build --workspace @codeai-hub/core` (green),
  - `npm run typecheck:webview` (green).
- В релизном прогоне `build-release` зафиксирован advisory по дублированию (`jscpd 3.07% > 3%`), при этом сборка успешно завершилась и VSIX создан.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `328be048 docs(vs): approve cold start recovery contract`
- `a33a620d test(core): cover stale-running recovery on cold start`
- `c7c4c408 fix(core): recover stale running sessions on cold start`
- `89a0e59a test(core): restore taskTimer totals on cold start`
- `da275518 fix(core): restore task timer totals from persisted workspace state`
- `1ad91d6d docs(vs): sync cold start recovery behavior notes`
- `6bf1681a chore(release): build-all v1.1.688`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Archive/Session041.md` (THIS REPORT)

> Далее: в зависимости от задачи открыть нужные документы из `doc/SolidWorks-WorkFlow/Clusters/`, `doc/SolidWorks-WorkFlow/Modules/`, `doc/SolidWorks-WorkFlow/Contracts/`.

## Plans for next session
- Выполнить manual PM UI smoke на реальном сценарии `virtual_simulation` (reopen после вопросов) и подтвердить отсутствие ручного Stop workaround.
- Проверить релиз `1.1.688` в тестовом окружении пользователя (VSIX + provider/core tarballs).
- По результатам тестов решить, нужен ли follow-up phase (например, по снижению jscpd дублирования выше 3% в release-пайплайне).
