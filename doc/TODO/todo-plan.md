# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Session166.md`, `doc/SolidWorks-WorkFlow/Plans/PostAudit_TailCleanup_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Runtime_GodModules_Decomposition_Architecture.md`
- Этот `TODO Plan` реализует один scope: **post-audit tail cleanup** после успешного и вручную подтверждённого релиза `1.1.819`
- Текущий baseline считается рабочим: пользователь подтвердил, что релиз `1.1.819` функционирует корректно; значит текущая работа ограничена **behavior-preserving cleanup/refactor**, а не feature-expansion
- Главная цель плана: подчищать хвосты после аудита, убирать release/package noise и довести handwritten codebase до контракта `1 class / 1 file` и `≤300` строк handwritten source на файл
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещён)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием каждого stream выполнять таргетные проверки затронутых пакетов/клиентов
- Для Core stream-ов таргетная проверка по умолчанию: `npm run build --workspace=@codeai-hub/core`
- Для provider package stream-ов таргетная проверка по умолчанию: `npm run build --workspace=@codeai-hub/gemini-module`, `npm run build --workspace=@codeai-hub/codex-module`, `npm run build --workspace=@codeai-hub/claude-module`
- Для PM/UI stream-ов таргетная проверка по умолчанию: `npm run build:webview` + `npm run typecheck:webview`
- Новый oversized handwritten source file вне explicit debt allowlist запрещён
- Generated/build directories (`dist/`, `build/`, `node_modules/`) исключаются из line-limit gate только по директориям, а не через выпадение целых source-root’ов
- Oversized allowlist должен только уменьшаться; если файл реально опустился до `300` строк или ниже, он должен покинуть allowlist без откладывания «на потом»
- Audit `CODEAI_HUB_HONEST_AUDIT_20260327.md` уже принят как baseline: его findings про source-surface blind spot, false-green gate surface, god-module concentration и release/package truthfulness должны учитываться в порядке задач ниже, но без расширения scope за пределы двух фаз этого плана

---

## Goal

Критерий завершения этого плана:

- `.husky/_` helper files и прочий служебный packaging noise не попадают в VSIX/package surface
- `Wave 2` backlog режет oversized hotspots последовательно, без смешивания с feature-work
- handwritten source surface движется к состоянию без файлов `>300` строк
- class-based runtime логика распадается на отдельные файлы по responsibility seams, а root giant files превращаются в thin façade surfaces

---

## Phase 77 — Post-Audit Packaging Tail Cleanup (owner: Oleksandr, updated: 2026-03-27)

