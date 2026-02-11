# Session 018 — Phase 141: Legacy Template Tail Cleanup + Release 1.1.561

**Date:** 2026-02-11 14:56 (CET)
**Branch:** main
**Version:** 1.1.561

---

# 1. Work Done in This Session

## Work summary
- В extension activation удалена автоустановка legacy шаблонов `full-development-flow/idea/*`; удалены installers, которые создавали хвост в `~/.codeai-hub/templates/full-development-flow`.
- Прогнаны обязательные гейты качества после cleanup (`check-architecture`, `ultracite`, `ts-prune`, `jscpd`, `check:links`, `compile`).
- Выполнены `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`; собран `codeai-hub-1.1.561.vsix`, обновлены tarball в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.
- Синхронизированы release-документы под `1.1.561`: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `cf509a09 refactor(extension): drop legacy full-development-flow template installers`
- `6b64c4a1 chore(checks): pass gates for phase 141 legacy template cleanup`
- `8aaa2a3a chore(release): run build-all for phase 141 cleanup`
- `ac9234ae chore(release): build and validate vsix for v1.1.561`
- `427ae1c8 docs(release): sync root notes and system architecture for v1.1.561`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session018.md` (THIS REPORT)

## Plans for next session
- Проверить чистую установку VSIX `1.1.561` в новом окружении и подтвердить, что `~/.codeai-hub/templates/full-development-flow` больше не создаётся.
- При необходимости выполнить дополнительную очистку legacy хвостов (`questionnaire-curator.md` и др.) с отдельным plan-stream.
- Подготовить следующую фазу по runtime template governance (явный whitelist активных template roots).
