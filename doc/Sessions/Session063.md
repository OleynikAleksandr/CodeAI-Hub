# Session 063 — Codex GPT-5.4 rollout + stale-env hotfix release v1.1.714

**Date:** 2026-03-05 20:48 (CET)
**Branch:** main
**Version:** 1.1.714

---

# 1. Work Done in This Session

## Work summary
- Выполнен rollout general-purpose модели Codex: `gpt-5.2` заменена на `gpt-5.4` в shared registry, Settings UI/extension, core normalization и Codex SDK manager с мягкой совместимостью для legacy settings.
- Удалён устаревший Codex SDK override, который опирался на несуществующую provider-side migration `gpt-5.2 -> gpt-5.3-codex`; SSOT модуля Codex синхронизирован в `doc/SolidWorks-WorkFlow/Modules/Codex.md`.
- На реальном provider rollout воспроизведён mismatch: `settings.json` уже содержал `gpt-5.4`, но `~/.codeai-hub/providers/codex/home/sessions/.../rollout-*.jsonl` и shell snapshot показывали `CODEX_DEFAULT_MODEL=gpt-5.3-codex` / runtime `model = gpt-5.3-codex`.
- Корневая причина: long-lived Core переносил stale boot env в provider child process; в `core config` и `CodexSDKManager` env имел приоритет над persisted `~/.codeai-hub/settings/settings.json`.
- Исправлено: persisted settings snapshot теперь SSOT для Codex model/reasoning и выигрывает у stale env; legacy env `gpt-5.2` нормализуется в `gpt-5.4` тем же путём, что и settings.
- Выполнены локальные релизные циклы `v1.1.713` и hotfix `v1.1.714`; финальным артефактом этой сессии является `codeai-hub-1.1.714.vsix` и tarball-линейка `1.1.714`.

## Validation / checks
- `npm run build --workspace=@codeai-hub/codex-module` — ✅ success.
- `npm run build --workspace=@codeai-hub/core` — ✅ success.
- `npm run compile` — ✅ success.
- `./scripts/build-all.sh --allow-dirty` — ✅ success for `v1.1.713` (initial rollout) and ✅ success for `v1.1.714` (stale-env hotfix); provider/core/ui/launcher tarballs собраны в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.
- `./scripts/build-release.sh --use-current-version --allow-dirty` — ✅ success for `v1.1.713` and ✅ success for `v1.1.714`.
- `build-release` лог hotfix-релиза — ✅ подтверждены этапы `Verifying SDK exclusions`, `Removing dev dependencies before packaging...`, `✅ Package created`.
- `build-release` quality gates — ✅ `Markdown links OK (223 files checked)`, ✅ duplication `2.97%`, ✅ architecture/type-check/compile passed.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `b78d78a8 feat(codex): expose gpt-5.4 general model`
- `93d75291 fix(codex): honor gpt-5.4 settings across runtime`
- `81c9928e chore(release): build-all v1.1.714`
- `a84c7dfa docs(release): sync v1.1.714 codex notes`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Modules/Codex.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session063.md` (THIS REPORT)

> Далее: в зависимости от результатов smoke открыть нужные документы из `doc/SolidWorks-WorkFlow/Contracts/` и `doc/SolidWorks-WorkFlow/Clusters/`.

## Plans for next session
- После пользовательского обновления Codex CLI/SDK и `~/.codeai-hub/providers/codex/home/models_cache.json` с `gpt-5.4` прогнать smoke `v1.1.714` для Codex Settings/runtime/resume-path.
- Проверить на реальном fresh session, что rollout JSONL фиксирует `turn_context.model = gpt-5.4`, даже если Core был запущен до последнего изменения Settings.
- Проверить, что legacy `gpt-5.2` настройки автоматически нормализуются в `gpt-5.4`, а явный выбор general-модели не откатывается в sticky `gpt-5.3-codex` thread.
- Если smoke зелёный, решить: делать ли отдельные git commits/post-release cleanup и архивировать текущий `todo-plan.md`; если найдётся дефект, открыть новую Phase под follow-up fix.
