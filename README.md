# CodeAI Hub

CodeAI Hub is a Visual Studio Code extension + standalone Project Manager (CEF) that unifies multiple AI providers behind a single, type-safe orchestration layer.

**Current Release — v1.2.230** (Application Skeleton managed orchestration)

This release fixes the post-completion Diagram Modules return loop from
v1.2.228. After all Product Parts are accepted, Phase 2 now opens an
always-current `diagram-modules.user-return.revisionN.task1` with a
paired `Git Commit` instead of an idle no-commit anchor. User-requested
revisions, such as updating the `Project Manager` Product Part from an
external document, are now committed through the managed boundary and
the next revision task is opened immediately afterward.

The managed commit transaction and installed plan shim both have
regression coverage for the release-blocker path: final Product Part
commit creates `revision1`, committing that revision creates
`revision2`, and a dirty `product-parts/project-manager.md` change is
committed instead of being left as pending Core-owned dirty state.

**Previous release: v1.2.228** (Diagram Modules managed repair orchestration)

This release makes Diagram Modules managed-step orchestration durable
when Core rejects an agent turn. Core now injects a dedicated
`repairN` microtask pair before provider-visible correction feedback,
commits each repair attempt even if the artifact is still invalid, and
writes tracked attempt evidence under the workspace revision tree so
failed tries do not disappear into runtime state. Product Part commits
no longer count dirty repair artifacts as accepted Product Parts.

The post-completion Diagram Modules phase is now a persistent
`user-return` surface rather than a one-shot review commit. After all
Product Parts are accepted, the child plan remains open for future
user-requested revisions, while the workspace ledger separately unlocks
Application Skeleton. A deterministic forced-rejection integration test
covers the full path: invalid Product Part, repair task injection,
repair feedback, tracked evidence, managed commit, and clean temp
workspace.

**Previous release: v1.2.227** (handoff anchor regex fix for v1.2.226)

This release fixes the last missing pin of the Application Skeleton
phase orchestration: the Phase 4 handoff seed line in
`managed-todo-tree.ts` did not contain the literal `expected commit:`
substring (it only said "no commit required" inside the scope clause),
so the post-Stream-A `TASK_LINE_RE` could not match it. After Phase 3
materialize commit, advancement could not find the next task line and
fell into the fallback-insert branch, synthesizing a spurious
`phase3.materialize.task2` continuation pair with the same commit
message — visible as a duplicate Pin 7 in the user plan and a stuck
IN_PROGRESS continuation. The fix adds `expected commit: none —
reserved handoff anchor` inside the parenthetical scope clause of the
handoff seed line. After the fix, advancement after Phase 3 materialize
lands cleanly on `application-skeleton.handoff.task1` with
`expectedCommitMessage: null`; the workspace stage transition
(`recordWorkspaceCommit`) then switches `activeStage` to
`quality_gates` through the normal path. End-to-end Application
Skeleton orchestration (Phase 1 → 2 → 3 → 4 handoff → Quality Gates)
now completes cleanly.

**Previous release: v1.2.226** (acceptance callback wiring fix for v1.2.225)

This release closes the production wiring gap that left v1.2.225's
acceptance write-path unreachable at runtime. The Phase 24 writer +
runner were correctly implemented and unit-tested, but the typed-fallback
router's optional `handleManagedAcceptContractCommand` callback was
**never assigned** anywhere in production code — only the read site in
`session-request-handler-message-dispatch.ts` existed, leaving the
optional chain a silent no-op. As a result, typing "Контракт принимаю,
можешь продолжать" or "accepted" got intercepted by the recognizer,
logged as `Skipping managed contract acceptance phrase`, and dropped on
the floor. No runner, no map.json patch, no Phase 2 commit, no Phase 3
continuation. The fix adds the late-bound callback at the
`remote-bridge-bootstrap.ts` composition site (mirroring the existing
`onTurnCompleted` pattern), threads it through
`SessionRequestHandlerOptions` and the runtime deps interfaces, and
hands it to the `SessionRequestHandlerMessageDispatch` factory. The
end-to-end flow now executes as designed.

**Previous release: v1.2.225** (acceptance write-path fix for v1.2.224)

This release closes the last missing piece of the Phase 16 Option C
acceptance flow: the `accepted: true` write on
`application-skeleton-map.json`. Before v1.2.225, every acceptance entry
point (PM Accept Contract button via HTTP endpoint, typed-fallback
recognizer with broadened verbs, Core accept-contract handler decision)
only set the in-memory `recentlyAcceptedSessions` Set. Nobody patched
the map file. The Phase 3 continuation dispatcher (Stream 16D Option C)
gates on `progress.accepted === true` reading the file, so it never
fired. User-typed "accepted" was silently intercepted by the typed-
fallback router with no follow-up turn, no Phase 2 accept commit, and
no Phase 3 materialization prompt.

The fix introduces a single-owner writer module
(`application-skeleton-acceptance-writer.ts`) that patches the map file
to `accepted: true` (and `reviewState: "accepted"` for draft maps;
materialized maps preserve their `reviewState`). The Core accept-contract
runner calls it on `kind: "accepted"`, so both the PM button (via HTTP
endpoint) and the typed-fallback router funnel through the same writer.
The patched file becomes a dirty Application Skeleton-owned artifact;
the managed commit gate auto-commits `docs: accept application skeleton
contract` (Phase 2 commit); the next read-model snapshot reports
`progress.accepted === true`; the Phase 3 dispatcher fires the
materialization continuation prompt to the agent.

