# Session 040 — Core: авто-attach workspace файлов + релиз 1.1.376

**Date:** 2026-01-02 11:11 (CET)
**Branch:** main
**Version:** 1.1.376

---

# 1. Work Done in This Session

## Work summary
- Реализован core-side auto-attach: если пользователь пишет триггер («прочитай/изучи/ознакомься…» или EN аналоги) и указывает пути к файлам (в том же предложении/строке или в формате `триггер:` + пути на следующих строках), Core сам читает текстовые файлы из workspace и добавляет их в контекст перед отправкой провайдеру.
- Добавлены ограничения безопасности: только относительные пути внутри workspace, фильтрация по папкам/именам и по расширениям; лимиты 3 файла и 60KB на файл; бинарники пропускаются.
- Собран релиз 1.1.376: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`, VSIX создан.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `5693613 feat(core): auto-attach workspace files on trigger`
- `657d3e9 feat: v1.1.376 - workspace auto-attach`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `CHANGELOG.md`
4. `doc/Sessions/Session040.md` (THIS REPORT)

## Plans for next session
- E2E: проверить, что auto-attach срабатывает только при близости «триггер+путь» и не цепляет случайные пути из текста.
- Уточнить список триггеров/расширений (в т.ч. мультиязычность) и при необходимости вынести в конфиг.
