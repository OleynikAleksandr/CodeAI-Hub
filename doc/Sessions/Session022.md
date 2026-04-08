# Session 022 — Diagram Modules Autolayout Failure History Summary

**Date:** 2026-04-08 15:49 (CEST)
**Branch:** main
**Version:** 1.1.916
**Execution Scope Status:** COMPLETED

---

# 1. Work Done in This Session

## Work summary
- Подготовлен специальный zero-context summary report по всем corrective wave для `Diagram Modules` autolayout, чтобы следующая сессия могла быстро восстановить историю неудачных подходов и не повторять тот же класс решений.
- Ключевые неудачные corrective attempts зафиксированы так:
  - Session013 — release `1.1.908`, measured min-gap normalizer. Неудача: появился стабильный gap между модулями, но модули всё равно налезали на нижние границы `Cluster` и `Product Part`; решение чинило sibling spacing, но не исправляло parent geometry contract.
  - Session014 — release `1.1.909`, measured ownership reflow. Неудача: было доказано, что проблема не в stale sidecar, но even measured-first ownership rebuild не устранил boundary overlap; значит ошибка жила глубже, чем sidecar invalidation и bottom-up resize.
  - Session015 — release `1.1.910`, shared visual bounds for auto/manual paths. Неудача: manual и autolayout path были формально унифицированы, но дефект остался; пользователь подтвердил, что overlap воспроизводится и в auto, и в manual, то есть shared bounds contract сам по себе оказался недостаточным.
  - Session016 — release `1.1.911`, initial autolayout hierarchical packer. Неудача: отделение `seed-autolayout` от `persisted-sidecar` и hierarchical packer не решили first-open autolayout на реальных пользовательских данных; safe ownership boundaries всё ещё не сходились.
  - Session017 — release `1.1.912`, overlap-aware initial autolayout. Неудача: top-boundary дефект был частично смягчён, но lower overlap остался; horizontal-overlap packing не решил реальную ownership geometry проблему.
  - Session019 — release `1.1.914`, module shadow visual-bottom allowance. Неудача: гипотеза про CSS shadow как главный root cause оказалась ложной или вторичной; пользователь подтвердил, что meaningful repair не произошло.
  - Session020 — release `1.1.915`, live measurement stabilization. Неудача: автолайаут всё ещё не был исправлен, а дополнительно появились зависания, trim-проблемы и регрессия ручного перетаскивания; это был самый неудачный corrective pass в серии.
- Сопутствующий контекст, который тоже нужно помнить в следующей сессии:
  - Session018 — release-only rebuild `1.1.913`, без новых layout-изменений; полезен только как напоминание, что identical defect profile может сохраняться просто потому, что релиз не содержал новой логики.
  - Session021 — rollback rebuild `1.1.916` поверх базы `1.1.914`; это не попытка лечения автолайаута, а сознательный возврат к более стабильному baseline после регрессий `1.1.915`.
- Главный общий вывод по всей серии неудач:
  - все corrective wave лечили локальные симптомы текущего pipeline: min-gap, measured reflow, shared bounds, hierarchical packing, overlap-aware packing, shadow allowance, stabilized re-measure;
  - ни одна волна не заменила сам базовый layout model на принципиально другой solver/ownership contract;
  - следующий scope не должен продолжать серию incremental repair вокруг существующей схемы без явного архитектурного разрыва с уже провалившимися подходами.

## Git commits
(REFERENCE ONLY: этот список сохраняется для исторической трассировки и расследования регрессий; следующая сессия не обязана читать все коммиты по умолчанию.)
- `00aa4a77f docs(session): record rollback rebuild release closeout`

---

# 2. Instructions for Next Session

**Base SSOT:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
**Scope Discovery Index:** `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Plans for next session
- Активный execution scope отсутствует.
- Следующий агент обязан сначала прочитать этот отчет: `doc/Sessions/Session022.md`.
- Затем агент обязан открыть все перечисленные в нем session reports по corrective wave `Diagram Modules` autolayout и изучить pattern of failure before proposing a new fix.
- После этого агент обязан прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и только затем согласовывать с пользователем новый scope.
- Новый scope должен явно объяснить, чем предлагаемый путь принципиально отличается от уже провалившихся corrective attempts `1.1.908–1.1.915`.
