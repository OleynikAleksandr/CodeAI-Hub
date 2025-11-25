# Session 014 — Multi-provider design & docs reorg

**Date:** 2025-11-25 18:16 (CET)
**Branch:** main
**Version:** 1.1.313

---

# 1. Work Done in This Session

## Work summary
- Documented future architecture for provider switching within a single dialog (Unified JSONL as canonical log, In/Out adapters, context policies) in `doc/Project_Docs/Идеи на перспективу/provider-switching-in-dialog.md`.
- Documented future architecture for a multi-provider consilium (PanelState, roles, phases, Orchestrator) in `doc/Project_Docs/Идеи на перспективу/multi-provider-consilium.md`.
- Reorganized architecture docs: moved Service Intelligence Module design into the "Идеи на перспективу" folder and relocated implemented UI modularization and unified session architecture docs into `doc/Project_Docs/SystemArchitecture/`.

## Git commits
- `1e1918f docs: add future ideas and move SIM design`
- `5667ae8 docs: move implemented architecture docs to SystemArchitecture`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/Project_Docs/SystemArchitecture/UnifiedSessionArchitecture.md`
4. `doc/Project_Docs/SystemArchitecture/UI_Modularization_Architecture.md`
5. `doc/Project_Docs/Идеи на перспективу/provider-switching-in-dialog.md`
6. `doc/Project_Docs/Идеи на перспективу/multi-provider-consilium.md`
7. `doc/Project_Docs/Идеи на перспективу/ServiceIntelligenceModule.md`
8. `doc/TODO/todo-plan.md`
9. `doc/Sessions/Session014.md` (THIS REPORT)

## Plans for next session
- Choose a primary focus for the upcoming Design Phase (provider switching, consilium, or Service Intelligence Module) and update `doc/TODO/todo-plan.md` accordingly.
- Refine the chosen architecture document into a concrete Design Phase spec (phases/streams, constraints, integration points) ready to be mapped into todo-plan phases.
- Optionally start validating current implementation of unified sessions and UI modularization against their architecture docs, to identify any gaps before extending to multi-provider scenarios.
