# Session 043 — Idea Collector: initiative-scoped paths + v1.1.378 release

**Date:** 2026-01-03 11:15 (CET)
**Branch:** main
**Version:** 1.1.378

---

# 1. Work Done in This Session

## Work summary
- Принят фидбек по полировке Idea Collector: каноничные пути через `initiatives/<initiativeSlug>/...`, lowercase kebab-case, multi-initiative/multi-module готовность.
- Обновлены глобальные шаблоны Idea Collector в `~/.codeai-hub/templates/full-development-flow/`:
  - `idea/idea-collector-prompt.md`, `idea/idea-collector-schema.json`, `idea/idea-template.md`
  - добавлены: `initiative/initiative-structure.md`, `state/flow-state.template.json`, `state/flow-config.template.json`, `realization/tasks.template.json`, `sessions/session-report.template.md`
  - добавлены (новые): `spec/spec-writer-prompt.md`, `plan/plan-writer-prompt.md`
- Обновлён код Core/UI:
  - Core принимает пути артефактов из structured output и сохраняет их в workspace (вместо жёстко заданных `.codeai-hub/full-development-flow/idea/...`).
  - UI отправляет `ideaPath`/`virtualSimulationPath` в `POST /api/v1/orchestrator/idea-artifact` и показывает фактически сохранённые пути.
  - Fallback prompt/schema обновлены под инициативные пути.
- Собран релиз v1.1.378: `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `b41f09c fix: write idea collector artifacts under initiatives`
- `d0e7bcf chore: bump versions and manifests to v1.1.378`
- `cd61bcb docs: update release docs for v1.1.378`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `CHANGELOG.md`
2. `README.md`
3. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
4. `doc/Architecture/Architecture.md`
5. `doc/Sessions/Session043.md` (THIS REPORT)

## Plans for next session
- Прогнать Idea Collector интервью ещё раз и проверить:
  - артефакты сохраняются в `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/idea/`;
  - после подтверждения "ОК/утверждаю" агент сразу делает `next_action=finalize` без повторных вопросов про сохранение;
  - UI показывает system-message “Saved …” и не требует дополнительных действий.
- Если понадобится: добавить/уточнить UI state machine (interviewing → awaiting_confirmation → finalizing → saved) для жёсткой UX-гарантии.
