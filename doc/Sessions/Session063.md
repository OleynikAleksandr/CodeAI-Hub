# Session 63 — Token usage persistence on Project Manager reopen (Core replay)

**Date:** 2026-02-01 18:15 (CET)
**Branch:** main
**Version:** 1.1.490

---

# 1. Work Done in This Session

## Work summary
- Fixed token usage reset to `0 / 200,000 (100%)` after closing/reopening Project Manager while Core keeps running.
- Core now caches the last tokenUsage per session on every `session:stream` update and replays it to newly connected WebSocket clients right after `core:state`.
- Built release `1.1.490` via `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`; VSIX is in the repo root.
- Copied new tarballs to `doc/tmp/releases/`.

## Git commits
- `3cdbaa61 fix(core): replay token usage on ws connect`
- `cbcdb4f2 docs(todo): record core token usage replay`
- `1f359a9c chore(release): build next version`
- `ca404f1e docs(todo): record core replay release hash`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session063.md` (THIS REPORT)

## Verification checklist
- Close Project Manager window, reopen it (без перезапуска Core) и убедиться что токены в Session panel восстанавливаются сразу (не 0).
- Если после перезапуска Core токены всё ещё сбрасываются: планировать persistence на диск (например через unified-session / continuity store) и гидрацию в `/api/v1/status`/`core:state`.
