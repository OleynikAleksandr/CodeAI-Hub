# Session 023 — Hotfix: bundled Description prompt + релиз 1.1.456

**Date:** 2026-01-20 16:35 (CET)
**Branch:** main
**Version:** 1.1.456

---

# 1. Work Done in This Session

## Work summary
- Найдена причина, почему Description Agent задавал вопросы: в релизе был упакован (bundled) старый `description-collector-prompt.md`, и TemplateSync раскатывал его в `~/.codeai-hub/templates/...`.
- Исправлен bundled template для `description/description-collector-prompt.md`, чтобы enforce-ить one-shot без вопросов; вопросы остаются на этапе Reviewer.
- Собран новый релиз 1.1.456: `./scripts/build-all.sh` (tarball’ы) + `./scripts/build-release.sh --use-current-version` (VSIX).

## Verification
- `./scripts/check-architecture.sh` (PASS with warnings)
- `npx ultracite check` (OK)
- `npx ts-prune` (OK)
- `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"` (OK)
- `npm run check:links` (OK)
- `npm run build --workspace @codeai-hub/core` (OK)
- `./scripts/build-all.sh` (OK)
- `./scripts/build-release.sh --use-current-version` (OK, VSIX `codeai-hub-1.1.456.vsix`)

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `c2be3bd6 docs(session): add Session022 report`
- `38076f83 fix(core): bundle one-shot description prompt`
- `7e9b0509 docs(release): prep 1.1.456 notes`
- `d8260128 chore(release): bump versions to 1.1.456`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md`
3. `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session023.md` (THIS REPORT)

## Plans for next session
- Протестировать новый VSIX `codeai-hub-1.1.456.vsix`: Description step должен быть one-shot без вопросов, вопросы только на Reviewer.
- Проверить артефакты релиза в `doc/tmp/releases/` (tarball’ы 1.1.456) и корректность путей.
