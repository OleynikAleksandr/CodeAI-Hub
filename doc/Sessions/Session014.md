# Session 014 — Gemini: YOLO tools + правильный workspace + runSlug от настроек; Release v1.1.450

**Date:** 2026-01-19 11:53 (CET)
**Branch:** main
**Version:** 1.1.450

---

# 1. Work Done in This Session

## Work summary
- ✅ RCA по `~/.codeai-hub/logs/core/core.log`: Gemini CLI работал в non-interactive DEFAULT mode → инструменты `run_shell_command`/`write_file`/`edit_file` исключались и реально отсутствовали в registry (ошибка `Tool \"run_shell_command\" not found in registry`).
- ✅ Fix(gemini): включён YOLO для Gemini CLI, чтобы shell/write/edit tools были доступны в non-interactive режиме.
- ✅ RCA: Gemini CLI получал неверный `workspacePath` (core runtime dir `.../.codeai-hub/core/.../app`) → жёсткая ошибка `Path must be within one of the workspace directories` при попытке читать файлы в workspace.
- ✅ Fix(gemini): добавлена нормализация `workspacePath` (если приходит core runtime dir — используем настроенный workspace).
- ✅ Fix(core): `auto-run` для `geminiCli` теперь берёт default model из `~/.codeai-hub/settings/settings.json`, чтобы `runSlug` соответствовал актуальному `Gemini Default model` без необходимости перезапуска core.
- ✅ Обновлён `doc/TODO/todo-plan.md` с фактическими commit hash.
- ✅ Release build:
  - `./scripts/build-all.sh` → tarball’ы v1.1.450 в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.
  - `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.450.vsix`.

## Git commits
- `8272e2c8 fix(gemini): enable yolo tools and correct workspace`
- `fbba3288 docs(todo): record gemini yolo workspace fix`
- `d8d71199 fix(core): resolve gemini model label from settings`
- `0f8ea69e docs(todo): record gemini model label settings fix`
- `1c5fecd2 chore: bump version to 1.1.450`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/TODO/todo-plan.md`
2. `doc/Sessions/Session013.md`
3. `doc/Sessions/Session014.md` (THIS REPORT)

## Plans for next session
- Manual test (1.1.450): отправка анкеты через Gemini (Idea Collector) → убедиться что:
  - `read_file` читает `.../VSCODE/CodeAI-Hub/.codeai-hub/codeai-hub/description/questionnaire.md`;
  - доступен `write_file` и создаётся/обновляется `description.md` по целевому пути;
  - новые run’ы создаются с `runSlug` от `providers.gemini.defaultModel` из `~/.codeai-hub/settings/settings.json` (например, `...-gemini-3-flash-preview`).
- Отдельно (не блокирует Gemini): предупреждение в core логе — Claude module override иногда не находит `@codeai-hub/idea-collector`.
