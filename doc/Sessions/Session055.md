# Session 055 — Fix questionnaire submit + pre-read auto-attach + release 1.1.385

**Date:** 2026-01-05 17:24 (CET)
**Branch:** main
**Version:** 1.1.385

---

# 1. Work Done in This Session

## Work summary
- Объединён submit анкеты в один provider turn (без гонки).
- Добавлен детерминированный pre-read auto-attach: Core извлекает `pre_read_documents` из анкеты и прикрепляет документы перед анкетой.
- Повышены лимиты auto-attach и `/read` (300 KB на файл, общий бюджет 1.2 MB).
- Обновлены архитектурные/релизные документы.
- Собран релиз 1.1.385 (build-all + build-release).

## Verification
- `./scripts/check-architecture.sh`
- `npx ultracite check`
- `npx ts-prune`
- `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
- `npm run check:links`
- `npm run typecheck:webview`
- `npm run build:webview`
- `npm run build --workspace @codeai-hub/core`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## Artifacts (1.1.385)
- VSIX: `codeai-hub-1.1.385.vsix` (repo root)
- Tarballs (local cache): `~/.codeai-hub/releases/*-1.1.385.tar.bz2`
- Tarballs (workspace copy): `doc/tmp/releases/*-1.1.385.tar.bz2`

## Git commits
(ВАЖНО: этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `9c79206 docs(orchestrator): add questionnaire pre-read auto-attach architecture`
- `2926971 fix(ui): send questionnaire submit as single turn`
- `eb4ae40 feat(core): detect questionnaire path for pre-read attach`
- `43ad1bf feat(core): extract pre-read document paths from questionnaire`
- `bb1bbcb feat(core): add total budget for workspace attachments`
- `164178a feat(core): attach pre-read questionnaire documents`
- `6cf770b feat(core): prepend pre-read attachments before auto-attach`
- `d185c66 feat(core): raise workspace read limits for idea collector`
- `3a8019e chore(webview): refresh bundle for read limits`
- `bd66733 docs(orchestrator): document questionnaire pre-read auto-attach`
- `9a09380 docs(release): update 1.1.385 notes`
- `eb70072 chore(release): prepare 1.1.385`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Sessions/Session055.md` (THIS REPORT)
2. `doc/Architecture/Architecture.md`
3. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`

## Plans for next session
- Ручная e2e проверка анкеты: один turn, auto-attach анкеты + pre-read документов.
- Проверить логи Codex CLI JSONL на отсутствие двух подряд user_message.
