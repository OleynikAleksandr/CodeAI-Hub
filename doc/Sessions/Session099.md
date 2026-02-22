# Session 099 — BUG-2026-02-22-01: Stream 1/2 закрыты + релиз 1.1.646

**Date:** 2026-02-22 10:22 (CET)
**Branch:** main
**Version:** 1.1.646

---

# 1. Work Done in This Session

## Work summary
- Закрыт **Stream 1 (PM)**: добавлен регрессионный тест на cold-start snapshot без `continuityLockReason` и внесён фикс в `applyWorkspaceSnapshotToSnapshots`, снимающий вечный `blocked` при `idle + continuityLockActive=false`.
- Закрыт **Stream 2 (Core)**: добавлена нормализация snapshot для `resume_in_place` idle/unlocked-сессий — Core теперь эмитит явный `continuityLockReason="no_rollover_needed"` вместо `undefined`.
- Выполнен релизный цикл **Stream 3 (частично)**:
  - `./scripts/build-all.sh` успешно поднял версию до `1.1.646` и собрал tarball-артефакты;
  - `./scripts/build-release.sh --use-current-version --allow-dirty` успешно собрал VSIX.
- Ручная матрица сценариев (normal / rollover / crash mid-turn / cold start / one-shot) в UI не прогонялась в этой сессии и оставлена как `BLOCKED` в `doc/TODO/todo-plan.md`.

## Build / verification
- PM regression/guard tests:
  - `node --import tsx --test src/client/project-manager/components/sessions/session-stream-provider-fallback.test.ts`
  - `node --import tsx --test src/client/project-manager/components/sessions/session-stream-rollover-pending.test.ts src/client/project-manager/components/sessions/session-stream.test.ts`
- Core runtime tests:
  - `node --import tsx --test packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts packages/core/src/workspace-runtime/session-runtime.test.ts`
- Release/build:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version --allow-dirty`
- Артефакты релиза:
  - VSIX: `codeai-hub-1.1.646.vsix`
  - Tarballs: `doc/tmp/releases/*-1.1.646.tar.bz2`

## Created/updated docs
- `doc/TODO/todo-plan.md`
- `doc/Sessions/Session099.md` (этот отчёт)

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `a066be90 test(pm): reproduce resuming stuck when lock reason missing`
- `ca728192 fix(pm): unlock input on cold-start idle snapshot`
- `de402c33 fix(core): emit explicit unlock reason for idle sessions`
- `71a20e11 feat(release): v1.1.646 - fix session input unlock on cold start`
- `90e37430 docs(todo): record release hash and block manual matrix`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
5. `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
6. `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
7. `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
8. `doc/TODO/todo-plan.md`
9. `doc/BugRegistry.md`
10. `doc/Sessions/Session099.md` (THIS REPORT)

## Plans for next session
- Прогнать ручную матрицу Stream 3 в Project Manager UI по контракту `SessionInputLock_SSOT_StateMachine.md`.
- Зафиксировать результаты ручной верификации в `doc/BugRegistry.md` и определить, можно ли закрывать `BUG-2026-02-22-01`.
- Если баг подтверждён как закрытый, перевести Stream 3 из `BLOCKED` в `DONE` и подготовить следующий Phase/todo-план.
