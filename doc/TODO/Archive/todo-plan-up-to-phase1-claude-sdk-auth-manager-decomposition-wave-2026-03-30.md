# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Source of truth для этой фазы: `doc/SolidWorks-WorkFlow/Plans/Runtime_GodModules_Decomposition_Architecture.md`
- Scope этой волны ограничен одним production hotspot: `packages/Claude_Module/src/auth/sdk-auth-manager.ts`
- Test files, `claude-usage-limits-facade.ts`, `launcher_handler.cc` и другие warning-zone кандидаты в эту фазу не входят.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если scope вырастает больше 3 файлов, подзадачу нужно дробить до начала правок.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** перед закрытием Stream:
  - Claude: `npm run build --workspace @codeai-hub/claude-module`
- **Real-time Документация:** structural decomposition и новые helper-boundaries должны синхронно попадать в `doc/` в том же коммите.

## Required documents to review before work
1. `doc/Sessions/Session204.md`
2. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
3. `doc/SolidWorks-WorkFlow/Modules/Claude.md`
4. `doc/SolidWorks-WorkFlow/Plans/Runtime_GodModules_Decomposition_Architecture.md`
5. `doc/TODO/Archive/todo-plan-up-to-phase1-runtime-400-500-production-hotspots-wave-1-2026-03-30.md`
6. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 1 — Claude SDK Auth Manager Decomposition Wave (owner: Oleksandr, updated: 2026-03-30)

Goal: behavior-preserving decomposition of the last remaining production hotspot from the originally agreed warning-zone list, without mixing in new Claude feature work.

### Stream: Claude Auth Home Bridge Split
1. [DONE] Claude_Module: вынести provider-home/macOS keychain bridge, legacy `.claude.json` link/copy handling и credentials migration seam из `sdk-auth-manager.ts` в focused helper и синхронизировать `Modules/Claude.md`. Scope: `packages/Claude_Module/src/auth/sdk-auth-manager.ts`, новый helper в `packages/Claude_Module/src/auth/`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`. Expected commit: `refactor(claude): extract auth home bridge helpers`
2. [DONE] Git Commit: `refactor(claude): extract auth home bridge helpers` (hash: `9862d4d4`)

### Stream: Claude Auth Runtime Split
3. [DONE] Claude_Module: вынести OAuth bootstrap/cache refresh, auth environment assembly и auth probe/check execution seam из `sdk-auth-manager.ts`, сохранив внешний API manager-а стабильным, и синхронизировать `Modules/Claude.md`. Scope: `packages/Claude_Module/src/auth/sdk-auth-manager.ts`, новый helper в `packages/Claude_Module/src/auth/`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`. Expected commit: `refactor(claude): split auth probe and token bootstrap`
4. [DONE] Git Commit: `refactor(claude): split auth probe and token bootstrap` (hash: `bf50a3d3`)

### Stream: Claude Auth Verification
5. [DONE] Verification: прогнать `npm run build --workspace @codeai-hub/claude-module` и focused auth bootstrap/provider-home sanity checks, затем синхронизировать execution status. Scope: `packages/Claude_Module`, `doc/TODO/todo-plan.md`. Expected commit: `test(claude): verify auth manager decomposition`
6. [DONE] Git Commit: `test(claude): verify auth manager decomposition` (hash: `7149d9e5`)

### Stream: Release Build
7. [DONE] Release: после закрытия structural stream-ов и verification актуализировать release-facing docs при необходимости, затем прогнать `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, сохранить свежие артефакты в `doc/tmp/releases/` и синхронизировать execution status. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Expected commit: `build(release): assemble sdk auth decomposition release`
8. [DONE] Git Commit: `build(release): assemble sdk auth decomposition release` (hash: `127af640`)

### Stream: Phase Closeout
9. [DONE] Docs: архивировать завершённый active plan, выпустить новый placeholder `todo-plan.md` и записать session handoff по итогам волны. Scope: `doc/TODO/Archive/`, `doc/TODO/todo-plan.md`, `doc/Sessions/SessionXXX.md`. Expected commit: `docs(plan): archive sdk auth manager decomposition wave`
10. [DONE] Git Commit: `docs(plan): archive sdk auth manager decomposition wave` (hash: `TBD`)
