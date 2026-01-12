# Session 98 — Release 1.1.411 + Design: safe artifact revisions

**Date:** 2026-01-12 17:45 (CET)
**Branch:** main
**Version:** 1.1.411

---

# 1. Work Done in This Session

## Work summary
- Release: собран новый релиз `1.1.411` после изменений шаблона анкеты (добавлен раздел `system.agent_qna`).
- Release artifacts: выполнены `build-all` (providers/core/ui/launcher tarballs) и `build-release` (VSIX).
- Post-finalize issue: выявлен нештатный сценарий «правки артефактов после финализации» — агент может начать импровизировать (читать транскрипт, перезаписывать файлы heredoc) и ломать `idea.md`/`virtual-simulation.md`.
- Workspace fix: артефакты run `002-opus` были перезаписаны вручную в корректный вид и сохранены backups рядом (файлы под `.codeai-hub/`, в git не коммитятся).

## Build results
- Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd`, `npm run check:links`
- Release build:
  - `./scripts/build-all.sh` (version bump → 1.1.411)
  - `./scripts/build-release.sh --use-current-version`
- VSIX: `codeai-hub-1.1.411.vsix`
- Tarballs copied by build-all to: `doc/tmp/releases/*-1.1.411.tar.bz2`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `8f16088a chore(release): bump 1.1.411`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session098.md` (THIS REPORT)

## Plans for next session

### Goal
Сделать «правки артефактов после финализации» штатным, детерминированным и безопасным сценарием (без автоподгрузки больших документов в контекст).

### Approach (target design)
- Добавить в контракт Idea Collector новый режим: `next_action = revise_artifacts`.
- В режиме `revise_artifacts` агент НЕ пишет файлы сам и НЕ читает транскрипты; он возвращает либо:
  - (предпочтительно) структурированный `patch` по секциям/якорям (section-aware операции),
  - либо (fallback) полные `artifact.idea_markdown`/`artifact.virtual_simulation_markdown`.
- UI и Core должны поддержать этот режим:
  - UI должен сохранять артефакты на `finalize` и `revise_artifacts`.
  - Core должен делать backup перед перезаписью и валидировать минимальную целостность результата (иначе откат + 400).

### Execution plan (micro-tasks; ≤3 files per task; each task ends with a commit)

1. [TODO] Contract: добавить `revise_artifacts` и `artifact.patch` (schema) — scope: `packages/agents/idea-collector/assets/idea-collector-schema.json`, `src/client/ui/src/services/idea-collector-fallback-schema.ts`; ожидаемый commit message: `feat(idea): add revise_artifacts to structured output contract`
2. [TODO] Git Commit: `feat(idea): add revise_artifacts to structured output contract` (hash: TBD)

3. [TODO] Prompt: добавить строгие правила ревизии (no heredoc/no transcript, patch-only preferred) — scope: `packages/agents/idea-collector/assets/idea-collector-prompt.md`, `src/client/ui/src/app-host/idea-kickoff-prompt.ts`; ожидаемый commit message: `docs(idea): clarify artifact revision rules`
4. [TODO] Git Commit: `docs(idea): clarify artifact revision rules` (hash: TBD)

5. [TODO] UI: сохранять артефакты и на `revise_artifacts` (не только `finalize`), плюс поддержать payload с patch/full markdown — scope: `src/client/ui/src/services/idea-collector-artifact.ts`, `src/client/ui/src/services/idea-collector-service.ts`; ожидаемый commit message: `feat(ui): persist idea artifacts on revise_artifacts`
6. [TODO] Git Commit: `feat(ui): persist idea artifacts on revise_artifacts` (hash: TBD)

7. [TODO] Core: backup + минимальная валидация перед overwrite (и поддержка patch application, если выбран) — scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`; ожидаемый commit message: `feat(core): safe idea artifact overwrite (backup+validation)`
8. [TODO] Git Commit: `feat(core): safe idea artifact overwrite (backup+validation)` (hash: TBD)

9. [TODO] Gates + targeted builds for touched packages — scope: scripts/commands; ожидаемый commit message: `docs: update todo plan status`
10. [TODO] Git Commit: `docs: update todo plan status` (hash: TBD)
