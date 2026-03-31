# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Source of truth для этой волны: `doc/SolidWorks-WorkFlow/Plans/Shared_RuntimeTranslation_Module_Architecture.md`
- Scope этой волны ограничен двумя фазами: (1) shared runtime translation module, (2) Gemini adapter parity поверх нового shared facade.
- Codex adapter, document/ad-hoc translation adapters и startup locale wiring в этот active plan не входят.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если scope вырастает больше 3 файлов, подзадачу нужно дробить до начала правок.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетная verification** перед release stream:
  - `npm run build --workspace @codeai-hub/translation`
  - `node --test --import tsx packages/Gemini_Module/src/messaging/message-processor.test.ts`
  - `node --test --import tsx packages/Gemini_Module/src/session/gemini-session-manager.test.ts`
  - `npm run build --workspace @codeai-hub/gemini-module`
- **Release closeout обязателен:** перед `build-all.sh` синхронизировать архитектурные и release-facing docs, затем выполнить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`.
- **Real-time Документация:** изменения модульных границ, facade/API контракта и Gemini translation ownership должны синхронно отражаться в `SystemArchitecture.md`, `Modules/Gemini.md` и `Contracts/Gemini_ThoughtTranslation.md` в той же execution wave.

## Required documents to review before work
1. `doc/Sessions/Session208.md`
2. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
3. `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
4. `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`
5. `doc/SolidWorks-WorkFlow/Plans/Shared_RuntimeTranslation_Module_Architecture.md`
6. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 1 — Shared Runtime Translation Module (owner: Oleksandr, updated: 2026-03-31)

Goal: extract provider-neutral EN -> target-language translation capability into a standalone reusable package with facade, engine contract, and Google GTX first engine.

### Stream: Translation Package Scaffold
1. [DONE] Translation: создать standalone package scaffold для `@codeai-hub/translation` с package manifest, tsconfig и root export surface. Scope: `packages/translation/package.json`, `packages/translation/tsconfig.json`, `packages/translation/src/index.ts`. Expected commit: `feat(translation): scaffold shared runtime translation package`
2. [DONE] Git Commit: `feat(translation): scaffold shared runtime translation package` (hash: `217de5b1`)

### Stream: Translation Facade And Contract
3. [DONE] Translation: добавить provider-neutral facade, public contract и engine abstraction для shared translation module. Scope: `packages/translation/src/translation-contract.ts`, `packages/translation/src/translation-engine.ts`, `packages/translation/src/translation-facade.ts`. Expected commit: `feat(translation): add facade and engine contract`
4. [DONE] Git Commit: `feat(translation): add facade and engine contract` (hash: `217de5b1`)

### Stream: Google GTX Engine
5. [DONE] Translation: реализовать Google GTX request path с request normalization и response parsing как first engine behind the shared facade. Scope: `packages/translation/src/google-translate-client.ts`, `packages/translation/src/translation-request-normalizer.ts`, `packages/translation/src/translation-response-parser.ts`. Expected commit: `feat(translation): add google gtx engine`
6. [DONE] Git Commit: `feat(translation): add google gtx engine` (hash: `217de5b1`)

### Stream: Translation Package Verification
7. [DONE] Verification: прогнать targeted build/diagnostics для нового translation package и синхронизировать execution status. Scope: `packages/translation`, `doc/TODO/todo-plan.md`. Expected commit: `test(translation): verify shared translation package`
8. [DONE] Git Commit: `test(translation): verify shared translation package` (hash: `7c2fde14`)

## Phase 2 — Gemini Adapter Parity And Release (owner: Oleksandr, updated: 2026-03-31)

Goal: rewire Gemini thought translation onto the new shared facade with zero visible regression, then sync docs and assemble a new release.

### Stream: Gemini Translation Adapter
9. [DONE] Gemini_Module: добавить provider-local adapter поверх shared translation facade и превратить legacy thought translator entrypoint в compatibility re-export, сохранив `assistant + tag: thinking` contract. Scope: `packages/Gemini_Module/src/messaging/gemini-thought-translation-adapter.ts`, `packages/Gemini_Module/src/messaging/thought-translator-service.ts`, `package-lock.json`. Expected commit: `refactor(gemini): add shared translation adapter`
10. [DONE] Git Commit: `refactor(gemini): add shared translation adapter` (hash: `b9e92f17`)

### Stream: Gemini Session Wiring
11. [DONE] Gemini_Module: перевести session-layer wiring со старого provider-local translator на shared translation facade и убрать direct Gemini-owned translator instance из session orchestration. Scope: `packages/Gemini_Module/src/session/gemini-turn-runner.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/messaging/thought-translator-service.ts`. Expected commit: `refactor(gemini): wire shared translation facade`
12. [DONE] Git Commit: `refactor(gemini): wire shared translation facade` (hash: `b03133c8`)

### Stream: Gemini Parity Verification
13. [DONE] Verification: прогнать targeted Gemini parity checks для translated thinking ordering/fallback и package builds для `translation` + `gemini-module`, затем синхронизировать execution status. Scope: `packages/translation`, `packages/Gemini_Module`, `doc/TODO/todo-plan.md`. Expected commit: `test(gemini): verify shared translation parity`
14. [DONE] Git Commit: `test(gemini): verify shared translation parity` (hash: `a1a9c919`)

### Stream: Architecture Docs Sync
15. [DONE] Docs: синхронизировать SSOT по shared translation baseline, Gemini ownership boundary и system/module contract до release-facing docs. Scope: `doc/SolidWorks-WorkFlow/Contracts/Gemini_ThoughtTranslation.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `docs(architecture): sync shared translation module`
16. [DONE] Git Commit: `docs(architecture): sync shared translation module` (hash: `eafd9e0c`)

### Stream: Release Docs
17. [DONE] Docs: подготовить release-facing notes под новый shared-translation release и синхронизировать execution status. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs(release): prepare shared translation release notes`
18. [DONE] Git Commit: `docs(release): prepare shared translation release notes` (hash: `fa714d2f`)

### Stream: Release Build
19. [DONE] Release: после зелёной structural verification и doc sync выполнить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, сохранить свежие артефакты и синхронизировать execution status. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Expected commit: `build(release): assemble shared translation release`
20. [DONE] Git Commit: `build(release): assemble shared translation release` (hash: `adf70909`)

### Stream: Phase Closeout
21. [DONE] Docs: архивировать завершённый active plan, выпустить placeholder `todo-plan.md` и записать session handoff по итогам release wave. Scope: `doc/TODO/Archive/`, `doc/TODO/todo-plan.md`, `doc/Sessions/SessionXXX.md`. Expected commit: `docs(plan): archive shared translation release wave`
22. [DONE] Git Commit: `docs(plan): archive shared translation release wave` (hash: TBD)
