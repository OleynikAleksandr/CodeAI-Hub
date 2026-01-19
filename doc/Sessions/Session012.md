# Session 012 — Fix Gemini auto-run (runSlug) + Release v1.1.448

**Date:** 2026-01-19 11:09 (CET)
**Branch:** main
**Version:** 1.1.448

---

# 1. Work Done in This Session

## Work summary
- ✅ RCA по `~/.codeai-hub/logs/core/core.log`: для `geminiCli` auto-run не создавался из-за отсутствия modelLabel → `runSlug` оставался `null` → `IdeaCollectorSubmitService` не отправлял первый промпт (и сессия оставалась пустой).
- ✅ Fix(core): добавлен `geminiCli` в `resolveModelLabel()` для auto-run, чтобы всегда генерировался `runSlug`.
- ✅ Обновлён `doc/TODO/todo-plan.md` с commit hash.
- ✅ Release build:
  - `./scripts/build-all.sh` → tarball’ы v1.1.448 в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.
  - `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.448.vsix`.

## Git commits
- `656324eb fix(core): enable gemini auto-run model label`
- `00057a94 docs(todo): record gemini auto-run fix commit`
- `cbcc4d01 chore: bump version to 1.1.448`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/TODO/todo-plan.md`
2. `doc/Sessions/Session010.md`
3. `doc/Sessions/Session011.md`
4. `doc/Sessions/Session012.md` (THIS REPORT)

## Plans for next session
- Manual test (1.1.448): отправка анкеты через Gemini → убедиться что:
  - в Core появляются логи `Session message received`/`Dispatching message to provider adapter`;
  - в UI промпт появляется как первое user сообщение;
  - в `~/.codeai-hub/logs/gemini/sdk-gemini-<id>.jsonl` появляется `user_input`.
- Если всё ещё пусто: проверить, не падает ли отправка на стороне UI (console) и что `session.runSlug` приходит в `session:created`.
