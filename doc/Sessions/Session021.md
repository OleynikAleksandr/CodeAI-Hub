# Session 021 — Claude Provider Home Isolation + Release 1.1.565

**Date:** 2026-02-12 10:45 (CET)
**Branch:** main
**Version:** 1.1.565

---

# 1. Work Done in This Session

## Work summary
- Claude: добавлена изоляция provider-home для Claude Code CLI через `HOME=~/.codeai-hub/providers/claude/home/`, чтобы JSONL/транскрипты не смешивались с пользовательскими терминальными `~/.claude/*`.
- Claude: `projectPath` и резолвинг cwd для `/context` переведены на provider-home `.../home/.claude/projects/*`.
- Release: выполнены `./scripts/build-all.sh` (версия `1.1.565`) и `./scripts/build-release.sh --use-current-version`; собран `codeai-hub-1.1.565.vsix`.
- Docs: синхронизированы `README.md`, `CHANGELOG.md`, `SystemArchitecture.md` под `1.1.565`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `a222b6a7 docs(todo): archive phase142 plan; start phases 143-144`
- `b4080324 feat(claude): isolate cli home under provider directory`
- `a93fb122 fix(claude): use provider-home for project paths`
- `538ba22b fix(claude): resolve cwd from provider-home projects`
- `5cf602a9 docs(todo): complete phase143 provider-home wiring`
- `9b05bc28 chore(release): run build-all for v1.1.565`
- `a94f14e8 docs(todo): mark phase143 build-all done`
- `953a49c5 docs(todo): mark phase143 build-release done`
- `6c2af024 docs(todo): record phase143 build-release hash`
- `4b14e9b6 docs(release): sync notes and system architecture for v1.1.565`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session021.md` (THIS REPORT)

## Plans for next session
- Phase 144: заменить попытку `/usage` в non-interactive режиме на подход `nsanden/claude-rate-monitor` (probe к `api.anthropic.com` + чтение `anthropic-ratelimit-unified-*` headers) и сохранить текущий контракт `usage_limits` для UI.
- Добавить кросс-платформенное получение OAuth токена (файл `~/.claude/.credentials.json` + Keychain/secret-tool/Windows Credential Manager).
