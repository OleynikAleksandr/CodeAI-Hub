# Session 104 — Release 1.1.414 (Artifact Upsert Protocol vB)

**Date:** 2026-01-13 13:17 (CET)
**Branch:** main
**Version:** 1.1.414

---

# 1. Work Done in This Session

## Work summary
- Утверждён Variant B протокол артефактов: `artifacts[]` (slot+markdown), без `next_action` и без путей от агента.
- Core: добавлен endpoint `POST /api/v1/orchestrator/artifact-upsert` и slot→path mapping для Idea stage.
- UI: принимает partial `artifacts[]` (и legacy `artifact.*_markdown`), сохраняет только полученные слоты; убрана зависимость от agent paths.
- Idea Collector contract: обновлены schema/prompt/fallback schema под Variant B.
- Выполнен релиз `1.1.414`: `build-all.sh` + `build-release.sh --use-current-version`.

## Gates / verification
- `./scripts/build-all.sh` (✅ успешно)
- `./scripts/build-release.sh --use-current-version` (✅ VSIX создан)

## Release artifacts
- VSIX: `codeai-hub-1.1.414.vsix`
- Tarballs: `doc/tmp/releases/` (`*-1.1.414.tar.bz2`)

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `b24f798b docs: approve artifact upsert protocol vB`
- `03397944 feat(core): add artifact upsert protocol vB`
- `1b5ac333 feat(ui): persist artifact upserts by slot`
- `fef0d66e feat(idea): switch to artifact upsert protocol vB`
- `d9ddc01d fix: prevent silent artifact drops (vB)`
- `2427bff7 docs: update todo plan status`
- `5d9033b2 chore(ui): refresh webview fallback bundle`
- `119483b6 chore(release): bump 1.1.414`
- `531df1f8 docs: update 1.1.414 release notes`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/ArtifactUpsertProtocol_VariantB_Architecture.md`
2. `doc/Architecture/Architecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session104.md` (THIS REPORT)

## Plans for next session
- Повторить эксперимент: выполнить частичный апдейт только `cluster.idea.virtual-simulation` и убедиться, что перезаписывается `virtual-simulation.md` без изменения `idea.md`.
- Решить, оставлять ли legacy `POST /api/v1/orchestrator/idea-artifact` как совместимость, или запланировать удаление в отдельной фазе.
