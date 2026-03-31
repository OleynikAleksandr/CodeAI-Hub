# Session 011 — Tune wait copy pulse range + Release v1.1.658

**Date:** 2026-02-23 11:37 (CET)
**Branch:** main
**Version:** 1.1.658

---

# 1. Work Done in This Session

## Work summary
- Session UI: изменили диапазон пульсации locked wait copy (working/resuming) в input на opacity 20% → 40% с периодом 1000ms (provider color).
- Release: обновили `README.md`/`CHANGELOG.md` под `1.1.658`, прогнали `build-all` и `build-release --use-current-version`.

## Build / verification
- `./scripts/build-all.sh`: ✅ success; артефакты в `~/.codeai-hub/releases/` и копия в `doc/tmp/releases/`.
- `./scripts/build-release.sh --use-current-version`: ✅ success.

VSIX path (local): `codeai-hub-1.1.658.vsix`
VSIX sha256: `1c41e86838155d0fd965eaddd9b3cc5fe044e19fe1a31cefa5c57a0c6724f03d`

## Git commits
- `5415ba47 fix(ui): tune locked wait copy pulse range`
- `80521560 docs(release): v1.1.658 notes`
- `394319a6 chore(release): build-all v1.1.658`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/SessionTaskTimer_UI.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session011.md` (THIS REPORT)

## Plans for next session
- Визуально подтвердить (Claude/Codex/Gemini): locked working/resuming текст пульсирует мягко (20% → 40%, 1000ms) и не мешает читаемости.
