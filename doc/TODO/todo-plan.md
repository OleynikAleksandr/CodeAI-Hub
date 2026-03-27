# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Session165.md`, `doc/SolidWorks-WorkFlow/Plans/Runtime_GodModules_Decomposition_Architecture.md`
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

---

## Phase 76 — Runtime God-Modules Decomposition (owner: Oleksandr, updated: 2026-03-27)

### Stream: Gate hardening — full source surface
1. [DONE] Расширить architecture gate на весь handwritten source surface и заменить скрытый blind spot явным debt allowlist. Scope: `scripts/check-architecture.sh`, `scripts/check-architecture-rules/max-lines-debt-allowlist.txt`, `scripts/README.md`. Expected commit: `chore(architecture): expand source-surface line-limit gate` (hash: 49629f58)
2. [DONE] Git Commit: `chore(architecture): expand source-surface line-limit gate` (hash: 49629f58)
3. [DONE] Синхронизировать hook bootstrap и архитектурный contract quality gates под Husky + explicit debt allowlist. Scope: `package.json`, `doc/SolidWorks-WorkFlow/Contracts/Formal_Module_Cluster_Facade_Architecture.md`. Expected commit: `docs(workflow): sync architecture gate contract with Husky` (hash: b97aef9c)
4. [DONE] Git Commit: `docs(workflow): sync architecture gate contract with Husky` (hash: b97aef9c)

### Stream: Core remote-bridge — `session-request-handler` becomes a facade
5. [DONE] Вынести provider session create/resume resolution и shell/bound session factories из `session-request-handler.ts` в отдельные micro-modules. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-provider-session-resolver.ts`, `packages/core/src/remote-bridge/handlers/session-shell-factory.ts`. Expected commit: `refactor(core): extract session bootstrap factories from request handler` (hash: 93503524)
6. [DONE] Git Commit: `refactor(core): extract session bootstrap factories from request handler` (hash: 93503524)
7. [DONE] Вынести description dialog history sync и provider binding wiring из `session-request-handler.ts` в dedicated services. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-description-dialog-sync.ts`, `packages/core/src/remote-bridge/handlers/session-provider-binding-service.ts`. Expected commit: `refactor(core): extract dialog sync from request handler` (hash: 9215ef6b)
8. [DONE] Git Commit: `refactor(core): extract dialog sync from request handler` (hash: 9215ef6b)
9. [TODO] Вынести flow-node rollover и continuity lock orchestration в самостоятельные runtime services. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-continuity-rollover-orchestrator.ts`, `packages/core/src/remote-bridge/handlers/session-continuity-lock-service.ts`. Expected commit: `refactor(core): extract continuity rollover orchestration`
10. [TODO] Git Commit: `refactor(core): extract continuity rollover orchestration` (hash: TBD)
11. [TODO] Вынести provider event routing и failure recovery из `session-request-handler.ts` в отдельные модули, оставив в файле только façade entrypoint. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts`, `packages/core/src/remote-bridge/handlers/session-provider-failure-recovery.ts`. Expected commit: `refactor(core): extract provider event routing from request handler`
12. [TODO] Git Commit: `refactor(core): extract provider event routing from request handler` (hash: TBD)
13. [TODO] Разрезать giant regression suite `session-request-handler.test.ts` на тематические test modules после стабилизации production façade. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.create-resume.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.rollover.test.ts`. Expected commit: `test(core): split request handler regression suite`
14. [TODO] Git Commit: `test(core): split request handler regression suite` (hash: TBD)

### Stream: Core provider registry — installer, loader, recovery clusters
15. [TODO] Вынести installer path policy и installed-provider path resolution из `provider-registry/index.ts` в отдельные modules; убрать user-specific absolute macOS paths из runtime source. Scope: `packages/core/src/provider-registry/index.ts`, `packages/core/src/provider-registry/provider-installer-paths.ts`, `packages/core/src/provider-registry/provider-installed-path-resolver.ts`. Expected commit: `refactor(core): extract provider path resolution`
16. [TODO] Git Commit: `refactor(core): extract provider path resolution` (hash: TBD)
17. [TODO] Вынести Claude/Codex/Gemini module loading и override/bundled fallback в dedicated loader modules. Scope: `packages/core/src/provider-registry/index.ts`, `packages/core/src/provider-registry/provider-module-loader.ts`, `packages/core/src/provider-registry/provider-module-loader.types.ts`. Expected commit: `refactor(core): extract provider module loader`
18. [TODO] Git Commit: `refactor(core): extract provider module loader` (hash: TBD)
19. [TODO] Вынести usage-limits bridge assembly и descriptor bootstrap в factory modules, чтобы `index.ts` стал registry façade. Scope: `packages/core/src/provider-registry/index.ts`, `packages/core/src/provider-registry/provider-usage-limits-bridge-factory.ts`, `packages/core/src/provider-registry/provider-descriptor-factory.ts`. Expected commit: `refactor(core): extract provider descriptor factories`
20. [TODO] Git Commit: `refactor(core): extract provider descriptor factories` (hash: TBD)
21. [TODO] Вынести retry timers и recovery attempts в отдельный scheduler/coordinator и оставить в `index.ts` только registry API. Scope: `packages/core/src/provider-registry/index.ts`, `packages/core/src/provider-registry/provider-recovery-scheduler.ts`, `packages/core/src/provider-registry/provider-recovery-coordinator.ts`. Expected commit: `refactor(core): extract provider recovery scheduler`
22. [TODO] Git Commit: `refactor(core): extract provider recovery scheduler` (hash: TBD)

### Stream: Gemini runtime — `gemini-session-manager` becomes a facade
23. [TODO] Вынести session bootstrap, settings snapshot resolution, auth/config/client initialization из `gemini-session-manager.ts`. Scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts`, `packages/Gemini_Module/src/session/gemini-session-settings-resolver.ts`. Expected commit: `refactor(gemini): extract session bootstrapper`
24. [TODO] Git Commit: `refactor(gemini): extract session bootstrapper` (hash: TBD)
25. [TODO] Вынести turn loop и tool-call orchestration в отдельные runtime modules. Scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/session/gemini-turn-runner.ts`, `packages/Gemini_Module/src/session/gemini-tool-call-orchestrator.ts`. Expected commit: `refactor(gemini): extract turn runner`
26. [TODO] Git Commit: `refactor(gemini): extract turn runner` (hash: TBD)
27. [TODO] Вынести session store, alias promotion, idle watchdog и close lifecycle в dedicated micro-modules; `gemini-session-manager.ts` оставить фасадом. Scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/session/gemini-session-store.ts`, `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`. Expected commit: `refactor(gemini): extract session lifecycle modules`
28. [TODO] Git Commit: `refactor(gemini): extract session lifecycle modules` (hash: TBD)
29. [TODO] Разрезать `gemini-session-manager.test.ts` на bootstrap/runtime suites после стабилизации façade boundary. Scope: `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`, `packages/Gemini_Module/src/session/gemini-session-bootstrapper.test.ts`, `packages/Gemini_Module/src/session/gemini-turn-runner.test.ts`. Expected commit: `test(gemini): split session manager suites`
30. [TODO] Git Commit: `test(gemini): split session manager suites` (hash: TBD)

