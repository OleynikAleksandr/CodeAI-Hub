# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ClaudeLiveText_DialogBubbleMerge.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/ClaudeLiveText_DialogBubbleMerge.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (§Invariant 25)
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
- Only this list is the source of documents for restoring context in this execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **Gates** запускаются автоматически через Husky hooks (`pre-commit`, `pre-push`). Ручной прогон не нужен, только для диагностики.
- **Таргетные сборки:** `npm run build --workspace packages/Claude_Module`, `npm run build:webview`, `npm run typecheck:webview` — выполнять перед закрытием Stream/Phase по факту изменения пакета.
- **Commit после каждой микрозадачи.** В `todo-plan.md` статус и hash обновляются тут же, в том же шаге что и commit.
- **Phase завершается** на чистом дереве.
- **Real-time Документация:** любое изменение архитектуры/логики требует синхронного обновления `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` **ДО** коммита — чтобы изменённая документация попала в тот же commit.

---

## Phase 1 — UI-side merge for consecutive live assistant messages (owner: Codex, updated: 2026-04-16)

### Stream 1.1 — Provider-side tag on live bubbles
1. [TODO] Add `tag: "live"` to `emitClaudeAssistantLiveText` output in `packages/Claude_Module/src/messaging/claude-thinking-dialog-emitter.ts`; extend existing emitter tests in `packages/Claude_Module/src/messaging/*.test.ts` to assert the tag is present on live emits. Scope: 2 files.
2. [TODO] Git Commit: `feat: tag claude live assistant bubbles for ui merge` (hash: TBD)

### Stream 1.2 — UI merge function and unit tests
1. [TODO] Add `mergeLiveAssistantMessages` in `src/client/ui/src/session/dialog-panel-message-utils.ts` (predicate `role === "assistant" && tag === "live"`, newline-join content/localizedContent, preserve first bubble id); unit tests in `src/client/ui/src/session/dialog-panel-message-utils.test.ts` covering: (a) consecutive live merge, (b) non-live assistant breaks group, (c) thinking between live breaks group, (d) localizedContent assembles with partial translation. Scope: 2 files.
2. [TODO] Git Commit: `feat: merge consecutive claude live assistant bubbles` (hash: TBD)

### Stream 1.3 — Wire merge pass in DialogPanel
1. [TODO] In `src/client/ui/src/session/dialog-panel.tsx`, pipe `mergeLiveAssistantMessages` after `mergeThinkingMessages` in `displayMessages` memo; add smoke render test in `src/client/ui/src/session/virtual-conversation.test.tsx` (or new targeted test) verifying the combined pass produces one card for consecutive live fragments. Scope: 2 files.
2. [TODO] Git Commit: `feat: apply live assistant merge pass in dialog panel` (hash: TBD)

### Stream 1.4 — SSOT sync
1. [TODO] Extend Invariant 25 in `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` with one line: live assistant bubbles carry `tag: "live"` and are merged UI-side by `mergeLiveAssistantMessages` symmetric to `mergeThinkingMessages`; update `doc/SolidWorks-WorkFlow/Modules/Claude.md` with the same note in the dialog-emitter section. Scope: 2 files.
2. [TODO] Git Commit: `docs: sync ssot for claude live bubble merge` (hash: TBD)

---

## Phase 2 — Release 1.1.999 (owner: Codex, updated: 2026-04-16)

### Stream 2.1 — Pre-build version sync
1. [TODO] Update `README.md` ("Current Release — v1.1.999") and `CHANGELOG.md` (add `## [1.1.999]` entry covering the live bubble merge fix). Scope: 2 files.
2. [TODO] Git Commit: `docs: prepare 1.1.999 release notes` (hash: TBD)

### Stream 2.2 — Build artifacts
1. [TODO] Run `./scripts/build-all.sh` from repo root. Script bumps versions and rebuilds Claude/Codex/Gemini/core/CEF launcher/UI and produces tarballs in `~/.codeai-hub/releases` + `doc/tmp/releases/`. On failure, fix and re-run `build-all.sh` only. Scope: no manual file edits (script owns version bumps).
2. [TODO] Git Commit: `chore: build 1.1.999 release assets` (hash: TBD — auto-created by build-all.sh if dirty tree)
3. [TODO] Run `./scripts/build-release.sh --use-current-version` on clean tree. Verify `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`. Grab `codeai-hub-1.1.999.vsix`. Scope: no file edits (script-driven).

### Stream 2.3 — Closeout
1. [TODO] Archive completed todo-plan as `doc/TODO/Archive/todo-plan-phase2.md`; create fresh empty `doc/TODO/todo-plan.md`; write `doc/Sessions/Session038.md` as Type A Completion Report referencing all commits of this cycle; audit `doc/SolidWorks-WorkFlow/Plans/ClaudeLiveText_DialogBubbleMerge.md` and either move to `Plans/Archive/` or delete per CLAUDE.md §4 rules; update `doc/SolidWorks-WorkFlow/Docs_Index.md` if plan-doc location changed. Scope: 3 files.
2. [TODO] Git Commit: `docs: archive claude live bubble merge execution scope` (hash: TBD)
