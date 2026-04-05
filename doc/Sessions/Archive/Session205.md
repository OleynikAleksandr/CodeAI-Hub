# Session 205 — Claude SDK auth manager decomposition planning intake

**Date:** 2026-03-30 20:20 (CEST)
**Branch:** main
**Version:** 1.1.850

---

# 1. Work Done in This Session

## Work summary
- Переоткрыл planning scope для последнего незакрытого production hotspot из исходной warning-zone волны: `packages/Claude_Module/src/auth/sdk-auth-manager.ts`.
- Обновил `doc/SolidWorks-WorkFlow/Plans/Archive/Runtime_GodModules_Decomposition_Architecture.md`, зафиксировав follow-up wave только под `sdk-auth-manager.ts` и явные helper seams: `claude-auth-home-bridge.ts` и `claude-auth-runtime.ts`.
- Заменил placeholder в `doc/TODO/todo-plan.md` на новый активный план с одной фазой, четырьмя stream-ами и микро-задачами `<=3` файлов: home-bridge split, runtime split, verification, phase closeout.

## Git commits
- `af06bc97 docs(plan): start sdk auth manager decomposition wave`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Modules/Claude.md`
5. `doc/SolidWorks-WorkFlow/Plans/Archive/Runtime_GodModules_Decomposition_Architecture.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Archive/Session205.md` (THIS REPORT)

## Plans for next session
- Начать `Phase 1 — Claude SDK Auth Manager Decomposition Wave` со stream `Claude Auth Home Bridge Split`.
- В первой микро-задаче вынести provider-home/macOS keychain bridge, legacy `.claude.json` link/copy handling и credentials migration seam из `sdk-auth-manager.ts` в отдельный helper без изменения внешнего поведения.
- Синхронно обновить `doc/SolidWorks-WorkFlow/Modules/Claude.md` в том же structural commit и после коммита сразу обновить `doc/TODO/todo-plan.md` со статусом и hash.
