# Session 131 — Launcher runtime integrity hotfix и релиз 1.1.537

**Date:** 2026-02-09 12:20 (CET)
**Branch:** main
**Version:** 1.1.537

---

# 1. Work Done in This Session

## Work summary
- Выполнен root-cause анализ падения Project Manager (`Failed to load CEF framework`) и подтверждён дефект в логике валидации launcher-install: проверялся только executable, без проверки целостности CEF framework payload.
- Реализован hotfix Phase 118: добавлен runtime integrity guard (обязательные файлы launcher runtime по платформе, включая macOS CEF framework binary) и защита legacy→primary migration от self-copy через symlink-path.
- Синхронизированы архитектурные документы (`Launcher_CEF_Module`, `SystemArchitecture`) и обновлён `todo-plan` под новый релизный цикл hotfix.
- Пройдены обязательные гейты: `check-architecture`, `ultracite check`, `ts-prune`, `jscpd`, `check:links`, `compile`.
- Выполнен релизный цикл: `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`; сформированы tarball-артефакты `1.1.537` и VSIX `codeai-hub-1.1.537.vsix`.
- Подтверждён clean-install smoke для launcher integrity: `CLEAN_INSTALL_SMOKE_OK`; дополнительно проверен guard на неполной установке: `INTEGRITY_GUARD_OK`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `a1b11b8c fix(launcher): enforce runtime integrity and guard legacy self-copy on macos`
- `b4ebf25c docs(qa): validate launcher integrity hotfix gates and targeted builds`
- `5608d20b docs(release): prepare release notes for launcher runtime integrity hotfix`
- `ecab5327 chore(release): run build-all for launcher runtime integrity hotfix`
- `c30dce21 chore(release): build and validate vsix for launcher runtime integrity hotfix`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Stacks/Launcher_CEF_Module.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session131.md` (THIS REPORT)

## Plans for next session
- Провести post-release пользовательский smoke в реальном сценарии: полностью очистить `~/.codeai-hub`, установить VSIX `1.1.537`, проверить запуск Project Manager и старт launcher/core без ручных правок.
- При зелёном smoke заархивировать завершённый `todo-plan` в `doc/TODO/Archive/` и подготовить новый `todo-plan.md` под следующий цикл задач.
- При выявлении edge-cases добавить targeted regression tests на launcher install reuse/migration path.
