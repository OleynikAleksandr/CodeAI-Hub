# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/Sessions/Session106.md`, `doc/Sessions/Session107.md`, `doc/SolidWorks-WorkFlow/Plans/Codex_GPT54_Resume_Recovery_Architecture.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 17 — Codex GPT-5.4 Resume Recovery Repair (owner: Oleksandr, updated: 2026-03-20)

### Stream: Planning baseline
1. [DONE] Зафиксировать reproduction, root cause, границы фикса и verification target в planning doc; заархивировать завершенный `Phase 16` execution plan и переключить active execution SSOT на новый Phase 17 (scope: `doc/SolidWorks-WorkFlow/Plans/Codex_GPT54_Resume_Recovery_Architecture.md`, `doc/TODO/Archive/todo-plan-up-to-phase16-inventory-only-diagram-cleanup-2026-03-20.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(recovery): record codex resume loop fix`).
2. [DONE] Git Commit: `docs(recovery): record codex resume loop fix` (hash: `d257ab65`)

### Stream: Codex provider resume semantics
1. [DONE] Убрать unconditional `gpt-5.4 => fresh thread on resume` path и добавить regression test, который подтверждает reuse existing thread id в ordinary reopen/recovery (scope: `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`, `packages/Codex_Module/src/sdk/codex-sdk-manager.test.ts`; expected commit: `fix(codex): restore gpt54 resume semantics`).
2. [DONE] Git Commit: `fix(codex): restore gpt54 resume semantics` (hash: `63b66804`)

### Stream: Core continuity normalization
1. [DONE] Немедленно нормализовать continuity/index для freshly bound runtime session в `session-request-handler` и покрыть eager-tracking regression test (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `fix(core): normalize resumed codex continuity state`).
2. [DONE] Git Commit: `fix(core): normalize resumed codex continuity state` (hash: `a812549d`)

### Stream: Project Manager reopen behavior
1. [DONE] Добавить dedupe для cold-open runtime restore requests по одному continuity entry и вынести bootstrap helper, чтобы `use-project-manager-dialog-core-events.ts` остался в архитектурном лимите (scope: `src/client/project-manager/components/sessions/dialog-session-bootstrap.ts`, `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`, `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`, `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`; expected commit: `fix(pm): stop stale codex dialog reopen retries`).
2. [DONE] Git Commit: `fix(pm): stop stale codex dialog reopen retries` (hash: `04cb574a`)
3. [DONE] Исправить release-time type-check regression в `dialog-session-bootstrap.ts`, чтобы bootstrap helper передавал `ProviderStackId | null`, а не `string | null` (scope: `src/client/project-manager/components/sessions/dialog-session-bootstrap.ts`; expected commit: `fix(pm): narrow dialog bootstrap provider typing`).
4. [DONE] Git Commit: `fix(pm): narrow dialog bootstrap provider typing` (hash: `40332e59`)

### Stream: Docs and verification
1. [DONE] Синхронизировать release-facing docs и SSOT под новый recovery bugfix: `README`, `CHANGELOG`, `BugRegistry`, `SystemArchitecture`, session reports и active `todo-plan` должны отражать root cause, fix boundary и target release `1.1.753` (scope: `README.md`, `CHANGELOG.md`, `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/Sessions/Session106.md`, `doc/Sessions/Session107.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(recovery): record codex resume loop fix`).
2. [DONE] Git Commit: `docs(recovery): record codex resume loop fix` (hash: `d257ab65`)
3. [DONE] Выполнить таргетные проверки и собрать новый релиз `1.1.753` через `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, затем зафиксировать version/manifests changes и release artifacts (scope: `release manifests/scripts`, package versions, build outputs; expected commit: `chore(release): build codex resume recovery release`).
4. [DONE] Git Commit: `chore(release): build codex resume recovery release` (hash: `9e872284`)
5. [DONE] После релизной сборки дописать фактические release hashes / verification notes в `todo-plan`, `BugRegistry` и `Session107`, чтобы следующий старт восстанавливал уже post-release context, а не pre-release worktree state (scope: `doc/TODO/todo-plan.md`, `doc/BugRegistry.md`, `doc/Sessions/Session107.md`; expected commit: `docs(session): record codex resume recovery verification`).
6. [DONE] Git Commit: `docs(session): record codex resume recovery verification` (hash: `5ed2481a`)

## Notes
- Archived previous completed rollout plan: `doc/TODO/Archive/todo-plan-up-to-phase16-inventory-only-diagram-cleanup-2026-03-20.md`
- Active planning doc for this phase: `doc/SolidWorks-WorkFlow/Plans/Codex_GPT54_Resume_Recovery_Architecture.md`
- Reproduction workspace: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4`
- Target bugfix release: `1.1.753`
- Archive finalized after post-release docs/session commit `5ed2481a`.
