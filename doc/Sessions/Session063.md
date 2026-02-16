# Session 063 — Codex model selection: gpt-5.2 vs gpt-5.3-codex (fix) + релиз 1.1.607

**Date:** 2026-02-16 08:55 (CET)
**Branch:** main
**Version:** 1.1.607

---

# 1. Work Done in This Session

## Work summary
- Ограничен список моделей Codex в Settings до двух: `gpt-5.2` и `gpt-5.3-codex`, включая сохранение/валидацию reasoning effort для каждой модели.
- Добавлен best-effort startup sanitizer для provider-home файлов Codex (`config.toml`, `models_cache.json`), чтобы удалять навязанную миграцию `gpt-5.2 -> gpt-5.3-codex` после автоапдейтов.
- Исправлено фактическое применение выбранной модели `gpt-5.2`: в сценариях, где Codex CLI/SDK “липнет” к модели треда, при выборе `gpt-5.2` модуль избегает resume и создаёт новый thread, чтобы rollout JSONL отражал `turn_context.model = gpt-5.2`.
- Собран и проверен локальный VSIX `codeai-hub-1.1.607.vsix`; пользователь подтвердил, что в релизе `1.1.607` выбор `gpt-5.2` начал реально работать.
- Обновлены `README.md` и `CHANGELOG.md` под релиз `1.1.607`; изменения закоммичены, тег `v1.1.607` создан и запушен в `origin/main`.

## Git commits
- `55603d34 feat(release): v1.1.607 - codex model selection`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/Sessions/Session063.md` (THIS REPORT)

## Plans for next session
- Если нужно оформить GitHub Releases страницу с артефактами: выполнить `gh auth login`, затем создать release `v1.1.607` и прикрепить `codeai-hub-1.1.607.vsix` и tarballs из `doc/tmp/releases/*-1.1.607.tar.bz2`.
- При необходимости: уточнить/документировать product behavior для смены модели Codex на активных диалогах (resume vs new thread) и добавить UX-подсказку в UI.
