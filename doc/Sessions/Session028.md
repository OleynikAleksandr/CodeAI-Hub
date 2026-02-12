# Session 028 — Claude usage limits fixed + release v1.1.573 packaged

**Date:** 2026-02-12 16:21 (Europe/Warsaw)
**Branch:** main
**Version:** 1.1.573

---

# 1. Work Done in This Session

## Work summary
- Исправлен parser usage limits для Claude: добавлена поддержка utilization headers (`anthropic-ratelimit-unified-5h-utilization`, `anthropic-ratelimit-unified-7d-utilization`) с сохранением fallback на `limit/remaining`.
- Добавлен отдельный probe-лог запросов лимитов: `~/.codeai-hub/logs/claude/usage-limits-probe.jsonl` (статусы запросов, headers, parsed snapshot/null, ошибки).
- Добавлены targeted тесты на parser/utilization и stream mapping для non-empty `session/weekly`.
- Пройдены гейты и таргетные сборки для phase 147; обновлён `doc/TODO/todo-plan.md`.
- Обновлены release-документы и выполнена релизная сборка:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
  - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.573.vsix`

## Git commits
(ВАЖНО: этот список используется в следующей сессии для восстановления контекста через `git show`)
- `af2e5369 fix(claude): parse usage limits from utilization headers`
- `d0ee8e59 feat(claude): add usage limits probe diagnostics log`
- `718d697b test(claude): cover usage limits utilization and stream mapping`
- `af46a43a chore(todo): close phase147 usage-limits stream`
- `6e6e2b0d docs(release): sync docs for v1.1.573`
- `348d06f1 chore(release): run build-all for v1.1.573`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Sessions/Session027.md`
2. `doc/Sessions/Session028.md` (THIS REPORT)
3. `doc/TODO/todo-plan.md`
4. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
5. `doc/SolidWorks-Flow/Stacks/Claude.md`
6. `CHANGELOG.md`
7. `README.md`

## Plans for next session
- Вручную проверить отображение `session/weekly` в `Session ID Bar` на новом цикле `description -> reviewer` в UI.
- Подтвердить по `~/.codeai-hub/logs/claude/usage-limits-probe.jsonl`, что probe-запросы выполняются после каждого turn и возвращают парсибельные headers.
- Если появятся edge-case ответы API (empty headers/429/5xx), расширить тесты и нормализацию статусов в probe-логах.
