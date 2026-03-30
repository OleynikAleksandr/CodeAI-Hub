# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Source of truth для этой фазы: `doc/SolidWorks-WorkFlow/Plans/Runtime_GodModules_Decomposition_Architecture.md`
- Scope этой волны ограничен тремя production hotspot-направлениями: `session-request-handler.ts`, `sdk-auth-manager.ts`, `gemini-installer.ts` + `cli-bridge.ts`
- Test files и test helpers из warning-zone в эту фазу не входят.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если scope вырастает больше 3 файлов, подзадачу нужно дробить до начала правок.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** перед закрытием Stream:
  - Core: `npm run build --workspace @codeai-hub/core`
  - Claude: `npm run build --workspace @codeai-hub/claude-module`
  - Gemini: `npm run build --workspace @codeai-hub/gemini-module`
- **Real-time Документация:** structural decomposition и новые helper-boundaries должны синхронно попадать в `doc/` в том же коммите.

## Required documents to review before work
1. `doc/Sessions/Session197.md`
2. `doc/Sessions/Session202.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Modules/Claude.md`
5. `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
6. `doc/SolidWorks-WorkFlow/Plans/Runtime_GodModules_Decomposition_Architecture.md`
7. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 1 — Runtime 400-500 Production Hotspots Wave 1 (owner: Oleksandr, updated: 2026-03-30)

Goal: behavior-preserving decomposition of the first three production warning-zone hotspots after the 500-line gate, without touching test-only warning files and without reopening Gemini feature work.

### Stream: Planning Intake
1. [DONE] Docs: обновить planning-док `Runtime_GodModules_Decomposition_Architecture.md` под актуальную волну `400-500`, зафиксировать, что в этой фазе идут только `session-request-handler.ts`, `sdk-auth-manager.ts`, `gemini-installer.ts` + `cli-bridge.ts`, и переоткрыть active `todo-plan`. Scope: `doc/SolidWorks-WorkFlow/Plans/Runtime_GodModules_Decomposition_Architecture.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs(plan): start 400-500 hotspot decomposition wave`
2. [TODO] Git Commit: `docs(plan): start 400-500 hotspot decomposition wave` (hash: TBD)

### Stream: Core Remote-Bridge Thin Facade Closure
3. [TODO] Core: вынести оставшийся constructor/runtime helper seam из `session-request-handler.ts` в focused helper рядом с existing runtime cluster и синхронизировать `SystemArchitecture.md`. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, новый helper в `packages/core/src/remote-bridge/handlers/`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): extract session-request-handler runtime helpers`
4. [TODO] Git Commit: `refactor(core): extract session-request-handler runtime helpers` (hash: TBD)
5. [TODO] Core: завершить перевод `session-request-handler.ts` в thin façade, вынеся оставшийся procedural/state glue в отдельный helper без изменения public handler API. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, новый helper в `packages/core/src/remote-bridge/handlers/`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): finish session-request-handler thin facade`
6. [TODO] Git Commit: `refactor(core): finish session-request-handler thin facade` (hash: TBD)
7. [TODO] Verification: прогнать таргетную сборку и focused tests по remote-bridge handler path, затем синхронизировать execution status. Scope: `packages/core`, `doc/TODO/todo-plan.md`. Expected commit: `test(core): verify session-request-handler facade split`
8. [TODO] Git Commit: `test(core): verify session-request-handler facade split` (hash: TBD)

### Stream: Claude SDK Auth Manager Decomposition
9. [TODO] Claude_Module: вынести provider-home bridge / legacy state linking and migration seam из `sdk-auth-manager.ts` и синхронизировать `Modules/Claude.md`. Scope: `packages/Claude_Module/src/auth/sdk-auth-manager.ts`, новый helper в `packages/Claude_Module/src/auth/`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`. Expected commit: `refactor(claude): extract auth home bridge helpers`
10. [TODO] Git Commit: `refactor(claude): extract auth home bridge helpers` (hash: TBD)
11. [TODO] Claude_Module: вынести OAuth bootstrap и auth-probe execution seam из `sdk-auth-manager.ts`, сохранив внешний API manager-а стабильным. Scope: `packages/Claude_Module/src/auth/sdk-auth-manager.ts`, новый helper в `packages/Claude_Module/src/auth/`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`. Expected commit: `refactor(claude): split auth probe and token bootstrap`
12. [TODO] Git Commit: `refactor(claude): split auth probe and token bootstrap` (hash: TBD)
13. [TODO] Verification: прогнать таргетную сборку Claude module и focused auth-path checks, затем синхронизировать execution status. Scope: `packages/Claude_Module`, `doc/TODO/todo-plan.md`. Expected commit: `test(claude): verify auth manager decomposition`
14. [TODO] Git Commit: `test(claude): verify auth manager decomposition` (hash: TBD)

### Stream: Gemini Installer / Runtime Cluster Decomposition
15. [TODO] Gemini_Module: вынести CLI root/core root resolution and candidate scanning из `cli-bridge.ts` в focused runtime helper и синхронизировать `Modules/Gemini.md`. Scope: `packages/Gemini_Module/src/runtime/cli-bridge.ts`, новый helper в `packages/Gemini_Module/src/runtime/`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`. Expected commit: `refactor(gemini): extract cli bridge resolution helpers`
16. [TODO] Git Commit: `refactor(gemini): extract cli bridge resolution helpers` (hash: TBD)
17. [TODO] Gemini_Module: вынести module-loading / compatibility-validation seam из `cli-bridge.ts` и переподключить `gemini-installer.ts` без изменения внешнего bridge contract. Scope: `packages/Gemini_Module/src/runtime/cli-bridge.ts`, новый helper в `packages/Gemini_Module/src/runtime/`, `packages/Gemini_Module/src/installer/gemini-installer.ts`. Expected commit: `refactor(gemini): split cli bridge loading and compatibility`
18. [TODO] Git Commit: `refactor(gemini): split cli bridge loading and compatibility` (hash: TBD)
19. [TODO] Gemini_Module: вынести npm/package-install/update/recovery helpers из `gemini-installer.ts` в focused installer helper и синхронизировать `Modules/Gemini.md`. Scope: `packages/Gemini_Module/src/installer/gemini-installer.ts`, новый helper в `packages/Gemini_Module/src/installer/`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`. Expected commit: `refactor(gemini): extract installer package management`
20. [TODO] Git Commit: `refactor(gemini): extract installer package management` (hash: TBD)
21. [TODO] Verification: прогнать таргетную сборку Gemini module и focused installer/runtime checks, затем синхронизировать execution status. Scope: `packages/Gemini_Module`, `doc/TODO/todo-plan.md`. Expected commit: `test(gemini): verify installer runtime decomposition`
22. [TODO] Git Commit: `test(gemini): verify installer runtime decomposition` (hash: TBD)
