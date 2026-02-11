# Session 020 — Claude Usage Limits + Session ID Bar + Release 1.1.564

**Date:** 2026-02-11 17:31 (CET)
**Branch:** main
**Version:** 1.1.564

---

# 1. Work Done in This Session

## Work summary
- Claude: добавлено чтение `/usage` и эмит `usage_limits` (5-hour session + weekly all models) в stream.
- Claude: служебные `/context` и `/usage` выполняются через `--model haiku` для минимизации стоимости.
- UI: `Session ID Bar` теперь показывает `session/weekly` usage (процент) и `Resets ...` прямо в подписи; индикатор заполнения отображается полосой.
- Release: выполнены `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`; собран `codeai-hub-1.1.564.vsix`, обновлены локальные tarball в `~/.codeai-hub/releases/`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `d0768fb8 feat(claude): emit usage limits from /usage`
- `24df873e fix(claude): run /context via haiku`
- `03594a2c feat(ui): track usage limits from stream`
- `0562f238 feat(ui): render session usage bars`
- `2d2ef7e6 fix(ui): show resets inline for session/weekly`
- `7dd03773 chore(webview): rebuild bundle`
- `332a62b9 chore(release): run build-all for v1.1.564`
- `846d6ba6 docs(release): sync notes and system architecture for v1.1.564`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session020.md` (THIS REPORT)

## Plans for next session
- Если нужно отображать usage limits в VS Code Webview (не только в Project Manager), добавить обработку `session:stream` событий в `src/client/ui/src/app-host/session-store.ts` по аналогии с PM-пайплайном.
- При необходимости: нормализовать/укоротить формат `Resets ...` (например, без timezone) по согласованному UX-правилу.
