# Session 113 — Phase 105 Workspace Runtime MVP: migration, lock authority, legacy deprecation

**Date:** 2026-02-08 06:27 (CET)
**Branch:** main
**Version:** 1.1.523

---

# 1. Work Done in This Session

## Work summary
- Завершена миграция PM/Core на `workspace:select` + `workspace:snapshot` с ack-gating и snapshot-first lock authority.
- В PM переведены workspace switch/resume path на `workspace:select:ack(applied)`; runtime fallback на `workspace:scope:set` удалён.
- Input lock в PM теперь определяется из `workspace:snapshot`; `token-usage-stream` больше не меняет `connectionState`/continuity lock по `session:stream`.
- Добавлены non-regression тесты Core/PM для routing `workspace:select`, snapshot-driven lock и ack-gating.
- Обновлены архитектурные/релизные документы под Phase 105; Phase 104 handshake помечен как deprecated, добавлен legacy checklist.
- Все микро-задачи закрывались с обязательными гейтами (`check-architecture`, Ultracite, ts-prune, jscpd, check:links, таргетные build/typecheck).

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `1d7975a4 feat(core): define workspace runtime compound keys and snapshot types`
- `f1386db3 feat(core): define workspace runtime wire protocol types`
- `1cfbe075 feat(core): extend bridge event types with workspace runtime messages`
- `f06cbe67 feat(core): implement sharded workspace store`
- `ac5ed4f2 feat(core): implement workspace snapshot builder`
- `3ab59fd8 feat(core): implement session runtime with turn state FSM and watchdog`
- `4a466ac7 test(core): cover session runtime FSM and watchdog`
- `ade1f60c feat(core): implement workspace runtime facade`
- `44bcb422 test(core): cover workspace runtime facade`
- `7890ea01 feat(core): hydrate workspace store from session manager on select`
- `3d1b4ae9 feat(core): route session lifecycle events through workspace runtime`
- `b4d5b124 feat(core): route turn state and lock through workspace runtime`
- `27c13f0c feat(core): wire stream chunk heartbeat to session runtime watchdog`
- `e14ccdff feat(core): wire workspace runtime facade into remote bridge with scope sync`
- `a3bdb9ca feat(pm): add workspace runtime wire types to message contract`
- `ff026889 feat(pm): implement client-side workspace snapshot store`
- `ed8029f6 feat(pm): migrate workspace scope sync to workspace:select protocol with ack-gating`
- `81161f12 feat(pm): migrate session resume intent to workspace:select protocol`
- `1a9cccc7 feat(pm): derive input lock from workspace snapshot instead of stream events`
- `ebe1c331 fix(pm): stop mutating connection lock state from stream events; snapshot authoritative`
- `efa634f3 docs(legacy): create Phase 104 deprecation checklist and mark deprecated`
- `049e909d test(core): cover workspace select routing in remote bridge`
- `0611f91d test(pm): assert snapshot-driven lock and remove legacy turn_state expectations`
- `56163ac5 test(pm): cover workspace select ack gating in switch and resume`
- `3515853a fix(pm): remove legacy workspace scope fallback from workspace sync`
- `bc8f9926 docs(architecture): document workspace runtime module in system architecture`
- `40913c99 docs(release): update README and CHANGELOG for workspace runtime MVP`
- `5a9c9625 docs(legacy): mark workspace scope handshake doc as deprecated`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/WorkspaceRuntime_LayeredArchitecture.md`
2. `doc/SolidWorks-Flow/InterfaceMap_WorkspaceRuntime.md`
3. `doc/SolidWorks-Flow/Phase104_LegacyDeprecationChecklist.md`
4. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session113.md` (THIS REPORT)

## Plans for next session
- Закрыть release stream: чистое дерево, `./scripts/build-all.sh`, коммит релизных манифестов/версий.
- Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX и tarball-артефакты.
- Обновить `doc/TODO/todo-plan.md` (статусы + hash для всех пунктов Phase 105) и архивировать завершённый план в `doc/TODO/Archive/`.
