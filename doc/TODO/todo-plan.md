# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  1) `doc/SolidWorks-WorkFlow/README.md`
  2) `doc/SolidWorks-WorkFlow/Docs_Index.md`
  3) `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase:
  - `npm run build --workspace <package>`
  - `npm run build:webview`
  - `npm run typecheck:webview`
- **Commit**: только после зеленых гейтов. После каждого коммита: обновить статусы и вписать hash.
- **Real-time Документация**: любое изменение архитектуры/логики требует синхронного обновления документов из `doc/` ДО коммита.

---

## Phase 219 — Provider Session HOME: Snapshot Engine + Integration (owner: Oleksandr+Codex, updated: 2026-02-21)

**Goal:** реализовать изоляцию provider HOME на уровне Session Node + `resume-first` recovery с `last-known-good` snapshot (FS default, Git optional).

**SSOT/Design:**
- `doc/SolidWorks-WorkFlow/Contracts/ProviderSessionHome_IsolationAndRecovery.md`
- `doc/SolidWorks-WorkFlow/Contracts/ProviderSessionHome_SnapshotEngine_Design.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`

---

### Stream 1: Docs — finalize SSOT + index sync
1. [TODO] Синхронизировать и финализировать SSOT-документы под реализацию snapshot engine (и уточнить open questions, особенно `sessionNodeId`).
   Scope: `doc/SolidWorks-WorkFlow/Contracts/ProviderSessionHome_IsolationAndRecovery.md` + `doc/SolidWorks-WorkFlow/Contracts/ProviderSessionHome_SnapshotEngine_Design.md` + `doc/SolidWorks-WorkFlow/Docs_Index.md` (3 файла); ожидаемый commit message: `docs(provider-home): finalize snapshot engine design`
2. [TODO] Git Commit: `docs(provider-home): finalize snapshot engine design` (hash: TBD)

---

### Stream 2: Core — новый закрытый модуль (facade + paths)
1. [TODO] Создать закрытый модуль `packages/core/src/provider-session-home/` и фасад как единственную точку входа. Добавить path-builder для `sessionHomePath`/`snapshotRootPath`.
   Scope: `packages/core/src/provider-session-home/provider-session-home-facade.ts` + `packages/core/src/provider-session-home/provider-session-home-types.ts` + `packages/core/src/provider-session-home/provider-session-home-path-builder.ts` (3 файла); ожидаемый commit message: `feat(core): add provider-session-home facade skeleton`
2. [TODO] Git Commit: `feat(core): add provider-session-home facade skeleton` (hash: TBD)

---

### Stream 3: Core — snapshot engine contract + lock + manifest
1. [TODO] Добавить per-session lock и контракт snapshot engine (interface). Добавить manifest store (`manifest.json`) с полями backend/timestamps/refs.
   Scope: `packages/core/src/provider-session-home/snapshot/session-home-snapshot-engine.ts` + `packages/core/src/provider-session-home/lock/provider-session-home-lock.ts` + `packages/core/src/provider-session-home/manifest/snapshot-manifest-store.ts` (3 файла); ожидаемый commit message: `feat(core): add session-home snapshot engine contract`
2. [TODO] Git Commit: `feat(core): add session-home snapshot engine contract` (hash: TBD)

---

### Stream 4: Core — FilesystemSnapshotEngine (default)
1. [TODO] Реализовать `FilesystemSnapshotEngine`: staging + atomic rename, rolling окно `last_good`/`previous_good`, restore с fallback.
   Scope: `packages/core/src/provider-session-home/snapshot/filesystem-snapshot-engine.ts` + `packages/core/src/provider-session-home/provider-session-home-facade.ts` + `packages/core/src/provider-session-home/provider-session-home-types.ts` (3 файла); ожидаемый commit message: `feat(core): add filesystem session-home snapshots`
2. [TODO] Git Commit: `feat(core): add filesystem session-home snapshots` (hash: TBD)

3. [TODO] Добавить unit tests для rotation/restore (минимум: happy-path + fallback previous_good).
   Scope: `packages/core/src/provider-session-home/snapshot/filesystem-snapshot-engine.test.ts` + (если нужно) `packages/core/src/provider-session-home/provider-session-home-facade.ts` (≤2 файла); ожидаемый commit message: `test(core): cover filesystem snapshot engine`
4. [TODO] Git Commit: `test(core): cover filesystem snapshot engine` (hash: TBD)

---

### Stream 5: Core — GitSnapshotEngine (optional)
1. [TODO] Реализовать `GitSnapshotEngine` (локальный repo, без remote): commit только на `completed_success`, 2 refs (`last_good`, `previous_good`), `reflog expire` + `gc/prune` после ротации.
   Scope: `packages/core/src/provider-session-home/snapshot/git-snapshot-engine.ts` + `packages/core/src/provider-session-home/snapshot/session-home-snapshot-engine.ts` + `packages/core/src/provider-session-home/provider-session-home-facade.ts` (3 файла); ожидаемый commit message: `feat(core): add git-backed session-home snapshots`
2. [TODO] Git Commit: `feat(core): add git-backed session-home snapshots` (hash: TBD)

3. [TODO] Добавить unit tests для ref rotation + restore.
   Scope: `packages/core/src/provider-session-home/snapshot/git-snapshot-engine.test.ts` (1 файл); ожидаемый commit message: `test(core): cover git snapshot engine`
4. [TODO] Git Commit: `test(core): cover git snapshot engine` (hash: TBD)

---

### Stream 6: Core — проброс `sessionHomePath` в provider adapters
1. [TODO] Расширить контракт `ProviderAdapter` так, чтобы Core мог передавать per-session HOME binding (минимум `sessionHomePath`, лучше `env` map). Обновить Core call sites на create/resume.
   Scope: `packages/core/src/provider-registry/index.ts` + `packages/core/src/remote-bridge/handlers/session-request-handler.ts` + `packages/core/src/provider-session-home/provider-session-home-facade.ts` (3 файла); ожидаемый commit message: `feat(core): thread sessionHomePath into provider adapter`
2. [TODO] Git Commit: `feat(core): thread sessionHomePath into provider adapter` (hash: TBD)

---

### Stream 7: Provider modules — per-session HOME (по одному провайдеру за раз)
1. [TODO] Codex: принять per-session HOME binding и использовать `CODEX_HOME=<sessionHomePath>` при create/resume.
   Scope: `packages/Codex_Module/src/provider/codex-provider-adapter.ts` + `packages/Codex_Module/src/sdk/codex-sdk-manager.ts` (2 файла); ожидаемый commit message: `feat(codex): support per-session CODEX_HOME`
2. [TODO] Git Commit: `feat(codex): support per-session CODEX_HOME` (hash: TBD)

3. [TODO] Claude: принять per-session HOME binding и использовать `HOME=<sessionHomePath>` (и provider-home разрешение по контракту).
   Scope: `packages/Claude_Module/src/provider/claude-provider-adapter.ts` + `packages/Claude_Module/src/session/session-manager.ts` (2 файла); ожидаемый commit message: `feat(claude): support per-session HOME binding`
4. [TODO] Git Commit: `feat(claude): support per-session HOME binding` (hash: TBD)

5. [TODO] Gemini: принять per-session HOME binding и использовать `GEMINI_CLI_HOME=<sessionHomePath>`.
   Scope: `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts` + `packages/Gemini_Module/src/provider/gemini-provider-adapter.test.ts` (2 файла); ожидаемый commit message: `feat(gemini): support per-session GEMINI_CLI_HOME`
6. [TODO] Git Commit: `feat(gemini): support per-session GEMINI_CLI_HOME` (hash: TBD)

---

### Stream 8: Core — turn lifecycle hooks (checkpoint + restore)
1. [TODO] На `completed_success`: вызывать `checkpointSuccess()` для текущей Session Node.
   Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts` + `packages/core/src/provider-session-home/provider-session-home-facade.ts` (2 файла); ожидаемый commit message: `feat(core): checkpoint session-home after successful turn`
2. [TODO] Git Commit: `feat(core): checkpoint session-home after successful turn` (hash: TBD)

3. [TODO] Manual retry: перед controlled replay делать `restoreLastGood()`.
   Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts` + `doc/SolidWorks-WorkFlow/CodeAI-Hub_Manual_Retry_RFC.md` (2 файла); ожидаемый commit message: `feat(core): restore session-home on manual retry`
4. [TODO] Git Commit: `feat(core): restore session-home on manual retry` (hash: TBD)

---

### Stream 9: Verification — таргетные сборки + manual сценарии
1. [TODO] Таргетные сборки: `npm test --workspace @codeai-hub/core` + `npm run build --workspace @codeai-hub/core` + провайдеры по очереди.
   Scope: packages `@codeai-hub/core`, `@codeai-hub/claude-module`, `@codeai-hub/codex-module`, `@codeai-hub/gemini-module`; ожидаемый commit message: `chore(build): verify per-session provider-home wiring`
2. [TODO] Git Commit: `chore(build): verify per-session provider-home wiring` (hash: TBD)
