# Session 037 — Idea Collector templates tuning + релиз 1.1.373

**Date:** 2026-01-01 16:06 (CET)
**Branch:** main
**Version:** 1.1.373

---

# 1. Work Done in This Session

## Work summary
- Дотюнен единый контракт/шаблоны Idea Collector под multi-module инициативы:
  - добавлены типы идеи `приложение`/`кластер`;
  - вшито правило Flow: для `приложение`/`кластер` этап Spec считается завершённым только после `Spec.md` для каждого модуля; `Plan.md` составляется отдельно для каждого модуля;
  - virtual-simulation.md стандартизирован: секции `UI ↔ Core события` и `Логи и телеметрия` сделаны обязательными (когда релевантно).
- Синхронизирован fallback (UI) для schema/стартового промпта, чтобы поведение было консистентным при недоступности Core контракта.
- Обновлены документы релиза: `README.md`, `CHANGELOG.md`, `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/IdeaCollector_Universal_Contract.md`.
- Собран релиз 1.1.373: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`, VSIX создан.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `f4fcf8c feat(idea-collector): add cluster/app flow rules`
- `e3a513c fix(idea-collector): sync kickoff prompt for clusters`
- `a2c1e27 feat: v1.1.373 - Idea Collector cluster/app rules`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/Project_Docs/IdeaCollector_Universal_Contract.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session037.md` (THIS REPORT)

## Plans for next session
- E2E: New Session → Codex → Idea Collector и New Session → Claude → Idea Collector: проверить, что `idea_type` корректно принимает `приложение/кластер` и что `virtual-simulation.md` включает `UI ↔ Core события` и `Логи и телеметрия`.
- При подтверждении качества — перейти к Spec Agent (`Spec.md`) с тем же multi-module правилом.
