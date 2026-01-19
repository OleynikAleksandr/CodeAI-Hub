# Session 013 — Fix Gemini workspace allowlist + Release v1.1.449

**Date:** 2026-01-19 11:28 (CET)
**Branch:** main
**Version:** 1.1.449

---

# 1. Work Done in This Session

## Work summary
- ✅ RCA по `~/.codeai-hub/logs/core/core.log` и `~/.codeai-hub/logs/gemini/sdk-gemini-*.jsonl`: Gemini CLI блокировал `read_file` для анкеты/шаблона, потому что `workspacePath` передавался как `process.cwd()` (core app dir), а `includeDirectories` был пустой.
- ✅ Fix(core): нормализация `workspacePath` в `session:create` — если приходит `process.cwd()` core app dir, используем workspace из окружения (`claudeWorkspacePath`).
- ✅ Fix(gemini): добавлен allowlist директорий для Gemini CLI (`includeDirectories`) чтобы разрешить чтение `~/.codeai-hub/templates` и `~/.codeai-hub/codeai-hub`.
- ✅ Обновлён `doc/TODO/todo-plan.md` с фактическими commit hash.
- ✅ Release build:
  - `./scripts/build-all.sh` → tarball’ы v1.1.449 в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.
  - `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.449.vsix`.

## Git commits
- `8143072e fix(gemini): allow reading hub templates and questionnaire`
- `90fb0ced docs(todo): record gemini allowlist fix commit`
- `9a953b69 chore: bump version to 1.1.449`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/TODO/todo-plan.md`
2. `doc/Sessions/Session012.md`
3. `doc/Sessions/Session013.md` (THIS REPORT)

## Plans for next session
- Manual test (1.1.449): отправка анкеты через Gemini (Idea Collector) → убедиться что `read_file` по:
  - `~/.codeai-hub/codeai-hub/description/questionnaire.md`
  - `~/.codeai-hub/templates/description/description-template.md`
  проходит без ошибки workspace allowlist.
- Если снова упадёт: проверить что в core логе `Resolved session for incoming message` содержит `workspacePath` равный реальному workspace (а не core app dir).
- Отдельно проверить предупреждение из `~/.codeai-hub/logs/core/core.log`: Claude module override иногда не находит `@codeai-hub/idea-collector` (возможная проблема упаковки/зависимостей провайдера Claude).
