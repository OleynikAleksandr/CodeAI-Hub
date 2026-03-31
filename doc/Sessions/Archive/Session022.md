# Session 022 — Release v1.1.667 (rebuild to avoid 666)

**Date:** 2026-02-24 14:55 (CET)
**Branch:** main
**Version:** 1.1.667

---

# 1. Work Done in This Session

## Work summary
- Release rebuild: собран новый релиз `1.1.667` вместо `1.1.666` (только из‑за номера версии).
- Release notes: обновлены `README.md`/`CHANGELOG.md` под `1.1.667` и отмечено, что это rebuild без функциональных отличий от `1.1.666`.
- TODO bookkeeping: закрыта Phase 242 в `doc/TODO/todo-plan.md`.

## Build / verification
- `./scripts/build-all.sh`: ✅ success; артефакты в `~/.codeai-hub/releases/` и копия в `doc/tmp/releases/`.
- `./scripts/build-release.sh --use-current-version`: ✅ success.

VSIX path (local): `codeai-hub-1.1.667.vsix`
VSIX sha256: `8a93b1c68c7e3eb922e999986ef5d07c9381e2b0d94329761ca0b0864f85c406`

## Git commits
- `c81dd129 chore(release): build-all v1.1.667`
- `722cb591 docs(release): update release notes for v1.1.667`
- `b71dfc0a docs(todo): mark Phase 242 complete`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Archive/Session022.md` (THIS REPORT)

## Plans for next session
- (Опционально) smoke test: Standalone PM (CEF) → one-shot `Description` → ↻ → Apply/Cancel.
