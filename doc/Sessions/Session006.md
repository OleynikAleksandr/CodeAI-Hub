# Session 006 — Settings provider banners & version uptick

**Date:** 20 November 2025, 17:30 (CET)
**Branch:** main
**Version:** 1.1.286

---

## Required documents reviewed before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`

---

## Work summary
- Added provider-specific warning banners and cleaner timestamp formatting in Settings version cards (Claude/Codex/Gemini); warnings reuse session provider colors, timestamps now local `YYYY-MM-DD HH:MM`.
- Built and packaged release 1.1.286 via `./scripts/build-all.sh` (VSIX + core/providers/launcher artifacts updated).
---

## Plans for next session
- UI polish/regression around Settings cards and provider updates.
- If needed, document release notes in CHANGELOG/SystemArchitecture.

---

## Git commits
- `a53fa3f feat: v1.1.286 - provider banners and timestamps`
