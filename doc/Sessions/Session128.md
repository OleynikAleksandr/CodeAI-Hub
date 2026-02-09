# Session 128 — Реализация Phase 116 и релиз 1.1.535

**Date:** 2026-02-09 09:59 (CET)
**Branch:** main
**Version:** 1.1.535

---

# 1. Work Done in This Session

## Work summary
- Полностью реализован `Phase 116 — Rollover Flag Reset After Bootstrap Unlock` из `doc/TODO/todo-plan.md`.
- В Core после `resume_ready` добавлена нормализация post-bootstrap lifecycle: очищаются rollover pending-флаги/контексты source+target, target переводится в `resume_in_place`, устранён повторный post-resume relock.
- Добавлен core regression на реальный порядок событий `assistant -> turn_completed` после rollover: подтверждено отсутствие повторного зависания в `resuming` lock и корректный unlock-path `no_rollover_needed`.
- Добавлены PM/UI non-regression тесты, подтверждающие отсутствие повторного `blocked(resuming)` placeholder после `resume_ready` и первого обычного turn.
- Обновлены архитектурные документы (`SystemArchitecture`, continuity lock contract) под Phase 116 инварианты post-bootstrap lifecycle нормализации.
- Выполнены release-этапы: `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`; собран VSIX `codeai-hub-1.1.535.vsix`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `4e4e507d fix(core): reset rollover flags and normalize lifecycle after bootstrap unlock`
- `8d0655b0 test(core): prevent post-resume relock after first normal turn`
- `a50b021a test(pm-ui): ensure no resuming relock after rollover bootstrap completion`
- `23cb35dc docs(architecture): document post-bootstrap rollover flag reset contract`
- `6b333cc1 docs(release): prepare release notes for phase 116 rollover flag reset hotfix`
- `e90772b5 chore(release): run build-all for phase 116 rollover flag reset hotfix`
- `17602f6e chore(release): build and verify vsix for phase 116 rollover flag reset hotfix`
- `e14373b9 chore(plan): finalize phase 116 release stream hashes`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/SessionContinuity/Core/FlowNodeContinuity_InputLock_Contract_Architecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session128.md` (THIS REPORT)

## Plans for next session
- Выполнить smoke-проверку установленного `codeai-hub-1.1.535.vsix` в целевом окружении на сценариях rollover/normal turn.
- При подтверждении стабильности Phase 116 перейти к новому архитектурному циклу (подготовка следующей Phase в `doc/TODO/todo-plan.md`).
- При необходимости заархивировать полностью завершённый план в `doc/TODO/Archive/` и сформировать новый `todo-plan.md` под следующую задачу.
