# Session 64 — Token usage persistence after Core restart

**Date:** 2026-02-01 18:41 (CET)
**Branch:** main
**Version:** 1.1.491

---

# 1. Work Done in This Session

## Work summary
- Fixed the root cause of token usage resetting to `0 / 200,000 (100%)` after restarting Core.
- Core now persists last-known token usage to `~/.codeai-hub/state/token-usage-cache.json` keyed by `providerSessionId` and restores it on Project Manager connect.
- Built release `1.1.491` via `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`; VSIX is in the repo root.
- Copied tarballs to `doc/tmp/releases/`.

## Git commits
- `c05c28fe fix(core): persist token usage across restarts`
- `40c06887 docs(todo): record token usage persistence`
- `6a94bd98 chore(release): build next version`
- `82a0ea48 docs(todo): record token usage persistence release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session064.md` (THIS REPORT)

## Verification checklist
- После установки `codeai-hub-1.1.491.vsix`: перезапусти Core (или VS Code/компьютер) и открой Project Manager — токены должны восстановиться сразу (не 0).
- Проверить, что файл `~/.codeai-hub/state/token-usage-cache.json` появляется/обновляется после любого нового ответа агента.
