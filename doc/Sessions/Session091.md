# Session 91 — Questionnaire resume fix + release 1.1.406

**Date:** 2026-01-12 10:30 (CET)
**Branch:** main
**Version:** 1.1.406

---

# 1. Work Done in This Session

## Work summary
- Исправлено возобновление анкеты Idea: UI перечитывает анкету при resume, не использует устаревший кеш шаблона и не сбрасывает валидные ответы из-за эвристики `<...>`.
- Обновлён bundled шаблон анкеты (подсказки вынесены из полей ответов).
- Собран релиз 1.1.406: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.
- Обновлены релизные документы (README/CHANGELOG/Architecture/SystemArchitecture) под 1.1.406.

## Build results
- VSIX: `codeai-hub-1.1.406.vsix`
- Tarballs: `doc/tmp/releases/*-1.1.406.tar.bz2`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `641b5263 fix(ui): preserve questionnaire answers on resume`
- `6c290850 fix(idea): adjust questionnaire template hints`
- `bd8fcca6 chore(ui): refresh webview fallback bundle`
- `3d714331 chore(release): bump 1.1.406`
- `f3a9ae0b docs: update 1.1.406 release notes`
- `aa402f3d docs: update todo plan status`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/Architecture/Architecture.md`
4. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session091.md` (THIS REPORT)

## Plans for next session
- Выполнить ручной e2e тест resume анкеты в UI на версии 1.1.406 (VS Code webview и при возможности web-client).
- Проверить, что шаблон анкеты из bundled templates корректно синхронизируется в `~/.codeai-hub/templates/full-development-flow/idea/questionnaire-template.md`.
- При необходимости: обновить `doc/TODO/todo-plan.md` (заполнить hash для `docs: add session 91 report`).
