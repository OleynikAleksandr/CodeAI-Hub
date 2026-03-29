# Session 192 — Provider Feedback Rollback And Release 1.1.837

**Date:** 2026-03-29 16:46 (CEST)
**Branch:** main
**Version:** 1.1.837

---

# 1. Work Done in This Session

## Work summary
- Полностью откатан provider-feedback logging scope для `Codex`, `Claude` и `Gemini`; удален лишний runtime-specific код и связанные тесты.
- Active SSOT и release-facing документы синхронизированы с rollback baseline; исторические документы релиза `1.1.836` сохранены как архивный факт.
- Собран новый rollback-релиз `1.1.837`: выполнены `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, получен `codeai-hub-1.1.837.vsix`, tarball-артефакты обновлены в `doc/tmp/releases/`.

## Git commits
- `58c234a2 docs(plan): define provider feedback rollback`
- `b652d3c6 revert: remove gemini provider thought feedback`
- `59a72fdf revert: remove gemini provider model feedback`
- `58d39c1d revert: remove claude provider feedback`
- `1eff30cd revert: remove codex provider feedback`
- `3c1c76d3 docs(ssot): rollback provider feedback core docs`
- `6224cd66 docs(release): prepare provider feedback rollback`
- `d3e8b231 chore: prepare v1.1.837 artifacts`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session192.md` (THIS REPORT)

> Далее: в зависимости от нового scope открыть нужные документы из `doc/SolidWorks-WorkFlow/Plans/`, `Modules/`, `Contracts/`, `Clusters/`.

## Plans for next session
- Использовать `1.1.837` как новый rollback baseline без provider-feedback logging scope.
- Если тема provider observability вернется, сначала доказать наличие точного provider echo на одном провайдере и только потом проектировать новую нормализацию в SDK logs.
- Перед новым execution stream обязательно создать новый planning-док и заменить placeholder `doc/TODO/todo-plan.md` на утвержденный phase/stream план.
