# Session 090 — Rollover wait-copy “resuming”

**Date:** 2026-02-19 08:34 (CET)
**Branch:** main
**Version:** 1.1.639

---

# 1. Work Done in This Session

## Work summary
- Диагностика: во время session rollover/switch placeholder оставался “Agent is working…”, хотя по смыслу это continuity/resume lock.
- UI fix: в `src/client/ui/src/session/session-view.tsx` форсируем `InputPanel.connectionState="blocked"`, когда базовый `connectionState="running"` и continuity lock reason ∈ {`context_check_pending`, `threshold_reached`, `report_in_progress`, `resume_bootstrap`}.
- Release: `./scripts/build-all.sh` → `1.1.639`; `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.639.vsix`.
  - VSIX: `codeai-hub-1.1.639.vsix`
  - Tarball’ы: `doc/tmp/releases/*-1.1.639.tar.bz2` (и кэш: `~/.codeai-hub/releases/`)

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `894de347 fix(ui): show resuming copy during rollover lock`
- `4400c8c0 feat(release): v1.1.639 - session rollover wait-copy`
- `57a1bc58 docs(bug-registry): record v1.1.639 rollover wait-copy fix`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/BugRegistry.md`
6. `doc/Sessions/Session090.md` (THIS REPORT)

## Plans for next session
- Manual verify `BUG-2026-02-18-07` в релизе `1.1.639`: во время смены/создания новой сессии placeholder должен быть “Agent is resuming your session… Please wait.”
- Если всё ещё остаётся “Agent is working…” в момент rollover: проверить реальные `continuityLockReason` в снапшотах (возможны `undefined`/другие причины) и скорректировать приоритет выбора wait-copy.
