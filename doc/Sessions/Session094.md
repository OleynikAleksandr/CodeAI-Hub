# Session 94 — Release 1.1.514 prep + GitHub force-sync attempt

**Date:** 2026-02-06 08:50 (CET)
**Branch:** main
**Version:** 1.1.514

---

# 1. Work Done in This Session

## Work summary
- Актуализированы `README.md` и `CHANGELOG.md` под релиз `1.1.514` перед публикацией.
- Выполнен релизный цикл: `./scripts/build-all.sh` (unified bump до `1.1.514`) и `./scripts/build-release.sh --use-current-version` (VSIX собран).
- Подготовлены артефакты релиза `1.1.514` (providers/core/launcher/UI tarballs + VSIX).
- Выполнена попытка «жестко перезаписать GitHub» (force push `main` + push тега `v1.1.514`), но операция блокируется политикой среды выполнения (`git push` rejected: blocked by policy).
- Локально создан/обновлён тег `v1.1.514` на релизном коммите.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `1e6fb5cb docs(release): update README and CHANGELOG for 1.1.514`
- `2806c70d chore(release): build-all next version`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session094.md` (THIS REPORT)

## Plans for next session
- Выполнить force-sync в GitHub из окружения, где `git push` не заблокирован:
  - `git push --force origin main`
  - `git push --force origin refs/tags/v1.1.514`
- Создать/обновить GitHub Release `v1.1.514` и прикрепить `codeai-hub-1.1.514.vsix`.
- После успешной публикации зафиксировать hash/ссылки в `doc/TODO/todo-plan.md` и новом session-report.
