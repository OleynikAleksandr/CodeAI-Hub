# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Claude_StopResume_And_LiveThinking_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Claude_StopResume_And_LiveThinking_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача должна затрагивать не более 3 файлов или 3 явно ограниченных script-managed scope buckets.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту задача начинает затрагивать больше 3 файлов, она должна быть немедленно дроблена, а этот файл переписан до продолжения работы.
- После каждого коммита сразу обновлять `doc/TODO/todo-plan.md`: статус, дата, hash.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполнять вручную перед закрытием затронутого Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`
- **Real-time документация:** любые изменения контрактов live thinking, translation ownership или provider failure routing должны попасть в релевантные SSOT-доки в этом же execution cycle.
- Финальный release-stream выполняется только на чистом дереве: сначала `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`.

## Phase 1 — Claude Stop/Resume hardening (owner: Claude, updated: 2026-04-16)

### Stream: Shutdown-safe interrupt handling
1. [DONE] Финализировать fix падения core после `Stop`: подавить late `aborted_streaming` errors после shutdown и прокинуть active provider errors через Claude adapter listener; scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/provider/claude-provider-adapter.ts`, `packages/Claude_Module/src/messaging/message-processor.test.ts`, `packages/Claude_Module/src/messaging/message-processor.stop.test.ts` (test split forced by 500-line architecture limit); expected commit message: `fix: harden claude stop interrupt handling`
2. [DONE] Git Commit: `fix: harden claude stop interrupt handling` (hash: `621c49436`)

## Phase 2 — Claude live thinking streaming (owner: Claude, updated: 2026-04-16)

### Stream: Delta ingestion and readable flush
3. [DONE] Поднять live ingestion `content_block_delta/thinking_delta` через отдельный buffer façade и начать выдавать readable thinking chunks до финального assembled block; scope: `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`, `packages/Claude_Module/src/messaging/claude-thinking-live-buffer.ts`, `packages/Claude_Module/src/messaging/claude-thinking-stream-handler.ts`, `packages/Claude_Module/src/messaging/claude-stream-event-router.test.ts` (handler split forced by 500-line architecture limit); expected commit message: `feat: stream claude thinking deltas`
4. [DONE] Git Commit: `feat: stream claude thinking deltas` (hash: `16571bfa8`)

### Stream: Finalization and dedupe
5. [DONE] Свести live delta path и финальный `message.content` thinking block без дублей: эмитить только unseen tail и очищать buffer на terminal boundaries; scope: `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`, `packages/Claude_Module/src/messaging/claude-thinking-stream-handler.ts` (handler exposes `consumeFinalThinking`), `packages/Claude_Module/src/messaging/claude-stream-event-router.test.ts`; expected commit message: `fix: dedupe finalized claude thinking`
6. [DONE] Git Commit: `fix: dedupe finalized claude thinking` (hash: `40b7679e4`)

## Phase 3 — SSOT synchronization (owner: Claude, updated: 2026-04-16)

### Stream: Claude thinking and translation contracts
7. [DONE] Синхронизировать SSOT под shutdown-safe Claude errors и source-first live thinking path с Core-owned translation overlays; scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit message: `docs: sync claude live thinking contracts`
8. [DONE] Git Commit: `docs: sync claude live thinking contracts` (hash: `eb6e1812f`)

## Phase 4 — Bugfix release for retest (owner: Claude, updated: 2026-04-16)

### Stream: Release notes preparation
9. [DONE] Подготовить user-facing release notes под bugfix release для `Claude Stop/Resume` и `Claude live thinking`; scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: prepare claude continuity bugfix release notes`
10. [DONE] Git Commit: `docs: prepare claude continuity bugfix release notes` (hash: `f4aea2684`)

### Stream: Script-managed release batch
11. [TODO] На чистом дереве выполнить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, зафиксировать version bump, provider bundles и release artifacts для пользовательского retest; scope: root version manifests, provider bundle outputs, `doc/tmp/releases/`; expected commit message: `chore: build claude continuity bugfix release`
12. [TODO] Git Commit: `chore: build claude continuity bugfix release` (hash: TBD)
