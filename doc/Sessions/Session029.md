# Session 029 — Usage limits reset timezone/format fix + release v1.1.574

**Date:** 2026-02-12 16:46 (Europe/Warsaw)
**Branch:** main
**Version:** 1.1.574

---

# 1. Work Done in This Session

## Work summary
- Исправлено отображение reset-времени usage limits в `Session ID Bar`:
  - время теперь рендерится в локальной timezone пользователя;
  - формат приведён к виду `Resets Feb 12 at 6pm` вместо сырого ISO/UTC.
- Добавлен отдельный formatter reset-времени и подключён в `session-id-bar`.
- Добавлены targeted тесты formatter-а для кейсов `ISO Z`, `(UTC)` и fallback строк.
- Прогнаны обязательные гейты и таргетные сборки (`check-architecture`, `ultracite`, `ts-prune`, `jscpd`, `check:links`, `build:webview`, `typecheck:webview`).
- Обновлены release-документы под `1.1.574`.
- Собран релиз:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
  - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.574.vsix`

## Git commits
(ВАЖНО: этот список используется в следующей сессии для восстановления контекста через `git show`)
- `ea85dc41 fix(ui): format usage reset times in local timezone`
- `5cd1a174 test(ui): cover usage reset local time formatting`
- `9d062ff8 docs(release): sync docs for v1.1.574`
- `8f32d4b9 chore(release): run build-all for v1.1.574`
- `f8b37c24 docs(session): add session029 release report`
- `1498a90a chore(todo): finalize phase148 status hashes`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Sessions/Session028.md`
2. `doc/Sessions/Session029.md` (THIS REPORT)
3. `doc/TODO/todo-plan.md`
4. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
5. `CHANGELOG.md`
6. `README.md`

## Plans for next session
- Выполнить ручной smoke-check в UI: подтвердить корректный локальный reset time для `session` и `weekly` после нескольких Claude turn.
- Проверить отображение на разных timezone системах (если доступно) и зафиксировать поведение для edge-кейсов парсинга reset-string.
- При необходимости расширить formatter для дополнительных форматов входного времени от провайдера.
