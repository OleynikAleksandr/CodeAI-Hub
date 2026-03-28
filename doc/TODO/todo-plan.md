# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Session173.md`, `doc/SolidWorks-WorkFlow/Plans/Remaining_Audit_Debt_Closure_Architecture.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Этот `TODO Plan` реализует один scope: **remaining audit debt closure** после завершённой `Phase 78` и собранного релиза `1.1.822`
- Текущий baseline считается рабочим, поэтому scope ограничен **truthfulness cleanup + behavior-preserving refactor**, без feature-expansion
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещён)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием каждого stream выполнять таргетные проверки затронутых файлов/пакетов
- Для docs/workflow stream-ов таргетная проверка по умолчанию: `npm run lint`, `npm run check:links`
- Для CI/workflow stream-ов таргетная проверка по умолчанию: локальный smoke-check workflow команд через `npm run check:architecture`, `npm run lint`, `npm run check:tsprune`, `npm run compile`
- Для Core stream-ов таргетная проверка по умолчанию: `npm run build --workspace=@codeai-hub/core`
- Новый oversized handwritten source file вне explicit debt allowlist запрещён
- Oversized allowlist должен только уменьшаться; если файл реально опустился до `300` строк или ниже, он должен покинуть allowlist без откладывания

---

## Goal

Критерий завершения этого плана:

- metadata и workflow surface больше не расходятся с реальным состоянием репозитория;
- Husky остаётся единственным живым hook workflow без stale Lefthook tail;
- в репозитории появляется минимальный публичный CI baseline;
- audit-visible giant hotspot `session-request-handler.ts` начинает системную декомпозицию по responsibility seams;
- oversized allowlist продолжает уменьшаться, а не стабилизироваться как постоянное состояние.

---

## Phase 79 — Remaining Audit Truthfulness and Core Hotspot Closure (owner: Oleksandr, updated: 2026-03-28)

### Stream: Metadata and workflow truthfulness
1. [DONE] Синхронизировать canonical repo metadata и licensing answer между `README.md` и `package.json`, чтобы закрыть remaining audit drift по clone target / repository URL / license wording без изменения runtime behavior. Scope: `README.md`, `package.json`. Expected commit: `docs(metadata): align repository and license contract`
2. [DONE] Git Commit: `docs(metadata): align repository and license contract` (hash: `1ecc4652`)
3. [DONE] Удалить stale Lefthook leftovers из active workflow surface и dependency graph, зафиксировав Husky как единственный hook engine. Scope: `lefthook.yml`, `package.json`, `package-lock.json`. Expected commit: `chore(workflow): remove stale lefthook leftovers`
4. [DONE] Git Commit: `chore(workflow): remove stale lefthook leftovers` (hash: `70d8d1af`)
5. [DONE] Свести `scripts/build-release.sh`, `scripts/README.md` и `AGENTS.md` к одному правдивому release contract: checks/next-steps wording не должны конфликтовать с локальным Husky-first workflow. Scope: `scripts/build-release.sh`, `scripts/README.md`, `AGENTS.md`. Expected commit: `docs(workflow): align release script contract`
6. [DONE] Git Commit: `docs(workflow): align release script contract` (hash: `855da1ce`)

### Stream: Public CI baseline
7. [DONE] Добавить минимальный GitHub CI workflow как публичный enforcement surface для root quality gates (`architecture`, `lint`, `tsprune`, `compile`) на push/PR и синхронно задокументировать его в root docs. Scope: `.github/workflows/ci.yml`, `README.md`, `scripts/README.md`. Expected commit: `ci: add repository truthfulness workflow`
8. [DONE] Git Commit: `ci: add repository truthfulness workflow` (hash: `697dee62`)

### Stream: Core session-request-handler hotspot
9. [DONE] Выделить session resume lifecycle и post-turn context arbitration state из `session-request-handler.ts` в отдельный helper как safe first cut giant hotspot-а, сохранив current `no_resume` / `resume_in_place` / rollover locking semantics. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-resume-lifecycle.ts`. Expected commit: `refactor(core): extract session request resume lifecycle`
10. [DONE] Git Commit: `refactor(core): extract session request resume lifecycle` (hash: `34d924b8`)
11. [TODO] Выделить create/register shell session + provider-session resolution path из `session-request-handler.ts`, оставив root file orchestrator-ом вокруг session shell factory и continuity root promotion. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-session-bootstrap.ts`. Expected commit: `refactor(core): extract session request bootstrap path`
12. [TODO] Git Commit: `refactor(core): extract session request bootstrap path` (hash: TBD)
13. [TODO] Выделить outbound/internal message dispatch и missing-binding guard path из `session-request-handler.ts`, сохранив turn lifecycle, pending-intent TTL и continuity tracking behavior текущего релиза. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`. Expected commit: `refactor(core): extract session request message dispatch`
14. [TODO] Git Commit: `refactor(core): extract session request message dispatch` (hash: TBD)
15. [TODO] Выделить flow-node rollover/report orchestration и continuity-request state machine из `session-request-handler.ts` в dedicated helper, сохранив continuity lock/report/resume pipeline текущего релиза. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-flow-node-rollover.ts`. Expected commit: `refactor(core): extract session request flow-node rollover`
16. [TODO] Git Commit: `refactor(core): extract session request flow-node rollover` (hash: TBD)
17. [TODO] Свести `session-request-handler.ts` к thin orchestration surface, синхронно обновить SSOT и снять root file с explicit oversized allowlist, если после предыдущих cuts он реально опустится до `300` строк или ниже. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `scripts/check-architecture-rules/max-lines-debt-allowlist.txt`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): thin session request handler facade`
18. [TODO] Git Commit: `refactor(core): thin session request handler facade` (hash: TBD)
