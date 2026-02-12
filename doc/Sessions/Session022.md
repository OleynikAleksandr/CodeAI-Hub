# Session 022 — Provider Auth Symlinks + Release 1.1.566

**Date:** 2026-02-12 11:21 (CET)
**Branch:** main
**Version:** 1.1.566

---

# 1. Work Done in This Session

## Work summary
- Claude: вместо копирования auth-state в provider-home внедрена link-стратегия для `~/.claude.json` (`~/.codeai-hub/providers/claude/home/.claude.json -> ~/.claude.json`; на Windows fallback на copy).
- Codex: для provider-home заменена copy-миграция на link-стратегию `auth.json`/`config.toml` (`~/.codeai-hub/providers/codex/home/{auth.json,config.toml} -> ~/.codex/{auth.json,config.toml}`; на Windows fallback на copy).
- Release: выполнены `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`; собран `codeai-hub-1.1.566.vsix`.
- Docs: синхронизированы `README.md`, `CHANGELOG.md`, `SystemArchitecture.md` под версию `1.1.566`; `Phase 145` в `todo-plan.md` закрыт.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `f868408c docs(todo): add phase145 auth symlinks for claude/codex`
- `e74cd8b4 fix(claude): link auth state into provider-home`
- `bcea57b6 fix(codex): link auth/config into provider-home`
- `638f78f3 docs(todo): mark phase145 auth link streams done`
- `77e7bedb chore(release): run build-all for v1.1.566`
- `0952df72 docs(todo): record phase145 release build steps`
- `fe02a134 chore(release): build vsix for phase145`
- `b254d55f docs(todo): mark phase145 release stream done`
- `7b231f5d docs(release): sync notes and system architecture for v1.1.566`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session022.md` (THIS REPORT)

## Plans for next session
- Вернуться к `Phase 144`: реализовать модуль сбора usage-limit через ratelimit headers (`nsanden/claude-rate-monitor` approach) для Claude.
- Сохранить текущий контракт `usage_limits` для Session UI (`session/weekly` + `Resets ...`) без изменения формата панели.
- Подготовить и проверить кросс-платформенный путь получения OAuth токена (macOS Keychain / Linux / Windows fallback).
