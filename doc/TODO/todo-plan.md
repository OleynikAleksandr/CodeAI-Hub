# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Claude_LiveText_And_Thinking_Visibility_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Claude_LiveText_And_Thinking_Visibility_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача должна затрагивать не более 3 файлов (architectural splits из 500-line rule документируются в scope явно).
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждого коммита сразу обновлять `doc/TODO/todo-plan.md`: статус, дата, hash.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполнять вручную перед закрытием затронутого Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Real-time документация:** любые изменения контрактов live streaming, thinking display и effort levels должны попасть в SSOT в этом же execution cycle.
- Финальный release-stream выполняется только на чистом дереве: сначала `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`.

## Phase 1 — Live text ingestion (owner: Claude, updated: 2026-04-16)

### Stream: Text buffer + content stream handler
1. [DONE] Создать `ClaudeTextLiveBuffer` по аналогии с `ClaudeThinkingLiveBuffer` (per-session accumulator, flush-threshold ~80-120 chars, sentence boundary) и regression test для `appendDelta` / `flushRemaining` / `consumeFinal`; scope: `packages/Claude_Module/src/messaging/claude-text-live-buffer.ts`, `packages/Claude_Module/src/messaging/claude-text-live-buffer.test.ts`; expected commit message: `feat: add claude text live buffer`
2. [DONE] Git Commit: `feat: add claude text live buffer` (hash: `506d80ec3`)
3. [DONE] Расширить handler: переименовать `ClaudeThinkingStreamHandler` → `ClaudeContentStreamHandler`, добавить `handleTextBlockStart/Delta/Stop` рядом с thinking-путём, и `consumeFinalText(sessionKey, finalText)`; scope: `packages/Claude_Module/src/messaging/claude-content-stream-handler.ts` (rename from thinking-stream-handler), `packages/Claude_Module/src/messaging/claude-stream-event-router.ts` (wire new handler), `packages/Claude_Module/src/messaging/claude-stream-event-router.test.ts`, `packages/Claude_Module/src/messaging/claude-stream-event-router.live-text.test.ts` (new split forced by 500-line architecture limit), `packages/Claude_Module/src/messaging/claude-thinking-dialog-emitter.ts` (adds `emitClaudeAssistantLiveText` helper); expected commit message: `feat: stream claude text deltas`
4. [DONE] Git Commit: `feat: stream claude text deltas` (hash: `5b1e307eb`)

### Stream: Finalization dedupe for text
5. [DONE] В `handleAssistantMessageInternal` прогонять assembled text через `consumeFinalText`: если весь текст уже materialized через live path — skip pending; если есть tail и live path был — эмитить tail как live-bubble (suffix `text_final_tail`); если live path не было — оставить legacy pending translation path. Structured output helpers вынесены в отдельный файл чтобы удержать router под 500-line rule; scope: `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`, `packages/Claude_Module/src/messaging/claude-structured-output-helpers.ts` (new split, forced by 500-line rule), `packages/Claude_Module/src/messaging/claude-stream-event-router.live-text.test.ts` (un-skip 3 tests: superset / no-live / divergent); expected commit message: `fix: dedupe finalized claude assistant text`
6. [DONE] Git Commit: `fix: dedupe finalized claude assistant text` (hash: `4d3b8e9db`)

## Phase 2 — Thinking display switch (owner: Claude, updated: 2026-04-16)

### Stream: thinking.display = summarized
7. [DONE] В `resolveThinkingOptions` / `buildQueryOptions` добавить `display: "summarized"` к `thinking: { type: "adaptive" }` при включённом thinking; расширить `ClaudeQueryOptions` и union effort типы поддержкой `xhigh` (plumbed through для будущих фаз); scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`; expected commit message: `fix: enable summarized thinking display for claude`
8. [DONE] Git Commit: `fix: enable summarized thinking display for claude` (hash: `44293929c`)

## Phase 3 — xhigh effort end-to-end (owner: Claude, updated: 2026-04-16)

### Stream: Core resolver + types
9. [DONE] Добавить `"xhigh"` в Core `CLAUDE_THINKING_EFFORTS` Set + union, расширить LEGACY token anchor table (20000 между high=10000 и max=32000), добавить descriptor в `CLAUDE_THINKING_EFFORTS` registry в `src/types/claude-model-registry.ts`; scope: `packages/core/src/config/provider-defaults-resolver.ts`, `src/types/claude-model-registry.ts`; expected commit message: `feat: accept xhigh claude reasoning effort`
10. [DONE] Git Commit: `feat: accept xhigh claude reasoning effort` (hash: `9b0e7f187`)

### Stream: Settings UI — xhigh option
11. [DONE] UI селектор автоматически подхватил новый descriptor; добавлен label resolver `"xhigh"` → `"x-High"` и approved-dict записи в `ui_helper_text.json`; scope: `src/client/ui/src/components/settings/thinking/thinking-effort-selector.tsx`, `assets/localization/source/en/ui_helper_text.json`; expected commit message: `feat: surface xhigh effort in claude settings`
12. [DONE] Git Commit: `feat: surface xhigh effort in claude settings` (hash: `67bc3e162`)

## Phase 4 — Drop version numbers from Claude model aliases (owner: Claude, updated: 2026-04-16)

### Stream: Registry displayName cleanup
13. [DONE] Снять числовую версию из `CLAUDE_MODEL_ALIASES[].displayName` (Sonnet 4.5 → Sonnet, Opus 4.5 → Opus, Haiku 4.5 → Haiku); описания обновлены под auto-resolve SDK; `claude-default-model-card.tsx` рендерит `displayName` напрямую — подхвачено без правок; Haiku translation-engine label в `localization-settings-card.tsx` оставлен интактным (это engine id, не alias); scope: `src/types/claude-model-registry.ts`; expected commit message: `chore: remove version numbers from claude model labels`
14. [DONE] Git Commit: `chore: remove version numbers from claude model labels` (hash: `7cdab45a9`)

## Phase 5 — SSOT synchronization (owner: Claude, updated: 2026-04-16)

### Stream: Claude live content and effort contracts
15. [TODO] Обновить `Modules/Claude.md` и `System/SystemArchitecture.md`: live text ingestion invariant, thinking.display=summarized default, xhigh effort уровень, alias-only model labels; scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md` (если изменяется overlay contract для text bubbles); expected commit message: `docs: sync claude live text and effort ssot`
16. [TODO] Git Commit: `docs: sync claude live text and effort ssot` (hash: TBD)

## Phase 6 — Release build (owner: Claude, updated: 2026-04-16)

### Stream: Release notes
17. [TODO] Pre-bump README `Current Release` и CHANGELOG под upcoming version (1.1.998); scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: prepare claude live text release notes`
18. [TODO] Git Commit: `docs: prepare claude live text release notes` (hash: TBD)

### Stream: Script-managed release batch
19. [TODO] На чистом дереве выполнить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, зафиксировать version bump, provider bundles и release artifacts; scope: root version manifests, provider bundle outputs, `doc/tmp/releases/`; expected commit message: `chore: build 1.1.998 release assets`
20. [TODO] Git Commit: `chore: build 1.1.998 release assets` (hash: TBD)