### Stream: Audit intake and packaging surface
1. [DONE] Синхронизировать findings audit-а `CODEAI_HUB_HONEST_AUDIT_20260327.md` с canonical planning doc и подтвердить, что текущий scope ограничен cleanup-хвостами после успешного релиза `1.1.819`, без feature-expansion. Scope: `doc/SolidWorks-WorkFlow/Plans/PostAudit_TailCleanup_Architecture.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs(architecture): sync post-audit cleanup scope`
2. [DONE] Git Commit: `docs(architecture): sync post-audit cleanup scope` (hash: `661b217b`)
3. [DONE] Исключить `.husky/_` helper files из VSIX/package surface и зафиксировать release-facing packaging contract, не меняя runtime behavior. Scope: `.vscodeignore`, `README.md`, `CHANGELOG.md`. Expected commit: `chore(packaging): exclude husky helper files from VSIX`
4. [DONE] Git Commit: `chore(packaging): exclude husky helper files from VSIX` (hash: `d027e5d4`)
5. [DONE] После exclusion `.husky/**` зачистить оставшийся non-runtime release surface (`.gitignore`, `GEMINI.md` и аналогичные repo-only файлы, если они всё ещё попадают в `vsce ls`) и синхронно зафиксировать правило в SSOT. Scope: `.vscodeignore`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs(workflow): sync post-audit packaging cleanup`
6. [DONE] Git Commit: `docs(workflow): sync post-audit packaging cleanup` (hash: `37ca1dcf`)

---

## Phase 78 — Wave 2 Oversized Debt After Audit (owner: Oleksandr, updated: 2026-03-27)

### Stream: Core remote-bridge edge surfaces
1. [DONE] Декомпозировать `http-api-router.ts` по route responsibilities, оставив в корневом файле thin router façade; в ходе реализации scope расширился дополнительными helper-модулями, чтобы сохранить `artifact-upsert` behavior после форматирования/Ultracite и снять root router с oversized allowlist. Scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/http-api-session-routes.ts`, `packages/core/src/remote-bridge/handlers/http-api-system-routes.ts`, `packages/core/src/remote-bridge/handlers/http-api-artifact-upsert-service.ts`, `packages/core/src/remote-bridge/handlers/http-api-artifact-validation.ts`, `scripts/check-architecture-rules/max-lines-debt-allowlist.txt`. Expected commit: `refactor(core): extract http api router route clusters`
2. [DONE] Git Commit: `refactor(core): extract http api router route clusters` (hash: `b21ca3c6`)
3. [DONE] Свести `remote-bridge/index.ts` к thin façade через вынос bootstrap/lifecycle wiring и websocket command routing в отдельные modules; по факту safe decomposition потребовала выделить отдельные dialog/workspace command helpers, чтобы новые handwritten files тоже остались `<=300` строк, а `index.ts` сразу покинул explicit oversized allowlist. Scope: `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/index.test.ts`, `packages/core/src/remote-bridge/remote-bridge-bootstrap.ts`, `packages/core/src/remote-bridge/remote-bridge-server-lifecycle.ts`, `packages/core/src/remote-bridge/remote-bridge-message-router.ts`, `packages/core/src/remote-bridge/remote-bridge-dialog-command-router.ts`, `packages/core/src/remote-bridge/remote-bridge-workspace-command-router.ts`, `scripts/check-architecture-rules/max-lines-debt-allowlist.txt`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): extract remote bridge bootstrap facade`
4. [DONE] Git Commit: `refactor(core): extract remote bridge bootstrap facade` (hash: `25c9e554`)

### Stream: Core runtime/config contract surfaces
5. [TODO] Декомпозировать `workspace-runtime-facade.ts` по lock/binding/session-sync seams, оставив корневой файл façade-entrypoint. Scope: `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`, `packages/core/src/workspace-runtime/workspace-runtime-lock-sync.ts`, `packages/core/src/workspace-runtime/workspace-runtime-session-sync.ts`. Expected commit: `refactor(core): extract workspace runtime facade clusters`
6. [TODO] Git Commit: `refactor(core): extract workspace runtime facade clusters` (hash: TBD)
7. [TODO] Разрезать `config/index.ts` на snapshot/default resolver helpers и свести root file к config façade/export surface. Scope: `packages/core/src/config/index.ts`, `packages/core/src/config/provider-settings-snapshot.ts`, `packages/core/src/config/provider-defaults-resolver.ts`. Expected commit: `refactor(core): extract config resolver clusters`
8. [TODO] Git Commit: `refactor(core): extract config resolver clusters` (hash: TBD)
9. [TODO] Разделить `remote-bridge/types.ts` на когерентные contract modules, чтобы root `types.ts` стал thin aggregation surface. Scope: `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/session-stream-contracts.ts`, `packages/core/src/remote-bridge/workspace-stream-contracts.ts`. Expected commit: `refactor(core): extract remote bridge contract modules`
10. [TODO] Git Commit: `refactor(core): extract remote bridge contract modules` (hash: TBD)

### Stream: Diagram DSL and provider messaging hotspots
11. [TODO] Декомпозировать `diagram-modules-parser.ts` по ownership/entity parsing seams, оставив root parser orchestration façade. Scope: `packages/core/src/workflow/diagram-dsl/diagram-modules-parser.ts`, `packages/core/src/workflow/diagram-dsl/diagram-ownership-parser.ts`, `packages/core/src/workflow/diagram-dsl/diagram-relations-parser.ts`. Expected commit: `refactor(core): extract diagram modules parser clusters`
12. [TODO] Git Commit: `refactor(core): extract diagram modules parser clusters` (hash: TBD)
13. [TODO] Декомпозировать Claude message processor на route/finish handlers, сохранив behavior текущего релиза. Scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`, `packages/Claude_Module/src/messaging/claude-message-finish-handler.ts`. Expected commit: `refactor(claude): extract message processor clusters`
14. [TODO] Git Commit: `refactor(claude): extract message processor clusters` (hash: TBD)
15. [TODO] Декомпозировать Codex message processor на event routing и completion helpers. Scope: `packages/Codex_Module/src/messaging/message-processor.ts`, `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`, `packages/Codex_Module/src/messaging/codex-message-finish-handler.ts`. Expected commit: `refactor(codex): extract message processor clusters`
16. [TODO] Git Commit: `refactor(codex): extract message processor clusters` (hash: TBD)
17. [TODO] Свести `structured-output-stream-controller.ts` к focused façade над parser/state helpers. Scope: `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`, `packages/Codex_Module/src/messaging/structured-output-parser.ts`, `packages/Codex_Module/src/messaging/structured-output-state.ts`. Expected commit: `refactor(codex): extract structured output stream controller helpers`
18. [TODO] Git Commit: `refactor(codex): extract structured output stream controller helpers` (hash: TBD)
19. [TODO] Декомпозировать Gemini message processor на event routing и assistant/thinking normalization helpers. Scope: `packages/Gemini_Module/src/messaging/message-processor.ts`, `packages/Gemini_Module/src/messaging/gemini-stream-event-router.ts`, `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`. Expected commit: `refactor(gemini): extract message processor clusters`
20. [TODO] Git Commit: `refactor(gemini): extract message processor clusters` (hash: TBD)