### Stream: Wave 2 debt inventory after first façade cuts
31. [TODO] После декомпозиции трёх ключевых файлов переприоритизировать вторую волну oversized debt и обновить explicit allowlist только в сторону уменьшения. Scope: `doc/SolidWorks-WorkFlow/Plans/Runtime_GodModules_Decomposition_Architecture.md`, `scripts/check-architecture-rules/max-lines-debt-allowlist.txt`, `doc/TODO/todo-plan.md`. Expected commit: `docs(architecture): reprioritize oversized debt wave two`
32. [TODO] Git Commit: `docs(architecture): reprioritize oversized debt wave two` (hash: TBD)

### Stream: Workflow quality-surface cleanup
33. [DONE] Синхронизировать исполняемый quality-gate contract между `.husky/pre-commit`, root `package.json` scripts и `scripts/README.md`, не смешивая эти правки с runtime refactor stream-ами. Scope: `.husky/pre-commit`, `package.json`, `scripts/README.md`. Expected commit: `chore(workflow): align quality gate scripts with Husky` (hash: 010c555f)
34. [DONE] Git Commit: `chore(workflow): align quality gate scripts with Husky` (hash: 010c555f)
35. [IN_PROGRESS] Синхронизировать локальные инструкции разработки с обновлённым quality-gate contract после cleanup. Scope: `AGENTS.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs(workflow): sync local instructions with quality gates`
36. [TODO] Git Commit: `docs(workflow): sync local instructions with quality gates` (hash: TBD)