- SolidWorks-WorkFlow docs index: `doc/SolidWorks-WorkFlow/Docs_Index.md`
- System SSOT: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Session input lock SSOT: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Bug registry: `doc/BugRegistry.md`

## Current Installation Path

CodeAI Hub is already usable, but the current recommended installation path is still source-based.
If you want to try the product today, clone the repository, build the release artifacts locally, and install the generated VSIX into Visual Studio Code.

### Prerequisites
- Git
- `nvm`
- Node.js per the project `.nvmrc` (currently `22.17.0`) + `npm`
- Visual Studio Code
- `cmake` (required for the standalone CEF launcher / Project Manager build)
- the provider CLIs or SDK access you plan to use (`Claude`, `Codex`, `Gemini`) installed and authenticated separately

### Build from Source
```bash
git clone https://github.com/OleynikAleksandr/CodeAI-Hub.git
cd CodeAI-Hub
nvm install   # reads .nvmrc and installs the pinned Node version
nvm use
npm install
npm run setup:hooks
./scripts/build-all.sh
./scripts/build-release.sh --use-current-version
```

### Build Output
- VSIX package in the repository root: `codeai-hub-<version>.vsix`
- fresh runtime tarballs in:
  - `doc/tmp/releases/`
  - `~/.codeai-hub/releases/`

### Install into VS Code
Open Visual Studio Code and run `Extensions: Install from VSIX...`, then select the generated `codeai-hub-<version>.vsix`.

### Notes
- This is the current early-access path, not a polished one-click installer.
- The first full build can take a while because it prepares provider bundles, UI bundles, core runtime, and the standalone launcher.
- Provider CLIs / SDKs are not bundled inside this repository and must be available separately.

Before starting, read `doc/SolidWorks-WorkFlow/Docs_Index.md` and follow the SSOT contracts in `doc/SolidWorks-WorkFlow/Contracts/` (especially `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`) to configure provider CLIs and SDKs.

## Development Workflow
1. Install dependencies
   ```bash
   npm install
   npm run setup:hooks    # installs Husky git hooks
   ```
2. Implement changes in `src/` and `packages/**` (micro-classes + facades; keep files under 500 lines).
3. Run quality checks before committing:
   ```bash
   npm run quality        # architecture gate + Ultracite lint
   npm run check:knip     # detect unused files/exports
   npm run compile        # ensure TypeScript builds cleanly
   ```

## Public CI
- GitHub Actions now runs a minimal public CI baseline on every push to `main` and on every pull request.
- The workflow enforces the same root quality gates used as the local baseline: `npm run check:architecture`, `npm run lint`, `npm run check:knip`, and `npm run compile`.
- The root `compile` gate now builds `@codeai-hub/translation`, `@codeai-hub/localization`, and `@codeai-hub/core-supervisor` before browser/root type-check, so clean GitHub runners do not depend on pre-existing workspace `dist/` folders.
- Local Husky hooks remain the fastest feedback path; CI is the public verification surface, not a replacement for the local release ritual.

## Building a Release
```bash
./scripts/build-all.sh
./scripts/build-release.sh --use-current-version
```

## Repository Layout
```
media/                       Bundled webview assets (CSS + JS) shipped with the extension.
media/react-chat.js          React bundle generated by the webview build script.
src/extension.ts             VS Code extension entry point.
src/extension-module/        Extension host micro-classes (settings, bootstrap glue).
src/core/webview-module/     HTML scaffold that injects the webview assets.
src/client/project-manager/  Project Manager CEF UI surface (sidebar, sessions, settings).
src/client/ui/               Shared session UI bundle (used by both webview and PM shells).
src/types/                   Shared TypeScript types (provider, session, model registries).
packages/                    Workspace packages — provider modules and runtime services.
packages/Claude_Module/      Claude provider runtime (Agent SDK integration, session lifecycle).
packages/Codex_AppServer_Module/   Codex provider runtime (App Server JSON-RPC, app-server process).
packages/Gemini_Module/      Gemini provider runtime (CLI core integration).
packages/core/               Core orchestrator (turn lifecycle, continuity, remote bridge).
packages/core-supervisor/    Runtime supervisor (Core process management).
packages/cef-launcher/       Standalone CEF Launcher (native macOS/Windows/Linux client for PM).
packages/ui/                 Project Manager UI styles + bundled assets.
packages/translation/        Shared runtime translation engine.
packages/localization/       Bundled English source dictionaries + glossary + lookup primitives.
packages/unified-session/    Shared session contract used across packages.
scripts/                     Quality, build, and release automation (build-all.sh, build-release.sh, etc.).
doc/                         Architecture SSOT, planning docs, sessions log, knowledge base.
doc/SolidWorks-WorkFlow/     Canonical SSOT tree (System / Clusters / Modules / Contracts / DesignSystem / Plans).
doc/tmp/releases/            Locally staged release tarballs after build-all.sh.
```

## License
This repository is currently distributed as `UNLICENSED`. Source is visible for audit and development collaboration, but redistribution requires explicit permission from the repository owner.
