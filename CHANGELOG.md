# Changelog

This project evolves quickly during active FLOW development. We keep the changelog intentionally short and treat the code + docs as the primary source of truth.

## [Unreleased]

## [1.2.196] - 2026-05-08
### Fixed
- **Core acceptance feedback is now repair-aware.** Identical validation failures are deduped only on the same workspace commit; after an agent repair commit, the same remaining blocker is sent back to the owning managed stage session again.
- **Managed stage feedback now includes diagnostic check context.** Diagram Modules, Application Skeleton, and Quality Gates feedback reports what Core checked, observed counters/lifecycle flags, and the specific failed part/path/gate.
- **The feedback contract now documents retry semantics.** Managed lifecycle docs require repeated feedback after failed repair attempts instead of leaving agents silent behind a locked downstream stage.

### Tests
- **Targeted regression coverage verifies repeated feedback after repair commits and diagnostic messages for all managed acceptance stages.**

## [1.2.195] - 2026-05-08
### Fixed
- **Quality Gates aggregate hook wiring now unlocks Development Tree correctly.** Core accepts `qg:before-commit` and `qg:before-push` when those scripts dispatch the corresponding required gate arrays from `quality-gates.json`.
- **Quality Gates agent instructions now match runtime acceptance.** Phase 2 must preserve Core lifecycle commands and wire `.husky/pre-commit` / `.husky/pre-push` before reporting `integrated: true`.
- **Live retest workspace validation now reaches Development Tree unlock.** The aggregate hook repair path evaluates to `qualityGatesProgress.integrated: true` and `developmentTreeBootstrapGate.unlocked: true`.

### Tests
- **Targeted regression coverage verifies aggregate hook acceptance, bundled Quality Gates prompt sync, and Development Tree bootstrap gating.**

## [1.2.194] - 2026-05-08
### Fixed
- **Managed acceptance failures are now returned to the owning agent session.** Core sends actionable repair feedback to Diagram Modules, Application Skeleton, and Quality Gates sessions when runtime validation rejects an agent commit.
- **Development Tree progression stays locked until real stage state passes Core validation.** Downstream workflow stages no longer rely on a single accepted/integrated flag when required materialized artifacts, hook wiring, or lifecycle evidence are missing.
- **Quality Gates feedback now explains the missing work.** If baseline gates are not actually wired into managed lifecycle hooks, Core reports the failed acceptance check back to the Quality Gates agent.

### Tests
- **Targeted regression coverage verifies Core feedback parity for Diagram Modules, Application Skeleton, and Quality Gates.**

## [1.2.193] - 2026-05-07
### Fixed
- **Application Skeleton can unlock Quality Gates from the materialized JSON map.** Core now treats `application-skeleton-map.json` as the machine lifecycle source and no longer requires `application-skeleton.md` to duplicate lifecycle fields verbatim when the Markdown is a narrative artifact.
- **Stale/draft Markdown contradictions are still rejected.** If `application-skeleton.md` explicitly says draft, unaccepted, or not materialized, the handoff remains blocked.

### Tests
- **Targeted regression coverage verifies narrative materialized Markdown unlocks Quality Gates while stale Markdown and stale JSON still fail.**

## [1.2.192] - 2026-05-07
### Fixed
- **Quality Gates integration now requires lifecycle hook wiring.** A `quality-gates.json` contract with `integrated: true` is treated as failed until every `requiredBeforeCommit` gate is present in `.husky/pre-commit` and every `requiredBeforePush` gate is present in `.husky/pre-push`.
- **Development Tree bootstrap now starts after accepted Quality Gates integration.** Workflow state reads trigger materialized Development Tree folders, draft templates, and node sessions once Application Skeleton and Quality Gates commits are accepted.
- **Development Tree bootstrap avoids duplicate sessions.** Existing unchanged draft files suppress repeated node-session creation after a Core restart or repeated state read.

### Tests
- **Targeted regression coverage verifies Quality Gates hook enforcement, Development Tree bootstrap side effects, bootstrap gate locking, and repeat-read duplicate protection.**

## [1.2.191] - 2026-05-07
### Fixed
- **Plan orchestrator runtime guardrails now fail loudly instead of silently closing or hanging managed workflow work.** Orphan `IN_PROGRESS` tasks are rejected, implicit terminal closeout requires an explicit anchor, and failed plan commands print deterministic repair guidance.
- **Core now blocks managed workflow progression on active plan debt or blocked plan state.** Downstream stage unlocks wait until `plan:repair`/plan validation recover the lifecycle instead of proceeding over an unfinished transaction.
- **Application Skeleton completion accepts the agent's lifecycle Markdown table format.** Materialized skeleton output can unlock Quality Gates when declared files exist.
- **Codex workflow turns default to non-interactive full access.** Core and AppServer defaults avoid invisible permission prompts during managed Git/filesystem work.

### Tests
- **Targeted regression coverage verifies orchestrator validation, recovery repair, managed workspace blockers, Codex permissions, and Application Skeleton to Quality Gates unlock behavior.**

## [1.2.190] - 2026-05-07
### Fixed
- **Project Manager now stays behind a startup readiness gate while Core/provider bootstrap is still running.** Workspace actions and Settings are blocked until Core HTTP readiness is available.
- **Codex workflow sessions now use full managed workspace access for ordinary workflow/documentation turns.** Managed stages can write artifacts and complete required `plan:commit` Git lifecycle operations instead of hanging on invisible permission escalation.
- **Gemini workflow sessions now keep explicit `yolo` approval flags.** Runtime flags are no longer downgraded by persisted settings, avoiding hidden approval prompts during managed workflow work.

### Tests
- **Provider permission coverage now checks Codex thread start, Core Codex defaults, and Gemini bridge approval behavior.** Targeted builds and node tests cover the affected provider paths before packaging.

## [1.2.189] - 2026-05-07
### Fixed
- **Codex workflow sessions now default to writable workspace mode.** Fresh clean-cache Description sessions no longer depend on Codex provider defaults that can resolve to `read-only` and block `Final_Description.md` materialization.

### Tests
- **Workflow sandbox defaults are covered for both Core adapter construction and Codex thread start.** Regression coverage verifies the empty-env/default path uses `workspace-write` while explicit sandbox settings remain respected.

## [1.2.188] - 2026-05-07
### Fixed
- **Post-clean-cache rebuild of the provider startup ready-gate release.** Rebuilds the current provider startup gate package after the local CodeAI Hub runtime cache was fully cleared, producing fresh provider, Core, UI, launcher, and VSIX artifacts under a new version.

## [1.2.187] - 2026-05-07
### Fixed
- **Clean rebuild of the provider startup ready-gate release.** Rebuilds the v1.2.186 provider startup gate changes under a fresh version after the previous package was built while live testing was still running.

### Process
- **Release builds now require explicit user confirmation after fixes are ready.** Future fix streams should stop at implementation/verification unless the user explicitly asks to build the next release.

## [1.2.186] - 2026-05-07
### Fixed
- **Project Manager now waits for provider startup readiness before accepting sessions.** Core completes provider auto-update and provider initialization before opening the RemoteBridge, preventing Description from starting Codex while the Codex CLI is still being installed.
- **Codex startup no longer races provider auto-update.** The `spawn codex ENOENT` path seen during v1.2.185 startup is blocked by the new startup order.

### Tests
- **Provider startup ready-gate coverage locks the startup order.** Targeted tests verify Core starts RemoteBridge only after auto-update and provider initialization, and that Codex CLI auto-update is awaited before startup completes.

## [1.2.185] - 2026-05-07
### Fixed
- **Filesystem workflow stages now start with committed draft contracts.** Fresh Application Skeleton and Quality Gates child plans split draft/contract checkpoints from materialization/integration, so long user review loops no longer collapse into one oversized commit.
- **Application Skeleton and Quality Gates prompts now require draft commits before destructive work.** Agents must commit canonical draft artifacts, verify clean Git, and only then proceed to materialization or gate script/package integration after user acceptance.
- **Development Tree unlock now requires managed transaction evidence.** Core checks accepted Application Skeleton materialization and Quality Gates integration commits in `doc/TODO/workspace.plan.md`, plus advanced child plans and clean Git.
- **Workflow-state reads no longer create Development Tree draft files as a side effect.** Read-only snapshots do not materialize downstream drafts while the Quality Gates agent is finishing.

### Tests
- **Managed draft lifecycle coverage verifies split child plans, prompt wording, transaction gates, and side-effect isolation.** Targeted tests cover generated `plan-cli.mjs` stage advancement, bundled templates, Development Tree gate evidence, and read-only snapshot behavior.

## [1.2.184] - 2026-05-07
### Fixed
- **Development Tree now waits for a committed Quality Gates transaction.** Dirty `quality-gates.json` content with `integrated: true` no longer unlocks downstream work unless `doc/TODO/workspace.plan.md` records an accepted `quality_gates` commit, the Quality Gates child plan advanced past the integration task, and Git is clean.
- **Quality Gates prompt now requires the managed commit before final integrated/unlocked status.** Phase 2 instructs the agent to run `npm run plan:commit -- "feat: integrate quality gates baseline"`, verify `npm run plan:status`, and confirm `git status --short` is empty before it can report the root gate as complete.

### Tests
- **Transaction-gate coverage reproduces the v1.2.183 retest failure.** Core tests now keep Development Tree locked when Quality Gates artifacts are dirty/integrated but not committed, and unlock only after managed ledger evidence plus clean Git.

## [1.2.183] - 2026-05-07
### Fixed
- **Core now owns managed stage handoff before each filesystem agent starts.** Application Skeleton and Quality Gates launches switch `doc/TODO/workspace.plan.md` to the correct active stage/child plan before the first provider prompt, while prompts explicitly stop on Core preflight mismatch instead of repairing lifecycle files by hand.
- **Application Skeleton completion now accepts the canonical map identifier contract.** Materialized maps with stable `id` fields for Product Parts, Clusters, and Modules can unlock Quality Gates, while validation errors stay distinct from missing-artifact failures.
- **Malformed managed workflow state no longer masks existing artifacts.** A damaged `.codeai-hub/<workspace>/workflow/state.json` is ignored during workflow-state reads so filesystem evidence still reports materialized skeleton progress and Quality Gates availability.

### Tests
- **Managed handoff, completion-gate, and malformed-state behavior are covered by targeted Core tests.** Coverage verifies stage-correct child plan routing, prompt-boundary wording, canonical skeleton materialization, Quality Gates unlock behavior, and recovery from bad workflow state JSON.

## [1.2.182] - 2026-05-07
### Fixed
- **Managed workspace Core ledger now records accepted stage commits.** Generated `npm run plan:commit` advances the active child plan, commits the agent artifacts, records the accepted commit hash/message/task in `doc/TODO/workspace.plan.md`, and creates a separate Core ledger commit so the workspace stays clean.
- **Session-create coverage now matches the managed TODO tree contract.** Diagram Modules and Application Skeleton activation checks assert `doc/TODO/workspace.plan.md` plus the active child plan under `doc/TODO/stages/<stage>/todo-plan.md`, and reject root `doc/TODO/todo-plan.md`.

### Tests
- **Managed workspace ledger behavior is covered by targeted Core tests.** Coverage verifies root plan absence, active child-plan status, workspace ledger accepted-commit entries, clean Git status after `plan:commit`, and synced managed-stage prompts.

## [1.2.181] - 2026-05-07
### Fixed
- **Managed user workspaces now use the per-stage child TODO plan as the active agent ledger.** Fresh Diagram Modules workspaces no longer create root `doc/TODO/todo-plan.md`; generated `npm run plan:*` reads `doc/TODO/workspace.plan.md` and advances the active child plan from `activePlanPath`.
- **Filesystem-stage prompts now point agents at the managed child plan.** Diagram Modules, Application Skeleton, and Quality Gates wording now references `workspace.plan.md` plus `doc/TODO/stages/<stage>/todo-plan.md` instead of the removed root plan path.
- **Managed lifecycle metadata exposes the workspace plan path.** Core validators, manifest path metadata, and Project Manager lifecycle payloads now report `doc/TODO/workspace.plan.md` as the recovery ledger.

### Tests
- **Child-plan behavior is protected by targeted Core and template tests.** Coverage verifies fresh managed workspaces do not create the root plan, `plan:status` and `plan:commit` operate on the active child plan, bundled prompts stay synced, and adoption/reconciler validation remains green.

## [1.2.180] - 2026-05-07
### Added
- **Managed workspace planning now has a Core-owned master TODO tree.** Fresh managed workspaces create `doc/TODO/workspace.plan.md` plus per-stage child plans under `doc/TODO/stages/<stage>/todo-plan.md`, while preserving the existing active-stage `npm run plan:*` compatibility path.

### Fixed
- **Diagram Modules layout sidecars no longer dirty managed Git.** Core ignores `.codeai-hub/*/diagram_modules/module-map.flow.json`, so UI/runtime graph layout state stays out of agent artifact commits.

### Tests
- **Managed TODO tree and sidecar handling are covered by targeted Core tests.** Bootstrapper, reconciler, plan-installer, and workflow-session managed workspace checks verify the new plan tree, idempotent ignore entries, and pre-provider lifecycle setup.

## [1.2.179] - 2026-05-07
### Fixed
- **Managed workspace runtime state no longer dirties project Git.** Core ignores live continuity chains and workflow runtime state under `.codeai-hub/*/`, while keeping durable lifecycle artifacts tracked.
- **Managed `plan:commit` now advances the active plan inside the artifact commit.** The generated plan shim updates `doc/TODO/todo-plan.md`, stages it, and commits it with the agent-created artifacts so Diagram Modules can continue from a clean tree.

### Tests
- **Managed lifecycle coverage now checks ignored runtime state and clean post-commit plan advancement.** Targeted tests verify adoption commits skip live runtime files and the generated plan shim leaves a temporary workspace clean after `npm run plan:commit`.

## [1.2.178] - 2026-05-07
### Fixed
- **Managed workspace lifecycle now creates its first commit at Diagram Modules.** Core commits the lifecycle baseline and accepted upstream evidence before the first `Diagram Modules` provider turn, so later `Application Skeleton` sessions start from a clean Git tree instead of inheriting uncommitted setup files.
- **Diagram Modules prompt now follows the managed commit flow.** The agent is told to read `doc/TODO/todo-plan.md`, use the Core-created clean baseline, keep upstream stages read-only, and commit its own staged artifacts through `npm run plan:commit`.

### Tests
- **Session-create coverage verifies the real managed entrypoint.** Targeted tests assert that `Diagram Modules` receives `.git`, hooks, plan scripts, tracked upstream evidence, an initial adoption commit, and a clean `git status` before provider session creation.

## [1.2.177] - 2026-05-07
### Fixed
- **Managed workspace bootstrap now activates the generated Husky hooks.** Core configures `core.hooksPath=.husky` during managed preflight, so normal `git commit` and `git push` run the managed `pre-commit`, `commit-msg`, `post-commit`, and `pre-push` scripts.
- **Managed workspace `.gitignore` now ignores `.DS_Store`.** Fresh project workspaces no longer show macOS metadata files as untracked lifecycle noise.

### Tests
- **Bootstrapper coverage verifies hook-path configuration and ignore baseline.** Targeted tests assert `git config core.hooksPath .husky`, `.DS_Store`, managed runtime/cache/log ignores, and idempotency.

## [1.2.176] - 2026-05-07
### Fixed
- **Managed workspace plans now parse fenced JSON state reliably.** The generated plan CLI strips Markdown fences before reading `codeai-plan-state`, so fresh managed workspaces can run `npm run plan:status`.
- **Filesystem-aware workflow stages now seed the correct expected commit.** `Application Skeleton` starts with `feat: materialize application skeleton`, and `Quality Gates` starts with `feat: integrate quality gates baseline`.
- **Application Skeleton now commits materialized scaffold output.** The prompt and contract require tracked `README.md` placeholders for Product Part / Cluster / Module directories and a managed `plan:commit` before the final materialization response.

### Tests
- **Managed lifecycle hotfix coverage now spans parser, stage seed, session create, and Application Skeleton templates.** Targeted tests verify generated plan status, real session bootstrap, stage-aware initial plans, synced bundled templates, and `@codeai-hub/core` build.

## [1.2.175] - 2026-05-07
### Fixed
- **Application Skeleton activation now bootstraps the managed workspace from the real Project Manager session path.** The generic `session:create` route runs the same Git/hooks/plan preflight as workflow gateway sessions before creating `Application Skeleton` or `Quality Gates` provider sessions.

### Tests
- **Session-create coverage now verifies the managed baseline in a real temporary workspace.** The regression asserts `.git`, `.husky/pre-commit`, `doc/TODO/todo-plan.md`, `scripts/plan-orchestrator/plan-cli.mjs`, and `.codeai-hub/workflow` exist before the provider session is created.

## [1.2.174] - 2026-05-07
### Fixed
- **Managed workspace baseline is now reconciled before every filesystem-aware workflow stage.** Core runs the Git/hooks/plan preflight before `Diagram Modules`, `Application Skeleton`, and `Quality Gates`, so older or drifted sessions cannot skip `doc/TODO/todo-plan.md`, plan scripts, hooks, and `.codeai-hub/workflow`.
- **Upstream read-only panels now use localized Project Manager copy.** `Description` and `Virtual Simulation` both replace editable sessions with the same localization-backed read-only panel after the managed lifecycle starts.

### Tests
- **Managed lifecycle activation coverage now includes Application Skeleton and Quality Gates.** Targeted tests verify provider sessions are not created before managed workspace preflight for the technical stages, plus the localized upstream read-only panel coverage.

## [1.2.173] - 2026-05-07
### Added
- **Managed workspace lifecycle now starts at Diagram Modules.** Core bootstraps the project repo, `.codeai-hub/workflow` ledger, `doc/TODO/todo-plan.md`, plan scripts, and managed hook baseline before filesystem-aware workflow stages begin.
- **Workflow revision tracking now supports downstream migration planning.** Accepted Diagram Modules, Application Skeleton, and Quality Gates artifacts can be snapshotted, diffed, and converted into downstream migration tasks without mutating project files automatically.

### Fixed
- **Upstream stages become read-only after Diagram Modules starts.** Description and Virtual Simulation history remains viewable, but new editing turns are blocked once the managed lifecycle is active.
- **Application Skeleton and Quality Gates prompts now assume Core-owned lifecycle controls.** Agents receive concise instructions to use the managed repo and plan state instead of creating git, hooks, lifecycle ledgers, or separate handoff sessions.

### Tests
- **Managed lifecycle regression coverage now spans Core, prompt, and Project Manager behavior.** Targeted tests cover bootstrap/reconciliation, hook manifest validation, revision diff planning, managed rollover recovery, upstream read-only gating, and prompt wording.

## [1.2.172] - 2026-05-07
### Fixed
- **Quality Gates Baseline no longer hardcodes JavaScript-specific tools as universal policy.** The first prompt now keeps universal architecture gates, including the `<= 500` source file/class rule, while requiring stack-specific tool selection from user preference, project evidence, or research.
- **Quality Gates integration stays in the same session.** Final integration wording now reports whether the Quality Gates root gate is integrated/unlocked instead of asking about separate Development Tree sessions.

### Tests
- **Quality Gates contract validation now rejects array-shaped `commands`.** Targeted coverage keeps `quality-gates.json` on the command-map contract and verifies the stack-neutral prompt constraints.

## [1.2.171] - 2026-05-07
### Fixed
- **Quality Gates Baseline now starts from a compact two-phase prompt.** The bundled prompt and contract separate draft artifacts from post-acceptance file-system integration, persist user-selected tooling such as Ultracite and Knip into `quality-gates.md` / `quality-gates.json`, and avoid duplicate runtime phase instructions.

### Tests
- **Quality Gates prompt and contract consistency are covered by targeted checks.** Core tests verify synced bundled templates, the compact integration-aware prompt surface, and stricter `quality-gates.json` validation for advisory, planned, and not-integrated gates.

## [1.2.170] - 2026-05-06
### Fixed
- **Application Skeleton validation now requires canonical identifier fields.** Materialized maps must use `partId` for Product Parts, `clusterId` for Clusters, and `moduleId` for clustered and standalone Modules, so generic `id` fields cannot silently pass the runtime gate.

### Tests
- **Application Skeleton materialization validator coverage now catches missing canonical identifiers.** A focused regression verifies that materialized maps with missing `partId`, `clusterId`, or `moduleId` stay invalid.

## [1.2.169] - 2026-05-06
### Fixed
- **Application Skeleton validation now checks standalone module paths.** Product Part-level `standaloneModules` are included in materialization validation, so missing standalone folders cannot unlock Quality Gates accidentally.

### Tests
- **Application Skeleton progress coverage now includes missing standalone module directories.** The targeted regression keeps the stage failed when a materialized map declares a standalone module path that does not exist.

## [1.2.168] - 2026-05-06
### Fixed
- **Application Skeleton now has a runtime validation gate for materialized artifacts.** Core treats the filesystem skeleton as part of the stage artifact surface and blocks Quality Gates when Markdown, JSON, or declared paths disagree after materialization is observed.
- **Application Skeleton materialization is detected from filesystem facts, not only agent-declared JSON state.** Existing `product-parts`, declared `codePath`, and `materializedPaths` now force materialized-state validation even if the agent forgets to update lifecycle fields.
- **Automation-first is now a standing agent rule.** Repeatable, formally checkable workflow issues should be solved with scripts, validators, hooks, or gates before relying on prompt wording alone.

### Tests
- **Application Skeleton progress coverage now includes stale Markdown, stale JSON, and missing path failures.** Targeted tests keep Quality Gates locked until the canonical artifacts and filesystem are consistent.

## [1.2.167] - 2026-05-06
### Fixed
- **Application Skeleton now treats upstream technology hints as strong baseline evidence.** Named shells, launchers, runtimes, frameworks, package formats, and deployment targets from prior artifacts must be used in the recommended baseline or explicitly rejected with rationale.
- **Application Skeleton keeps `product-parts` as the default source root.** The prompt and contract now require `sourceRoot: "product-parts"` unless the user explicitly accepts another production root.
- **Application Skeleton final responses are language-aware.** Draft and materialization completion messages now describe the required state transition in the chat language instead of emitting fixed English template text.

### Tests
- **Bundled template coverage protects technology inference and source-root defaults.** The targeted Application Skeleton template test now asserts upstream technology hint handling, localized final-response semantics, and the `product-parts` source root rule.

## [1.2.166] - 2026-05-06
### Fixed
- **Application Skeleton first-turn instructions are now shorter and more directive.** The bundled prompt keeps the universal draft/materialization lifecycle, Development Tree filesystem mirror, and user stack-decision handling while removing duplicated guidance that made the first prompt noisier.
- **Application Skeleton post-materialization cleanup is stricter.** The agent is now explicitly told to remove stale draft/future claims from both Markdown and JSON after creating the filesystem, including deferred notes that still say the filesystem was not materialized.

### Tests
- **Bundled template coverage tracks the compact prompt contract.** The Application Skeleton template test now protects the shorter prompt wording and the stale-draft cleanup rule.

## [1.2.165] - 2026-05-06
### Fixed
- **Application Skeleton now treats the Development Tree as the default production filesystem shape.** The bundled prompt/contract require Product Part roots under `product-parts/<product-part-id>`, clustered modules under `clusters/<cluster-id>/modules/<module-id>`, and standalone modules under the Product Part instead of scattering Product Parts across `apps/`, `packages/`, or `extensions`.
- **Application Skeleton JSON now has a canonical lifecycle shape.** Draft and materialized maps must use explicit `reviewState`, `materialized`, `materializationState`, `materializedPaths`, and array-based `stack.languages`, `stack.frameworks`, and `stack.runtimes` fields.
- **Post-materialization artifacts must describe the current filesystem, not a future draft.** The prompt now tells the agent to rewrite draft/future-tense Markdown after it creates the accepted skeleton.

### Tests
- **Bundled template coverage protects the Development Tree mirror contract.** Targeted tests assert the Product Part-aligned filesystem rules, canonical JSON fields, and post-materialization Markdown cleanup requirements.

## [1.2.164] - 2026-05-06
### Fixed
- **Application Skeleton runtime prompt pack now matches the discovery-first stage direction.** The Project Manager prompt pack no longer injects legacy “ask stack questions first” phase guidance and keeps draft contract creation separate from post-acceptance filesystem materialization.
- **Application Skeleton now receives complete upstream Diagram Modules context.** The first-turn prompt inlines Final Description, Virtual Simulation, the Product Parts index, and generated Product Part artifacts derived from the index.
- **Application Skeleton path contracts now distinguish workflow artifacts from production code.** The bundled prompt/contract forbid `.codeai-hub/...` as `sourceRoot` and require cluster-owned modules under `<productPartPath>/clusters/<cluster-id>/modules/<module-id>`.

### Tests
- **Prompt pack and bundled template tests cover the corrected behavior.** Targeted tests verify discovery-first runtime phase guidance, source artifact descriptor generation, and stricter source/module path contract wording.

## [1.2.163] - 2026-05-06
### Fixed
- **Application Skeleton no longer starts by blocking on stack-choice questions.** The bundled prompt now requires a discovery/research pass first, asks the agent to propose one recommended baseline when the inputs support it, and limits blocking questions to genuinely ambiguous decisions.

### Tests
- **Template coverage protects the discovery-first prompt rule.** The Application Skeleton bundled template test now asserts that the prompt forbids early blank-choice stack questions and requires recommended-baseline confirmation style.

## [1.2.162] - 2026-05-06
### Fixed
- **Application Skeleton now owns post-acceptance filesystem materialization.** The bundled agent prompt separates draft contract creation from accepted skeleton materialization, writes explicit `materialized` state, and keeps Quality Gates blocked until the real scaffold exists.
- **Quality Gates Baseline now owns post-acceptance gate integration.** The bundled prompt and contract separate accepted gate baselines from integrated tooling, and Development Tree bootstrap now waits for `quality-gates.json` to report `integrated: true`.

### Tests
- **Materialization and integration gates are covered by targeted Core checks.** Tests verify Application Skeleton materialized progress, Quality Gates integrated unlock, Development Tree filesystem path application, template sync, `@codeai-hub/core` build, and webview type-check.

## [1.2.161] - 2026-05-06
### Fixed
- **Quality Gates agents now start with a universal research-first prompt.** The stage infers the current project shape from the accepted Application Skeleton, compares suitable tooling strategies, drafts minimal/recommended/strict baselines, and designs a first-class architecture gate without assuming a CodeAI Hub-specific stack.
- **Quality Gates contracts now separate active blockers from deferred tooling.** The bundled contract reference requires selected baseline metadata, advisory/deferred sections, and keeps materialization, hooks, CI, scripts, and production files outside the Quality Gates stage unless explicitly allowed.

### Tests
- **Template sync and Core build checks cover the prompt update.** Targeted template tests and the `@codeai-hub/core` build passed after regenerating bundled templates.

## [1.2.160] - 2026-05-06
### Added
- **Codex workflow agents now run with research-capable documentation tooling.** The documentation workflow process keeps implementation-heavy capabilities disabled but no longer disables browser/search tools, so Diagram Modules, Application Skeleton, and Quality Gates discussions can compare frameworks, architecture options, and external references when the user asks for research.
- **A restricted Codex workflow process profile remains available.** Translation and no-research contexts keep browser/search/tool discovery disabled, preserving the narrow tool surface where external research is not appropriate.

### Fixed
- **Application Skeleton agents now have an explicit completion boundary.** After the accepted skeleton contract is written, the agent must stop, avoid materialization/root file creation, and direct the user to Quality Gates Baseline.

### Tests
- **Provider and template profile coverage verifies the new tooling split.** Targeted checks cover Codex app-server process args, translation isolation, model invocation profile keys, template sync/update behavior, and affected package builds.

## [1.2.159] - 2026-05-06
### Fixed
- **Application Skeleton and Quality Gates sessions now keep their workflow stage identity in continuity.** New sessions for the technical root steps are stored under `application_skeleton` / `quality_gates` instead of `unknown`, so Project Manager can attach the started dialog to the selected workflow row.

### Tests
- **Technical root continuity is covered by Core regression tests.** The hotfix verifies canonical continuity paths for `application_skeleton` and `quality_gates`, dialog reconciliation coverage, and the `@codeai-hub/core` build.

## [1.2.158] - 2026-05-06
### Fixed
- **Workflow session empty states no longer show a stale `Creating session` placeholder.** If a Diagram Modules branch node, Application Skeleton, or another workflow surface has no session/help content yet, the session panel now falls back to the generic empty state instead of showing an indefinite spinner.

### Tests
- **The empty-state regression is covered by targeted Project Manager session tests.** The hotfix verifies that the shared empty state no longer references the pending copy or spinner and that Project Manager workflow session routing still stays scoped to live stage/session intents.

## [1.2.157] - 2026-05-06
### Added
- **Application Skeleton and Quality Gates Baseline are now first-class workflow stages.** After Diagram Modules, the Project Manager exposes dedicated technical root rows, prompt packs, artifact panels, confirmation cards, and SSOT documentation for creating the application skeleton before development-tree execution begins.
- **Development Tree execution is locked until skeleton and gates are accepted.** The workflow now prevents Product Part / Cluster / Module agent-session automation from starting until the application skeleton and quality baseline artifacts are produced and accepted.

### Tests
- **The workflow expansion is covered by targeted Core and Project Manager verification.** Prompt-pack, stage-start, workflow-state, panel-routing, workspace-tree, Core build, webview type-check, and webview build checks were run before release packaging.

## [1.2.156] - 2026-05-06
### Fixed
- **Apple Native reasoning translation retries the transient first-call readiness failure.** If Apple Translation reports `TranslationError.Cause.notInstalled` during the first runtime call even though the language pair is installed, the Apple Native engine now performs a bounded retry instead of leaving the first `Thinking` bubble in source English.

### Tests
- **The retry guard is covered by translation package regression tests.** New Apple Native engine tests verify that transient `runtime_failure` / `notInstalled` is retried and that real language-pack failures are not retried.

## [1.2.155] - 2026-05-06
### Fixed
- **Text-to-Speech now selects the Apple voice language from the bubble text.** When no explicit speech language is provided by the UI, the packaged Apple Speech helper detects the text language and resolves Russian Cyrillic text to `ru-RU` instead of falling back to the system/default English voice.

### Tests
- **Apple Speech helper language detection is covered without audible playback.** The Swift fixture suite now runs a dry-run `speak` request for Russian text and asserts `resolvedLanguage: ru-RU` with a real Apple voice identifier, alongside the existing helper build and fixture checks.

## [1.2.154] - 2026-05-06
### Fixed
- **Text-to-Speech Speak clicks now pass Core WebSocket validation.** The Core incoming message validator accepts `session:speech:speak-message` and `session:speech:stop`, so bubble Speak buttons reach the speech router instead of being rejected as unknown commands.

### Tests
- **The hotfix is covered by Core regression tests and build verification.** Targeted checks cover accepted speech commands, malformed speech payload rejection, speech handler/router/service behavior, Ultracite validation, and the `@codeai-hub/core` build.

## [1.2.153] - 2026-05-05
### Added
- **Apple Native Text-to-Speech is available for session bubbles on macOS.** Assistant and thinking bubbles now expose provider-styled `Speak` controls that read the visible bubble text through the packaged Apple Speech helper, with stop behavior on the active bubble.
- **Text-to-Speech rate is configurable in General Settings.** The persisted `general.textToSpeech.rate` setting is clamped to `0.75x-2.0x` and sent with each speech request.

### Tests
- **Text-to-Speech integration is covered across helper, Core, UI, and packaging.** Targeted verification covers Swift helper fixtures, Core speech service and websocket routing, settings persistence, bubble Speak rendering, PM speak/stop command building, Core/webview type-check/build, and release validation for the packaged Apple Speech helper executable.

## [1.2.152] - 2026-05-05
### Fixed
- **Apple Native Settings save now resolves the packaged helper from the Core runtime path.** The Project Manager launcher can start Core with `cwd=/`; Settings preflight and runtime translation now also look beside the packaged Core entry point, so `Apple Native - On-Device` no longer fails helper discovery in installed builds.

### Tests
- **Installed runtime helper discovery was verified against the `1.2.151` Core layout.** The resolved path maps to `app/native/apple-translation-helper/.build/release/apple-translation-helper`, and the helper returns `ok:true` for `en -> ru` preflight.

## [1.2.151] - 2026-05-05
### Fixed
- **Apple Native release packaging now ships the executable helper in the Core runtime.** macOS release builds compile `native/apple-translation-helper` and bundle the executable under the Core app runtime path used by Settings preflight and translation requests.
- **Release validation now blocks missing Apple helper binaries.** `build-release.sh --use-current-version` fails on macOS if the packaged Core runtime does not contain an executable Apple Translation helper.

### Tests
- **The `1.2.151` release build supersedes the local `1.2.150` VSIX candidate.** This avoids VS Code extension caching of the previously built package number and gives user acceptance a fresh installable artifact.

## [1.2.150] - 2026-05-05
### Added
- **Apple Native translation is available as an on-device engine on supported macOS builds.** Settings can select `Apple Native - On-Device` for both UI and Reasoning translation after Core verifies macOS Translation framework readiness, the Swift helper, Xcode toolchain availability, and installed language packs.
- **Apple Native readiness failures now give actionable setup guidance.** Users are told whether they need to update macOS, install Xcode, build/ship the helper, or download the required Translation Languages packs before retrying.

### Tests
- **Apple Native integration has helper, package, Core, Localization, and UI verification.** The release includes live Swift helper smoke coverage for installed/missing language packs plus targeted builds/tests for translation, localization, Core settings preflight, and webview type-checking.

## [1.2.149] - 2026-05-05
### Fixed
- **Workflow and Development Tree prompts now start with localized instructions for Russian settings.** Description, Virtual Simulation, Diagram Modules, and Development Tree node first prompts now materialize a Russian instruction block when Settings > General > Reasoning is `ru`, while preserving filenames, ids, statuses, DSL markers, `agent-fill`, method/event names, and structural headings as canonical tokens.
- **Development Tree contract draft prose now stays localized.** `ModuleFacadeContract.draft.md` and `ClusterFacadeContract.draft.md` are no longer treated as English-prose exceptions; only canonical identifiers remain English.
- **Draft readiness now rejects malformed `agent-fill` marker balance.** Filled drafts with orphaned or unbalanced fill markers stay `in_progress` instead of being marked ready.

### Tests
- **Localized prompt materialization has targeted regression coverage.** Tests now compare localized and non-localized prompt variants, lock protected canonical tokens, verify cache/materializer dimensions, and cover workflow prompt language plus Development Tree marker readiness.

## [1.2.148] - 2026-05-05
### Fixed
- **Development Tree readiness now refreshes after draft writes.** Core includes Development Tree draft artifact mtimes in the workflow state freshness signal, so completed Product Part, Cluster, and Module drafts can turn ready without switching steps.
- **Active Development Tree artifact panels now re-read filled drafts.** Project Manager refreshes the right artifact panel for the selected Development Tree node when workflow state freshness changes, replacing stale empty drafts with the agent-filled artifact content.

### Tests
- **Live readiness refresh has targeted regression coverage.** Tests now cover Core readiness recomputation after draft writes, client parsing of refreshed Development Tree metadata, and sidebar color updates from refreshed snapshots.

## [1.2.147] - 2026-05-05
### Fixed
- **Development Tree draft-pass agents now stay inside first-prompt context.** Product Part, Cluster, and Module first-draft prompts now explicitly forbid reading, searching, listing, or opening additional workspace files during the automatic draft pass.
- **Truncated scoped context now becomes an Open question instead of a file read.** If a Development Tree excerpt is incomplete, the agent records the uncertainty in the draft and waits for explicit user permission before reading more files.

### Tests
- **Draft-pass read boundaries are covered by Core prompt tests.** Tests assert the no-read boundary, user-permission rule, and truncated-excerpt behavior in Development Tree node prompts.

## [1.2.146] - 2026-05-05
### Fixed
- **Development Tree Product Part prompts now receive exact owner Markdown in full.** When `diagram_modules/product-parts/<part-id>.md` exists for the selected Product Part node, Core sends the complete file as protected context instead of letting scoped snippet ranking reduce it to a heading.
- **Scoped context ranking now stays reserved for indirect sources.** `Final_Description.md`, `virtual-simulation.md`, and `product-parts.index.md` still provide bounded excerpts, while direct owner Markdown cannot be displaced by broad anchor matches.

### Tests
- **Exact owner context is covered by oracle-style Core tests.** The new regression test independently reads and parses real-shape source artifacts, assembles expected Product Part / Cluster / Module context, and compares that expectation against the first prompt emitted by Core Runtime.

## [1.2.145] - 2026-05-05
### Fixed
- **Workflow stage directories are now prepared by Core Runtime before agent sessions start.** Description, Virtual Simulation, and Diagram Modules sessions get their parent artifact directories pre-created before provider session creation, so the first prompt cannot arrive before the target directory exists.
- **Workflow agent prompts now keep directory ownership out of agent work.** Description, Virtual Simulation, and Diagram Modules instructions now state that agents write artifact content at the provided target path while Core Runtime owns parent workflow directory preparation.

### Tests
- **Directory preflight order is covered by targeted Core verification.** Tests assert `diagram_modules/` and `diagram_modules/product-parts/` already exist inside `session:create` before the provider session is created, plus workflow template contract tests and Core build.

## [1.2.144] - 2026-05-05
### Fixed
- **Description first prompts now include the full questionnaire inline.** The questionnaire is sent as an authoritative fenced source block with provenance/fallback paths, so the agent does not need a separate turn just to read the initial answers.
- **Active artifact viewers now refresh when agents write drafts.** Project Manager refreshes the right artifact pane for both normal workflow artifacts and Development Tree draft artifacts while the user stays on the active session.
- **Development Tree node prompts now wait briefly for detailed Product Part context.** Product Part / Cluster / Module agents retain scoped excerpts and Product Part sessions no longer miss `diagram_modules/product-parts/<part-id>.md` when it appears moments after bootstrap starts.

### Tests
- **Follow-up workflow behavior is covered by targeted Project Manager and Core verification.** Tests lock Description inline source prompts, active artifact refresh matching, Development Tree prompt context extraction, delayed detailed Product Part context loading, webview typecheck, webview build, and Core build.

## [1.2.143] - 2026-05-05
### Fixed
- **Workflow prompt language now separates chat and artifact prose.** Description, Virtual Simulation, and Diagram Modules first prompts now carry Settings > General > Reasoning as the chat language and Settings > General > Artifacts for the User as the artifact prose language, while English examples/templates remain format-only and contract tokens stay stable.
- **Early workflow steps now receive upstream artifacts inline.** Virtual Simulation receives the full `Final_Description.md`; Diagram Modules receives the full `Final_Description.md` and `virtual-simulation.md` in the first prompt with provenance and fallback paths.

### Tests
- **Workflow prompt language behavior is covered by targeted Project Manager and Core verification.** Tests lock prompt language separation, settings-backed start wiring, inline source payloads, template sync, and Diagram Modules structural-token boundaries.

## [1.2.142] - 2026-05-05
### Fixed
- **Development Tree node-agent prompts now use scoped upstream context.** Product Part, Cluster, and Module bootstrap prompts no longer paste broad upstream artifacts into every node; Core extracts deterministic excerpts that match the selected node, its Product Part, and its Cluster.
- **Development Tree draft artifacts now follow the configured artifact language.** Node-agent first prompts separate chat language from Settings > General > Reasoning and draft prose language from Settings > General > Artifacts for the User, while preserving canonical ids, filenames, generated blocks, and structural labels.

### Tests
- **Scoped prompt and artifact-language behavior is covered by targeted Core tests.** Tests now lock context extraction, bootstrap loading, response-language resolution, and settings-backed draft artifact language selection.

## [1.2.141] - 2026-05-05
### Fixed
- **Development Tree node-agent first prompts now include existing workflow context.** New Product Part, Cluster, and Module bootstrap prompts include bounded prior context from `Final_Description.md`, `virtual-simulation.md`, `product-parts.index.md`, and the selected Product Part artifact when those files exist in the workspace.
- **Node agents are told not to restart discovery from zero.** The prompt now treats upstream artifacts as prior context and explicitly tells the agent not to ask the user to re-explain information already present there.

### Tests
- **Prompt artifact context is covered by targeted Core tests.** Tests now verify both prompt rendering and workspace-backed artifact loading during node session bootstrap.

## [1.2.140] - 2026-05-05
### Fixed
- **Development Tree node session tabs now show only the node name.** Tabs for `development_tree/...` sessions no longer expose the full materialized path and instead render the final Product Part, Cluster, or Module segment in readable Title Case.
- **Development Tree node-agent first prompts now carry the configured reasoning language.** New node bootstrap prompts include the response-language instruction from Settings > General > Reasoning, with the persisted default language as fallback.

### Tests
- **Session polish is covered by targeted UI/Core tests.** Tests now lock short tab labels, prompt-level response-language text, and settings-backed language resolution during node session bootstrap.

## [1.2.139] - 2026-05-05
### Fixed
- **Development Tree node selection now clears stale Diagram Modules session state.** Product Part, Cluster, and Module clicks now outrank an older Diagram Modules `stepStartedIntent`, and the Project Manager session surface ignores live dialog overrides whose stage no longer matches the selected node `development_tree/...` startup stage.

### Tests
- **Stale dialog routing is covered by targeted Project Manager regression tests.** Tests now lock selected-node priority over `stepStartedIntent`, stage-scoped dialog overrides, exact dialog matching, runtime node-path fallback, webview typecheck, and webview bundle generation.

## [1.2.138] - 2026-05-05
### Fixed
- **Development Tree node selection no longer falls back to the Diagram Modules dialog.** When a selected Product Part, Cluster, or Module has draft artifacts but no exact session metadata in the branch event, Project Manager now clears the Diagram Modules dialog intent and scopes the left runtime session list by the selected node `development_tree/...` path.

### Tests
- **Runtime session fallback is covered by targeted Project Manager verification.** Logs confirmed node sessions exist in continuity and provider JSONL while PM still resolved `diagram_modules`; tests now lock the selected-node `initialDialogIntent=null` fallback and node-path `startupStage` behavior.

## [1.2.137] - 2026-05-05
### Fixed
- **Development Tree node selection now opens the exact node session.** Product Part, Cluster, and Module selections pass the concrete `dialogId`, `rootSessionId`, and `sessionId` into the Project Manager session surface, so the left pane resolves the selected node dialog before falling back to provider/stage matching.

### Tests
- **Node session routing has targeted regression coverage.** Project Manager tests now verify that exact node dialog identity wins over a newer generic `Diagram Modules` dialog, with webview typecheck and build verification before release prep.

## [1.2.136] - 2026-05-05
### Fixed
- **Development Tree sidebar is back to pure Product Part / Cluster / Module structure.** Node draft artifacts and sessions are no longer rendered as child rows inside the sidebar tree.
- **Selecting a Development Tree node opens its working surfaces.** Product Part, Cluster, and Module selection now routes node metadata into Project Manager: the node session opens in the left session pane and the node draft artifacts are available in the right artifact pane with per-file switching.

### Tests
- **Node detail routing is covered by targeted Project Manager verification.** Tests confirm artifact/session metadata stays out of sidebar rows, remains available on branch selection, and the webview typecheck/build path passes.

## [1.2.135] - 2026-05-05
### Fixed
- **Development Tree node sessions now keep their concrete workflow identity.** Product Part, Cluster, and Module bootstrap sessions now use the materialized node path under `development_tree/materialized/...` instead of falling into `continuity/unknown`, and dialog IDs include the concrete node suffix instead of a generic `development-tree` suffix.
- **Development Tree node sessions inherit the actual workflow provider.** Node bootstrap now resolves the provider from the latest `diagram_modules` continuity chain for the workspace, with the configured provider only as fallback.
- **Project Manager now shows node-level artifacts and sessions.** Core exposes draft artifacts and latest session metadata per Product Part / Cluster / Module, Project Manager parses that metadata, and the Development Tree renders `Artifact: ...` and `Session: ...` rows under their owning nodes.

### Tests
- **Retest verification covers the namespace, continuity, session naming, parser, and PM rendering path.** Targeted Core and Project Manager checks passed before this release prep, including core build, webview typecheck, webview bundle generation, and plan validation.

## [1.2.134] - 2026-05-04
### Added
- **Development Tree now materializes after Diagram Modules.** Core builds the existing Project Manager Development Tree snapshot into a neutral workspace-owned filesystem tree under `.codeai-hub/<workspace-slug>/development_tree/materialized/`, then bootstraps structural draft artifacts and first-message agent session intents for materialized Product Part, Cluster, and Module nodes.
- **Development Tree readiness now reaches the sidebar.** Draft content is classified as `idle`, `in_progress`, or `ready`, exposed through the Core snapshot payload, parsed by Project Manager, and rendered as gray/orange/green branch-node state.

### Fixed
- **Diagram Modules completion now requires real Product Part structure.** Product Part artifacts with only headings, missing `Part ID`, mismatched IDs, or no valid Cluster/Module nodes no longer count as completed.
- **Skeleton-only planned Product Parts no longer create folders, drafts, or sessions.** Planned entries stay visible as skeleton nodes until their matching Product Part artifact exists.

### Tests
- **Development Tree materialization coverage now spans Core and PM.** Targeted tests cover artifact validation, filesystem planning/apply, draft preservation, first-message session bootstrap, readiness aggregation, Project Manager parsing/rendering, and manual workspace verification.

## [1.2.133] - 2026-05-03
### Fixed
- **Documentation Tree continuity rollover no longer blocks on agent-authored reports.** `Description`, `Virtual Simulation`, and `Diagram Modules` now use a fast synthetic rollover path that creates the next session, unlocks input after target materialization, skips Create Report/report polling/resume bootstrap, and attaches the continuation contract only to the next real user message.
- **Continuation turns now preserve the user's visible conversation context.** The first user turn after rollover carries the normal workflow start/step contract, explicit `Continuation Mode`, the last user-visible assistant message from the previous session, and the user's answer while UI/history keep showing only the original user text.

### Tests
- **Fast rollover coverage added across direct and production paths.** Targeted Core tests cover stale report-state cleanup, no internal bootstrap turn, inherited Codex model/reasoning binding, all three Documentation Tree stages through post-turn token usage, and the continuation instruction envelope contract.

## [1.2.132] - 2026-05-03
### Fixed
- **Codex flow-node continuity rollover now preserves workflow context and per-turn model/reasoning.** Reopened `Description`, `Virtual Simulation`, and `Diagram Modules` trunk sessions materialize with their workspace/stage context, rollover-created Codex sessions inherit the current session binding, and stale-provider retry re-sends with the active Codex turn config instead of falling back to stale defaults.
- **Post-turn continuity decisions no longer leave PM input stuck in resuming state.** Terminal snapshot reasons (`no_rollover_needed`, `resume_ready`, `resume_failed`, `resume_timeout`) return the session stream to idle, including aborted plain turns.

### Tests
- **Continuity hotfix coverage added across Core and PM snapshot reconciliation.** Targeted tests cover Codex restored dialog context hydration, trunk rollover eligibility, delayed usage arbitration for `Virtual Simulation`, continuity model-binding refresh, inherited rollover binding, stale rebind retry, and no-indefinite-resuming terminal decisions.

## [1.2.131] - 2026-05-03
### Fixed
- **Codex app-server startup is compatible with `codex-cli 0.128.0`.** CodeAI Hub no longer passes legacy partial `mcp_servers.*.enabled=false` config overrides that make Codex reject startup with `invalid transport in mcp_servers.codex` and leave reopened Codex sessions at `Provider codexCli unavailable`.

### Tests
- **Codex startup profile now has targeted regression coverage and a direct process smoke.** The app-server process profile test covers the updated startup args, and the built `CodexAppServerProcess.start()` path was smoke-tested against local `codex-cli 0.128.0`.

## [1.2.130] - 2026-05-02
### Fixed
- **Gemini provider module is bundled in the clean Core runtime.** The Core runtime now carries `@codeai-hub/gemini-module` as an explicit dependency, so a VSIX plus matching runtime release folder can load Gemini before checking CLI authentication instead of reporting `Gemini provider module is not installed`.

### Tests
- **Release validation now fails if Core runtime is missing the Gemini provider module.** `build-release.sh` checks and loads the bundled Gemini module from the staged Core runtime alongside the existing provider and localization bundle checks.

## [1.2.129] - 2026-05-02
### Changed
- **Capture Workbench accepted build is repackaged under a clean handoff release number.** This release preserves the accepted `1.2.128` behavior and provides a fresh VSIX/runtime tarball set for clean-install archival and external handoff.

### Notes
- **External handoff still needs the runtime tarballs alongside the VSIX.** The VSIX installs the extension shell; Core, Launcher, and UI runtime archives are resolved from `~/.codeai-hub/releases/` during installation/startup, and provider CLI/auth setup remains user-owned.

## [1.2.128] - 2026-05-02
### Fixed
- **Capture Workbench reasoning switches now use one parent-owned selection state.** The selector bar and Managed snapshot row no longer keep separate selection copies, so switching Claude reasoning from `thinking-high` to `thinking-off` and immediately re-capturing targets the visible slot on the first click.

### Tests
- **Selection bar regression coverage now rejects duplicate local selection state.** The Workbench selector test asserts the bar is controlled by the detached parent and still preserves sticky load/save wiring.

## [1.2.127] - 2026-05-02
### Changed
- **Capture Workbench workflow fix is repackaged under a fresh release number.** This release preserves the `1.2.126` workflow-state transport fix and provides a clean install target after an interrupted local VSIX installation.

## [1.2.126] - 2026-05-02
### Fixed
- **Capture Workbench workflow-step captures now keep the Project Manager API receiver bound.** Description, Virtual Simulation, and Diagram Modules managed capture can resolve workflow state without throwing `this.getHttpUrl is not a function`; Translation remains on the direct capture path.

### Tests
- **Workbench runner coverage now reproduces class-style API receiver binding.** The regression test exercises workflow scenario prompt building with a transport method that depends on `this.getHttpUrl()`.

## [1.2.125] - 2026-05-02
### Fixed
- **Detached Capture Workbench selectors no longer use native HTML popup controls.** Step, Provider, Model, and Reasoning now render DOM-owned button/listbox controls to avoid the standalone CEF/macOS native popup crash path seen in `1.2.124`.

### Tests
- **Capture Workbench selector regression coverage now rejects native selects.** The selection bar test verifies the rendered selector surface and selector source files do not reintroduce `<select>`, `<option>`, or `<optgroup>`.

## [1.2.124] - 2026-05-02
### Added
- **Capture Workbench MVP is ready for release packaging.** Settings → General now opens a detached Project Manager workbench for managed provider-native request snapshots, explicit Step/Provider/Model/Reasoning selection, two-generation slot rotation, artifact links, and semantic `Managed: current vs previous` diff sections over Core-owned capture artifacts.

### Changed
- **Native request capture diagnostics moved out of the Settings card.** The shared Settings surface now owns only the launcher button, while Project Manager owns the detached workbench UI, PM bridge/index store, Core-backed `workbench:state:*` persistence, and `workbench:artifact:read` records path.

### Tests
- **Capture Workbench coverage added across Core, providers, PM bridge, and UI.** Focused tests cover applied capture envelopes, reasoning override transport, Core state/artifact bridge, Workbench selection persistence, managed recapture slot rotation, provider diff extractors, diff renderer modes, and Settings launcher migration.

## [1.2.123] - 2026-05-01
### Fixed
- **Provider Native Request Capture now works on empty workspaces for workflow scenarios.** The Project Manager capture runner bypasses upstream artifact gating only for the diagnostic capture path, so `Virtual Simulation` and `Diagram Modules` captures can generate provider request artifacts before `Final_Description.md` or `virtual-simulation.md` exists. Normal workflow turns still enforce the `Workflow_CLI.md` upstream artifact contract.

### Tests
- **Capture bypass verification added.** New Project Manager unit coverage checks the resolver default guard behavior, diagnostic bypass canonical paths, runner capture payloads for `Virtual Simulation` / `Diagram Modules`, and the unchanged direct `Translation` path.

## [1.2.122] - 2026-05-01
### Changed
- **Cleanup release for dead-code and stale-reference hygiene.** Removed the unused `diagram-modules-agent` source stub, deleted dead CSS selectors from the legacy webview/session and Project Manager stylesheets, removed stale localization keys, and corrected documentation/config references that no longer matched the current codebase.
- **Repository analysis config now reflects current packages.** `knip.json`, `.vscodeignore`, and direct workspace dependencies now include the active Codex app-server module and shared translation package edges without legacy package names.

### Tests
- **Cleanup verification passed before release packaging.** Passed architecture, lint, knip, markdown links, duplication, Project Manager/webview builds, webview typecheck, and targeted Core/Claude/Gemini workspace builds.

## [1.2.121] - 2026-05-01
### Changed
- **Status Panel pickers behave like provider-tinted buttons.** The model card and the reasoning card now share the same default → hover → active state model as the toggle buttons below them. The active option is highlighted in the provider color (Claude warm peach, Codex cyan, Gemini cool lavender) using the same RGBA tokens as `session-status-button--*`, hover lights the option up in the provider hue, and clicking a different option swaps the active highlight from the previous option to the new one before closing the popup. Smooth 120 ms transitions on background/border/color, plus a `focus-visible` outline for keyboard navigation.

## [1.2.120] - 2026-05-01
### Changed
- **Status Panel model/reasoning switches are now decoupled.** Both Claude and Codex Status Panel switches travel as two independent transport commands per provider, never one coupled payload: `session:claude:model-switch` carries only `targetModelId`, the new `session:claude:thinking-switch` carries only `thinkingEnabled` + optional `targetReasoningEffort`; `session:codex:model-switch` carries only `targetModelId`, and the new `session:codex:reasoning-switch` carries only `targetReasoningEffort`. Model-only handlers preserve the previous `reasoningEffort`/`thinkingEnabled` from `Session.modelBinding`; reasoning-only handlers preserve the previous `baseModelId`. This fixes the regression where switching reasoning unintentionally rebound the model (and vice versa) on stale UI snapshots.
- **Status Panel pickers no longer mix dimensions.** The model card lists only model names, the reasoning card lists only effort levels. The active option in both cards is highlighted through `data-active="true"` + `data-provider` against the same RGBA tokens as the toggle button below the picker; the previous reasoning suffix on each model row and the textual `active` label on the active reasoning row are removed.

### Tests
- **Decoupled switch coverage across Core and PM/UI.** New tests for `session-request-handler-claude-thinking-switch.ts` and `session-request-handler-codex-reasoning-switch.ts` cover effort transitions, base-model preservation, unsupported-effort/unknown-model rejection, and non-target-provider session ignore. Existing model-switch and dialog-helpers/picker tests rewritten around the model-only callbacks and the new active-highlight contract.

## [1.2.119] - 2026-05-01
### Added
- **Claude Status Panel model/thinking switch is now active.** Claude sessions can switch `Sonnet` / `Opus` / `Haiku` and thinking `off | low | medium | high | xhigh | max` from the lower status chips. Core updates the logical `Session.modelBinding`, broadcasts `session:model:update`, keeps Settings defaults untouched, and applies the selected model/thinking config on the next Claude SDK turn.

### Tests
- **Claude switch coverage includes native request evidence.** Passed focused Claude capability/provider/SDK/native-capture tests, Core switch tests, PM/UI picker and dispatch tests, plus targeted Claude/Core/Project Manager/webview builds before release packaging.

## [1.2.118] - 2026-04-30
### Fixed
- **Codex Spark model switch now sends explicit `summary: "none"`.** Runtime logs showed that omitting `turn/start.summary` lets Codex app-server default Spark turns to `detailed`, which then becomes unsupported native `reasoning.summary`. Spark now receives explicit `summary: "none"` in workflow turns, model-switch turns, native capture, translation capture, and Core invocation profiles.
- **User retest accepted the final Codex switch contract.** Native rollout evidence confirmed one Codex session using `gpt-5.4-mini` → `gpt-5.3-codex-spark` → `gpt-5.5`, with Spark recorded as `summary=none`. This supersedes the failed `1.2.116`/`1.2.117` omit/neutralize attempts.

### Tests
- **Spark summary-none contract covered across runtime paths.** Passed focused Codex App Server facade/helper/capture/translation tests, Core model invocation profile smoke tests, and targeted Codex/Core workspace builds before release packaging.

## [1.2.117] - 2026-04-30
### Fixed
- **Codex Spark model switch no longer inherits provider-home reasoning summary fallback.** Provider-home `model_reasoning_summary` is now forced to `none` by both runtime startup materialization and extension-side settings sync, so switching an active Codex session from `gpt-5.2` to `gpt-5.3-codex-spark` cannot reintroduce unsupported native `reasoning.summary` through global config.

### Tests
- **Spark summary neutralization covered before release packaging.** Added provider-home materializer and settings-sync regression tests, reran the Spark raw `turn/start` payload test, and passed Codex App Server module build plus root TypeScript compilation.

## [1.2.116] - 2026-04-30
### Added
- **Codex Status Panel model/reasoning switch is restored with a capability-gated same-session path.** Codex sessions can switch model and reasoning from the lower status chips without resending the previous user message. Core updates the live session binding, broadcasts `session:model:update`, injects one `<model_switch>` instruction item on the next turn, and keeps Settings defaults from overwriting the selected model/reasoning.

### Fixed
- **Spark switch payloads no longer send unsupported reasoning summary fields.** Codex turn payloads are rebuilt from the runtime model capability registry, so `gpt-5.3-codex-spark` omits explicit `summary` while non-Spark models keep the shared reasoning summary policy.
- **Dialog resume no longer overwrites a newer live switch with stale continuity binding.** Existing runtime sessions only hydrate continuity `modelBinding` snapshots when the continuity timestamp is newer than the live binding.

### Tests
- **Model switch regression coverage added before release packaging.** Added registry parity tests, Core switch transport and dialog-send continuity tests, PM dispatch wiring tests, UI picker tests, and Codex raw turn payload coverage for Spark model switch without `summary`.

## [1.2.115] - 2026-04-30
### Changed
- **Release rebuilt from the rollback point after the failed status-panel switcher scope.** The in-place status-panel model/reasoning switching implementation from releases `1.2.112` through `1.2.114` has been removed. The lower Session Status Panel keeps the passive model and reasoning chips that existed in `1.2.111`; future provider/model/reasoning switching will be redesigned around provider-segment handoff compatibility instead of mutating an incompatible native provider thread in place.
- **Release process guardrails are retained.** The User Visual Acceptance Gate remains documented so built artifacts are not treated as completed scope until the user installs/runs the release and explicitly confirms acceptance.

### Tests
- **Rollback verification passed before release packaging.** Passed webview typecheck/build, Claude/Codex/Gemini provider builds, Core build after provider modules, focused Session Status Panel and Project Manager session-view tests, plus commit-hook architecture/lint/knip checks.

## [1.2.111] - 2026-04-29
### Fixed
- **Runtime reliability follow-up hardens teardown and diagnostics.** Core WebSocket server/client error events are now owned and logged, startup/workspace best-effort failures produce sanitized diagnostics, runtime dispose/stop paths clear owned maps and provider recovery timers, legacy continuity handoff state can retry after failure, unified-session close keeps writer ownership until terminal close promises settle, and the remaining rollover runtime factory definite-assignment bypass is replaced by an explicit deferred reference.
- **Core Bridge reconnect status avoids error/close churn.** Browser-side websocket `error` events now log diagnostics and delegate reconnect status ownership to the scheduler/dedupe path.

### Tests
- **Targeted runtime reliability verification passed.** Passed Core build, webview typecheck/build, and focused Node tests for WebSocket error handling, continuity retry, session runtime dispose, provider recovery scheduler dispose, runtime factory wiring, and unified-session storage close.

## [1.2.110] - 2026-04-29
### Fixed
- **Sidebar tint reflects strict per-step attribution.** The 1.2.109 upstream inheritance (virtual_simulation falling back to Description's provider, diagram_modules falling back to VS chain or Description) was a regression: the StageConfirmationCard inherited-provider badge is a preselect hint the user can change, not a binding, so the sidebar tint must not anticipate that hint. `useStepProviderResolver.forStage` now returns `null` for idle VS/DM stages even when an upstream chain has provider attribution; the row renders neutral until the step's own session actually attaches. The legitimate `description.primarySession.providerId` fallback for the description stage itself is preserved (it is description's own session, not upstream inheritance).

## [1.2.109] - 2026-04-29
### Fixed
- **Idle workflow steps inherit upstream provider tint.** Until v1.2.108, an idle workflow step (no own continuity chain) rendered fully neutral, even when an upstream step had already established a provider. Now `useStepProviderResolver.forStage` mirrors `resolveInheritedProviderId` from `workflow-provider-resolver.ts`: virtual_simulation falls back to `description.primarySession.providerId`; diagram_modules falls back to the latest virtual_simulation chain and then to description. The sidebar tint stays consistent with the inherited-provider badge that `StageConfirmationCard` already shows when preselecting the next step.
- **Selected idle step no longer inherits legacy green.** A truly idle step (no own chain AND no upstream attribution) selected in the sidebar previously showed `--pm-accent-strong` (green) fill + border via the legacy selection rules. An explicit `:not([data-provider]).pm-tree__item--selected` override now applies a neutral `rgba(255,255,255,0.04)` fill, `rgba(255,255,255,0.18)` border, and `var(--pm-text-primary)` label so fresh-workspace selections stay color-free.

### Changed
- **Stage Confirmation Card provider radio pills tinted per provider.** The Claude / Codex / Gemini selection pills (and the inherited-provider badge) now use the same corporate tokens as the sidebar tree and the model/reasoning chips — Claude warm peach, Codex cyan, Gemini cool lavender — instead of the legacy hardcoded `rgba(95,227,186,*)` (green) selection state. Tokens live in `src/client/project-manager/components/shared/stage-confirmation-card-provider-tint.ts` and mirror `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html`.

## [1.2.108] - 2026-04-29
### Fixed
- **Development Tree branch nodes stay neutral.** Until v1.2.107, the P/C/M branch nodes (Product Part / Cluster / Module) inherited the provider tint of the latest `diagram_modules` trunk chain — but the Development Tree skeleton is materialized from that artifact and the individual branch items do not have a provider session of their own yet. `useStepProviderResolver.forBranchPart` / `forBranchCluster` / `forBranchModule` now always return `null` for v1, so branch nodes render with the neutral `--pm-text-primary` label and no `data-provider` attribute. When per-branch sessions (`Cluster Design` / `Module Design`) materialize, the resolver will be extended to return real attribution per `partId` / `clusterId` / `moduleId` without changing the call-site contract.

## [1.2.107] - 2026-04-29
### Fixed
- **Idle workflow steps now render neutral.** A regression in v1.2.106 caused workflow steps without any continuity attribution (never been worked on by any provider) to inherit the `codex` cyan tint via the resolver's default fallback. The `useStepProviderResolver` hook now returns `SidebarProviderId | null` and `workspace-tree.tsx` omits the `data-provider` attribute when the resolver returns null, so unattributed steps fall back to the existing neutral `--pm-text-primary` label and stay free of any provider color until they receive their first provider segment. The `fallbackProviderId` parameter remains available for callers that explicitly want a tint default.

## [1.2.106] - 2026-04-29
### Added
- **Workflow Tree sidebar tinted per provider.** Each row of the Project Manager sidebar (trunk Documentation Tree stages and Development Tree branch nodes — Product Part / Cluster / Module) now carries a `data-provider` attribute resolved from `WorkflowStateSnapshot.continuity.chains[].segments[].providerId`, so unselected steps render their label in the provider's accent hue and selected steps render with a soft provider fill + provider border + muted text. Branch nodes inherit the provider of the latest `diagram_modules` chain until per-branch sessions exist; idle stages fall back to the resolver's default provider.
- **Corporate design system folder.** New `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html` documents the canonical provider color tokens (Claude warm peach, Codex cyan, Gemini cool lavender) and the neutral selected-text + light font-weight tokens; this is the first SSOT entry for the corporate design and will grow with future sections (typography, spacing, semantic colors).

### Changed
- **Sidebar legacy hardcodes replaced.** The `pm-tree__type-marker` in-progress `#d9a441` (yellow) and done `--pm-accent-strong` (green), the `pm-tree__type-marker--has-children` outline, the `pm-tree__pp-wrapper--open` PP frame border, and the `pm-tree__cluster-children` connector lines now all read from per-row provider variables (`--row-soft`, `--row-border`, `--row-accent`) instead of the old uniform tokens. Sidebar font-weight is now `300` (light) regardless of node type. Legacy `--pm-accent-strong` rules remain as a defensive fallback when `[data-provider]` is absent.

## [1.2.105] - 2026-04-29
### Changed
- **Tokens chip metric is muted to match the model/reasoning chips.** The numeric `used (remaining%)` value inside the right-most session status chip now uses the same neutral grey `#b0b0b0` as the default-state model and reasoning button chips, so the digits stop pulling visual attention away from the model identity.

## [1.2.104] - 2026-04-29
### Changed
- **Session status row split into four chips.** The status surface directly under `InputPanel` now renders as a label chip (`Модель:`), a provider-tinted button chip carrying the model display name, an optional provider-tinted button chip carrying the reasoning value, and a right-most tokens chip with the `used (remaining%)` metric and a free right edge reserved for future per-session signals. The component now returns nothing when Core is not ready or `models[0]` is missing; the legacy `Core Supervisor: starting…` and single-line summary fallbacks were removed.
- **Localization key for the new label.** Added `session.status.model_label` to the approved `messages_for_the_user.json` dictionary and the legacy `system_feedback.json` mirror.

### Tests
- **Four-chip status panel is covered by unit tests.** `status-panel.test.tsx` asserts the four-chip layout per provider, the reasoning chip omission rule, the tokens metric, the not-ready and missing-models null returns, and the optional debug strip.

## [1.2.103] - 2026-04-28
### Fixed
- **Runtime WebSocket boundaries are now explicit and validated.** Project Manager Core stream connection is idempotent with intentional disconnect cleanup, PM/Core incoming WebSocket frames pass structural validators before dispatch, and malformed frames fail at the boundary instead of relying on raw casts.
- **Core Bridge and provider runtime stability diagnostics are safer.** Browser/Core Bridge best-effort failures now emit sanitized diagnostics for server-message parsing, session history hydration, status snapshots, and supervisor requests without changing reconnect UX.
- **Hot-path settings reads are cached without moving settings ownership.** Core settings/default/translation reads use path-scoped short TTL snapshots with invalidation after settings writes, and Claude/Codex/Gemini provider-local fallback reads use short path-scoped caches instead of repeated synchronous `settings.json` reads.
- **Gemini and Core runtime lifecycle wiring is more deterministic.** Gemini adapter-owned session listeners are disposed/reassigned on close/session id changes, and Core runtime factory callback cycles now use explicit deferred refs instead of definite assignment assertions.

### Tests
- **Runtime remediation verification passed before release packaging.** Passed focused PM/Core/provider regression tests plus webview typecheck/build, Project Manager build, Claude/Codex/Gemini provider builds, and Core build.

## [1.2.102] - 2026-04-28
### Fixed
- **Session model binding now survives real workflow continuity.** Core persists `session.modelBinding` into continuity segment/index data, hydrates restored Project Manager dialogs from that binding, and clones it for `Remaining context threshold (%)` continuation sessions instead of rereading the current Settings default.
- **Project Manager no longer relabels bound sessions from unbound runtime fallbacks.** Client bridge normalization preserves Core `modelBinding`, dialog bootstrap carries it into placeholders, and runtime model sync refuses to overwrite a binding-owned label with a Settings-derived update.

### Tests
- **Persistent binding regression coverage passed before release packaging.** Passed Core build, webview build/typecheck, Project Manager build, and focused regressions for same-provider sessions with different bound models, restored dialog binding, continuity persistence, and rollover inheritance.

## [1.2.101] - 2026-04-28
### Added
- **Workflow sessions now bind their model identity at creation time.** Core stores a session-scoped effective model binding, serializes it through session/runtime snapshots, and uses it for later turns instead of letting Settings changes rewrite existing sessions.
- **Explicit model switching now updates the session binding intentionally.** The `switch_model` path mutates the logical session binding and preserves the effective `session:model:update` broadcast contract.

### Fixed
- **Project Manager keeps bound session labels stable across Settings edits.** Session snapshots are seeded from `SessionRecord.modelBinding`, Settings sync no longer overwrites binding/runtime-owned model info, and same-provider sessions can display different frozen model labels.

### Tests
- **Targeted SMB verification passed before release packaging.** Passed Core build, webview build, webview typecheck, and focused regression coverage for session-bound model labels and Settings sync ownership.

## [1.2.100] - 2026-04-28
### Changed
- **Codex GPT translation engines are now translator-only by contract.** `gpt-5.4-mini` and `gpt-5.3-codex-spark` translation calls use dedicated translation instructions that forbid workflow-agent work, tools, shell/file/patch access, web search, planning, and user-input requests.
- **Codex translation capture is guarded against workflow prompt leakage.** The `Translation` native request capture route now verifies the `translation` purpose, `codex:translation` process profile, `codex:translation-tools-minimal` policy key, `workflowPrompt = null`, and zero workflow prompt metadata.

### Tests
- **Targeted Codex/Core verification passed before release packaging.** Passed Codex App Server and Core builds plus focused native capture, Codex diagnostic capture, and model invocation profile tests.

## [1.2.99] - 2026-04-28
### Added
- **Model invocation profiles now separate workflow-agent and translation purposes.** Core resolves provider/model/step profiles with compatible model lists, keeps `diagnostic` as a capture mode rather than a profile, and loads user-editable text-only instruction fragments without exposing process flags, tools, sandbox, or approval policy.
- **Template sync now preserves user-modified instruction templates.** Clean bundled templates update in place, user edits are preserved, incoming bundled candidates are staged under `.incoming/<version>/`, and Project Manager settings can resolve updates by group or file.
- **Codex GPT translation engines now use the Codex App Server path first.** Core registers provider-owned Codex translation wrappers for the public Codex GPT translation ids, uses the translation-specific App Server profile, and keeps the shared `codex exec` engine as fallback during migration.
- **Provider Native Request Capture includes a real Translation scenario.** The Settings capture card adds `Translation`; Core routes it through the translation invocation profile with a small fixed sample instead of a workflow first-turn prompt.

### Tests
- **Targeted profile and release checks passed before release packaging.** Passed Codex App Server, Core, translation, webview typecheck/build, Project Manager build, and focused regression tests for profile resolution, template overrides, Codex translation fallback, engine registration, and translation native request capture.

## [1.2.98] - 2026-04-27
### Changed
- **Main repository release rebuilt after retest merge.** This release packages the merged `main` line after `1.2.97`, combining the main-line Codex reasoning paragraph/translation timeout work with the retest-line Spark compatibility, progress-update guard, provider SDK/raw log removal, and provider-home summary config materialization.

### Tests
- **Release verification build planned from a clean main tree.** The release flow rebuilds provider modules, Core, UI bundles, CEF launcher, runtime tarballs, and the final VSIX from the merged repository state.

## [1.2.97] - 2026-04-27
### Changed
- **Merged the main-line Codex reasoning paragraph stream work into the retest release line.** Codex reasoning summaries keep stable per-block ids and can be emitted paragraph-by-paragraph for progressive translation overlays.
- **Merged the main-line reasoning translation timeout adjustment.** Live reasoning overlay translation keeps the longer timeout profile from the main branch, reducing fallback English paragraphs for large Codex reasoning summaries.

### Fixed
- **Codex Spark remains compatible without reintroducing the unsupported turn parameter.** `gpt-5.3-codex-spark` still omits explicit `turn/start.summary`, and the Codex App Server process materializes provider-home `model_reasoning_summary = "auto" | "none"` from shared Codex settings before startup. User retest showed Spark still may not emit readable reasoning summaries; this is left as a provider-side limitation while preserving successful turns.
- **Non-Spark Codex summary behavior is guarded.** Other Codex models keep the existing explicit `turn/start.summary = "detailed" | "none"` path, so the Spark compatibility fix does not weaken normal visible reasoning controls.

### Tests
- **Targeted Codex provider checks passed.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module` and direct Node tests for provider-home summary materialization, Spark summary omission, non-Spark `gpt-5.5` summary preservation, native request capture parity, and main-line reasoning paragraph streaming.
- **Targeted Core session-translation verification passed on the main line before merge.** Passed `npm run build --workspace=@codeai-hub/core` plus `node --test packages/core/dist/session-translation/session-translation-facade.test.js`.

## [1.2.96] - 2026-04-27
### Fixed
- **Codex Spark no longer receives unsupported explicit reasoning-summary parameters.** Normal Codex App Server turns and native request capture now omit `turn/start.summary` for `gpt-5.3-codex-spark`, avoiding the provider error `Unsupported parameter: 'reasoning.summary'`.
- **Codex Spark translation runtime is protected too.** Localization/reasoning translation uses `codex exec`, not App Server, but its temporary `config.toml` also now omits explicit `model_reasoning_summary` for `gpt-5.3-codex-spark`. Other Codex translation models still keep `model_reasoning_summary = "none"`.

### Tests
- **Targeted Codex provider checks passed.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module` and regression tests for normal runtime/native capture Spark summary omission.
- **Targeted translation checks passed.** Passed `npm run build --workspace @codeai-hub/translation` and `node --test packages/translation/dist/codex-translation-runtime-home-facade.test.js`.

## [1.2.95] - 2026-04-27
### Changed
- **Codex progress updates are explicitly non-terminal.** The shared Codex early-workflow prompt now states that after an ordinary visible progress update, Codex must continue the same turn until the promised work or requested artifact is complete.
- **The guard is provider-level, not Description-specific.** No Description templates were changed; the rule applies through the shared Codex workflow prompt used by all Codex models and current early-workflow steps.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; runtime prompt and synced Codex prompt artifact have matching `Progress Updates` sections.

## [1.2.94] - 2026-04-27
### Changed
- **Provider-owned SDK/raw file logs are removed from runtime.** Claude, Codex, and Gemini no longer construct or call the file-backed mirrors under `~/.codeai-hub/logs/{claude,codex,gemini}`.
- **Codex app-server logger code is gone, not just disabled.** The deleted transport logger path removes SDK-log serialization from `child.stdin.write(...)` and app-server notification fan-out.
- **Runtime evidence is now explicit.** Audits should use live provider streams, session-local normalized history, provider-home artifacts, and optional native request capture instead of always-on SDK/raw JSONL mirrors.

### Tests
- **Provider cleanup verification passed.** `rg` found no runtime references to the removed SDK/raw loggers in `packages`, and targeted builds passed for Codex app-server, Claude, and Gemini provider modules.

## [1.2.93] - 2026-04-27
### Changed
- **Codex SDK transport logs are disabled.** `codex-app-server-session-logger.ts` is now a no-op compatibility shim and no longer creates process-wide or per-thread JSONL files under `~/.codeai-hub/logs/codex/`.
- **Runtime evidence stays on the real runtime paths.** Codex behavior continues to come from the live app-server JSON-RPC stream, provider-home rollout artifacts, session-local normalized dialog JSONL, and optional native request capture rather than from SDK transport logs.
- **Diagnostic report updated with the `1.2.92` result.** The retest confirmed that split file names were not the trigger; the remaining risk was filesystem work from SDK transport logging, which this release removes.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; Husky pre-commit gates passed on the implementation commit.

## [1.2.92] - 2026-04-27
### Changed
- **Diagnostic retest: Codex app-server logs keep split names but return to the flat log root.** Process-wide logs now use `~/.codeai-hub/logs/codex/sdk-codex-app-server-process-*.jsonl`, while per-thread logs use `~/.codeai-hub/logs/codex/sdk-codex-thread-<threadId>-*.jsonl`.
- **The split-folder `app-server-process/` and `threads/` layout from `1.2.91` is intentionally removed for this test.** This isolates whether ordinary Codex progress-message loss follows separate log folders / thread-log mkdir timing rather than file naming.
- **Diagnostic report added.** `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_Progress_Message_Regression_Diagnostics_1.2.91.md` records the evidence from `1.2.90` and `1.2.91`, including provider-native confirmation that system instructions were present.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; Husky pre-commit gates passed on the implementation commit.

## [1.2.91] - 2026-04-27
### Changed
- **Diagnostic retest: Codex app-server logs use split folders without the extra creation event.** Process-wide logs are written under `~/.codeai-hub/logs/codex/app-server-process/sdk-codex-app-server-process-*.jsonl`, and per-thread logs are written under `~/.codeai-hub/logs/codex/threads/sdk-codex-thread-<threadId>-*.jsonl`.
- **The `thread_log_created` process-log record from `1.2.89` remains disabled.** This isolates whether the folder/name split alone affects ordinary Codex progress-message emission.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; Husky pre-commit gates passed on the implementation commit.

## [1.2.90] - 2026-04-27
### Changed
- **Rollback retest: Codex diagnostic log layout returns to the `1.2.88` shape.** The per-thread SDK sublog remains enabled, but process and thread JSONL files are again written side-by-side under `~/.codeai-hub/logs/codex/` with the `sdk-codex-app-server-*.jsonl` and `sdk-codex-app-server-thread-<threadId>-*.jsonl` names.
- **The `1.2.89` folder split is intentionally removed.** This release is meant to test whether ordinary Codex progress messages return when only the log-layout cleanup is rolled back.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; Husky pre-commit gates passed on the rollback commit.

## [1.2.89] - 2026-04-27
### Changed
- **Codex app-server diagnostics now separate process and thread logs by folder.** Process-wide transport logs are written under `~/.codeai-hub/logs/codex/app-server-process/sdk-codex-app-server-process-*.jsonl`, while per-rollout/thread mirrors are written under `~/.codeai-hub/logs/codex/threads/sdk-codex-thread-<threadId>-*.jsonl`.
- **Process logs now point to their thread sublogs.** When a thread sublog is created, the process log records `thread_log_created` with the `threadId` and target path, making the two diagnostic layers explicit instead of looking like duplicate SDK sessions.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; Husky pre-commit gates passed on the implementation commit.

## [1.2.88] - 2026-04-27
### Added
- **Codex app-server now writes per-thread SDK sublogs.** In addition to the process-wide `sdk-codex-app-server-*.jsonl`, the Codex transport logger now writes `sdk-codex-app-server-thread-<threadId>-*.jsonl` for each rollout/thread so retests can inspect one Description run without manually filtering a long-lived app-server process log.
- **Thread sublogs preserve the app-server request/response boundary.** `thread/start` is attached after the returned `threadId` is known, while `turn/start` requests, matching responses, and thread-scoped notifications are written directly to the matching sublog.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace @codeai-hub/codex-app-server-module`; Husky pre-commit gates passed on the implementation commit.

## [1.2.87] - 2026-04-27
### Changed
- **Controlled Codex progress-message rollback release.** This release is intentionally built from the `1.2.86` baseline so the Codex Description-step retest can verify whether ordinary user-visible assistant progress messages still appear before the later reasoning paragraph streaming changes.
- **No implementation behavior is changed before the retest.** The goal is to produce a clean installable package from the known-good progress cadence baseline and collect runtime evidence.

### Tests
- **Full release automation is the acceptance gate.** `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version` must complete for this rollback/retest package.

## [1.2.86] - 2026-04-27
### Changed
- **Codex progress-update cadence is stricter for long turns.** The early-architecture prompt now tells Codex not to continue silently through several internal analysis/tool cycles and to send a visible update about every 30 seconds while still working.
- **Codex has a work-cycle fallback when elapsed time is hard to estimate.** After 3-5 substantial tool calls, file-reading steps, or internal analysis cycles without a visible update, the prompt asks for one short visible assistant message before continuing.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace=@codeai-hub/codex-app-server-module` and Husky pre-commit gates on the prompt cadence change commit.

## [1.2.85] - 2026-04-27
### Changed
- **Codex progress-update prompt wording now targets visible chat messages.** The CodeAI Hub-owned Codex early-architecture prompt asks for ordinary user-visible assistant chat messages and explicitly excludes reasoning summaries, hidden commentary, tool-call notes, metadata, and other non-user-visible channels.
- **The agreed Codex system-prompt artifact stays in sync with runtime.** `Codex_My_System_Prompt.md` and `CODEAI_CODEX_EARLY_ARCHITECTURE_SYSTEM_PROMPT` now match exactly for the tuned Progress Updates section.

### Tests
- **Targeted Codex provider build passed before release.** Passed `npm run build --workspace=@codeai-hub/codex-app-server-module` and Husky pre-commit gates on the prompt change commit.

## [1.2.84] - 2026-04-27
### Added
- **Codex Settings now exposes `gpt-5.2` and `gpt-5.3-codex-spark`.** The shared Codex model registry and Core settings defaults accept both model IDs with default reasoning `medium`.
- **Codex model order is numeric/provider-family ascending.** Settings now lists `gpt-5.2`, `gpt-5.3-codex-spark`, `gpt-5.3-codex`, `gpt-5.4-mini`, `gpt-5.4`, then `gpt-5.5`.

### Fixed
- **Settings General footer no longer scrolls past the action bar.** The Settings shell clips outer overflow, the tab body owns vertical scrolling, and the footer remains anchored/reachable.

### Tests
- **Targeted checks covered the changed UI/Core surfaces.** Passed `npm run build:webview`, `npm run build:core`, and Husky pre-commit gates on all implementation commits.

## [1.2.83] - 2026-04-25
### Changed
- **Main merge verification release.** Confirms that the completed `codex/claude-instruction-stack-tests` work is present on `main` and that the merged branch can pass the full release packaging flow.
- **No new runtime behavior is introduced.** The `1.2.82` provider instruction/tool-profile baseline is carried forward unchanged.

### Tests
- **Release automation is the acceptance gate.** `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version` must complete for `1.2.83`, including SDK exclusion verification, production dependency pruning and VSIX package creation.

## [1.2.82] - 2026-04-25
### Changed
- **Codex App Server теперь тестирует documentation tool profile.** Normal Codex runtime и Settings diagnostic capture стартуют с отключенными `multi_agent`, browser/computer surfaces, `image_generation`, plugins/apps/tool-search и provider-home MCP servers `codex` / `playwright`.
- **Retest должен проверить минимальный provider-native tool surface.** Ожидаемый keep-list: `exec_command`, `write_stdin`, `apply_patch`, `update_plan`, `web_search`, `view_image`; ожидаемое удаление: `mcp__playwright__`, `mcp__codex__`, MCP resource tools и `image_generation`.
- **`request_user_input` остается evidence-gated.** Отдельного подтвержденного removal knob пока нет: `default_mode_request_user_input` уже был `false`, но tool оставался в предыдущем capture.

### Tests
- **Targeted checks закрывают startup-profile wiring.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node tests для `codex-app-server-process`, `codex-app-server-facade`, `codex-native-request-capture-service`.

## [1.2.81] - 2026-04-25
### Changed
- **Codex App Server теперь тестирует отключение `multi_agent`.** Normal Codex runtime и Settings diagnostic capture стартуют `codex app-server --disable multi_agent`, чтобы проверить удаление subagent tool family из provider-native request.
- **Retest должен проверить уменьшение Codex `body.tools`.** Ожидаемый target: `spawn_agent`, `send_input`, `resume_agent`, `wait_agent`, `close_agent` отсутствуют; остальные Codex tool classes пока не меняются.

### Tests
- **Targeted checks закрывают startup-flag wiring.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node tests для `codex-app-server-process`, `codex-app-server-facade`, `codex-native-request-capture-service`.

## [1.2.80] - 2026-04-25
### Changed
- **Claude workflow runtime теперь тестирует explicit `Read` / `Write` / `Edit` tool allowlist.** Normal SDK turns и Settings diagnostic capture передают `tools: ["Read", "Write", "Edit"]`, чтобы проверить, заменяет ли Claude Agent SDK default Claude Code tool declarations или добавляет allowlist поверх них.
- **Retest должен проверить удаление Agent/Skill шума.** Ожидаемый native request target: `body.tools` содержит только `Read`, `Write`, `Edit`; `Agent`, subagents, `Skill`, `ScheduleWakeup`, `ToolSearch` и broad exploration guidance отсутствуют.

### Tests
- **Targeted checks закрывают SDK option wiring.** Пройдены `npm run build --workspace=@codeai-hub/claude-module` и direct node tests для `claude-sdk-manager` / `claude-native-request-capture-service`.

## [1.2.79] - 2026-04-25
### Fixed
- **Native Request Capture Markdown больше не размножает большие prompt payload.** Raw request body, ignored request details и provider diagnostic context теперь печатаются как summary; полный читаемый system/tools/messages остается в extracted sections, а full-fidelity payload сохраняется в JSONL.
- **Claude и Codex capture logs стали менее неоднозначными.** Claude workflow prompt больше не повторяется в `.md` через parsed body/bodyText/section extracts, а Codex custom system prompt не дублируется через diagnostic context.

### Tests
- **Targeted checks закрывают Markdown dedupe.** Пройдены `npm run lint`, `npm run build --workspace=@codeai-hub/core`, `node --test packages/core/dist/provider-network-capture/native-request-capture-writer.test.js packages/core/dist/provider-network-capture/native-request-capture-facade.test.js`.

## [1.2.78] - 2026-04-25
### Fixed
- **Provider startup auto-update восстановлен для Project Manager settings.** Core на старте читает persisted `settings.json`, применяет `providers.*.autoUpdate.enabled`, последовательно запускает update targets и только после этого инициализирует provider registry.
- **Claude auth preflight больше не запускает интерактивный `npx @anthropic-ai/claude-code --version`.** SDK/runtime/diagnostic/translation paths передают установленный `claude` executable из `SDKInstaller`; `ensureInstalled()` больше не делает скрытый latest-check при каждом старте.
- **Native Request Capture различает unsupported и not-ready provider.** Для известного provider descriptor без initialized adapter Core возвращает `provider_not_ready`, что делает стартовую ошибку Claude/Opus диагностически честной.

### Tests
- **Targeted checks закрывают startup update, Claude preflight и capture readiness.** Пройдены `npm run build --workspace=@codeai-hub/core`, `npm run build --workspace=@codeai-hub/claude-module`, direct node tests для `settings-provider-auto-update-service`, `native-request-capture-facade`, `claude-sdk-manager`, `claude-native-request-capture-service` и `claude-haiku-translation-service`.

## [1.2.77] - 2026-04-25
### Changed
- **Codex runtime теперь использует CodeAI Hub-owned early-architecture instruction profile.** Normal `thread/start` и Settings diagnostic capture передают compact `baseInstructions` и `config.project_doc_max_bytes = 0`.
- **Claude runtime теперь использует общий CodeAI Hub workflow `systemPrompt`.** Normal SDK turns и diagnostic capture передают `CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT`, сохраняя `settingSources: []`.

### Tests
- **Targeted checks закрывают request-shape changes.** Пройдены targeted builds/tests для `@codeai-hub/codex-app-server-module` и `@codeai-hub/claude-module`.

## [1.2.76] - 2026-04-25
### Added
- **Codex settings теперь включают `gpt-5.5`.** Shared Codex model registry добавляет `GPT-5.5`, и Settings -> General -> Provider Native Request Capture получает новую кнопку через существующий `CODEX_SETTINGS_MODELS` source of truth.
- **Core defaults принимают GPT-5.5 reasoning state.** Core settings resolver и persisted snapshot defaults знают `gpt-5.5` с default reasoning `medium`, сохраняя те же уровни `low` / `medium` / `high` / `xhigh`, что и у `gpt-5.4`.

### Tests
- **Targeted checks закрывают UI/Core model propagation.** Пройдены `npm run build --workspace=@codeai-hub/core`, `npm run build:webview` и `npm run typecheck:webview`.

## [1.2.75] - 2026-04-25
### Changed
- **Codex diagnostic capture временно убирает compact `baseInstructions`.** Temporary App Server `thread/start` снова не отправляет `baseInstructions`, чтобы retest мог собрать полный provider/system base prompt для выбранной Codex-модели.
- **X8 cleanup остается включенным.** `config.project_doc_max_bytes = 0` сохраняется, поэтому model-specific base prompt собирается без project `AGENTS.md` / `turn_context.user_instructions` шума.

### Tests
- **Targeted checks закрывают full-base-prompt retake request shape.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node test для `codex-native-request-capture-service`.

## [1.2.74] - 2026-04-25
### Changed
- **Codex diagnostic capture теперь отправляет compact `baseInstructions`.** Temporary App Server `thread/start` получает diagnostic-only compact system prompt через `baseInstructions` и сохраняет X8 cleanup `config.project_doc_max_bytes = 0`.
- **Retest проверяет замену system/base prompt, а не developer instructions.** Capture должен показать новый compact prompt в `thread/start.request.baseInstructions`, native `response.create.instructions` и provider-home `base_instructions.text`.

### Tests
- **Targeted checks закрывают compact baseInstructions request shape.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node test для `codex-native-request-capture-service`.

## [1.2.73] - 2026-04-25
### Changed
- **Codex diagnostic capture снова включает X8 `project_doc_max_bytes = 0`.** Temporary App Server `thread/start` получает diagnostic-only `config.project_doc_max_bytes = 0`, чтобы проверить удаление project `AGENTS.md` уже после фикса полной observability.
- **Проверка теперь должна проходить по одному artifact.** `.md` / `.jsonl` содержит `thread/start`, native WebSocket frame и embedded `codex_provider_home_rollout_context`; retest должен показать отсутствие `AGENTS.md` и пустой/без-project `turn_context.user_instructions` без ручного открытия rollout-файла.

### Tests
- **Targeted checks закрывают X8 full-capture request shape.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node test для `codex-native-request-capture-service`.

## [1.2.72] - 2026-04-25
### Fixed
- **Codex native capture теперь встраивает provider-home rollout context в основной artifact.** Diagnostic run читает rollout JSONL из `thread/start.response.thread.path` и пишет его в `Provider Diagnostic Context` как `codex_provider_home_rollout_context`, чтобы `.md` / `.jsonl` показывали полный `turn_context.user_instructions` / `AGENTS.md` слой без ручного поиска второго файла.
- **Диагностический X8 flag убран из текущего baseline-релиза.** `project_doc_max_bytes = 0` больше не отправляется в `thread/start`; релиз нужен для no-flag baseline полной структуры запроса перед следующими flag experiments.

### Tests
- **Targeted checks закрывают rollout snapshot и no-flag request shape.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node test для `codex-native-request-capture-service`.

## [1.2.71] - 2026-04-25
### Changed
- **Codex diagnostic capture теперь отправляет `project_doc_max_bytes = 0` в App Server `thread/start`.** Это первый X8 flag experiment для проверки, можно ли убрать project `AGENTS.md` из Codex instruction sources без изменения normal workflow runtime path.
- **Флаг ограничен Settings -> General native request capture.** `CodexNativeRequestCaptureService` меняет только временный isolated App Server diagnostic process; обычные Codex sessions остаются на прежнем `CodexAppServerFacade` path.

### Tests
- **Targeted checks закрывают X8 diagnostic request shape.** Пройдены `npm run build --workspace=@codeai-hub/codex-app-server-module` и direct node test для `codex-native-request-capture-service`.

## [1.2.70] - 2026-04-25
### Changed
- **Claude diagnostic capture перешёл с Claude Code preset на custom-only neutral system prompt.** `ClaudeNativeRequestCaptureService` теперь передает строковый `systemPrompt` с нейтральными operating rules вместо `{ type: "preset", preset: "claude_code" }`.
- **System prompt не содержит product/wrapper identity.** Новый diagnostic prompt не упоминает CodeAI Hub, orchestrator/wrapper или third-party app, а фиксирует только instruction priority, source boundaries, artifact-first workflow, assumptions/scope control и communication rules.
- **Workflow templates остаются user-message contract.** Stage-specific инструкции из template path не переносятся в system prompt; capture должен подтвердить, что они остаются в `body.messages`.

### Tests
- **Targeted checks закрывают custom systemPrompt option.** Пройдены `npm run build --workspace @codeai-hub/claude-module` и direct node test для `claude-native-request-capture-service`.

## [1.2.69] - 2026-04-24
### Fixed
- **Claude native capture больше не завершается на translation/localization request.** Core diagnostic proxy теперь требует agent-loop tool declarations для Claude `api.anthropic.com/v1/messages` target rule, поэтому Haiku translation requests записываются как ignored/intermediate и не закрывают capture раньше workflow request.

### Tests
- **Targeted checks закрывают corrective filter.** Пройдены `npm run build --workspace @codeai-hub/core` и direct node test для `native-request-capture-facade`.

## [1.2.68] - 2026-04-24
### Changed
- **Claude diagnostic capture включает Claude Code preset system prompt.** `ClaudeNativeRequestCaptureService` теперь передает SDK option `systemPrompt: { type: "preset", preset: "claude_code" }` вместе с существующим `settingSources: []`.
- **Capture path остается изолированным экспериментом.** Изменение не трогает tools, permissions, sandbox, model selection, thinking policy или normal workflow send path.

### Tests
- **Targeted checks закрывают новый SDK option.** Пройдены `npm run build --workspace @codeai-hub/translation`, `npm run build --workspace @codeai-hub/claude-module` и direct node test для `claude-native-request-capture-service`.

## [1.2.67] - 2026-04-24
### Added
- **Codex capture artifacts получили `Provider Diagnostic Context`.** JSONL/Markdown теперь сохраняют provider-supplied diagnostic records отдельно от native request body.
- **Codex diagnostic run записывает app-server payloads.** Temporary App Server capture фиксирует `thread/start` request/response и `turn/start` request/response, включая полный workflow prompt в `turn/start.input[0].text`.

### Changed
- **Codex capture теперь честно показывает два слоя.** Native WebSocket request остаётся provider-network surface с системными инструкциями/tools, а app-server context показывает фактический turn payload, который CodeAI Hub отправил через штатный diagnostic path.
- **Markdown writer вынес форматирование в отдельный helper.** `native-request-capture-writer.ts` больше не находится у 500-line limit и остаётся тонким владельцем записи артефактов.

### Tests
- **Targeted checks закрывают новый diagnostic context path.** Пройдены сборки Core/Codex App Server module и node tests для native capture writer/facade/WebSocket плюс Codex native request capture service.

## [1.2.66] - 2026-04-24
### Added
- **Settings -> General получил workflow scenario selector для Native Request Capture.** Диагностика теперь может отправить `Description`, `Virtual Simulation` или `Diagram Modules` first-turn prompt вместо generic probe.

### Changed
- **Capture prompt строится через штатный Project Manager workflow path.** PM использует `buildWorkflowPromptPack(...)` для выбранного сценария и передаёт `scenarioPrompt` в Core; provider diagnostics используют `workflowPrompt ?? probePrompt` без создания workflow sessions или записи артефактов.
- **Capture artifacts фиксируют scenario metadata.** JSONL/Markdown `capture_start` показывает выбранный сценарий рядом с model/applied config, чтобы сравнивать эффект изменений флагов и инструкций на одном и том же workflow turn.

### Fixed
- **Codex WebSocket capture теперь выбирает full-turn payload.** Proxy пишет несколько client frames и ждёт useful frame с non-empty `input` / non-`generate:false`, поэтому Markdown primary request больше не оказывается ранним служебным frame.

### Tests
- **Targeted checks закрывают scenario prompt и full-turn capture.** Пройдены webview/core/provider сборки, provider diagnostic tests, writer tests и Codex WebSocket multi-frame tests.

## [1.2.65] - 2026-04-24
### Added
- **Settings -> General теперь позволяет выбрать модель для Native Request Capture.** Claude и Codex capture controls получили provider-local model selectors; выбранная модель применяется только к диагностическому запуску и не сохраняется как default.

### Changed
- **Native Request Capture теперь идёт по app-path config resolver.** Webview/Project Manager/Core протягивают `modelId`, Core резолвит normal applied turn config, а provider diagnostics используют selected/applied model, Claude thinking/effort и Codex effort/summary вместо старых diagnostic-only defaults.
- **Capture artifacts показывают applied config и все matched requests.** JSONL `capture_start` фиксирует selected model и resolved applied config; Markdown перечисляет все захваченные provider requests, выбирает последний matched request как primary и извлекает Codex `instructions` / `input` в читаемые sections.

### Tests
- **Targeted checks закрывают новый capture путь.** Пройдены `build:webview`, `typecheck:webview`, сборки core/Claude/Codex modules и node tests для writer + provider diagnostic services.

## [1.2.64] - 2026-04-24
### Fixed
- **Native Request Capture теперь умеет читать первый Codex WebSocket payload.** Diagnostic proxy отвечает локальным `101 Switching Protocols`, разбирает masked client frame и пишет фактический JSON body в JSONL/Markdown вместо одного HTTP upgrade без тела.
- **Ignored provider requests стали диагностируемыми.** Для `request_path_not_matched` и других ignored events JSONL/Markdown теперь фиксируют method/path, redacted headers, bodyText/body, reason и target, чтобы было видно, что именно клиент пытался отправить.
- **TLS socket errors больше не затирают уже собранную трассу.** Ошибки TLS-сокета после observed request записываются как ignored diagnostics, а не как преждевременный terminal `tls_trust_failed`.

### Tests
- **Добавлены targeted regression tests для WebSocket frame parsing и ignored diagnostics.** Core tests проверяют RFC accept header, masked JSON frame parsing, Markdown/JSONL ignored details и proxy ignored CONNECT event.

## [1.2.63] - 2026-04-24
### Fixed
- **Native Request Capture больше не вызывает provider adapter method без class receiver.** Core `NativeRequestCaptureFacade` вызывает `captureNativeRequest` через adapter object, поэтому class-based Claude/Codex adapters сохраняют `this.nativeRequestCaptureService` и не падают до запуска diagnostic runtime.
- **Ранний provider failure теперь виден в capture artifacts.** JSONL получает `provider_runtime_error`, Markdown получает `Provider Runtime Error` с message/stack, поэтому пустой capture больше не выглядит как молчаливый timeout без причины.
- **Proxy stop очищает pending capture timeout.** При provider failure Core останавливает proxy без позднего второго `capture_end timeout`, чтобы artifact не смешивал первичную runtime ошибку с вторичным ожиданием.

### Tests
- **Regression test покрывает найденный live bug.** Core facade test теперь использует class-style adapter, чей `captureNativeRequest` пишет в `this`, и отдельно проверяет provider runtime diagnostics в `.jsonl` / `.md`.

## [1.2.62] - 2026-04-24
### Added
- **Settings -> General получил native request capture диагностику для Claude и Codex.** Новая bottom card запускает one-shot commands `Capture Claude Native Request` и `Capture Codex Native Request`, показывает running/success/error state и возвращает пути к `.md` / `.jsonl` артефактам.
- **Core добавил локальный provider-native capture слой.** `provider-network-capture` запускает `127.0.0.1` CONNECT/TLS proxy, готовит diagnostic CA/host certs, пишет Markdown + JSONL, редактирует credential-bearing headers и завершает captured request без forwarding к Anthropic/OpenAI.

### Changed
- **Claude capture идёт через Agent SDK runtime path, а Codex capture — через временный isolated App Server process.** Оба пути используют тот же provider bootstrap/auth/settings контур, который нужен для сборки native request, но diagnostic run не привязывается к обычной workflow continuity.
- **Remote Bridge и Project Manager получили новый settings command/result contract.** Host принимает `settings:native-request-capture`, возвращает `settings:native-request-capture:result`, а Settings UI отображает artifact paths без сохранения каких-либо новых settings.

### Docs
- **SSOT обновлён под новый diagnostic feature.** `SystemArchitecture.md`, `Modules/Claude.md`, `Modules/Codex.md`, `Modules/UI_Bundles.md` и `Docs_Index.md` фиксируют capture-and-abort contract, provider boundaries, artifact output и Settings ownership.

## [1.2.61] - 2026-04-23
### Fixed
- **Canonical settings path теперь жёстко зафиксирован на `~/.codeai-hub/settings/settings.json`.** Core config bootstrap больше не выбирает `claude.json` как runtime fallback path, поэтому launcher/Core startup и Core-owned settings persistence больше не могут resurrect full unified snapshot под legacy filename.
- **Core materialize-ит default `settings.json` уже на startup/settings bootstrap, если canonical файла нет.** `SettingsPersistenceService` делает best-effort startup prime для normalized default snapshot, так что после удаления `claude.json` новый persisted settings file появляется сразу на canonical path.

### Changed
- **VS Code extension settings storage полностью перестал консультироваться с `claude.json`.** Extension-side `loadSettingsSnapshot()` теперь работает только с `settings.json`; legacy fallback удалён, вместе с мёртвым exported helper для old Claude-only thinking migration.
- **SSOT обновлён под hard cutover.** `SystemArchitecture.md` и `EffectiveModelIdentity_And_Settings_SSOT.md` теперь явно фиксируют, что `settings.json` — единственный поддерживаемый runtime settings snapshot, а `claude.json` не участвует в нормальном read/write contract.

## [1.2.60] - 2026-04-23
### Fixed
- **VS Code extension webview теперь получает локализованный bootstrap snapshot при первом рендере.** `HomeViewProvider` ранее всегда передавал `localizationBootstrap: null` в `WebviewHtmlGenerator.generate`, из-за чего `window.__CODEAI_LOCALIZATION_BOOTSTRAP__` стартовал пустым, и `SettingsOnlyHost` рендерил English fallback вплоть до прихода `settings:loaded` message (на практике пользователь видел English не дожидаясь update'а). Теперь `resolveWebviewView` вызывает `LocalizationRuntimeService.loadRuntimeBootstrapSnapshot(loadSettingsSnapshot())` и инжектит результат в HTML до mount'а React — тот же контракт, что уже работает в Project Manager.

### Changed
- **Retag `extension_shell.role.title` как UI Labels.** Короткий section title классифицируется как `UI Labels` per `UserFacing_Text_Localization_Boundary §3.1`, не как `UI Helper Text`. Ключ перенесён из `assets/localization/source/en/ui_helper_text.json` в `assets/localization/source/en/ui_labels.json`; `SettingsOnlyHost` теперь резолвит заголовок через runtime категорию `ui_interface`. Body и Hint остаются в `user_guidance` как explanatory paragraphs.

## [1.2.59] - 2026-04-23
### Changed
- **VS Code extension webview (SettingsOnlyHost) теперь показывает steady-state описание роли расширения**, а не устаревшее сообщение о переезде настроек в Project Manager. Новый текст: "This extension is for install and updates only" + два параграфа про то, что весь функционал живёт в Project Manager (иконка на рабочем столе после первого запуска).
- **Локализация**: добавлены approved ключи `extension_shell.role.{title,body,hint}` в `assets/localization/source/en/ui_helper_text.json` (категория `user_guidance`). Ключи переводятся на активный UI language через стандартный UI Helper Text pipeline.
- **Retired**: fallback-only ключи `settings.only.compat_{body,hint,notice}` удалены из компонента (в source dictionary их никогда и не было). Третий `<p>` compat notice удалён — сообщение теперь двухабзацное.
- **aria-label** webview region мирроррит локализованный заголовок вместо хардкод-английского "Settings moved to Project Manager".

## [1.2.58] - 2026-04-23
### Fixed
- **CI quality-gate Lint step больше не падает за 0 секунд на Ubuntu runner.** Root cause: Biome доставляет native binary через platform-specific optional packages (`@biomejs/cli-<os>-<arch>`), и наш `package-lock.json` генерируется на macOS Apple Silicon → в `packages` секции lockfile только `@biomejs/cli-darwin-arm64`. `npm ci` строго следует lockfile, не устанавливает Linux binary, shim `biome` падает `require.resolve` мгновенно. Фикс: все 7 non-host `@biomejs/cli-*` пакетов добавлены в root `optionalDependencies` с exact pinned version 2.4.7, что делает их tracked в `packages` секции lockfile с `os/cpu` guards. На каждой платформе npm ставит только свой binary; CI Ubuntu теперь находит Linux binary. Предыдущие 9 runs (#43-#52) падали по этой причине.

### Changed
- **Knip step в CI переведён в advisory режим** (`continue-on-error: true`). Knip завершается с exit 1 на Ubuntu runner за ~1 секунду без видимого output, при этом локально на macOS с теми же lockfile/config/Node version exit 0 даже в `CI=true GITHUB_ACTIONS=true`. Pre-commit hook локально продолжает запускать Knip в strict режиме, поэтому dead code detection сохранена как gate перед push; на CI она advisory до диагностики Linux-specific причины.
- **SystemArchitecture.md: Invariant §34 добавлен** — "CI quality-gate platform-binary invariant". Фиксирует контракт: при bump'е Biome (и других toolchain с native binaries) все platform-specific CLI packages обязаны быть в root `optionalDependencies` синхронно, иначе CI на non-host платформах упадёт без объяснений.

## [1.2.57] - 2026-04-23
### Changed
- **PM footer: убран дубликат workspace identity.** `StatusBar` больше не рендерит левый блок с плашкой `CONTEXT` и именем workspace — workspace selector в левом sidebar остаётся единственным visible surface для workspace identity. Prop `workspaceName` удалён из `StatusBar`, связанные локализационные ключи (`pm.status_bar.context_label`, `pm.status_bar.no_workspace_label`) удалены из approved dictionary.
- **PM footer: кнопка `Open Settings` выведена в primary action.** Кнопка получила выделенный CSS-класс `pm-status-open-settings` вместо generic `pm-status-zoom`. Typography выровнена с `WORKFLOW TREE MVP` (uppercase, letter-spacing `0.08em`, font-size 12px), но выделена цветом через PM accent. Три визуальные фазы: default (accent border + tinted background), hover (brighter accent, primary text), active/pressed (deeper accent + inset shadow + translateY(1px)), плюс focus-visible outline для keyboard navigation.

## [1.2.56] - 2026-04-23
### Fixed
- **Detached Digital Models popup больше не закрывает весь standalone Project Manager.** `LauncherWindowDelegate` теперь различает main window и popup window, поэтому auxiliary detached diagram popup больше не маршрутизируется в whole-app `RequestNativeApplicationTermination()` path.
- **Detached popup больше не наследует autosaved frame главного PM окна.** Launcher перестал применять restore/tracking/persist path к popup browsers, а PM detach action теперь даёт explicit popup-sized open hint (`width=1180,height=820`), так что окно стартует в более узком artifact-oriented формате.

### Changed
- **CEF/PM contract уточнён на уровне bug history и SSOT.** `BugRegistry.md`, `Launcher_CEF.md` и `Project_Manager.md` теперь фиксируют split между главным PM окном и detached diagram popup: popup не является owner-window приложения и не должен reuse-ить main-window autosave state.

## [1.2.55] - 2026-04-22
### Fixed
- **`UI Translation Engine` больше не роняет standalone Project Manager на macOS 26.x.** Shared `TranslationEngineSelector` переведён с native `<select>` на DOM-owned button/listbox selector, поэтому PM больше не заходит в Chromium/AppKit popup path, который завершался `NSApplication unrecognized selector`.
- **`Reasoning Translation Engine` получил тот же fix-path.** Один и тот же custom selector теперь покрывает оба translation-engine controls и сохраняет availability labels, disabled engines и keyboard navigation без native popup branch.

### Changed
- **CEF/macOS boundary уточнена на уровне SSOT.** `BugRegistry.md`, `UI_Bundles.md` и `Launcher_CEF.md` теперь фиксируют, что shared translation-engine controls не должны использовать native HTML `<select>` в standalone CEF-host, потому что launcher-side close-button workaround из `1.2.52` не гарантирует безопасность всех Chromium/AppKit popup branches.

## [1.2.54] - 2026-04-22
### Fixed
- **Project Manager Settings больше не живут в отдельном popup-окне.** `Open Settings` теперь переводит правую панель PM в in-shell settings mode, а `Close Settings` возвращает предыдущий panel context вместо закрытия Project Manager window вместе с detached settings flow.
- **`Restart Core` вернулся в `Settings -> General`.** Shared `Core Controls` снова доступны в PM-mode, а standalone CEF-host получил явный restart bridge `codeai://core-restart` и native `RestartCoreProcess()`, так что recovery UX больше не деградирует до декоративной кнопки или отсутствующего control.
- **Provider-only saves больше не показывают ложный overlay `Synchronizing localization`.** Shared settings state теперь использует фактический `settings:localization-sync-status`, поэтому blocking localization UI появляется только на реальном strict sync busy-state.

### Changed
- **PM settings stabilization оформлена как in-shell contract, а не popup lifecycle.** `SystemArchitecture.md`, `Project_Manager.md`, `UI_Bundles.md`, `Launcher_CEF.md` и `BugRegistry.md` синхронизированы под новую границу: PM owns the visible settings surface, launcher bridge остаётся узким, а три регрессии `1.2.53` закрыты в `1.2.54`.

## [1.2.53] - 2026-04-22
### Added
- **Project Manager now owns the only live Settings window.** Footer action `Open Settings` opens or focuses a detached CEF window on `?mode=detached-settings`, and the shared `SettingsView` is reused there in `mode="project-manager"` through PM-owned transport/state hooks.

### Changed
- **Core is now the sole backend owner for settings flows.** The remote bridge settings cluster now owns `settings:load`, `settings:save`, `settings:reset`, `settings:update-provider`, `settings:versions`, and `settings:open-user-glossary-file`, together with the downstream `settings:loaded`, `settings:saved`, `settings:save-error`, `settings:localization-sync-status`, and `settings:user-glossary-file` broadcasts.
- **Project Manager settings actions no longer depend on the extension-side webview path.** PM websocket contracts and settings state now drive save/reset/provider-update/version/glossary flows directly against Core, while the PM-host bridge handles editor-aware glossary file opening.
- **VS Code extension is no longer a runtime bootstrap owner.** Activation no longer starts or attaches the Core runtime and no longer runs the extension-owned provider auto-update/runtime keep-alive path; the extension remains only a distribution/install/bootstrap-components shell.
- **Legacy VS Code Settings webview was de-scoped to a compatibility surface.** `codeaiHub.openSettings` now lands on a localized compat notice instead of a live settings product surface.

### Docs
- **SystemArchitecture.md, Project_Manager.md, and UI_Bundles.md** were synchronized to lock the new ownership contract: PM-only Settings UI, Core-owned settings backend, PM bootstrap authority for user-facing runtime start, and extension distribution-only role.

## [1.2.52] - 2026-04-22
### Fixed
- **Red NSWindow close button no longer triggers the "quit unexpectedly" dialog on macOS 26.x — true fix, not another mitigation.** User retest on 1.2.51 confirmed the `-[NSApplication reportException:]` swizzle alone did not prevent the crash: on macOS 26 the exception apparently reaches `+[NSApplication _crashOnException:]` through a route that does not go via `-reportException:`. Rather than chase the exception through another layer, 1.2.52 stops running the buggy Chromium teardown callback in the first place.

### Changed
- **`LauncherWindowDelegate::CanClose` in `packages/cef-launcher/src/launcher_app.cc` now short-circuits on macOS.** Instead of calling `browser->GetHost()->TryCloseBrowser()` (which is the entry point into Chromium 141's async browser-teardown that crashes on macOS 26), the `#if defined(__APPLE__)` branch invokes a new cross-platform helper `codeai::launcher::RequestNativeApplicationTermination()` and returns `false`. The helper is declared in `packages/cef-launcher/src/launcher_handler.h` (namespace `codeai::launcher`) and implemented in `packages/cef-launcher/src/platform/mac/launcher_handler_mac.mm` as `[NSApp terminate:nil]`. The red close button now follows the same `-[NSApplication terminate:]` → `-[NSApplication stop:]` → orderly AppKit unwind → `main()` returns → `CefShutdown()` path that Cmd+Q and Dock Quit already use cleanly. The buggy Chromium callback is never invoked, so the exception is never thrown, and `+[NSApplication _crashOnException:]` is never called.
- **Windows/Linux `CanClose` behaviour is unchanged** — the `#else` branch keeps the existing `TryCloseBrowser` flow.

### Retained as safety net
- **The 1.2.51 `-[NSApplication reportException:]` swizzle** (category `NSApplication (CodeAIHubReportExceptionSuppression)` in `app_main_mac.mm` with `+load` / `method_exchangeImplementations`) stays in place as a belts-and-suspenders fallback. Matching pattern is narrow, overhead is negligible, and if a future CEF update ever introduces another path that throws the same signature, the swizzle covers it without needing a new release. It will be removed together with the CEF/Chromium upgrade.

### Known deferred issue
- **CEF/Chromium upgrade is still the only proper root-cause fix** for `BUG-2026-04-22-01` — Chromium 141 inside our CEF binary remains incompatible with macOS 26.3.1 around that specific teardown callback. With the short-circuit in place the observable crash is gone, but the upgrade remains tracked as a separate investigation scope. Urgency is now low because users do not see the crash.

### Not touched
- NSApplication remains plain (no `CefAppProtocol` shell, no `sendEvent:` override, no `terminate:` override, no `NSApplicationDelegate`). `Info.plist` is not changed. `LauncherHandler::DoClose`, `LauncherHandler::OnBeforeClose` and `LauncherHandler::CloseAllBrowsers` are not changed. Paste (Cmd+V), SuperWhisper, Cmd+C/X/A, the Edit menu, Cmd+Q, Dock Quit and dock reopen continue to behave exactly as in 1.2.49 / 1.2.50 / 1.2.51.

### Docs
- **SystemArchitecture.md §3 Invariant 32** rewritten around the 1.2.52 short-circuit as the primary fix; both prior exception-pipeline attempts (1.2.50, 1.2.51) are now explicitly recorded as failed, with the reasons spelled out. 1.2.51 swizzle is noted as retained-as-safety-net. Канон list points at `launcher_app.cc`, `launcher_handler.h`, `launcher_handler_mac.mm` and `app_main_mac.mm`.
- **Launcher_CEF.md** gains a new "Shutdown-crash primary fix (1.2.52 — CanClose short-circuit)" subsection before the 1.2.51 subsection (now tagged "[superseded as primary, retained as safety net]"). Narrative explains the pivot from catching the exception to preventing the buggy callback.
- **BugRegistry.md** — `BUG-2026-04-22-01` flipped from MITIGATED to FIXED. Current-resolution block is rewritten around the short-circuit; the 1.2.51 swizzle attempt moves into a "Superseded attempts (kept for history)" timeline entry alongside the existing 1.2.50 entry.

## [1.2.51] - 2026-04-22
### Fixed
- **Red NSWindow close button no longer shows "quit unexpectedly" dialog on macOS 26.x.** User retest on 1.2.50 confirmed that the `NSSetUncaughtExceptionHandler()` approach did not intercept the crash. Two reasons: AppKit reinstalls its own `NSApplicationUncaughtExceptionHandler` during `-[NSApplication finishLaunching]` (overwriting ours, which was installed pre-`CefExecuteProcess`); and `+[NSApplication _crashOnException:]` — a private Apple path — bypasses the standard uncaught-exception chain on macOS 26 regardless of what's registered via `NSSetUncaughtExceptionHandler`. The standard ObjC uncaught chain is simply not the right layer for this issue.

### Changed
- **Switched mitigation from `NSSetUncaughtExceptionHandler` to an Objective-C method swizzle on `-[NSApplication reportException:]`.** The new mitigation lives in `packages/cef-launcher/src/platform/mac/app_main_mac.mm` as category `NSApplication (CodeAIHubReportExceptionSuppression)`, whose `+load` method performs `method_exchangeImplementations(reportException:, codeai_reportException:)`. The Objective-C runtime invokes `+load` during dyld image load — before `main()` and before any AppKit / CEF init — so AppKit cannot undo the swap. When AppKit subsequently calls `-[NSApplication reportException:]`, the runtime dispatches into our `codeai_reportException:`, which inspects the exception and returns without reaching `+[NSApplication _crashOnException:]` when it matches the Chromium-141 × macOS-26 signature (`NSInvalidArgumentException` whose reason contains both `unrecognized selector sent to instance` and `NSApplication`). Non-matching exceptions are forwarded to the original IMP through `[self codeai_reportException:exception]` — the standard ObjC swizzle trampoline.
- **Removed dead 1.2.50 `NSSetUncaughtExceptionHandler` code** (`g_previous_uncaught_handler`, `CodeAIHubUncaughtExceptionHandler`, `InstallCodeAIHubUncaughtExceptionHandler` and its call from `main()`). Atomic swap in the same commit so no one has to guess which mitigation is actually active.

### Known deferred issue
- **`BUG-2026-04-22-01` remains MITIGATED, not root-fixed.** The swizzle absorbs the specific Chromium-141 × macOS-26 exception signature, but the underlying Chromium 141 teardown callback is still sending an AppKit-private selector that no longer exists on macOS 26. A proper root-cause fix requires upgrading CEF to a build that ships Chromium 142+ or 143+. That CEF upgrade is still tracked as a separate investigation scope. If a future macOS patch moves the problematic path off `-reportException:`, this mitigation stops covering and we'll need the CEF upgrade or a different attack vector.

### Not touched (explicit preservation of 1.2.49 / 1.2.50 behaviour)
- NSApplication remains plain (no `CefAppProtocol` shell, no `sendEvent:` override, no `terminate:` override, no `NSApplicationDelegate`). Paste (Cmd+V), SuperWhisper (synthetic Cmd+V via CGEvent), Cmd+C/X/A, the Edit menu, Cmd+Q, Dock Quit, the red close button teardown path and dock reopen all continue to behave exactly as in 1.2.49 / 1.2.50. `Info.plist` is not changed. `LauncherWindowDelegate::CanClose` / `LauncherHandler::DoClose` / `LauncherHandler::OnBeforeClose` are not changed.

### Docs
- **SystemArchitecture.md §3 Invariant 32** rewritten around the new swizzle mitigation. Explicitly records that 1.2.50 `NSSetUncaughtExceptionHandler` failed and why, and updates the permanent CEF acceptance matrix with the new stderr signature (`suppressed NSApplication unrecognized selector via reportException: swizzle`).
- **Launcher_CEF.md** shutdown-crash mitigation subsection rewritten fully: trigger, root cause, why 1.2.50 failed, 1.2.51 swizzle mechanism, what the mitigation still does NOT touch, runtime flow on interception, and the documented limits of the swizzle approach.
- **BugRegistry.md** — `BUG-2026-04-22-01` still MITIGATED, but the current-resolution block is rewritten around the swizzle; the failed 1.2.50 `NSSetUncaughtExceptionHandler` attempt is preserved inline as a timeline entry with both root causes spelled out (AppKit reinstall + `_crashOnException:` bypass).

## [1.2.50] - 2026-04-22
### Fixed
- **Red NSWindow close button no longer triggers the "CodeAI Hub Project Manager quit unexpectedly" dialog on macOS 26.x.** User retest on 1.2.49 pinpointed the crash as deterministic on the red close button path only (`LauncherWindowDelegate::CanClose` → `browser->GetHost()->TryCloseBrowser()` → Chromium async browser teardown), while Cmd+Q and Dock Quit remained clean because they unwind through `-[NSApplication stop:]` and bypass the Chromium teardown callback entirely. The failing callback sends an AppKit-private selector to `-[NSApplication ...]` that no longer exists on macOS 26.3.1 under Chromium 141 (shipped inside our CEF binary `141.0.10+chromium-141.0.7390.123`).

### Added
- **`InstallCodeAIHubUncaughtExceptionHandler()` in `packages/cef-launcher/src/platform/mac/app_main_mac.mm`.** The handler is installed from `main()` immediately after `CefScopedLibraryLoader::LoadInMain()` and before `CefExecuteProcess`. It captures the previous handler via `NSGetUncaughtExceptionHandler()`, intercepts `NSInvalidArgumentException` whose reason contains both `unrecognized selector sent to instance` and `NSApplication`, logs a `CodeAIHubLauncher: suppressed NSApplication unrecognized selector: ...` line to stderr and returns without propagation. All other uncaught exceptions are forwarded to the previous handler so real bugs still reach AppKit's default crash reporter. With the exception absorbed before `+[NSApplication _crashOnException:]`, the remainder of the browser teardown (`OnBeforeClose` → `CefQuitMessageLoop` → `main()` returns → `CefShutdown`) completes cleanly.

### Known deferred issue
- **`BUG-2026-04-22-01` moves from DEFERRED to MITIGATED.** The mitigation is a targeted workaround, not a root-cause fix. A proper fix requires upgrading CEF to a build containing Chromium 142+/143+ that understands the macOS 26 selector semantics. That CEF upgrade is tracked as a separate investigation scope.

### Not touched (explicit preservation of 1.2.49 behaviour)
- NSApplication remains plain (no `CefAppProtocol` shell, no `sendEvent:` override, no `terminate:` override, no `NSApplicationDelegate`). Paste (Cmd+V), SuperWhisper (synthetic Cmd+V via CGEvent), Cmd+C/X/A, the Edit menu, Cmd+Q, Dock Quit, the red close button flow and dock reopen all continue to behave exactly as in 1.2.49. `Info.plist` is not changed. `LauncherWindowDelegate::CanClose` / `LauncherHandler::DoClose` / `LauncherHandler::OnBeforeClose` are not changed.

### Docs
- **SystemArchitecture.md §3 Invariant 32** extended with the 1.2.50 mitigation note, the refined window-close-only crash trigger, and the requirement that any future shutdown hardening pass the full clipboard + quit + red-close + reopen acceptance matrix before merge.
- **Launcher_CEF.md** gains a new "Shutdown-crash mitigation (1.2.50)" subsection covering trigger, root cause, handler install point, explicit non-goals, and the stderr log signature that indicates the handler fired.
- **BugRegistry.md** — `BUG-2026-04-22-01` flipped from DEFERRED to MITIGATED with the full narrative (window-close-only trigger, Chromium 141 × macOS 26.3.1 incompat, handler implementation, commit hash, deferred proper fix). The 1.2.46 → 1.2.48 → 1.2.49 rollback history is preserved as context.

## [1.2.49] - 2026-04-22
### Reverted
- **Full rollback of the 1.2.46 CEF macOS bootstrap refactor and the 1.2.48 follow-up.** After a second round of user retesting on 1.2.48, Cmd+V / paste and SuperWhisper (synthetic Cmd+V via CGEvent) still failed to reach the Chromium input field inside the standalone Project Manager. The narrow 1.2.48 fix (dropping the Edit menu and restoring the standard `applicationShouldTerminate:` quit path) was theoretically reasonable but did not address the real breaker — which lives inside the `CodeAIHubApplication : NSApplication <CefAppProtocol>` shell itself, not in the cosmetic surfaces around it. The full CEF bootstrap refactor was therefore reverted.

### Fixed
- **Paste (Cmd+V), clipboard shortcuts and SuperWhisper work again in the Project Manager input on macOS.** Delivered by rolling the launcher back to the 1.2.45 baseline: `codeai_hub_application_mac.{h,mm}` are deleted, `app_main_mac.mm` is restored to the `70ac9a6ac` state (plain `[NSApplication sharedApplication]` + inline `CreateApplicationMenu` + `CefInitialize` + `CefRunMessageLoop`), and the corresponding entries are removed from `packages/cef-launcher/CMakeLists.txt`.

### Known deferred issue
- **`BUG-2026-04-22-01` — rare non-deterministic `NSApplication unrecognized selector` crash-on-quit for the standalone Project Manager on macOS is re-opened as DEFERRED.** The 1.2.46 hardening attempt that suppressed this crash broke clipboard shortcuts, so its rollback leaves the crash as a known, accepted trade-off until a new investigation produces a fix that does not regress Cmd+V / SuperWhisper. Any future CEF bootstrap change must pass the full clipboard + quit + reopen acceptance matrix before merge.

### Docs
- **SystemArchitecture.md §3 Invariant 32** rewritten as a rollback note describing why the CefAppProtocol shell was removed and pointing at the deferred shutdown-crash bug. Invariant 33 (introduced in 1.2.48 for the custom shell) deleted entirely.
- **Launcher_CEF.md** macOS Bootstrap Lifecycle Boundary collapsed to "plain `NSApplication` bootstrap + deferred shutdown crash" and now carries the clipboard+quit acceptance guardrail for any future hardening attempt.
- **BugRegistry.md** — `BUG-2026-04-22-01` flipped to DEFERRED with the full rollback history retained; `BUG-2026-04-22-04` moved to FIXED (via rollback in 1.2.49) with the 1.2.48 narrow-fix description kept as "superseded, for history".

## [1.2.48] - 2026-04-22
### Fixed
- **Paste (Cmd+V) and synthetic Cmd+V from SuperWhisper work again inside the standalone Project Manager input.** The Cut/Copy/Paste/Select All menu items with `target:nil` have been removed from the CEF launcher application menu — they hijacked `NSMenu performKeyEquivalent:` after the 1.2.46 bootstrap refactor dropped the implicit CEF-swizzle of `-[NSApplication sendEvent:]`, and the web view does not answer Cocoa `paste:` / `cut:` / `copy:` / `selectAll:` selectors. Chromium now observes the raw NSKeyDown event and handles clipboard shortcuts on the render-process side, as originally intended.
- **Dock right-click Quit, Cmd+Q and app-menu Quit close the launcher reliably on the first click again.** The `-[CodeAIHubApplication terminate:]` override and the matching `tryToTerminateApplication:` delegate method have been removed. Quit requests now flow through the standard AppKit path `terminate:` → `applicationShouldTerminate:`; the delegate force-closes CEF browsers via `LauncherHandler::CloseAllBrowsers(true)` and returns `NSTerminateCancel`, while `OnBeforeClose` drives `CefQuitMessageLoop()` once the last browser is gone so `main()` returns from `CefRunMessageLoop()` and reaches `CefShutdown()`.

### Changed
- **`CodeAIHubApplication` keeps the `CefAppProtocol` shell and `CefScopedSendingEvent` wrapper from 1.2.46** — the shutdown-crash fix remains in place, only the AppKit-facing side (terminate override + Edit menu) is rolled back.

### Docs
- **SystemArchitecture.md §3** — Invariant 32 (1.2.46) rewritten to drop `tryToTerminateApplication` / `CloseAllBrowsers(false)`; new Invariant 33 (1.2.48) locks the standard terminate path, bans the Edit menu, and pins the permanent CEF acceptance matrix.
- **Launcher_CEF.md** — macOS bootstrap lifecycle boundary refined: override `terminate:` forbidden, Cut/Copy/Paste/SelectAll menu items forbidden, `applicationShouldTerminate:` + force `CloseAllBrowsers(true)` is the only canonical quit contract.
- **BugRegistry.md** — `BUG-2026-04-22-04` added newest-first, tracing paste / SuperWhisper / Dock Quit regression from 1.2.46 through the 1.2.48 fix.

## [1.2.46] - 2026-04-22
### Fixed
- **Standalone Project Manager on macOS no longer relies on a plain `NSApplication` bootstrap.** The CEF launcher browser-process entrypoint now creates a dedicated `CodeAIHubApplication : NSApplication <CefAppProtocol>` and a delegate-driven shutdown/reopen seam before entering the CEF message loop. This aligns the launcher more closely with the official CEF macOS sample and removes the crash-on-quit class where AppKit/CEF hit `NSApplication unrecognized selector` during orderly shutdown.

### Changed
- **macOS launcher lifecycle ownership is now explicit.** `codeai_hub_application_mac.{h,mm}` owns `sendEvent:` wrapping via `CefScopedSendingEvent`, `terminate:` redirection into `LauncherHandler::CloseAllBrowsers(false)`, dock reopen, and secure restorable state; `app_main_mac.mm` is back to a thin wiring layer.

## [1.2.45] - 2026-04-22
### Fixed
- **Claude and Codex reopened dialogs now show truthful usage limits before the next user message.** PM keeps a provider-scoped usage cache (`providerScopeKey = {providerId}:global`), seeds reopened runtime/dialog snapshots from it, and Core treats `dialog_opened` as an explicit pre-turn usage-refresh boundary: cached limits are replayed immediately, then a cheap provider refresh runs even when cached payload already exists. This closes the UX gap where old dialogs stayed empty until the first new assistant response.
- **Empty first warmup probes no longer permanently suppress later `binding_ready` refreshes.** `UsageLimitsWarmupTracker` now effectively warms a provider only after a real payload reaches the stream; a null Claude/Codex probe after cold start no longer blocks the next ready-binding attempt.

### Added
- **Explicit pending-state usage bar for cold opens.** `SessionIdBar` now renders a visible loading state for provider usage telemetry instead of silent empty rails, and shows reset timestamps in parentheses for the 5-hour / weekly buckets as soon as `resetsAt` is known.
- **Explicit `dialog_opened` transport path for usage limits.** PM reuses `session:refreshUsageLimits` with `lifecycleTrigger: "dialog_opened"` so pre-turn refresh stays lifecycle-driven instead of mount-driven.

### Docs
- **SystemArchitecture.md**, **SessionUI_Behavior.md**, and **Dialogs_And_Continuity_Routing.md** now define the reopened-dialog pre-turn usage refresh contract, provider-scoped PM seeding, and the distinction between replay-first delivery and explicit `dialog_opened` freshness refresh.

### Tests
- **`usage-limits-stream.test.ts`**, **`project-manager-session-view.test.tsx`**, **`session-id-bar.test.tsx`**, and **`session-request-handler.usage-limits.test.ts`** now cover replay-before-snapshot caching, provider-scoped seeding, explicit `dialog_opened` refresh, and the empty-warmup retry path.

## [1.2.44] - 2026-04-21
### Fixed
- **Usage-limits widget no longer stays empty or shows fake `0%` for Claude and Codex in the cold-cache window.** Hotfix to `1.2.43`. PM emits `binding_ready` usage-limits refresh per reopened dialog after Core restart, and under the `1.2.39` materializer paper-binding those first refreshes raced against provider hydration: `ClaudeLiveHeadersReader` and `CodexAppServerFacade.refreshUsageLimits` returned null payloads, the cache never filled, and subsequent `binding_ready` triggers kept hitting the same race. The cache key is already account-scoped (`providerScopeKey = `${providerId}:global``), so one successful probe is enough to populate every session of a provider — but nothing stopped the parallel storm of failing probes. `SessionRequestHandler` now owns `UsageLimitsWarmupTracker: Set<providerId>`: the first `binding_ready` for a provider dispatches, subsequent `binding_ready` for the same provider skip the dispatch and fall back to cached replay (empty rows stay hidden instead of surfacing as false `0%`). Other lifecycle triggers (`turn_completed`, `reconnect`, `manual`, `provider_session_rebound`, `dialog_opened`, `session_opened`) bypass dedup because they represent real state changes.

### Added
- **`UsageLimitsWarmupTracker`** + **`handleRefreshUsageLimitsFlow`** (`packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-warmup.ts` + `session-request-handler-usage-limits-refresh.ts`) — extracted from `SessionRequestHandler` so the main handler stays under the 500-line architecture limit and the new dedup / diagnostic logic is independently testable.

### Docs
- **SystemArchitecture.md §3 Invariant 1** — single-probe warmup policy recorded alongside existing stale-binding auto-recovery rules.
- **BugRegistry.md** — new entry `BUG-2026-04-21-06` capturing the cold-cache race.

### Tests
- **`session-request-handler.usage-limits.test.ts`** — new case: cold-cache failed warmup (second `binding_ready` for a different session of the same provider must not re-dispatch) + `turn_completed` pass-through even when the provider is already warmed.

## [1.2.43] - 2026-04-21
### Fixed
- **Codex provider no longer gets stuck in "Provider codexCli unavailable" after a benign child-process restart.** Hotfix to release `1.2.42`. `CodexAppServerProcess.startInternal` inherits `process.env` from the VS Code extension host, which on macOS GUI-launched VS Code often ships without the user's shell PATH additions (`~/.npm-global/bin`, Homebrew). The first spawn at boot could succeed case-by-case; after a graceful `process.stop` (fired when all Codex sessions close), every subsequent spawn raised `spawn codex ENOENT`, and the provider-recovery scheduler looped forever with `write EPIPE` against a dead stdin. The spawn env now prepends a curated set of common install directories (`~/.npm-global/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin` on POSIX; `%APPDATA%\npm` on Windows) — inherited PATH stays the primary lookup, candidates only get appended when absent. No hardcoded absolute paths in the runtime.
- **Claude and Codex `usage_limits` widget no longer stays empty after a Core restart.** PM emits the `binding_ready` `usage_limits` refresh exactly once per logical session. After the `1.2.39` continuity materializer paper-binding, that first refresh races against provider hydration — Claude's HTTP probe and Codex's app-server handshake — and the payload is dropped. Gemini's proactive refresh path hides this for it; Claude and Codex widgets just stayed empty. The `1.2.42` stale-binding retry branch now triggers one additional `adapter.refreshUsageLimits` for the freshly hydrated session via the new `triggerPostRebindUsageLimitsRefresh` helper, so the widget catches up automatically on the same user message that drove the rebind.

### Added
- **`triggerPostRebindUsageLimitsRefresh`** (`packages/core/src/remote-bridge/handlers/session-request-handler-post-rebind-usage-limits.ts`) — exported helper extracted from `SessionRequestHandlerMessageDispatch` so the dispatch file stays under the 500-line architecture limit and the new logic is independently testable.

### Docs
- **SystemArchitecture.md §3 Invariant 1** — post-rebind usage_limits refresh contract (required after successful rebind) and Codex PATH augmentation note added to the existing stale-binding auto-recovery text.
- **BugRegistry.md** — new entry `BUG-2026-04-21-05` with the two symptom split, root cause, fix, commits, and guards.

### Tests
- **`session-request-handler-post-rebind-usage-limits.test.ts`** — 4 contract cases: adapter without `refreshUsageLimits` produces no broadcasts; `refreshUsageLimits` invoked exactly once with the retry binding; only normalized `usage_limits` events are broadcast; synchronous adapter failures are logged and swallowed.

## [1.2.42] - 2026-04-21
### Fixed
- **First user message in a reopened Claude/Codex dialog no longer vanishes after a Core restart.** Follow-up to `BUG-2026-04-21-01`/release `1.2.39`. The continuity materializer correctly journaled paper-bindings with `providerSessionStatus: "ready"` (so PM input stopped sticking in "Agents is working…"), but the dispatch path trusted `ready` as "provider hydrated" and called `adapter.sendMessage` without first resuming. In Claude, `ClaudeSDKManager.sendMessage` threw a generic `Error("Session <id> not found")`; in Codex, `turn/start` hit the freshly spawned app-server child which had never seen the thread. The failure classifier marked both as retryable, but no retry was wired for generic errors — the message was silently dropped. Each provider adapter now throws a typed `ClaudeSessionStaleBindingError` / `CodexSessionStaleBindingError` (symmetric to Gemini's `GeminiSessionStaleBindingError` from `1.2.8`), and the Core dispatch detector is generalized over the shared set of provider-scoped codes so the one-shot `invalidateProviderBinding + ensureSessionReadyForSend + resend` recovery path fires for all three providers.

### Added
- **`ClaudeSessionStaleBindingError`** (`packages/Claude_Module/src/provider/claude-session-stale-binding-error.ts`) with `code: "CLAUDE_SESSION_STALE_BINDING"` and carried `providerSessionId`.
- **`CodexSessionStaleBindingError`** (`packages/Codex_AppServer_Module/src/provider/codex-session-stale-binding-error.ts`) with `code: "CODEX_SESSION_STALE_BINDING"` and carried `providerSessionId`.
- **`handshakedThreadIds` guard in `CodexAppServerFacade`** — populated in `createSession` / `resumeSession`, consulted in `sendMessage` before `turn/start`, cleared in `closeSession`. Raises the typed error when a paper-binding points at a thread the current app-server child has never seen.

### Docs
- **SystemArchitecture.md §3 Invariant 1** now records that `ready` paper-binding means "journaled" and not "provider hydrated" — every adapter must raise a typed stale-binding error on first-send-after-restart, generic `Error` is forbidden because the retryable classifier would drop it silently.
- **BugRegistry.md** — new entry `BUG-2026-04-21-04` with full forensics, root cause split, fix, commits, and guards.

### Tests
- **`claude-session-stale-binding-error.test.ts`** and **`codex-session-stale-binding-error.test.ts`** — error contract tests (code / providerSessionId / message / name / Error prototype) pinning the throw-site ↔ Core catch-site handshake.

## [1.2.41] - 2026-04-21
### Fixed
- **Diagram Modules Artifacts panel composition now actually fits under auto-fit zoom.** Hotfix to release `1.2.40`. The previous cycle introduced `width: max-content + minWidth: 100%` on the inner composition div, intending to expose the natural grid width through `scrollWidth`. In practice the intrinsic-sizing keyword let prose (purpose text, long titles) and `1fr` column tracks inside ProductPart / Cluster / Module cards expand into unwrappable single lines, so the natural width grew to thousands of pixels and auto-fit collapsed straight to the floor `0.25` — composition overflowed horizontally even at Cmd+Ctrl+0 (100% user-zoom) and Cmd+scroll → 25%. The inner div is now back on natural grid sizing: `scrollWidth` on a normally-sized grid already reports `max(clientWidth, rightmost-child.right)`, which matches the auto-fit measurement path once real card min-content (`minWidth: 220`, `minmax(240px, 1fr)`) overflows the track. Source-level regression assertion inverted to `max-content === false` so the keyword cannot silently return.

### Docs
- **SystemArchitecture.md §6.4** — rephrased auto-fit zoom contract: no intrinsic-sizing keyword on the composition-container, and an explicit note on why (prose / `1fr` tracks would expand into unwrappable lines and blow the natural width past any reasonable floor).
- **BugRegistry.md** — new entry `BUG-2026-04-21-03` capturing the root cause split, user-visible symptom on workspace `CodeAI-Hub claude`, fix, commits, and guards.

## [1.2.40] - 2026-04-21
### Fixed
- **Development Tree sidebar no longer flickers between correct and phantom standalone modules on `diagram_modules` artifacts.** `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts` consumed its `NEXT_SECTION_RE` singleton through direct `.exec()` calls, so the global regex's `lastIndex` accumulated between calls in the long-lived Core process and produced alternating hit/null results on the same artifact. When the clamp slipped, the standalone body extended past `## Simple Relations` and the non-strict `MODULE_ROW_RE` happily matched the `from-id` in 4-column relation rows as a module id. Any sidebar cluster expand/collapse triggered a `/workflow-state` refetch and re-rolled the alternation. The parser now routes every `/g` regex through `.matchAll()` (lastIndex-free) or a fresh factory instance, and `MODULE_ROW_RE` is strict 2-column (`[^|\n]+` in column 2 + `|\s*$` anchor) so Simple Relations rows physically cannot match even if the clamp ever slips again.
- **Diagram Modules Artifacts panel composition no longer gets cut off when the PM window is narrow.** `DiagramEditorFacade` now auto-fits the rendered composition to the container width via `ResizeObserver` + the composition's natural `scrollWidth`: `effectiveZoom = autoFitScale * userZoom`, where `autoFitScale = min(1, containerWidth / naturalWidth)` with a floor of `0.25`. Manual Cmd/Ctrl+scroll becomes an overlay on top of the auto-fit base, and Cmd/Ctrl+0 clears only the user overlay without breaking auto-fit.

### Docs
- **SystemArchitecture.md §6.4** records two new invariants: regex lastIndex safety for `development-tree-snapshot` (no direct `.exec()` / `.test()` on module-level `/g` regex), and the auto-fit zoom contract (auto-fit base × user-zoom overlay, natural width advertised through `width: max-content + min-width: 100%`).

### Tests
- **`development-tree-snapshot.test.ts`** adds a 10-run idempotency regression (lastIndex drift guard) and a cluster-module-as-Simple-Relations-`From` guard that reproduces the original sidebar symptom.
- **`diagram-editor-facade.test.tsx`** adds source-level regression coverage for the auto-fit API surface (`autoFitScale`, `userZoom`, `effectiveZoom`, `ResizeObserver`, `scrollWidth`, `max-content`, `setUserZoom(1)`).

## [1.2.39] - 2026-04-21
### Fixed
- **Reopened workflow dialog no longer sticks in "Agents is working, please wait..." after Core cold-start.** Previously Core only rehydrated a runtime session for the `lastActive` stage on startup; other reopened dialogs (e.g. `virtual_simulation`, `diagram_modules`) had no record in `workspace:snapshot`. PM `createInitialSnapshot` started workflow sessions with `connectionState: "running"` expecting a Core-initiated turn, but the expected idle snapshot update never arrived, and the initial "running" remained indefinitely. `RemoteBridgeDialogCommandRouter.handleDialogList` now materializes a stub runtime session for every continuity entry via the new `materializeContinuityEntries` helper, so the existing snapshot reconciliation (`snapshotSignalsIdleUnlocked`, released in `1.1.646`) flips the UI to idle automatically.
- **Stop button on a reopened workflow dialog now works.** The same underlying asymmetry caused `SessionRequestHandlerStopAction.handleStop` to return `"Session not found"` without emitting `turn_state: "idle"`, so clicking Stop did nothing. Because the dialog list now always materializes a session + paper-binding in Core, `handleStop` finds both lookups and invalidates the binding normally.

### Added
- **`SessionManager.registerSessionWithId`** — externally-id-preserving session registration (no UUID regeneration) for restore-from-continuity paths; `providerSessionStatus` is set to `"ready"` without invoking any provider adapter.
- **`SessionProviderBindingService.registerRestoredBinding`** — paper-binding registration in `providerSessions` Map for restored sessions; no adapter subscription is created, `invalidateProviderBinding`'s existing `unsubscribe()` call is a safe no-op.
- **`session-continuity-materializer.ts`** — helper that walks a `ContinuityIndexEntry[]` and, for each entry with a complete `latestSessionId + providerId + providerSessionId` triple that is not yet known to `SessionManager`, registers a stub session, paper-binding, and `WorkspaceRuntimeFacade.notifySessionCreated` hydration with `turnState: "idle"`, `continuityLockActive: false`, `bindingStatus: "ready"`. Idempotent on repeated `dialog:list`.

### Unchanged
- **External Codex contract stays stable.** Provider `thread/resume` remains lazy — it is triggered by the first user message through the existing `resolveProviderSessionId` dispatch path, not by materialization. Codex app-server `closeSession` is safe on paper-bindings because it only interrupts an active turn (none exist for stubs) and deletes its internal map entry.

### Docs
- **SessionInputLock SSOT §3.3, SessionUI_Behavior §4.4, CoreOrchestrator §3, SystemArchitecture §3 Invariant 1** all updated to record the runtime session materialization invariant. New `BugRegistry` entry `BUG-2026-04-21-01` captures the full forensics, root cause, fix, and guards.

### Tests
- **`session-continuity-materializer.test.ts`** — happy path stub creation (session / binding / workspace runtime hydration), idempotency across repeated `dialog:list`, skip behavior for incomplete entries, and explicit assertion that post-materialize state satisfies both `handleStop` preconditions (`sessionManager.getSession` + `providerSessions.get` both non-null).

## [1.2.38] - 2026-04-21
### Removed
- **Legacy Codex SDK-based provider module deleted.** `packages/Codex_Module/` and its transitive dependency `@openai/codex-sdk@0.53.0` are removed from the repository and the workspace lockfile. The module had been orphaned since release `1.2.22`, when the `codex app-server` line in `packages/Codex_AppServer_Module/` became the sole active runtime; no active `import` from `@codeai-hub/codex-module` existed in Core / provider-registry / build scripts / tests. `knip.json` and `.vscodeignore` entries for the legacy package are cleaned up in the same change.

### Unchanged
- **External Codex contract stays stable.** Provider id remains `codexCli`, provider-home slot remains `~/.codeai-hub/providers/codex`, and the release artifact name remains `codex-module-<version>.tar.bz2` (now built from `packages/Codex_AppServer_Module/` with the same name as an explicit installer contract). No installer migration required.

### Docs
- **Canonical SSOT documents retargeted at the app-server module.** `Modules/Codex.md`, `System/SystemArchitecture.md`, the then-active `Contracts/Formal_Module_Cluster_Facade_Architecture.md` (now archived at `Plans/Archive/Formal_Module_Cluster_Facade_Architecture.md`), `Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`, and `Contracts/EffectiveModelIdentity_And_Settings_SSOT.md` no longer describe the legacy module as a fallback and no longer reference files under `packages/Codex_Module/`. Historical docs (`CHANGELOG.md` entries for releases ≤ 1.2.21, `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/Sessions/`, `doc/BugRegistry.md`) are preserved as audit trail.

## [1.2.37] - 2026-04-21
### Fixed
- **Diagram Modules module tables now render.** Both the Project Manager diagram canvas parser (`diagram-modules-staged-part-parser.ts`) and the Core Development Tree snapshot (`development-tree-snapshot.ts`) now accept the canonical 2-column `| \`module-id\` | Responsibility |` module table. Previously the parsers still required a third backtick-wrapped column (the removed `ModuleKind` slot from refactor `c488df065`), so new staged artifacts rendered as `Modules: 0` in clusters and lost all standalone modules.
- **`## Simple Relations` rows no longer leak as phantom standalone modules.** The Core snapshot now clamps the `## Standalone Modules` body at the next `##` header, so `From` / `To` entries from Simple Relations are no longer mis-surfaced as standalone nodes in the PM sidebar Development Tree.

### Changed
- **Parser tests updated to the 2-column contract.** Staged-part parser and development-tree-snapshot tests now exercise the canonical 2-column shape and include a regression test for Simple Relations isolation.

### Docs
- **SystemArchitecture §6.4 records the 2-column module table invariant.** The staged `product-parts/<part-id>.md` format and the standalone-section clamping rule are now SSOT for both readers of the staged artifact.

## [1.2.36] - 2026-04-20
### Added
- **Dedicated `UI Translation Engine` and `Reasoning Translation Engine` selectors in the Settings localization card.** The UI engine drives interface bundle materialization and the browser bootstrap payload; the reasoning engine drives live translation of visible Thinking / Reasoning bubbles and defaults to `Google GTX Free` for stability.
- **Fifth user-facing `Reasoning` localization category with its own language selector.** Visible Thinking / Reasoning bubbles now use a dedicated `reasoning` target language, decoupled from `Messages for the User`. Hidden reasoning continues to bypass the translation pipeline entirely.

### Changed
- **Reasoning engine and reasoning language changes are runtime-only.** They never enter the strict localization sync path, never block Settings save / Project Manager / new session sends, and never rebuild browser bootstrap bundles. Only the UI translation engine and the four UI-owned category languages still trigger the strict sync path.
- **Core-owned live reasoning overlay translation now reads `reasoningEngineId` and `reasoningLanguage`.** Provider-local applied-turn-config adapters (Claude, Codex, Gemini) prefer the new envelope fields and fall back to the legacy `translationEngineId` / `messagesForTheUserLanguage` aliases only while Core still forwards both.

### Migration
- **Legacy settings migrate on first load.** `general.localization.engineId` is migrated into `general.localization.uiEngineId` (legacy key dropped from persisted state), `general.localization.reasoningEngineId` is seeded to `google-gtx`, and the new `categories.reasoning` target language is seeded from `messagesForTheUser` so existing installations keep the same visible reasoning language on upgrade.

### Tests
- **Regression coverage added for the split routing.** `SessionTranslationPolicyResolver` now has dedicated tests covering the reasoning engine routing on both the enabled and `localization_sync_pending` paths, the reasoning-language decoupling from `Messages for the User`, and the on-read legacy-migration fallback.
- **Applied turn-config envelope tests updated.** The session request handler fixtures now assert the new `reasoningEngineId` and `reasoningLanguage` fields flow through alongside the legacy aliases.

## [1.2.35] - 2026-04-20
### Fixed
- **Main thinking body text is now slightly brighter on both internal paths.** The readable content inside both legacy `role="thinking"` and assistant-tagged reasoning cards (`Claude · Thinking`, `Codex · Thinking`, `Gemini · Thinking`) now uses `rgba(173, 178, 186, 0.7)` instead of `rgba(173, 178, 186, 0.6)`.
- **The rest of the thinking visual contract remains unchanged.** Fill, stroke, shadow, provider-colored header, and the more-muted timestamp stay on the accepted `1.2.34` baseline while only the main body text is retuned.

### Tests
- **Targeted shared-UI verification passed.** `npm run build:webview` and `npm run build:project-manager` both completed successfully before release packaging.

## [1.2.34] - 2026-04-20
### Fixed
- **Both internal `Thinking` bubble paths now share one chrome contract.** The legacy `role="thinking"` surface and the assistant-tagged reasoning path (`Claude · Thinking`, `Codex · Thinking`, `Gemini · Thinking`) now use the same muted fill `rgba(44, 50, 48, 0.45)` and stroke `rgba(71, 71, 74, 0.45)` instead of rendering with different chrome values.
- **Thinking-card shadow is now unified and softened.** Both thinking paths now keep the same visible shadow `0px 6px 14.1px 3px rgba(0, 0, 0, 0.5)`, replacing the previous split between `no shadow` on the legacy strip and the heavier opaque shadow on the assistant-tagged path.

### Tests
- **Targeted shared-UI verification passed.** `npm run build:webview` and `npm run build:project-manager` both completed successfully before release packaging.

## [1.2.33] - 2026-04-20
### Fixed
- **Visible provider `Thinking` bubbles now render as full cards again.** Assistant-tagged reasoning cards such as `Codex · Thinking`, `Claude · Thinking`, and `Gemini · Thinking` no longer inherit the flatter legacy compact-strip treatment; the user-facing bubble path restores the message-card shadow.
- **Muted provider `Thinking` chrome is now tuned against the real Session dialog backdrop.** The user-facing reasoning bubble surface no longer falls into the darker panel-gray composite caused by sharing the legacy alpha treatment directly on top of the dialog panel background, while the compact `role="thinking"` strip keeps its separate transition-surface contract.

### Tests
- **Shared provider-facing `Thinking` verification passed.** `npm exec -- tsx --test src/client/ui/src/session/dialog-panel-message-utils.test.ts`, `npm run build:webview`, and `npm run build:project-manager` all completed successfully before release packaging.

## [1.2.32] - 2026-04-20
### Fixed
- **Muted thinking-card chrome now uses the exact approved design colors.** The shared reasoning surface no longer relies on approximate near-gray values; fill now resolves from `#2C3230` at `45%` alpha and stroke from `#47474A` at `45%` alpha, matching the intended spec more precisely.

### Tests
- **Targeted shared-UI verification passed.** `npm run build:webview` and `npm run build:project-manager` both completed successfully for the exact-color retune before release packaging.

## [1.2.31] - 2026-04-20
### Fixed
- **Provider `Thinking` headers now keep their accent instead of fading to neutral gray.** Assistant-tagged reasoning cards such as `Codex · Thinking`, `Claude · Thinking`, and `Gemini · Thinking` now preserve the provider hue at `0.6` alpha, so the header remains visibly provider-scoped while still reading as secondary content.
- **Muted thinking bubble chrome is slightly stronger.** The shared thinking surface now uses `0.45` alpha for fill and border instead of `0.4`, improving contrast without restoring the ordinary assistant-card weight.

### Tests
- **Targeted shared-UI verification passed.** `npm run build:webview` and `npm run build:project-manager` both completed successfully for the provider-accent retune before release packaging.

## [1.2.30] - 2026-04-20
### Fixed
- **Visible `Thinking` cards now receive the muted alpha contract on the actual user-facing render path.** Session UI now applies the softened background/border/text treatment not only to `role="thinking"` bubbles but also to assistant messages tagged as thinking, so cards such as `Codex · Thinking` no longer fall back to the ordinary assistant surface.

### Tests
- **The real `assistant + tag="thinking"` path is now regression-covered.** `src/client/ui/src/session/dialog-panel-message-utils.test.ts` now locks the dedicated styling hook for tagged thinking cards, and targeted verification passed with `npm exec -- tsx --test src/client/ui/src/session/dialog-panel-message-utils.test.ts`, `npm run build:webview`, and `npm run build:project-manager`.

## [1.2.29] - 2026-04-20
### Changed
- **Session dialog message cards now use a shared `1px` stroke.** The base bubble contract in `media/session-view.css` no longer uses the heavier `2px` border, so user, assistant, and thinking cards render with a lighter frame across the whole dialog surface.
- **Thinking cards are visually muted across Claude, Codex, and Gemini.** Provider reasoning bubbles now use alpha-softened background and border colors plus dimmer header/body/toggle typography, so visible `Thinking` stays readable but no longer competes with the final assistant answer.

### Tests
- **Targeted shared-UI bundle verification passed.** `npm run build:webview` and `npm run build:project-manager` both completed successfully before the release packaging phase.

## [1.2.28] - 2026-04-20
### Fixed
- **Late translation growth of the last dialog bubble now re-triggers bottom-lock autoscroll.** Session UI now derives the dialog scroll anchor from the last visible bubble display payload (`localizedContent ?? content`) instead of native `content` alone, so when a late Core translation overlay expands the already-rendered last thinking/assistant bubble in place, the view stays pinned to the newest bottom edge automatically.

### Tests
- **Localized last-bubble autoscroll is now regression-covered.** `src/client/ui/src/session/dialog-panel-scroll-anchor.test.ts` now proves that a change in `localizedContent` alone is enough to invalidate the last-bubble scroll anchor, and targeted verification passed for the scroll-anchor test plus `build:webview`.

## [1.2.27] - 2026-04-20
### Fixed
- **Codex app-server commentary is visible again in the dialog trail.** `phase: "commentary"` agent messages now materialize as non-terminal assistant `dialog_message` entries with `tag: "commentary"` instead of being dropped after transport normalization, while `final_answer` stays the terminal assistant reply.
- **Merged Codex thinking cards now preserve a blank boundary before the next standalone bold heading block.** The Session merge helper remains marker-repair aware for split list items, but now inserts a paragraph break before the next `**Heading**` block so completed reasoning sections keep their scan rhythm.
- **Standalone bold heading spacing is now narrowed to real body/list followers.** The Session stylesheet no longer uses an over-broad wildcard sibling rule after bold-only heading paragraphs; the zero-gap rule now targets only the immediately following paragraph/list body, preserving the intended heading rhythm more precisely.

### Tests
- **Codex commentary and heading-boundary regressions are covered on both provider and UI paths.** The app-server router test now locks commentary preservation, and the Session merge-helper test now locks the blank-line contract before standalone bold heading blocks. Targeted verification also passed for `@codeai-hub/codex-app-server-module`, `dist` router tests, the UI merge test, and `build:webview`.

### Contracts
- **Codex hybrid/app-server contract now explicitly preserves commentary and completed reasoning structure.** SSOT docs now state that `Hybrid` cannot collapse user-facing progress down to reasoning + final answer only, and that the Session UI owns boundary-aware merge/spacing repair for completed bold heading sections.

## [1.2.26] - 2026-04-20
### Fixed
- **Claude live ordered lists no longer split on marker-only stream fragments.** The Claude thinking and assistant live buffers now backtrack to the previous safe boundary instead of flushing a chunk that ends with a bare markdown marker such as `1.`, `2.`, `-`, `*`, or `+`.
- **Project Manager now repairs Claude thinking fragments that still arrive with a split list boundary.** The dialog merge layer rejoins `2.` + `Первоначальный запуск` style fragments into one markdown list item before the visible thinking bubble is persisted.
- **Session ordered lists now keep their markers on the outside line box.** The dialog stylesheet no longer renders loose markdown lists with `list-style-position: inside`, which previously pushed the ordered-list number onto its own visual line when the item started with a paragraph block.

### Tests
- **Claude list-marker regressions are covered on both provider and UI paths.** Regression tests now cover thinking/text live buffers, the Claude stream router fallback path, and the Project Manager thinking merge repair utility.

### Contracts
- **Claude session formatting contract is now marker-safe across provider and UI boundaries.** Provider live buffers must not emit marker-only fragments, while the Session UI remains responsible for secondary repair and outside-marker rendering when provider chunking still arrives imperfectly.

## [1.2.25] - 2026-04-19
### Fixed
- **Codex reasoning no longer splits semantic sections across live `thinking` bubbles.** The app-server line now waits for `item/completed` and emits user-facing reasoning from completed summary blocks instead of readable live fragments built from `summaryTextDelta` / `textDelta`, so heading/body pairs such as `**Exploring model synchronization**` and `**Crafting concise questions**` stay intact.
- **Standalone bold reasoning headings now keep the correct spacing after the heading line.** Session dialog CSS now suppresses the extra gap after bold-only paragraph headings while preserving the normal gap before them, so heading paragraphs read as the title of the following text block.

### Tests
- **Codex completed-summary reasoning emission is now regression-covered.** `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.test.ts` covers completion-only reasoning emission, accumulated summary fallback when `item.summary[]` is absent, and raw-text fallback when only `textDelta` exists.

### Contracts
- **Codex reasoning contract is now completion-first on the app-server line.** User-facing reasoning waits for completed summary blocks on `item/completed`; live deltas remain provider-local fallback/diagnostic inputs and no longer define the visible dialog stream.

## [1.2.24] - 2026-04-19
### Fixed
- **Translation overlays now normalize missing spaces on `latin <-> cyrillic` boundaries.** Shared translation post-processing repairs mixed-script prose such as `parallelдля`, `вродеpwd`, and `lsилиsed` before the text reaches dialog overlays, while protected `inline code` and fenced code blocks remain untouched.
- **Assistant and thinking messages now preserve paragraph boundaries before standalone bold section titles.** Shared text formatting repair turns glued patterns such as `...data.**Clarifying ...**` into readable section blocks on both the source message path and the localized overlay path.
- **Nested markdown lists no longer render with inflated blank gaps in ordinary assistant replies.** Session dialog CSS now collapses structural whitespace at the `li` layer instead of surfacing markdown indentation/newline artefacts as empty vertical blocks.

### Contracts
- **Shared text-format normalization is now layered, not UI-provider-specific.** Mixed-script spacing and standalone bold section-title repair are owned by the shared translation/core formatting path, while nested-list whitespace collapse stays owned by the session markdown renderer.

## [1.2.23] - 2026-04-19
### Fixed
- **Codex app-server reasoning is now emitted incrementally from the real-time stream.** `item/reasoning/summaryTextDelta` and optional `item/reasoning/textDelta` now materialize readable append-only `thinking` bubbles while the turn is still running, and `item/completed` only flushes the unseen tail or acts as fallback when deltas are absent.
- **Codex app-server transport diagnostics are restored under `~/.codeai-hub/logs/codex`.** The active process bridge now writes rotate-safe JSONL `sdk-codex-app-server-*.jsonl` files containing JSON-RPC requests/responses/notifications, protocol log records, stderr, and malformed stdout lines, complementing the existing session `*-description.jsonl` and provider-home rollout/history artifacts.

### Changed
- **Codex app-server package builds now start from a clean `dist/`.** `packages/Codex_AppServer_Module` removes stale compiled outputs before `tsc`, preventing deleted `*.test.*` artefacts from leaking into `codex-module-<version>.tar.bz2` and the final VSIX.

### Contracts
- **Codex live reasoning contract is now delta-first on the app-server line.** User-facing incremental reasoning comes from app-server `summaryTextDelta` / `textDelta` notifications, while `summary = "detailed" | "none"` remains governed by the shared settings snapshot and `Reasoning in dialog` toggle.
- **Codex diagnostics are now explicitly three-layered.** The active release line keeps separate CodeAI Hub transport JSONL (`logs/codex`), session-local normalized `description.jsonl`, and provider-native provider-home artifacts instead of collapsing everything into one raw-log surface.

## [1.2.22] - 2026-04-19
### Changed
- **Codex provider runtime switches to the new app-server transport module.** Core keeps the same external provider contract (`codexCli`, provider slot `~/.codeai-hub/providers/codex`, same installer artefact name `codex-module-<version>.tar.bz2`), but the bundled/runtime adapter path now resolves to `@codeai-hub/codex-app-server-module` instead of the legacy SDK-stream package.
- **Core/provider packaging and version orchestration follow the new workspace package.** `build-core.sh`, `build-codex-module.sh`, `build-all.sh`, and release packaging now build/package/version `packages/Codex_AppServer_Module`, remove the old Codex workspace from the staged Core dependency graph, and keep VSIX/provider artefacts aligned to the app-server line.

### Contracts
- **Codex contract stays externally stable while the transport changes internally.** The provider id remains `codexCli`, the provider home remains `~/.codeai-hub/providers/codex/home`, and the release artefact contract remains `codex-module-<version>.tar.bz2`; only the internal transport/runtime implementation changes from legacy SDK rollout streaming to `codex app-server`.

## [1.2.21] - 2026-04-19
### Fixed
- **Strict localization sync now retries isolated missing structured bundle entries before failing Save.** When a provider-owned translation engine returns a marker-preserving runtime bundle with one missing segment, `LocalizationMaterializer` now retries only the missing entry and stitches it back into the bundle instead of persisting a partial-fallback bundle and rejecting synchronization.

### Contracts
- **Whole-bundle localization stays strict, but single-entry recovery is now part of the contract.** Runtime localization bundles still materialize as one structured batch and still fail if unresolved fallback entries remain after recovery, but a single dropped batch segment is no longer treated as an automatic hard failure when it can be recovered deterministically.

## [1.2.20] - 2026-04-19
### Changed
- **Neutral packaging refresh for the duplication and PM refresh line.** `1.2.20` carries forward the runtime fix-set introduced in `1.2.19` and finalizes the archived planning/docs closeout without changing runtime behavior.

### Contracts
- **Runtime contracts are unchanged from `1.2.19`.** Single terminal assistant emission, replay-first usage ownership, and visibility-aware polling remain the governing contracts for this release line.

## [1.2.19] - 2026-04-19
### Fixed
- **Official release closeout for the duplication and PM refresh fix-set.** Claude order-safe finalization, Codex terminal-answer dedupe, Project Manager `Stop` → resend reconciliation, replay-first usage telemetry delivery, and visibility-aware polling budget are now shipped together as the public `1.2.19` line.

### Changed
- **Planning closeout is archived and finalized.** The completed umbrella planning scope moved into `doc/SolidWorks-WorkFlow/Plans/Archive/`, active operational docs now point to the finalized `1.2.19` release/docs flow, and the active `todo-plan` has been reset to an empty placeholder.

### Contracts
- **Single terminal assistant emission and replay-first usage ownership remain the governing contracts for this release line.** Final assistant text is single-owner across Claude/Codex/PM paths, while usage telemetry belongs to provider turn completion plus Core replay/bootstrap rules rather than to UI-owned refresh loops.

## [1.2.18] - 2026-04-18
### Fixed
- **Claude final live text finalization is now order-safe.** Late `content_block_stop` events can no longer append an orphan tail after the canonical final assistant text has already been materialized. The live buffer tracks the finalized text per session and emits only unseen canonical tail content.
- **Codex terminal assistant emission is now single-owner.** When rollout produces equivalent `final_answer` and `task_complete` terminal payloads for the same turn, the first authoritative terminal answer wins and the fallback duplicate is suppressed even in the observed missing-`turn_id` case.
- **Project Manager canonical history now reconciles optimistic `Stop` → resend user bubbles.** When the user stops a turn and immediately resends the same message, the canonical history entry replaces the recent optimistic placeholder instead of rendering side-by-side as a duplicate user bubble.
- **Usage telemetry is replay-first and lifecycle-owned.** Codex and Gemini now deliver fresh usage telemetry on turn completion, Core replays cached `usage_limits` on reopen/reconnect before considering a provider refresh, and the ready-binding bootstrap refresh is allowed only once per binding lifecycle instead of re-triggering on every idle dialog reopen.
- **Idle dialog restore and background polling churn are reduced.** Session usage refresh ownership moved out of the PM UI, idle dialog restore no longer self-refreshes usage limits, and workflow/artifact/diagram polling now uses a visibility-aware budget (`foreground`, `background`, `hidden`) instead of one constant cadence.

### Contracts
- **Single terminal assistant emission.** Claude live finalization, Codex rollout terminal delivery, and PM canonical history now follow a one-owner dedupe contract: final assistant text and canonical user history replace optimistic/intermediate material instead of appending parallel duplicates.
- **Display-only usage UI with replay-first delivery.** `Session ID + Usage Limits` is a passive surface; authoritative usage telemetry belongs to provider turn-completion delivery plus Core websocket replay/bootstrap rules, while PM observers only render the latest snapshot and adjust polling cadence to window visibility.

## [1.2.17] - 2026-04-18
### Fixed
- **Claude localized pre-tool text no longer leaks as assistant/live output before `tool_use`.** In localized workflow turns, Claude could emit an English pre-tool progress fragment such as `I've read the Final_Description.md... Let me create the directory...` and our live text path persisted it as an ordinary assistant/live message between two `Thinking` bubbles. The fragment was therefore shown as a normal answer and skipped the thinking translation overlay. The Claude messaging path now holds localized pre-tool text off the assistant/live branch until the message outcome is known and routes `tool_use` preambles through the thinking contract instead of through the ordinary assistant path.

### Contracts
- **Claude pre-tool text classification.** Claude text that belongs to a message resolving to `tool_use` must not surface as a visible assistant/live bubble in localized sessions; it follows the thinking rendering/translation path instead. Ordinary `end_turn` assistant text keeps the existing assistant contract.

## [1.2.16] - 2026-04-18
### Fixed
- **Claude false `resuming` continuity lock after a successful final reply.** A Claude turn could complete normally, persist the final assistant response, and then fail during post-turn `/context` usage refresh because the Unix probe path launched `node <executablePath> ...` even when `claude` resolved to a native bundled executable. `packages/Claude_Module/src/sdk/claude-context-usage-probe.ts` now executes native Claude binaries directly on Unix and uses `process.execPath` only for real JS entrypoints.
- **Core continuity arbitration now has an explicit provider-side fallback for missing trailing usage snapshots.** When an eligible flow-node session reaches `turn_completed` without a usable usage snapshot, Core still does not auto-assume `no_rollover`. But if the provider explicitly marks post-turn usage as unavailable, `packages/core/src/remote-bridge/handlers/session-request-handler-turn-arbitration.ts` now resolves the turn to `no_rollover` instead of leaving the session stuck in `context_check_pending`.

### Contracts
- **Claude post-turn usage-unavailable signal.** Claude completion flow may emit an explicit `postTurnTokenUsageUnavailable` signal when `/context` usage probing fails after a completed turn.
- **Continuity arbitration invariant.** Shared Core continuity logic may fall back to `no_rollover` only on an explicit provider signal that trailing usage is unavailable; absence of usage alone is still not enough.

## [1.2.15] - 2026-04-17
### Fixed
- **Client-side label fallback flicker.** Companion fix to 1.2.13 (which addressed only the Core-side broadcast path). `src/client/ui/src/session/model-info-builder.ts` `resolveModelReasoning` for Gemini/Codex branches was returning the raw thinking/reasoning level from settings without the provider-specific prefix, so the initial client render produced `(high)` / `(medium)` while `parseEffectiveModelId` on effective ids produced `(thinking high)` / `(reasoning medium)`. First render matched settings, then Core's `session:model:update` replaced it — user saw a one-frame flicker most visible on temp-session start. Fallback now wraps the level as `thinking ${level}` / `reasoning ${level}`. Both paths now produce identical labels.

### Contracts
- **Invariant 14** (Effective model identity SSOT) client-side extension: client `ModelInfo` builder fallback path to settings MUST wrap raw level values in the same provider-specific prefix that Core emits in effective modelIds (`thinking ` for Gemini, `reasoning ` for Codex; Claude keeps its own `thinking off` convention).

## [1.2.14] - 2026-04-17
### Fixed
- **Gemini post-tool stalled-turn watchdog bumped 120s → 240s** in `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts` (`DEFAULT_POST_TOOL_STALLED_TURN_WATCHDOG_MS`). 1.2.13 retest on Gemini 3.1 Pro + `thinkingLevel=high` showed the post-tool leg killed at exactly 120s after a two-tool-call initial turn — Gemini was still in silent deep-reasoning phase when the watchdog fired. The 1.2.11 asymmetry (initial 240s, post-tool 120s) was based on an incorrect assumption that follow-up legs always respond faster than initial reasoning. Both legs are now 240s. Per-session overrides preserved.

### Contracts
- **Invariant 7** (Gemini stalled-turn watchdog) updated: `DEFAULT_POST_TOOL_STALLED_TURN_WATCHDOG_MS = 240_000` now symmetric with `DEFAULT_STALLED_TURN_WATCHDOG_MS = 240_000`. Adaptive-per-thinking-level watchdog remains planned as a future follow-up only if 240s/240s proves too generous or too tight.

## [1.2.13] - 2026-04-17
### Fixed
- **SESSION UI model label flicker between `(thinking high)` and `(high)`.** Cosmetic only — real applied thinkingLevel was always correct. Root cause: `broadcastRuntimeModelUpdate` in `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts` was forwarding raw `data.model` from the provider SDK's `model_info` event (e.g. `"gemini-3.1-pro-preview"`) without the effective-identity suffix, while `session-request-handler-message-dispatch.ts` was broadcasting the same event with the full effective id (`"gemini-3.1-pro-preview thinking:high"`). UI renderer in `src/client/ui/src/session/model-info-builder.ts` matched/fell-back differently on the two shapes. Core now enriches the SDK-path broadcast through `SessionRequestHandlerAppliedTurnConfig.resolveEffectiveModelId(providerId, targetModelId)`, which reuses the same `buildProviderEffectiveModelId` helper the dispatch path already uses. Both paths now emit identical effective ids and the UI label stops flickering.

### Contracts
- **Invariant 26** (Effective model identity SSOT) extended: any `session:model:update` broadcast MUST carry the effective modelId (with thinking/reasoning suffix), never a raw base id from the provider SDK. Raw `data.model` values arriving from SDK `model_info` events must be enriched via `AppliedTurnConfig.resolveEffectiveModelId` before broadcast.

## [1.2.12] - 2026-04-17
### Fixed
- **Core daemon no longer crashes on Gemini cli-core self-abort.** `@google/gemini-cli-core` `GeminiClient.processTurn` calls `controller.abort()` internally when its own loop-detection fires (observed in 1.2.11 retest with Gemini 3.1 Pro + `thinkingLevel=high`). The resulting node-fetch AbortError lives in a background Promise chain that is NOT owned by our `runTurn` try/catch, so it bubbles as uncaughtException and kills the daemon. `packages/core/src/index.ts` now installs a `process.on("uncaughtException", handler)` that inspects the error and selectively swallows `AbortError` only when `error.stack` contains `@google/gemini-cli-core`. All other uncaughtExceptions still crash the process — crash-safety for real bugs is preserved.
- **Gemini mis-routed thinking content rerouted to thinking overlay.** On `thinkingLevel=high` with large Description Agent prompts, Gemini 3.1 Pro streams its internal meta-prompt through `Content` events instead of `Thought` events. `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts` now has a `hasMisroutedThinkingPrefix(text)` detector that checks the finalised assistant segment against known leaks (`sthought`, `CRITICAL INSTRUCTION`, `Related tools:`, `Plan:\n`, `Drafting the content`). When matched, the whole segment is rerouted through the existing `thought-translator-service` overlay path (same helper as the 1.2.9 `[Thought: true]` splitter), so the user never sees an English meta-prompt in the assistant dialog. Detector runs after Bug A splitter and Bug B pre-tool heuristic from 1.2.9.

### Contracts
- **Invariant 7** (Provider dialog segment preservation) Gemini branch extended: mis-routed thinking prefixes in `Content` event streams must be rerouted through the thought-translator overlay.
- **Invariant 30** (new): Core has a process-level `uncaughtException` handler that selectively suppresses `AbortError` from embedded provider SDK stacks (currently `@google/gemini-cli-core`). Embedded SDKs run background Promise chains parallel to our turn runner, and their internal aborts cannot be captured by per-turn try/catch. Any future provider SDK with similar background abort behaviour should be added to the allowlist explicitly.

## [1.2.11] - 2026-04-17
### Fixed
- **Gemini initial-leg stalled-turn watchdog bumped 60s → 240s** (`packages/Gemini_Module/src/session/gemini-session-lifecycle.ts` `DEFAULT_STALLED_TURN_WATCHDOG_MS`). Fixes 1.2.10 retest regression where Gemini 3.1 Pro Preview + `thinkingLevel=high` on the Description step produced 60s silence on the stream channel during deep reasoning and got killed by our watchdog. Post-tool watchdog (`DEFAULT_POST_TOOL_STALLED_TURN_WATCHDOG_MS = 120_000`) unchanged. Single-constant bump; to be validated in retest and narrowed later if 240s proves too generous.

### Contracts
- **Invariant 7** (Gemini stalled-turn watchdog): new baseline is 240s for initial leg, 120s for post-tool leg. Adaptive-per-thinking-level watchdog deferred to a follow-up scope.

## [1.2.10] - 2026-04-17
### Changed
- **Audit cleanup release** (no runtime behaviour change; no retest required). Scope split across four directions: (A) docs + config verification — all three audit-flagged items investigated; `Docs_Index.md` template section extended to document both bundled-template source paths AND per-workspace instance paths (audit had confused the two layers), `knip.json` diagram-DSL exclusion kept (intentional: chain used only through `diagram-editor-facade.test.tsx`), spec-creator TODO lives in a third-party published package (not under our control); (B) localization cleanup — 99 unused keys removed from the four approved source dicts (`ui_labels`, `ui_helper_text`, `messages_for_the_user`, `artifacts_for_the_user`) after a grep-partial dry-run ruled out dynamic template-literal usage; (C) duplication refactor — `useBootstrapSettings` extracted to `src/client/shared/hooks/`, `createWorkspaceFileHandler` factory introduced in `workspace-file-service.ts`, `idea-collector-schema-utils.ts` now imports from `@codeai-hub/agents-shared` instead of duplicating; (D) process formalization — new `doc/SolidWorks-WorkFlow/Checklists/PeriodicAudit.md` documents the recurring audit cadence and parallel audit-pass workflow.
- `check:dup` duplication metric: 3.68% → ~3.2% (stays under the 3%* threshold with headroom; 200+ remaining clones are documented as legitimate parallel provider scaffolding + client↔core boundary mirrors per the new SSOT invariant).

### Contracts
- **SystemArchitecture** gains an explicit "Acceptable parallel-scaffolding duplication" invariant: Claude/Codex/Gemini parallel provider boilerplate (installer, session-logger, provider-adapter, session-registry, auth bridge) and symmetric client↔core type-contract mirrors are NOT debt. Future audits must classify by blast radius (provider isolation + layer independence) rather than by raw LOC.

## [1.2.9] - 2026-04-17
### Fixed
- **Gemini inline `[Thought: true]` marker now splits into a thinking bubble + final assistant reply**: post-tool follow-up turns sometimes arrive as a single `content` stream containing an English thought-like summary, the literal token `[Thought: true]`, and the final target-language answer — without any `ptype: "thought"` events. `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts` `handleFinishedEvent` now regex-splits the assembled segment on `/\[Thought:\s*(true|false)\]/`. The pre-marker half is routed through the existing `thought-translator-service` overlay path (same one native `ptype: "thought"` events use), the post-marker half becomes the assistant bubble, and the literal token itself is dropped from dialog.
- **Gemini pre-tool non-target-language progress text reroutes to thinking overlay**: `TurnAccumulator` now snapshots the assembled assistant text at the first `tool_call_request` event of each turn into `preToolAssistantSegment`. At `handleFinishedEvent`, if Messages-for-the-User target is in the Cyrillic family (`ru` / `uk` / `bg` / `sr` / `mk` / `be` / `ky` / `kk` / `mn` / `tg` / `ab`) and the snapshotted pre-tool text contains zero Cyrillic characters (U+0400..U+052F), the segment is rerouted through `thought-translator-service` as a thinking bubble and excluded from the final assistant bubble. Target `en` disables the heuristic entirely. In-target-language pre-tool text keeps current behaviour (prepended to the assistant bubble unchanged).

### Contracts
- **Invariant 7** (Provider dialog segment preservation) — Gemini branch now documents that inline `[Thought: true]` markers and non-target-language pre-tool progress text are not part of the final assistant bubble; both surface through the thought-translator overlay path.

## [1.2.8] - 2026-04-17
### Fixed
- **Gemini post-stop resume now actually loads the prior chat**: `packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts` now runs the full resume pipeline inside our embed path (1.2.7's `argv.resume` was a no-op because only the `gemini` main binary consumes that flag). The bootstrap scans `config.storage.getProjectTempDir()/chats` for `session-*-<uuid-first-8>.json`, picks the file whose full `sessionId` matches and has the most messages (defensive against pre-1.2.8 mess with two files for one UUID), calls `config.setSessionId(...)`, converts `messages` via the newly exposed `convertSessionToClientHistory` from `@google/gemini-cli-core`, and finishes with `await client.resumeChat(history, { conversation, filePath })`. The existing chat file is reused by `ChatRecordingService.initialize(resumedSessionData)` instead of a new empty one being created.
- **Stale-seed send recovery**: when `GeminiProviderAdapter.sendMessage` catches `Gemini session <id> not found. Available: [] Aliases: []` it throws a tagged `SessionStaleBindingError`. `packages/core/src/remote-bridge/handlers/session-request-handler-provider-send.ts` catches that error, invalidates the binding, seeds the pre-stop `providerSessionId`, re-runs `ensureSessionReadyForSend` (post-stop resume path), and retries the send once. Only one auto-retry per turn; a second failure surfaces as an ordinary provider error. Covers the case where Project Manager dialog bootstrap creates a new Core session with a dead provider session id + `providerSessionStatus: "ready"` and the user send bypasses `hasStopInvalidatedBinding`.

### Removed
- **Legacy `SwitchRecoveryBanner`**: `src/client/ui/src/session/switch-recovery-banner.tsx`, `src/client/project-manager/components/sessions/use-dialog-switch-offer.ts`, `src/client/project-manager/dialog-switch-types.ts`, related CSS and localization keys. Recovery is now silent end-to-end through 1.2.7 post-stop resume + 1.2.8 stale-seed guard.

### Contracts
- **Invariant 24** extended further: providers with `requiresPostStopResume` must publish a recognizable "session not found" surface so that Core can auto-heal mid-send stale-seed cases without prompting the user.

## [1.2.7] - 2026-04-17
### Fixed
- **Gemini `Stop` no longer wipes provider chat history**: `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts` `closeSession` no longer calls `session.client.resetChat()`. That call materialized a new empty `GeminiChat` against the same `Config.sessionId` and wrote a new empty chat file under `~/.gemini/tmp/<projectSlug>/chats/`, orphaning the prior chat file. The abort path is now `abortController.abort()` + `sessionStore.removeSession()` only, so the pre-stop provider chat file stays intact.
- **Core-side post-stop Gemini rebind resumes by provider session id**: Core's `SessionProviderBindingService.invalidateProviderBinding` now remembers the live `providerSessionId` in a pre-stop map before setting the binding to `null`, and `SessionRequestHandlerStopRebind.performRebind` threads that id into `resolveProviderSessionId`'s `requestedProviderSessionId` for providers with the new `requiresPostStopResume` capability. `GeminiProviderAdapter.resumeSession` forwards it to Gemini CLI Core `argv.resume`, which loads the prior chat file with full Description Agent system instructions and prior dialog. Claude/Codex paths are unchanged (their post-stop continuity is already owned provider-natively).

### Contracts
- **Invariant 24** extended: `Provider Stop` is now also required not to discard provider-native chat history. For providers declaring `requiresPostStopResume`, Core must persist the pre-stop provider session id and resume against it on rebind.

## [1.2.6] - 2026-04-17
### Fixed
- **Codex `Stop` aborts the active subprocess instead of waiting for `turn_completed`**: `packages/Codex_Module/src/sdk/codex-sdk-patches.ts` registers the `ChildProcess` spawned by `streamCodexExec` in a module-scoped Map keyed by `threadId` and exports `killActiveCodexProcess(threadId)` which issues `SIGTERM`. `packages/Codex_Module/src/session/session-manager.ts` `closeSession` calls this hook before `lifecycle.closeSession` and the `processingLoop` await, so the underlying `codex exec` stdout closes promptly, the readline `for await` unblocks, the existing `finally` cleans up, and the processing loop resolves. Previously Stop only resolved the outer message generator; the child kept running until Codex naturally finished the turn.
- **PM Stop-button no longer stacks clicks**: `src/client/ui/src/session/input-panel.tsx` tracks a new `stopInFlight` state that flips true on a Stop click and resets when `agentBusy` flips to false. While in-flight the handler short-circuits before calling `stopSession`. `src/client/ui/src/session/input-play-stop-button.tsx` gains a `stopPending` prop that disables the button and switches the aria-label to `Stopping current turn…`.
- **Core `handleStop` re-entry guard**: `packages/core/src/remote-bridge/handlers/session-request-handler-stop-action.ts` early-returns when `hasStopInvalidatedBinding(sessionId)` is already true, preventing a duplicate cleanup path when the PM debounce is bypassed.

### Out of scope (still planned)
- **Gemini Stop → Continue retest** — not yet run, will be covered in a follow-up once the user validates 1.2.6.

## [1.2.5] - 2026-04-17
### Fixed
- **Stop → Continue input lock no longer sticks**: `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts` now (1) mirrors `onSessionBinding` into the `SessionRecord.binding` in addition to the snapshot-level binding, (2) remembers the last known `providerSessionId` in `lastProviderSessionIdRef` the moment the binding flips to `null`, and (3) accepts a new session in `onSessionCreated` via an `isPostStopRebindSwap` branch when the created session carries the remembered `providerSessionId`. Placeholder cleanup and ref reset cover the new adoption path. The UI now switches `activeSessionId` onto the new session the moment Core creates it, so the next user message correctly locks the input panel and surfaces the `Agents is working, please wait...` wait-copy.

### Removed
- **1.2.3 Core `stopdiag_` instrumentation** gone from `stop-action.ts`, `stop-rebind.ts`, `message-dispatch.ts`, `runtime-callbacks.ts` (emit stack-capture), `provider-event-router.ts`.
- **1.2.4 PM `pmdiag_` instrumentation** gone from PM `api.ts`, `session-stream.ts`, `project-manager-runtime-session-view.tsx`, `project-manager-dialog-session-view.tsx`.
- **`pm:diag:log` → project-manager.log appender** reverted: the Core remote-bridge handler again routes PM diagnostic entries through `logger.info` into `core.log`. The dedicated `~/.codeai-hub/logs/project-manager/project-manager.log` file and its `CODEAI_PROJECT_MANAGER_LOG_FILE` env override are no longer written.

### Outstanding (planned for 1.2.6)
- **Codex `adapter.closeSession` abort**: the 1.2.3 Codex trace showed that Stop clicks stack in Core until Codex naturally emits `turn_completed`. Closing must abort the active turn instead of waiting.
- **PM Stop-button debounce**: while a `session:stop` is in flight, `InputPlayStopButton` should not re-fire on subsequent clicks.
- **Gemini Stop → Continue retest** — not covered by 1.2.3 / 1.2.4 retests yet.

## [1.2.4] - 2026-04-17
### Diagnostics
- **PM-side Stop → Continue trace (temporary)**: the 1.2.3 Claude retest proved Core emits `turn_state=running` correctly for the new sessionId that carries the post-Stop turn; PM keeps the old sessionId active in UI state, so the running snapshot lands on a session the input panel is not reading. New logs are routed to a dedicated file `~/.codeai-hub/logs/project-manager/project-manager.log` via the PM `logDiagnostic` transport and a local appender in the Core remote-bridge handler (path overridable via `CODEAI_PROJECT_MANAGER_LOG_FILE`):
  - `src/client/project-manager/api.ts` — `pmdiag_api_stop_session` on every Stop click, `pmdiag_api_send_session_message` on every outbound user message, both with the `sessionId` the UI actually resolved.
  - `src/client/project-manager/components/sessions/session-stream.ts` — `pmdiag_workspace_snapshot_apply` on every `workspace:snapshot` push, with a per-session summary (`turnState`, `continuityLockActive`, `continuityLockReason`, `providerSessionId`, `resumeMode`, `finalTurnCompleted`).
  - `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx` — `pmdiag_active_session_changed` on every `setActiveSessionId` transition with `from`, `to`, `workspacePath`, and a truncated call-site stack (7 frames) so the caller site is identifiable.
  - `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx` — `pmdiag_dialog_active_session_changed` when the dialog controller swaps `session.id`, with `providerId` / `stage` / `providerSessionId` from the current intent.
- **Core logging split**: `pm:diag:log` messages no longer flow into `core.log` via `logger.info` — the remote-bridge handler in `packages/core/src/remote-bridge/remote-bridge-message-router.ts` now writes PM entries through a dedicated appender to `~/.codeai-hub/logs/project-manager/project-manager.log`. Core stays the authoritative writer, PM stays the author, but the two tiers are separated on disk.
- **Codex observation (from 1.2.3 trace)**: `Codex adapter.closeSession` does not abort the active turn; Stop clicks accumulate in Core and only drain when Codex emits `turn_completed` naturally. This is a separate baseline bug from the Claude Stop → Continue input lock; fix planned for 1.2.5 alongside a PM input-panel Stop debounce.
- Scheduled for removal in 1.2.5 together with the 1.2.3 Core `stopdiag_` logs once the PM-side fix lands.

## [1.2.3] - 2026-04-17
### Diagnostics
- **Stop → Continue input lock trace (temporary)**: after a Claude turn is interrupted via `Stop` and the user sends a follow-up message, the reply streams but the input panel stays unlocked — no `Agents is working, please wait...` wait-copy and no disabled fieldset. Core-only structured logs prefixed `stopdiag_` are emitted to `~/.codeai-hub/logs/core/core.log` from:
  - `packages/core/src/remote-bridge/handlers/session-request-handler-stop-action.ts` — `stop_begin`, `stop_close_done/error`, `stop_lifecycle_pre`, `stop_finalize_flow_lock`, `stop_emit_no_rollover_unlock`, `stop_invalidate_done`, `stop_emit_idle`.
  - `packages/core/src/remote-bridge/handlers/session-request-handler-stop-rebind.ts` — `rebind_gate`, `rebind_await_existing`, `rebind_no_adapter`, `rebind_begin`, `rebind_resolve_error`, `rebind_create_done` (with `supportsImmediateBinding`), `rebind_seed_done`, `rebind_attach_done/error`.
  - `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` — `dispatch_begin`, `dispatch_append_skipped`, `dispatch_no_binding`, `dispatch_resolve_binding`, `dispatch_emit_running`, `dispatch_send_done`, `dispatch_send_error`.
  - `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-callbacks.ts` — `emit_turn_state` on every `emitTurnStateEvent` with a truncated `new Error().stack` so every caller is pinpointed to its source.
  - `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts` — `router_typed_event`, `router_handle_typed`, `router_turn_failed`.
- Scheduled for removal in 1.2.4 once the fix lands.

## [1.2.2] - 2026-04-16
### Fixed
- **Core `settings:load` no longer reverts Claude `xhigh` back to `medium`**: `packages/core/src/remote-bridge/handlers/settings-request-handler-claude-thinking.ts` carried an independent hardcoded whitelist `Set(["low","medium","high","max"])` — `xhigh` was missing. Every PM / websocket `settings:load` ran through this whitelist, treated `xhigh` as legacy numeric, normalized it to `DEFAULT_CLAUDE_THINKING_EFFORT = "medium"`, flagged `changed=true`, and persisted the rewritten snapshot to disk. Added `xhigh` plus a matching legacy anchor (`maxTokens: 20000`) and a comment pointing at SystemArchitecture §Invariant 27.

### Removed
- **1.2.0 / 1.2.1 diagnostic instrumentation**: `settings-file-watcher.ts`, persist/load/save debug logging in `settings-storage.ts` and `settings-message-handler.ts`, and the watcher start/stop hooks in `src/extension.ts` are gone.

### Documentation
- **SystemArchitecture §Invariant 27 added**: `settings.json` is re-normalized by two independent layers (extension-side `parseSettingsSnapshot` + Core `SettingsRequestHandler.handleLoad`). Provider effort/thinking values accepted by one layer but not the other are silently rewritten to the Core default on PM boot. New effort/reasoning/thinking levels must be added to all four canonical files in the same commit: UI model registry, extension-side normalizer, shared defaults resolver, Core remote-bridge handler.
- **Modules/Claude.md**, **Modules/Codex.md**, **Modules/Gemini.md** each gain a matching invariant bullet so per-provider work sees the cross-boundary rule.

## [1.2.1] - 2026-04-16
### Diagnostics
- **Settings.json fs watcher (temporary)**: the 1.2.0 trace proved that `persistSettingsSnapshot` alone cannot explain the stale-persist regression — one persist=xhigh log entry was followed by a silent on-disk rewrite to medium. Add a polling `fs.watchFile` started in extension activate and stopped in deactivate before `disposeExtensionLogger`; every mtime/size change on `~/.codeai-hub/settings/settings.json` is logged as `settings_debug_watcher_change` regardless of writer. Removed once the root cause is fixed.

## [1.2.0] - 2026-04-16
### Diagnostics
- **Settings storage trace (temporary)**: `loadSettingsSnapshot`, `persistSettingsSnapshot`, and `handleSaveRequest` now emit structured entries into `~/.codeai-hub/logs/extension/extension.log` via `getExtensionLogger()`. Persist trace includes a full stack trace of the caller. Used to identify the regression where launching Project Manager rewrites `claude.thinking.effort` back to `medium` after the user saved `x-High`. Scheduled for removal in a follow-up release once the root cause is fixed.

## [1.1.999] - 2026-04-16
### Fixed
- **Claude live assistant text no longer renders as one card per sentence**: the Phase 1 live-text ingestion shipped in 1.1.998 still emits each readable fragment as a stable append-only `SessionMessage` (so Core translation overlays can attach `localizedContent` per fragment), but the UI layer now collapses consecutive live fragments into one growing assistant card. The provider tags live emits with `tag: "live"`, Core `appendProviderMessage` forwards the tag into `SessionMessage.tag`, and `mergeLiveAssistantMessages` in `dialog-panel-message-utils.ts` performs the UI merge symmetric to `mergeThinkingMessages`.

### Documentation
- **System SSOT invariant 25** extended with a one-line note about the `tag: "live"` marker and the UI-side merge contract.
- **Modules/Claude.md** dialog-emitter section mirrors the same note.

## [1.1.998] - 2026-04-16
### Fixed
- **Claude visible text is now live**: a new `ClaudeTextLiveBuffer` + `ClaudeContentStreamHandler` ingest `content_block_delta` `text_delta` fragments and emit append-only assistant bubbles at sentence/paragraph boundaries. The previous ~2-minute silence between pre-tool assistant text and `stop_reason="tool_use"` (while Claude streamed large `input_json_delta` for `Write`/`Edit`) is eliminated. Finalization reconciles the assembled text against what was already materialized so nothing is duplicated.
- **Opus 4.7 plain-text thinking is visible again**: SDK option `thinking.display: "summarized"` is forwarded whenever thinking is enabled. Without it, Opus 4.7 only streams `signature_delta` (encrypted, zero plain-text). Safe no-op on Sonnet/Haiku/older Opus where plain-text thinking was already exposed.

### Added
- **x-High reasoning effort**: `ClaudeThinkingEffort` union extended with `xhigh` between `high` and `max`. Documented by the Claude Agent SDK as Opus-only "Deeper than high; falls back to High elsewhere". Settings UI renders it with a new radio row and localized label `x-High`.

### Changed
- **Claude model labels stop shipping hard-coded versions**: `CLAUDE_MODEL_ALIASES[].displayName` is now `Sonnet` / `Opus` / `Haiku`. Descriptions call out that the Anthropic SDK auto-resolves each alias to the latest concrete version at query time (today: `opus → claude-opus-4-7`).

### Documentation
- **System SSOT invariant 25** rephrased from "Provider live thinking" to "Provider live content" and extended to cover live `text_delta` ingestion too.
- **System SSOT invariant 26** added: Claude model aliases stay unversioned in UI, effort union is 5-level, `thinking.display = "summarized"` is the Opus-visibility contract.
- **Modules/Claude.md** updated: new messaging cluster files (`claude-content-stream-handler`, `claude-text-live-buffer`, `claude-structured-output-helpers`), new SDK options, and effort/alias contract.

## [1.1.997] - 2026-04-16
### Fixed
- **`Stop` is now shutdown-safe for Claude**: pressing `Stop` while Claude is streaming reaches the SDK as a clean interrupt and the resulting `aborted_streaming` terminal reason is treated as the expected outcome of a stopped turn. Late processor / dispatch / processing errors arriving after shutdown are suppressed instead of being emitted into a torn-down session error channel, so core no longer crashes with `ERR_UNHANDLED_ERROR` on the post-`Stop` window.
- **Claude provider error envelope reaches Core symmetrically to Codex**: `ClaudeProviderAdapter` now bridges `session.eventEmitter.on("error", ...)` into the standard provider error envelope, so active stream failures continue to surface to Core without depending on listeners that are about to be removed.

### Added
- **Live Claude `Thinking` streaming**: reasoning is now surfaced incrementally as Claude streams `thinking_delta` fragments. A new per-session `ClaudeThinkingLiveBuffer` accumulates raw fragments and emits readable segments at sentence/paragraph boundaries (default flush threshold ~240 chars), wrapped in a dedicated `ClaudeThinkingStreamHandler` micro-class. The dialog no longer goes silent during long Claude reasoning.
- **Live thinking dedupe vs final block**: the final assembled `thinking` block from Claude is now reconciled against what was already materialized live. If the final block is a superset, only the unseen tail is emitted; if it diverges, the canonical block wins and is emitted in full; if no live path ran, the legacy "emit full block" behavior is preserved.

### Documentation
- **System SSOT now documents two new invariants**: invariant 24 (provider `Stop` is shutdown-safe) and invariant 25 (provider live thinking is incremental and dedup-safe) so future provider work cannot regress the behavior silently.
- **Claude module SSOT and Shared Runtime Translation module SSOT** updated to reflect the new live-thinking ingestion path, finalization dedupe contract, and the per-bubble overlay translation requirement (multiple stable `messageId`s per turn).

## [1.1.996] - 2026-04-16
### Fixed
- **Project Manager `Stop` now reaches the correct session transport**: the shared input-panel stop action now delegates to the Project Manager transport when that frontend is active, instead of sending through the regular chat webview bridge that is not initialized inside the standalone workflow shell.
- **Hung continuity rollovers can now be interrupted from the input bar**: when Project Manager is stuck on `Agent is resuming your session`, the `Stop` button can again send a real `session:stop` request for the active session and release the UI from a transport-level dead button.
- **Regression coverage locks the Project Manager stop delegation path**: a dedicated core-bridge test now asserts that `stopSession()` forwards to the Project Manager hook when the shared session UI runs outside the regular webview bootstrap.

## [1.1.995] - 2026-04-16
### Fixed
- **Description no longer reuses stale workflow snapshots during workspace switch**: the Project Manager main area now ignores workflow-store payloads whose `workspaceSlug` and `workspacePath` do not match the current active workspace, preventing the previous workspace from reselecting its `Final_Description.md` during the switch window.
- **Workspace switch restores the correct pre-submit Description surface**: when the newly selected workspace has no `Final_Description.md`, Project Manager now keeps the questionnaire/editor path instead of showing the false `Description artifact is not available yet` placeholder on the right panel.
- **Regression coverage locks the current-workspace guard**: the main-area workflow-state test now asserts that Description artifact derivation stays gated by the active workspace identity, reducing the chance of cross-workspace regressions returning silently.

## [1.1.994] - 2026-04-16
### Fixed
- **Translation engine availability now follows real provider status**: the Settings localization engine selector keeps `Google GTX Free` available by default, but disables `OpenAI Codex` and `Anthropic Claude` engines when their backing provider stack is unavailable in live `core:state`.
- **Unavailable provider-owned engines now explain themselves instead of looking ready**: disabled translation options surface the provider recovery/status message so users see that CLI access or provider runtime readiness must be restored before those engines can be selected.
- **The UI no longer implies a non-existent subscription check**: CodeAI Hub still does not have a first-class entitlement signal for OpenAI or Anthropic, so the selector now gates by actual provider availability/auth state rather than pretending model access was explicitly verified.

## [1.1.993] - 2026-04-16
### Fixed
- **Google GTX strict sync now survives large localization bundles**: the shared Google translation client no longer forces long marker-preserving runtime bundles through a `GET ...&q=...` URL; large payloads now use `POST application/x-www-form-urlencoded`, preventing full-bundle fallback on categories such as `system_feedback`.
- **Whole-bundle localization batching remains unchanged for Google-backed runtime sync**: `LocalizationMaterializer` still uses one structured no-chunk batch per runtime bundle, but the transport layer now chooses a payload-safe request method instead of failing closed before translation begins.
- **Regression coverage locks the transport split**: the translation package now tests both short `GET` requests and large `POST` requests for `google-gtx`, protecting the runtime save path from reintroducing the `83 fallback translations` error.

## [1.1.992] - 2026-04-16
### Fixed
- **Haiku startup bundle translation now masks `Ultrathink` trigger literals before dispatch**: the Claude Haiku translation-only runtime replaces prompt-triggering literals such as `Ultrathink` with internal placeholders before sending localization/help text to the provider and restores them after translation, preventing provider-native `ultrathink_effort` from reappearing on the first large startup bundle.
- **Runtime localization bootstrap is no longer strictly one bundle at a time**: `LocalizationFacade` now resolves the runtime-priority bundle set with bounded concurrency `2`, shortening cold-start and strict save-sync latency on slower engines while preserving the existing strict-ready semantics.
- **Thinking translation no longer bottlenecks on a single global worker**: the session translation dispatcher now runs `2` concurrent jobs, reducing queue-driven delay when Codex/Claude/Gemini emit several visible thinking bubbles in quick succession.

## [1.1.991] - 2026-04-16
### Fixed
- **Haiku translation-only runtime now hard-disables thinking at the SDK level**: the provider-owned Claude translation path still sends `thinking: { type: "disabled" }`, but now also passes `settings.alwaysThinkingEnabled = false`, so literal help text such as `Ultrathink` can no longer reactivate hidden Claude reasoning during interface/help bundle materialization.
- **Regression coverage now locks the transport profile**: the Haiku translation service test asserts the SDK `alwaysThinkingEnabled: false` flag together with the existing translate-only prompt and disabled-thinking query profile.
- **Claude SSOT now records the no-thinking translation contract**: the module documentation explicitly states that translation-only Haiku requests must keep prompt-triggered reasoning heuristics disabled even when the source text contains thinking-related literals.

## [1.1.990] - 2026-04-16
### Fixed
- **Haiku translation prompts are now explicit and marker-safe**: the provider-owned Claude Haiku runtime no longer sends raw source text as a bare user request; it wraps every translation in a translate-only prompt, repeats the `__CODEAI_HUB_LOCALIZATION_ENTRY__` preservation rule for `localization_bundle`, and keeps helper/help/interface materialization aligned with the existing one-bundle no-chunk path.
- **Dedicated Haiku translation runtime JSONL are restored under the intended project slug**: translation turns keep `persistSession: true`, but the query runtime now executes from the dedicated `translation-runtime-haiku` project directory while auth/bootstrap still reuse provider-home, so native Claude traces are written into a stable translation-only bucket again.
- **Live reasoning translation no longer duplicates identical Haiku jobs**: Core reuses one in-flight translation per `engineId + targetLanguage + sourceHash`, preventing live reasoning plus rollout replay from enqueueing the same visible thinking block twice behind the single-worker session-translation dispatcher.

## [1.1.989] - 2026-04-15
### Fixed
- **Haiku save-path false mismatch removed**: extension-side strict localization sync now normalizes to the same canonical five-category runtime snapshot that Core returns from `/api/v1/localization/bootstrap`, so selecting `Anthropic Claude · Haiku 4.5` no longer fails with `Core localization bootstrap does not match the current settings snapshot`.
- **Regression coverage for canonical bootstrap matching**: added unit coverage for the exact Haiku bootstrap snapshot shape that Core emits, preventing future reintroduction of the five-category vs nine-key mirrored comparison bug.

## [1.1.988] - 2026-04-15
### Fixed
- **Settings and Project Manager startup unblocked**: both UI clients now stop waiting for `/api/v1/localization/bootstrap` before the first React render, removing the blank shell / long apparent hang when Haiku helper/help bundles are still catching up.
- **Settings now reflects `settings.json` immediately**: load paths broadcast the persisted settings snapshot first and deliver localization runtime in a second pass, so the Settings panel no longer sits on default values while localization resolves.
- **Localization bootstrap is cache-first**: Core now returns the persisted bootstrap snapshot when it matches the active settings and no longer triggers a strict helper/help bundle rematerialization on every bootstrap GET.

## [1.1.987] - 2026-04-15
### Fixed
- **Haiku reasoning translation no longer falls back silently to Google GTX**: the provider-owned Claude Haiku service is now injected into the live Core session-translation runtime, and explicit `anthropic-claude-haiku-4-5` requests fail closed with diagnostics instead of quietly resolving to the default engine.
- **Core-only Haiku localization path now stays authoritative**: `/api/v1/localization/bootstrap` rebuilds a strict snapshot from current settings for `anthropic-claude-haiku-4-5`, extension-host save/bootstrap flows must consume that Core-produced snapshot, and helper/help/message bundles no longer degrade to locally materialized English fallback content under `ru`.
- **Provider-native Haiku diagnostics and traces restored**: Claude Haiku translation queries now persist native provider JSONL under the dedicated `translation-runtime-haiku` slug, and session-translation logs record requested/resolved engine metadata so runtime mismatches are visible without indirect log reading.

## [1.1.986] - 2026-04-15
### Added
- **Anthropic Claude Haiku 4.5 translation engine**: new engine `anthropic-claude-haiku-4-5` is exposed in Localization settings as `Anthropic Claude · Haiku 4.5`. UI bundle materialization and Core-owned live reasoning overlays can now dispatch through Claude Haiku reusing the existing Anthropic subscription and provider-home auth bootstrap.
- **Provider-owned translation service**: `ClaudeHaikuTranslationService` (+ category-aware `buildClaudeHaikuTranslatorInstruction`) lives next to the Claude provider and runs a dedicated translation-only query profile (`tools: []`, `maxTurns: 1`, `persistSession: false`, `thinking: { type: "disabled" }`, `model: "claude-haiku-4-5-20251001"`, project slug `translation-runtime-haiku`). Translation turns do not create native Claude session JSONL.
- **Core-backed translation and localization factories**: `createCoreTranslationFacade(...)` composes built-in engines with the Haiku wrapper, `createCoreLocalizationFacade(...)` threads that facade into the localization pipeline, `SessionTranslationFacade` now delegates facade construction through this factory, and the shared translation package exports a reusable `createDefaultTranslationEngines(...)`.

### Changed
- **Extension-host skips local Haiku materialization**: `LocalizationRuntimeService.synchronizeRuntimePayload` falls back to `resolveRuntimePayload` when the active engineId is Core-only, so extension-host does not attempt to run Claude translation locally and keeps reading the persisted bootstrap snapshot from disk.
- **Translation engine profile registry**: adds a chunk policy entry for `anthropic-claude-haiku-4-5` (`soft 400 / hard 600`, `mode: "auto"`) as a registry placeholder; live localization/reasoning paths continue to dispatch without chunking.
- **Localization facade injection path**: `LocalizationFacade` now accepts an optional `translationFacade` via `LocalizationTranslationFacadeContract`, and `LocalizationMaterializer` consumes that contract instead of a concrete `TranslationFacade` class.

## [1.1.985] - 2026-04-15
### Changed
- **Incremental settings save sync**: Settings save path classifies every save through `LocalizationSettingsImpactClassifier` and `LocalizationSelectiveSyncPlanner`; provider-only, response-mode, and continuity saves skip the localization overlay, while engine/category saves rebuild only the planned runtime bundle set.
- **Messages for the User owns visible Thinking / Reasoning**: user-facing localization boundary, Localization module SSOT, and Settings helper copy explicitly classify visible provider Thinking / Reasoning under `Messages for the User`.

### Fixed
- **Hidden thinking never enters translation**: `SessionTranslationPolicyResolver` resolves per-provider visibility from the active settings snapshot, and `SessionTranslationFacade` short-circuits thinking/reasoning translation when the owning provider's display toggle is off.
- **Forward-only thinking visibility**: persisted `SessionMessage` records now carry an immutable `visibilityAtEmission` decision; shared Session transcript filters honor it over the current settings flag, so re-enabling `Thinking in dialog` / `Reasoning in dialog` inside a long-running session no longer reveals previously hidden reasoning.

## [1.1.984] - 2026-04-14
### Fixed
- **Reasoning defaults to one-block translation**: shared translation request normalization now resolves `category = reasoning` to `chunkingMode = "disabled"` unless a caller explicitly opts back into chunking.
- **Live thinking overlays stop paying sequential chunk latency**: Codex, Gemini, and Claude reasoning messages now translate as one provider-emitted block instead of `2-5` sequential subrequests through the shared chunk planner.
- **Chunk planner preserved for non-reasoning content**: `generic` and `document` translation keep the existing engine-aware chunk policy, so long-form bundle/document translation does not lose its current fallback protections.

## [1.1.983] - 2026-04-14
### Fixed
- **Canonical bootstrap path for live thinking translation**: `SessionTranslationPolicyResolver` now reads the persisted browser localization bootstrap from `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json` instead of constructing a double-prefixed `~/.codeai-hub/.codeai-hub/...` path.
- **Codex reasoning overlays no longer stall behind a false pending gate**: when the persisted bootstrap already matches the active localization settings, Core now enables the live translation policy and allows `thinking` fragments to reach async translation dispatch instead of skipping them forever as `localization_sync_pending`.
- **Regression coverage for release runtime layout**: added a production-like settings/bootstrap path test so future changes cannot silently break the `~/.codeai-hub/settings/` -> `~/.codeai-hub/localization/cache/` bootstrap contract again.

## [1.1.982] - 2026-04-14
### Fixed
- **Bundle-level interface localization batching**: localization save-sync now translates each selected interface bundle as one structured marker-preserving request instead of dispatching Codex per entry, eliminating the multiplicative slowdown that kept the localization spinner active for minutes.
- **Warm Codex translation bootstrap reuse**: temp translation-only Codex runtimes now reuse cached plugin/bootstrap artifacts from the resolved Codex home, removing repeated plugin bootstrap overhead during interface localization.
- **Project Manager blank screen after localization blocking**: PM main-area busy placeholders now keep hook order invariant across `busy -> ready`, so the UI recovers cleanly after strict localization sync instead of rendering an empty shell.

## [1.1.981] - 2026-04-14
### Fixed
- **Bundle-level interface localization batching**: localization save-sync now translates each selected interface bundle as one structured marker-preserving request instead of dispatching Codex per entry, eliminating the multiplicative slowdown that kept the localization spinner active for minutes.
- **Warm Codex translation bootstrap reuse**: temp translation-only Codex runtimes now reuse cached plugin/bootstrap artifacts from the resolved Codex home, removing repeated plugin bootstrap overhead during interface localization.
- **Project Manager blank screen after localization blocking**: PM main-area busy placeholders now keep hook order invariant across `busy -> ready`, so the UI recovers cleanly after strict localization sync instead of rendering an empty shell.

## [1.1.980] - 2026-04-14
### Fixed
- **Blocking localization readiness on save**: localization `Save Changes` now waits for Core to rematerialize and activate the required runtime bundles in deterministic priority order before Project Manager resumes interactive work.
- **Whole-request interface localization**: Settings/Help/User-message bundle materialization no longer uses chunk fan-out; it now relies on dynamic watchdog timeouts plus automatic retries and rejects fallback / `partial_fallback` results for required categories.
- **Serialized live translation dispatch**: live session translation now resolves current localization settings on each dispatch, stays disabled until the persisted bootstrap matches those settings, and runs through a shared single-worker queue to prevent restart races and overloaded translation bursts.
- **Hydration drift in UI/runtime model state**: the localization engine selector now preserves unknown persisted engine ids instead of coercing to `Google GTX Free`, and early runtime model updates are buffered until the session snapshot exists so the visible model label matches the real session.

## [1.1.979] - 2026-04-14
### Added
- **Universal chunk planner in shared translation**: long translation requests now split at safe paragraph/list/sentence/clause boundaries, respect protected Markdown/code/link/placeholder spans, and run through engine-specific conservative chunk budgets before dispatch.
- **Chunked translation regression tests**: added dedicated coverage for protected-boundary resolution, multi-chunk round-trip planning, and partial-fallback assembly in `@codeai-hub/translation`.

### Changed
- **Core translation diagnostics now trace chunk execution**: session translation logs include chunk plan metadata, per-chunk dispatch/completion with elapsed time, and final assembly summary under the existing `sessionId` / `messageId` / `sourceHash` correlation path.
- **Localization materialization now uses the shared chunk contract explicitly**: long localized help/settings strings opt into shared `chunkingMode = "auto"` and materialization results now expose counts for whole-string fallback versus `partial_fallback` across unique translation operations.

## [1.1.978] - 2026-04-13
### Added
- **Core-side thinking translation trace logging**: every user-visible thinking message now writes a correlation trail to `~/.codeai-hub/logs/core/core.log`, covering message persistence, translation dispatch start, translation completion/fallback, overlay append, and session/dialog translation patch broadcast.

### Changed
- **Diagnostic release for mixed-language Codex thinking**: this build is meant to capture why only part of a multi-fragment Codex reasoning burst receives localized overlay patches. It does not yet change UI aggregation or translation-engine policy.

### Not fixed yet
- **Partial thinking localization remains under investigation**: native rollout segmentation and unified-session persistence are already confirmed correct; the open issue is why some reasoning `messageId`s complete the overlay path while others end in `fallback / empty_translation`.

## [1.1.977] - 2026-04-13
### Fixed
- **PM artifact-language restart regression**: workflow prompt-pack assembly now falls back to the persisted browser localization bootstrap snapshot when live settings have not reloaded yet, so `Artifacts for the User` no longer silently degrades from `ru` to `en` after Project Manager reconnect/cold-start.
- **Codex translation runtime bootstrap**: isolated translation-only Codex runs now resolve auth/cache artifacts from provider home first and fall back to legacy `~/.codex` data when the provider-owned home is not present yet.
- **Thinking overlay chunk identity**: Codex reasoning delta messages now emit deterministic per-chunk ids instead of reusing one provider item id, preventing later translation overlays from overwriting earlier thinking fragments in live/replay/history paths.

## [1.1.976] - 2026-04-13
### Fixed
- **Codex rollout thinking translation**: rollout-backed Codex thinking now follows the same source-first plus Core overlay path as the rest of the thinking pipeline, instead of triggering a second provider-local translation attempt inside the active Codex turn.
- **Missing final reply under `outputSchema`**: plain-text rollout `final_answer` messages now fall back to raw assistant output when structured parsing does not produce `assistantText`, so workflow turns no longer end with thinking only and no visible final answer.

### Changed
- **Codex rollout cleanup**: the obsolete provider-local Codex thought-translation adapter was removed after rollout thinking translation ownership moved entirely into the Core overlay path.

## [1.1.975] - 2026-04-13
### Added
- **Selectable translation engines**: `Settings -> Localization -> Translation engine` now offers `Google GTX Free`, `OpenAI Codex · GPT-5.4 Mini`, and `OpenAI Codex · GPT-5.3 Codex Spark`.

### Changed
- **Shared engine propagation**: the selected `translationEngineId` now travels from persisted localization settings through Core applied turn config into Codex, Claude, and Gemini live translation paths.
- **Catalog-backed selector stability**: the settings UI keeps all supported translation-engine options visible even before localization runtime bootstrap finishes loading.

## [1.1.974] - 2026-04-13
### Changed
- **Release rebuild only**: this package is a clean rebuild of the already shipped `1.1.973` baseline with a fresh release number for distribution and validation.

### Not changed
- **No new product logic in this rebuild**: the source-first thinking overlay pipeline, persisted localized history projection, and Claude translation packaging fix remain exactly as shipped in `1.1.973`.

## [1.1.973] - 2026-04-13
### Changed
- **Source-first thinking delivery**: Gemini, Codex, and Claude now emit visible thinking into session history immediately in the provider's native language, while translation runs asynchronously in Core instead of blocking the first render path.
- **Localized history projection**: Core persists translated thinking overlays per session and reapplies them on runtime/dialog history load through `localizedContent`, so previously translated thoughts reopen already localized without rewriting the canonical transcript.

### Fixed
- **Mixed-language thinking race**: the first reasoning chunks no longer fall back permanently to English just because the live translation request times out or returns late; the UI can now patch the already-rendered message when the translation arrives.
- **Claude packaging gap**: release packaging now vendors and validates `@codeai-hub/translation` inside the installed Claude provider bundle, preventing runtime failures in the remaining provider-local pre-tool translation path.

## [1.1.972] - 2026-04-13
### Added
- **Inline provider override on trunk confirmation cards**: idle `Virtual Simulation` and `Diagram Modules` stages now show a visible provider selector in the confirmation card. The previous-step provider is preselected and marked inline, but the user can switch to any connected provider before launching the next step.

### Fixed
- **Chosen-provider bootstrap identity**: Project Manager now seeds dialog/bootstrap snapshots from the explicit step-start provider intent when opening a new trunk-step session, so the lower status/model panel starts on the correct provider context even before the final runtime model update arrives.
- **Provider-correct restore request path**: runtime restore/bootstrap no longer re-reads a stale provider identity from dialog-list payloads when the explicit step-start provider should remain authoritative.
- **Limits follow the selected provider**: after the new step session becomes `ready`, `Session ID + Usage Limits` refreshes against the selected provider/runtime identity and shows the correct provider-family limits instead of lingering on the previous step provider.

## [1.1.971] - 2026-04-13
### Fixed
- **PM/Core `sessionKind` mismatch removed from restore adoption**: Project Manager no longer requires `sessionKind` equality when adopting the real runtime session after dialog auto-restore, because Core `session:created` does not preserve that PM-only field.
- **First auto-opened step can now leave placeholder state**: the restored dialog session is adopted on the first workspace open, so the active snapshot can reach the existing ready-time usage-limits refresh path without a manual stage switch.
- **Smaller restore contract**: the dialog restore path now keys only on actual continuity identity (`workspace`, `stage`, `run`, `provider`, `providerSessionId`) instead of accumulating extra PM-only conditions.

## [1.1.970] - 2026-04-13
### Fixed
- **Auto-select dialog restore race**: Project Manager no longer sends manual usage-limits refresh while the dialog restore path still points at a placeholder bootstrap session without a materialized runtime session.
- **Runtime-session adoption after restore**: when Core creates the real runtime session for a restored dialog continuity entry, PM now swaps the placeholder snapshot to that runtime session and keeps the existing dialog history attached.
- **Ready-only refresh effect**: `Session ID + Usage Limits` now waits for `binding.status === ready`, so the manual refresh request is emitted only after runtime restore/rebind has completed.

## [1.1.969] - 2026-04-13
### Changed
- **Project Manager diagnostics now persist to Core logs**: standalone PM forwards usage-limits investigation events into Core over the websocket bridge, so restore/bootstrap diagnostics land in `~/.codeai-hub/logs/core/core.log` instead of depending on browser console access.
- **Usage-limits refresh decision logging**: Core records whether the manual refresh path found the runtime session, resolved a bound `providerSessionId`, and actually dispatched the request to the provider adapter.
- **Investigation-only release**: this package is intended to capture the auto-select refresh race after workspace open; it does not yet claim a user-visible fix for that regression.

## [1.1.968] - 2026-04-12
### Fixed
- **Dialog-session refresh wiring**: Project Manager dialog-mode session screens now pass `onRefreshUsageLimits` into `SessionView`, restoring live usage-limits refresh on active workflow stage dialogs.
- **Limits visible again across providers**: Codex, Claude, and Gemini usage limits render again in Project Manager because the manual refresh request is now sent from both runtime-session and dialog-session surfaces.
- **No backend contract rollback**: the release keeps the existing provider-global, live-only usage-limits contract from `1.1.967`; this patch only restores the missing UI trigger path.

## [1.1.967] - 2026-04-12
### Fixed
- **Provider-global usage limits**: the same provider now shares one canonical usage-limits scope across workflow sessions instead of keeping separate limits per provider session id.
- **Persistent cache removal**: `Session ID + Usage Limits` no longer falls back to browser-stored usage-limit snapshots, so the panel reflects only fresh live snapshot data.
- **Legacy scope normalization**: restored sessions with old session-specific `providerScopeKey` values are normalized into the provider-global contract when usage limits propagate through Project Manager.

## [1.1.966] - 2026-04-12
### Fixed
- **Session-scoped usage limits refresh**: `Session ID + Usage Limits` now sends manual refresh requests with the real active session context (`sessionId`, `providerId`, `providerSessionId`) instead of a provider-wide synthetic scope.
- **Runtime-scoped refresh broadcast**: Core now routes manual usage-limits refresh results back into the concrete runtime `sessionId`, so the active Project Manager snapshot rerenders immediately through the normal `session:stream` path.
- **Bound provider session reads**: Claude, Codex, and Gemini manual refresh paths now read usage limits for the active bound provider session instead of the synthetic `proactive` bucket.
- **Regression coverage**: added dedicated Core coverage for the session-scoped refresh path and documented the factual `SessionIdUsageBar` contract.

## [1.1.965] - 2026-04-12
### Fixed
- **Codex rate limits**: replaced broken RPC reader (`codex app-server` fails on `prolite` plan type) with direct HTTP reader that calls `chatgpt.com/backend-api/wham/usage`. Session and weekly limits now display reliably.
- **Gemini rate limits**: expanded model whitelist to cover all current Gemini models (3.1 Pro, 3 Pro, 3 Flash, 3.1 Flash Lite, 2.5 Pro, 2.5 Flash). Unknown model IDs are now auto-formatted instead of silently dropped.
- **Proactive rate limits on session open**: all three providers (Codex, Claude, Gemini) now fetch usage limits immediately on session create/resume instead of waiting for the first completed turn.

## [1.1.965] - 2026-04-12
### Fixed
- **Confirmation card localization**: added all missing message IDs to approved source dictionaries (`ui_labels.json`, `ui_helper_text.json`, `messages_for_the_user.json`) so confirmation card texts are localizable. Fixed `confirm_warning` to use template variable `{upstreamStage}` instead of JS template literal.
- **Session auto-restore on workspace open**: auto-select retries session dispatch when chains are not yet available. WorkflowStateStore emits when chain count changes. Dialog list retry no longer overwrites already-loaded message history — the `dialog:list:result` handler now skips re-bootstrap if the dialog was already matched and loaded.
- **Right panel jitter during agent responses**: memoized `MainAreaArtifactContent` JSX via `useMemo` so Help/Artifacts panel does not re-render when session messages stream in. Wrapped `MainAreaArtifactContent` with `React.memo` for additional protection.

## [1.1.938] - 2026-04-11
### Added
- **Stage confirmation card**: clicking an idle trunk stage (Virtual Simulation, Diagram Modules) in the sidebar shows a confirmation card in the left panel. The card displays the upstream artifact name and availability status, a warning that Start confirms readiness, and a Start button that creates the agent session and sends the instruction pack automatically. When the upstream artifact is missing, the button is disabled and a blocked message is shown. Localized via `ui_interface` / `user_guidance` / `system_feedback` categories.

### Changed
- **Prop-based session intent**: `ProjectManagerSessionView` receives `initialDialogIntent` as a prop resolved from workflow state continuity chains, instead of relying on `pm:dialog:open` broadcast events for startup and navigation. Sessions load instantly on workspace open and stage switch regardless of React mount timing. The event listener remains for runtime-only scenarios (confirmation card Start, manual sidebar clicks). Scales to any number of sessions without timing workarounds.
- **Neutral empty state**: session panel shows "No active session" / "Select a workflow step in the sidebar" instead of Description-specific questionnaire instructions.
- **Dynamic startupStage**: session scope reflects the active stage immediately instead of hardcoded "description".

## [1.1.935–1.1.937] - 2026-04-11
- Intermediate releases (superseded by 1.1.938).

## [1.1.934] - 2026-04-11
### Changed
- **Type markers**: development tree branch nodes now display P/C/M letter markers (19×19px) instead of separate toggle triangles and type badges. Marker color follows three-state scheme: gray (idle), orange (in-progress), green (done). Expandable markers with children show a green outline with 2px offset.
- **Nested sidebar structure**: development tree renders as nested DOM with ProductPart wrapper (accent frame on expand), cluster wrapper with vertical/horizontal connector lines to child modules. Row click expands/collapses without separate chevron.
- **Accordion behavior**: only one ProductPart and one Cluster can be expanded at a time. Opening a new node collapses the previous one.

## [1.1.932] - 2026-04-10
### Changed
- **Module kind field removed**: the internal DSL classifier (`service`, `adapter`, `gateway`, etc.) is removed from the entire codebase — types, parsers, serializer, diff service, agent templates, and all tests. The field was never used for behavioral decisions.
- **Diagram card cleanup**: module cards no longer show the redundant cluster/standalone footer line. Visual hierarchy already communicates membership.
- **Accent-colored titles**: module, cluster, and product part names on the diagram now use the accent color for better readability.
- **Development tree module names**: the sidebar now displays humanized module IDs (e.g. "Extension Entry Shell") instead of DSL kind tokens ("service").

## [1.1.931] - 2026-04-10
### Added
- **Development Tree baseline**: after Diagram Modules completes, the sidebar projects a Product Part / Cluster / Module tree from generated artifacts. Skeleton parts appear as `todo`; materialized parts as `draft` with nested children.
- **Branch-node selection routing**: clicking a dev tree node dispatches `pm:branch:selected` and updates the panel header and artifact surface.

### Changed
- **Sidebar-only trunk navigation**: the top stage toolbar is removed; the workspace tree is the sole navigation surface.
- **Section separators and leaf stage nodes**: workspace root replaced by "Documentation Tree" / "Development Tree" separators. Trunk stages are flat leaf nodes; panel sync via `pm:stage:activated`.
- **Three-color stage indicators**: gray (idle), orange (in progress), green (artifact available). Stage color derived from artifact availability, not core completed event.
- **Auto-select last active stage**: on workspace open, the last non-idle stage is selected instead of always starting at Description.
- **Zoom badge in status bar**: diagram zoom indicator moved from scrollable canvas to the bottom status bar for consistent visibility.

### Not changed
- Branch session lifecycle (lazy start, provider inheritance, restore) is deferred to a follow-up release. Branch panels show a placeholder surface.

## [1.1.923] - 2026-04-09
### Changed
- **Projection naming cleanup (internal refactor)**: the Diagram Modules adapter layer no longer carries React Flow naming. `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.ts*` and `module-stage-react-flow.ts` are renamed to `domain-model-to-projection.ts*` and `module-stage-projection.ts`. Eight types move from `DiagramFlow*` / `ProductPartFlowNodeData` / `ClusterFlowNodeData` / `ModuleFlowNodeData` to their `Projection`-prefixed equivalents, and `domainModelToReactFlow()` becomes `domainModelToProjection()`. Sidecar-related names (`FlowSidecarDocument`, `parseFlowSidecar`, `buildFlowSidecarDocument`, `applyFlowSidecarPositions`, `applyFlowSidecarLayoutParams`, `FlowSidecarLayoutParams`, `FlowSidecarViewport`) are kept as-is because they reference the on-disk `module-map.flow.json` sidecar file, not React Flow.
- **Archive compression (docs hygiene)**: `doc/SolidWorks-WorkFlow/Plans/Archive/` (77 historical planning documents) and `doc/TODO/Archive/` (19 historical todo-plans) were compressed into `Archive.zip` files with accompanying `Archive.README.md` pointer notes. Grep-based dead-code / dead-links audits no longer hit ~62 stale inline references inside closed historical plans. Git history is preserved — `git log --all --follow` on any archived path still works.

### Not changed
- **No user-visible behavior changes**: Diagram Modules rendering, layout params context menu, sidecar v2 persistence, zoom, and every other product surface behave identically to `1.1.922`. This is an internal hygiene release built on top of the same behavior baseline.

## [1.1.922] - 2026-04-09
### Added
- **Sidecar v2 persists Diagram Modules layout params**: `module-map.flow.json` schema bumped to `version: 2` with a new `layoutParams` section storing per-ProductPart (`columns`, `targetAspectRatio`) and per-Cluster (`moduleColumns`) CSS Grid overrides. Right-click context-menu selections now survive diagram reload, PM restart, and cross-window sidecar sync.
- **Backwards-compat parser**: `parseFlowSidecar` accepts both `version: 1` and `version: 2` payloads. Invalid enum values in the `layoutParams` section are dropped per entry instead of failing the whole sidecar; workspace sidecar files from `1.1.921` keep loading without errors and fall back to defaults until the first context-menu edit upgrades them to v2.
- **Stable sidecar diffs**: `buildFlowSidecarDocument` writes `nodes`, `layoutParams.productParts`, and `layoutParams.clusters` in alphabetical order, so user-visible git diffs of `module-map.flow.json` stay minimal when a single entry changes.

### Changed
- **Diagram editor shell**: right-click layout param handlers (`columns`, `targetAspectRatio`, `moduleColumns`) now push the updated nodes through `onNodesChange`, which the persistence hook writes into the sidecar file. The projection-reset `useEffect` still prefers `initialNodes` as the first source so persisted overrides ride the next projection rebuild via `applyFlowSidecarLayoutParams`.
- **Downgrade behavior (documented caveat)**: if a workspace opens a v2 sidecar with `1.1.921` the older parser will reject it (it required `version === 1` exactly) and the diagram will render with defaults. This is graceful degradation, not corruption.

## [1.1.921] - 2026-04-08
### Changed
- **React Flow removed from Diagram Modules**: the `@xyflow/react` dependency is deleted. ProductPart cards now render in a single-column CSS Grid instead of a React Flow canvas. Native browser scroll replaces pan/zoom.
- **Context menu fixed**: right-click layout param selection (columns, aspect ratio) now applies correctly — React Flow's `pointer-events: none` was blocking clicks, and sidecar persistence was resetting changes.
- **Cmd/Ctrl+scroll zoom**: CSS transform-based zoom (25%–200%) with smooth 1%-per-tick sensitivity. Cmd/Ctrl+0 resets to 100%. Clickable zoom badge appears when zoomed.
- **Sidebar hint updated**: reflects new CSS Grid zoom controls instead of legacy React Flow pan/drag instructions.

## [1.1.917] - 2026-04-08
### Changed
- **`Diagram Modules` layout replaced with CSS Grid**: the entire self-written iterative settle-loop layout engine (~1350 lines, 7 files) has been deleted and replaced with browser-native CSS Grid layout inside ProductPart nodes. Clusters and Modules are now rendered as regular React components (not separate React Flow nodes), and all sizing is computed by the browser from actual text content — no more height estimation or multi-pass normalization.
- **Layout context menu (right-click)**: ProductPart nodes support `Columns` (Auto / 2–5) and `Aspect Ratio` (Landscape / Wide / Square) overrides; Cluster cards support `Module Columns` (Auto / 1–3) overrides. Changes apply instantly via CSS Grid re-render.
- **Edges between modules removed**: relation edges are no longer rendered on the diagram canvas.

## [1.1.916] - 2026-04-08
### Reverted
- **`Diagram Modules` measurement bridge now ships again with the pre-`1.1.915` baseline instead of the stabilized live measurement experiment**: the release removes the extra runtime hooks added in `1.1.915`, including `ResizeObserver`, post-font re-measure after `document.fonts.ready`, and window-resize measurement rescheduling.
- **Release `1.1.916` is a rollback rebuild on top of the stable `1.1.914` baseline**: this package is intended to remove the hangs/trim/manual-layout regression path introduced in `1.1.915` while the remaining autolayout defect is investigated separately.

## [1.1.915] - 2026-04-08
### Fixed
- **`Diagram Modules` first-open autolayout now waits for stabilized live measurement instead of trusting the first DOM snapshot**: the measurement bridge re-emits geometry after the next animation frame, after late `document.fonts.ready`, and after real node/header resize events, so ownership containers can resize from the final card heights rather than from an early under-measured pass.
- **Bridge dedupe now includes runtime owner style bounds as part of the measurement signature**: `Cluster` and `Product Part` reflow passes are no longer dropped just because the initial measurement arrived before the owner boxes completed their first resize cycle.

## [1.1.914] - 2026-04-08
### Fixed
- **`Diagram Modules` now reserves the real lower shadow tail of module cards before ownership containers resize**: shared visual bounds no longer stop at the DOM measured border-box height, so lower `Cluster` / `Product Part` borders follow the visible card bottom instead of visually cutting through the last module.
- **The tightened module visual-bottom allowance is now shared across first-open autolayout and manual normalization**: both layout paths compute deepest direct child bottoms from the same shadow-aware helper, removing the last split where lower-boundary safety could still depend on path-specific geometry assumptions.

## [1.1.913] - 2026-04-08
### Changed
- **Release `1.1.913` rebuilds the already shipped `1.1.912` baseline without new product-logic changes**: the package was reissued under a fresh version so clients that did not refresh the previous Project Manager delivery can consume a new release identity.
- **Standalone Project Manager and VSIX artifacts were rebuilt end-to-end**: the standard release pipeline was rerun to publish a fresh `project-manager` tarball and a new extension package on top of the current `main` snapshot.

## [1.1.912] - 2026-04-08
### Fixed
- **`Diagram Modules` now measures ownership header boundaries in zoom-safe flow coordinates before initial autolayout runs**: the React Flow bridge converts rendered header height back through the current viewport zoom before emitting `bodyStartY`, eliminating the regression where first-open module cards could start inside `Product Part` or `Cluster` header text on fit-scaled diagrams.
- **First-open `Diagram Modules` packing now uses horizontal-overlap conflict rules instead of exact seed-column identity**: wide `Cluster` boxes and standalone `Module` cards inside one `Product Part` are repacked whenever their actual horizontal bounds intersect, so different `x` seeds no longer let ownership bottoms overlap visually.
- **The released first-open layout contract now combines top-boundary and bottom-boundary safety explicitly**: top clearance comes from zoom-correct measured header starts, while bottom clearance comes from overlap-aware sibling packing plus deepest-direct-child container resize; persisted sidecar layouts keep the conservative preserve path for manual compositions.

## [1.1.911] - 2026-04-08
### Fixed
- **First-open `Diagram Modules` autolayout now rebuilds ownership from measured hierarchy instead of repairing heuristic carry-over**: when no `module-map.flow.json` is applied, the measured path repacks `Module` cards inside `Cluster`, then repacks finalized `Cluster` boxes and standalone modules inside `Product Part`, and repeats until the ownership geometry reaches a stable fixed point.
- **The diagram shell now distinguishes seed autolayout from persisted sidecar composition explicitly**: projections carry a `layoutSource` flag, so the measured pipeline can apply the stronger packer only for initial layout and avoid repacking saved manual layouts from scratch.
- **Persisted `module-map.flow.json` layouts keep the manual composition from `1.1.910` while still resizing ownership safely**: the conservative preserve-and-normalize branch remains active for sidecar-backed diagrams, so the user no longer trades away manual placement stability to get a safe first-open autolayout.

## [1.1.910] - 2026-04-08
### Fixed
- **`Diagram Modules` now shares one visual-bounds engine between first-open autolayout and manual drag**: the measured post-render path and the shell drag-resize path both derive `Cluster` / `Product Part` heights from the deepest direct child visual bottom, eliminating the split contract where manual moves could still leave lower-boundary overlaps.
- **Lower ownership borders now respect visible module chrome instead of only React Flow border-box height**: module cards reserve explicit visual-bottom allowance for their outer shadow, so dense cards no longer appear to run into cluster or product-part bottoms when the underlying border box was technically still inside the container.
- **`module-map.flow.json` now rejects stale geometry from the pre-unified boundary contract**: the layout metric version advances again, preventing older sidecars from restoring positions calculated before the shared visual-bounds engine existed.

## [1.1.909] - 2026-04-08
### Fixed
- **`Diagram Modules` now rebuilds ownership layout from measured children instead of patching guessed container heights**: after React Flow measures the actual cards, the runtime derives `Cluster` and `Product Part` geometry bottom-up from finalized module boxes and measured ownership header boundaries.
- **`Cluster` and `Product Part` lower boundaries now follow finalized measured columns**: ownership containers no longer trust stale seed heights when dense content expands a child card, so the visible lower border grows from the deepest finalized child bottom plus padding.
- **`module-map.flow.json` now rejects stale `1.1.908` ownership geometry**: the layout metric version was bumped again for the measured-first reflow contract, so pre-fix repair-pass sidecars no longer override the released ownership layout pipeline.

## [1.1.908] - 2026-04-08
### Fixed
- **`Diagram Modules` now normalizes first-open layout against measured React Flow node sizes**: after the browser renders the actual ownership cards, the shell repacks later siblings downward and expands `Cluster` / `Product Part` containers so dense localized content no longer overlaps siblings or container bottoms.
- **The released diagram surface now enforces a hard `4px` minimum safe gap on actual ownership boxes**: `Product Part`, `Cluster`, and `Module` cards keep a real post-render separation contract instead of relying only on projection-time height guesses.
- **`module-map.flow.json` now rejects stale pre-measured geometry again**: the layout sidecar compatibility fingerprint was bumped for the measured-layout contract, so old saved positions no longer override the repaired runtime normalization path.

## [1.1.907] - 2026-04-08
### Fixed
- **`Diagram Modules` localized first-open layout now keeps dense cards inside their boundaries**: the initial React Flow projection uses a more conservative height budget for `Product Part`, `Cluster`, and `Module` cards, preventing the dense `Project Manager Workflow Ui`-style scenarios from crossing sibling cards or container bottoms on Russian long-copy baselines.
- **`module-map.flow.json` now rejects stale geometry after layout-metric changes**: the layout sidecar includes a `layoutMetricVersion` compatibility guard, so positions saved under the previous height model no longer override the repaired computed layout.
- **Release verification now includes localized dense diagram regressions explicitly**: targeted PM diagram tests now cover dense cluster and standalone boundary safety alongside the sidecar compatibility path before the release build.

## [1.1.906] - 2026-04-07
### Removed
- **`Foundation Envelope` is removed from the active workflow**: the supported trunk now stops at `Diagram Modules`, and branch design starts directly from `Product Part Specification` without a separate FE stage.

### Changed
- **Core, PM, startup restore, continuity, and prompt routing now follow the reduced trunk end-to-end**: `foundation_envelope` no longer participates in workflow state, gating, artifact routing, diagram loading, localization, repair flows, or regression coverage.
- **The former FE release wave is preserved as history only**: archived plans, TODOs, and session reports are explicitly marked retired so future scopes do not treat `Foundation Envelope` as active navigation or a dormant supported contract.

## [1.1.905] - 2026-04-07
### Added
- **`Foundation Envelope` now renders as a React Flow diagram in the Project Manager `Artifacts` surface**: once the canonical `foundation-envelope.md` exists, the user sees the stage as a diagram-first review surface instead of a raw markdown-only panel.

### Changed
- **`foundation-envelope.flow.json` is now the runtime-owned layout sidecar for the stage**: semantic ownership remains in `foundation-envelope.md`, while node positions and view-state persistence are stored separately and routed through the shared workflow artifact endpoints.
- **The shared PM diagram pipeline now covers `Foundation Envelope` end-to-end**: the stage reuses the common diagram loader, persistence path, repair scaffold, help localization contract, workflow-tree parity checks, and webview typecheck expectations instead of maintaining a markdown-only branch.

## [1.1.904] - 2026-04-07
### Fixed
- **Standalone PM dialog file links now decode launcher query paths as real filesystem paths**: the launcher no longer forwards `%2FUsers%2F...` into Visual Studio Code after the PM bridge has already handed off the file target.
- **The remaining `Path does not exist` regression from `1.1.903` is narrowed to the correct boundary and repaired there**: the `path` query parameter now uses filesystem-oriented URI unescape rules before the final `vscode://file/...` URI is assembled.

### Deferred
- **Broader method/knowledge documentation for the multi-step standalone file-link debugging sequence remains deferred until the user confirms this release works**.

## [1.1.903] - 2026-04-07
### Fixed
- **Standalone PM dialog file links now decode percent-encoded absolute paths before the open pipeline continues**: agent-provided paths such as `...%20...` are normalized back into real filesystem paths before PM routes them to VS Code.
- **Launcher-side `vscode://file/...` generation now preserves path separators**: the standalone fallback no longer re-encodes `/` or `:` into broken values like `/%2FUsers/...%2520...`, so Visual Studio Code no longer receives a non-existent path after the confirmation prompt.
- **The remaining standalone safeguard prompt is now explicitly treated as a platform-level behavior, not a PM regression**: the PM/UI/launcher docs now lock the contract that the prompt may still appear, but confirming it must open the real target file and location.

## [1.1.902] - 2026-04-07
### Fixed
- **Standalone PM dialog file links no longer open a second Chromium window with `ERR_UNKNOWN_URL_SCHEME`**: the dialog surface no longer tries to navigate CEF directly to `vscode://file/...` after the user clicks an agent-provided file reference.
- **Standalone file-link fallback now routes through the launcher host**: PM uses a dedicated `codeai://open-in-vscode?...` bridge in standalone mode, `OnBeforeBrowse` cancels in-window navigation, and the launcher opens the final `vscode://file/...` target through the operating system.
- **The launcher hotfix is now synchronized across PM/UI/launcher docs and targeted validation**: PM opener coverage, native launcher build verification, and SSOT docs now protect the corrected standalone fallback boundary.

## [1.1.901] - 2026-04-07
### Fixed
- **Project Manager dialog file links now open in the VS Code editor path instead of a generic text handler**: absolute local file links rendered inside agent dialog markdown are intercepted on the dialog surface and routed to the editor-aware open flow.
- **Dialog file targets now preserve explicit location metadata**: supported `:line:column` and `#LlineCcolumn` links now resolve correctly for both unix and windows absolute paths, so the editor route can reveal the intended file position.
- **The open contract is now covered across PM, webview, and docs**: PM opener tests, parser regressions, the VS Code handler contract guard, and the PM/UI/launcher docs now lock the dialog-only interception scope plus the `vscode://file/...` standalone fallback boundary.

## [1.1.900] - 2026-04-07
### Fixed
- **The left Project Manager tree now highlights the current workflow step explicitly**: stage selection from the toolbar, tree rows, startup route, and nested artifact/session clicks now converges on one visible selected-stage state in the sidebar.
- **Only the active workflow branch now stays expanded in the left sidebar**: the tree behaves as an `activeStage` accordion, so inactive workflow steps collapse instead of leaving stale artifact/session rows open after navigation.
- **The navigation contract and regression coverage now include the left sidebar explicitly**: PM SSOT/cluster docs plus the workflow navigation source-test now require the left tree highlight/accordion behavior to stay aligned with the shared `activeStage`.

## [1.1.899] - 2026-04-07
### Fixed
- **Workspace startup is temporarily pinned to `Description` across Core and Project Manager**: workspace open, switch, reconnect, and cold-start restore now force `Description` as the startup stage instead of deriving it from continuity recency or late-step artifact timestamps.
- **Startup restore no longer leaks later-stage sessions into the left panel**: automatic runtime fallback is now Description-scoped, so `Virtual Simulation`, `Diagram Modules`, and `Foundation Envelope` sessions no longer appear on startup unless the user explicitly navigates there.
- **The released docs and PM regression tests now protect the temporary contract**: Project Manager SSOT/cluster docs plus startup routing source-tests now explicitly lock `workspace open => Description`, `Final_Description.md`/`questionnaire.md` startup selection, and the removal of the old `lastActive` startup selector.

## [1.1.898] - 2026-04-06
### Fixed
- **Workflow startup truth is now canonical across the released trunk chain**: Core now repairs `lastActive` from the combined workflow-state, continuity, and semantic artifact evidence, so late trunk steps no longer depend on ad hoc per-stage heuristics after restart.
- **Stale workspace metadata now self-heals instead of freezing startup on an older step**: workspace activation and semantic artifact writes persist repaired `lastActive` snapshots back into canonical state, which prevents `Description`-era pointers from surviving after the workspace has already advanced to `Diagram Modules` or `Foundation Envelope`.
- **Project Manager startup routing now uses one stage resolver end-to-end**: workspace-open auto-select, toolbar navigation, tree clicks, artifact selection, and dialog/session restore all route through the same stage-to-artifact/session mapping driven by `workflow-state.lastActive`.
- **Formal symmetry regression coverage now protects the retrofit**: dedicated core and PM tests now lock canonical `lastActive`, stale-state self-heal, late-step cold-start hydration, shared startup routing, and the existing history-backed continuity baseline before release packaging.

## [1.1.897] - 2026-04-06
### Fixed
- **Project Manager startup restore now follows workflow-scoped truth instead of browser-local dialog cache**: workspace reopen no longer revives a stale `foundation_envelope` dialog intent from `localStorage`, so Toolbar, workflow tree, artifact panel, and session panel recover from the same `workflow-state` + `continuity` route.
- **`Diagram Modules` no longer falls back to a false `todo` state after restart**: cold-start workflow-state hydration now derives `diagram_modules` status from the canonical staged progress snapshot, restoring `in_progress` or `completed` when the semantic artifacts already prove readiness.
- **Workflow new-step guardrails now explicitly ban split startup restore paths**: the system SSOT now requires one startup source of truth, shared stage normalization, canonical cold-start readiness hydration, and history-backed continuity recovery for every new workflow step.

## [1.1.896] - 2026-04-06
### Fixed
- **`Foundation Envelope` dialog history now survives cold-start restore correctly**: continuity root resolution no longer normalizes the official `foundation_envelope` stage to `unknown`, so restart/resume reuses the existing history-backed dialog instead of creating a fresh empty dialog id.
- **Duplicate continuity entries no longer steal PM dialog restore**: when stale duplicate `Foundation Envelope` roots exist for the same provider session, dialog restore now prefers the entry that actually has persisted JSONL history instead of the newer but empty duplicate.
- **New-step rollout guardrails now explicitly forbid local stage-normalizer drift**: the workflow SSOT now requires all continuity/root/handoff/cold-start restore paths to share one canonical stage normalization contract and to test duplicate-root recovery explicitly.

## [1.1.895] - 2026-04-05
### Changed
- **The workflow step is now canonically named `Foundation Envelope` end-to-end**: the old three-word naming is removed from runtime code, PM UI, templates, contracts, tests, and architectural docs so the trunk step now matches the two-word naming pattern used by the rest of the workflow.
- **The stage id, artifact path, and prompt/template routes now follow the shorter contract**: the step now uses `foundation_envelope`, `foundation-envelope.md`, `foundation-envelope-prompt.md`, and the matching `foundation-envelope-contract` API path across client/core release surfaces.
- **Deferred visual sidecar naming is pre-aligned with the new step title**: future-wave docs and prompt assets now reserve `foundation-envelope.flow.json`, preventing the older mixed naming from leaking back into the next implementation wave.

## [1.1.894] - 2026-04-05
### Fixed
- **`Diagram Modules` now keeps canonical entity naming in English even when `Artifacts for the User` is localized**: `Product Part`, `Cluster`, and `Module` names/titles no longer follow the artifact-language translation path, while explanatory prose such as `Purpose`, `Responsibility`, notes, and assumptions still follows the selected user-facing artifact language.
- **The runtime prompt contract now separates canonical structural names from localizable prose**: the `diagram_modules` prompt pack and bundled prompt assets explicitly protect English-only entity naming, eliminating the earlier ambiguity that let the agent translate `Product Part` titles into Russian.
- **Bundled template sync coverage now guards the naming boundary**: prompt-pack and template-sync tests now fail if the shipped `Diagram Modules` assets stop enforcing English-only entity names.

## [1.1.893] - 2026-04-05
### Changed
- **Codex user-visible output now uses provider-native raw rollout JSONL as the single dialog source of truth**: `thinking`, `commentary`, and `final_answer` segmentation now follows rollout `event_msg` semantics instead of the semantically poorer SDK `item.*` mirror.
- **Live Codex turns now tail rollout output directly during the turn lifecycle**: rollout-backed normalization drives live updates, terminal drain, replay, and cold-start reconstruction with stable segment ids and session-local dedupe, so reconnect-style rereads do not duplicate already-emitted dialog segments.
- **`sdk-codex-*.jsonl` is now diagnostics-only**: SDK feedback logging remains for transport/runtime debugging, but it no longer participates in semantic dialog routing or history reconstruction.

### Fixed
- **The reported second-turn Description regression no longer mixes commentary into `Thinking`**: rollout `agent_message.phase = commentary` is now emitted as assistant progress text while `agent_reasoning` remains the only source of `Thinking`.
- **Replay and resume now stay deterministic under the rollout cutover**: the Codex test surface now protects in-session dedupe, saved-rollout replay, and cold-start rebuild from duplicate segment emission.
- **Empty-terminal recovery remains green after the rollout migration**: if Codex reaches `task_complete` with a substantive `last_agent_message` but no usable `final_answer`, the user still receives the real assistant completion instead of a thinking-only end state.

## [1.1.892] - 2026-04-05
### Fixed
- **Codex empty-terminal turns now preserve the last substantive assistant answer**: when Codex emits a real user-facing `agent_message`, then drifts into a late reasoning tail and finally ends the turn with an empty terminal assistant payload, the bridge now restores that earlier substantive answer instead of leaving the dialog with giant `Thinking` output and no completion.
- **The recovery is intentionally scoped to the observed reasoning-tail failure mode**: only substantive assistant candidates demoted by a later `reasoning` item are remembered as fallback completions, which avoids promoting ordinary short progress commentary into the final assistant reply.
- **Regression coverage now locks the exact Codex failure sequence**: dedicated messaging tests cover `substantive agent_message -> reasoning tail -> progress check -> empty terminal agent_message`, and the patched `@codeai-hub/codex-module` package builds cleanly before release packaging.

## [1.1.891] - 2026-04-05
### Fixed
- **`Foundation Envelope` continuity chains no longer fall back to `unknown`**: core continuity stage normalization now recognizes `foundation_envelope` during chain creation, root promotion, and tracker matching, so the left Project Manager tree can discover the session branch under the canonical continuity folder.
- **Foundation Envelope handoff artifacts now keep the canonical stage path**: handoff prompt rendering and handoff report path generation now preserve `foundation_envelope`, preventing Foundation Envelope handoff files from drifting into `continuity/unknown/...`.
- **Foundation Envelope survives workflow last-active readback on cold start**: the workflow-state parser now accepts `foundation_envelope` as a valid persisted last-active stage, so restarts no longer drop the stage identity after the artifact has already been created.
- **Core regression coverage now protects the persistence hotfix**: dedicated tests verify Foundation Envelope continuity chain paths, handoff report paths, and last-active readback, and the patched `@codeai-hub/core` package builds cleanly before release packaging.

## [1.1.890] - 2026-04-05
### Fixed
- **`Foundation Envelope` workflow tree parity**: the new stage now materializes the same two-line left-sidebar contract used by mature workflow steps, exposing both the provider session line and the canonical artifact line for `foundation-envelope.md`.
- **Foundation Envelope stage selection consistency across PM entrypoints**: toolbar activation, stage clicks, child-node clicks, and workspace auto-select now reopen the same continuity/dialog session while selecting the canonical artifact whenever it already exists.
- **Right-panel empty state no longer falls back to Description for Foundation Envelope**: the shared session empty-state surface now understands the current workflow stage and routes `Foundation Envelope` through dedicated localization keys instead of showing Description questionnaire guidance.
- **Regression coverage now protects the parity hotfix**: new PM tests verify tree artifact/session wiring, stage-aware empty-state routing, and the localized source-dictionary path for the Foundation Envelope empty-state copy before release packaging.

## [1.1.889] - 2026-04-05
### Fixed
- **`Foundation Envelope` help now follows the selected user-message language**: the new stage help panel and load fallback now resolve through canonical `Messages for the User` entries instead of falling back to English-only inline copy when the user selects Russian.
- **New stage shell labels now participate in `UI Labels` lookup**: the toolbar label, workflow-tree label, blocked-title, and session branch label for `Foundation Envelope` now have stable source-dictionary ids, including a provider-aware session-label template with translation variables.
- **The stage guidance is now synchronized with the workflow SSOT**: the help copy now explicitly covers `Application Root`, `Shared Zones`, `Integration Seams`, technology intent, and placement/dependency rules, matching the actual contract of the stage shell.
- **Regression coverage now protects the localization surface of the new stage**: dedicated Project Manager tests verify the dictionary backfill and stage-label wiring so future trunk-step additions do not repeat the same omission.

## [1.1.888] - 2026-04-05
### Added
- **`Foundation Envelope` workflow stage shell**: the trunk workflow now continues after `Diagram Modules`, exposes the canonical artifact `.codeai-hub/<workspace>/foundation_envelope/foundation-envelope.md`, and ships the new bundled contract/prompt path end-to-end.

### Changed
- **Core workflow gating and persistence now include the new stage**: `Foundation Envelope` unlocks only after `diagramModulesProgress.aggregateReady === true`, and the stage now participates in workflow-state ordering, cold-start hydration, HTTP contract exposure, and artifact upsert routing.
- **Project Manager workflow surfaces now understand the new trunk step**: toolbar routing, tree labels, auto-select priority, branch-node sync, stage panel sync, session recovery, and the dedicated panel shell now keep `Foundation Envelope` consistent with the rest of the workflow.

### Fixed
- **Shared artifact repair flow now reaches `foundation-envelope.md`**: the shared stage artifact view/fix button path can now reopen the correct workflow stage and request a repair session for the new canonical markdown artifact.
- **Workflow verification fixtures now match the expanded stage map**: the remaining Project Manager test fixtures now include the `foundation_envelope` stage key, restoring a clean `npm run typecheck:webview` verification surface before release packaging.

## [1.1.887] - 2026-04-04
### Fixed
- **Codex provider-owned config now tracks the selected model**: `~/.codeai-hub/providers/codex/home/config.toml` now rewrites its `model = ...` line from shared settings instead of leaving stale `gpt-5.4` values behind while only updating `model_reasoning_summary`.
- **Codex `Reasoning in dialog` now reaches runtime event routing**: Core applied turn config now carries the Codex display-sync flag just like Claude and Gemini, and the Codex provider stores that flag in session-local runtime state before routing streamed items.
- **Visible Codex thinking is restored from provider-native `agent_message` progress**: intermediate completed `agent_message` items now become `Thinking` only when later tool/file/command events prove that work continued, while the last `agent_message` of the turn still remains the final assistant reply.
- **Native `gpt-5.4` reasoning remains on the original path**: Codex messaging coverage now explicitly protects the native `item.type = "reasoning"` route, so the `gpt-5.3-codex` `agent_message` fallback does not regress visible `Thinking` for `gpt-5.4`.
- **Settings saves no longer trigger the stale stub overlay**: the extension no longer shows `Settings saved (stub implementation).`, which keeps the Settings WebView footer visible and preserves the existing in-WebView `Saving...`/`settings:saved` feedback flow as the only save confirmation path.

## [1.1.886] - 2026-04-04
### Fixed
- **Clean-runner workspace compile order**: the root `compile` script now builds `@codeai-hub/translation`, `@codeai-hub/localization`, and `@codeai-hub/core-supervisor` before browser/root type-check, so public GitHub runners no longer fail on missing `@codeai-hub/localization` declarations after a fresh `npm ci`.
- **Public CI documentation parity**: README now reflects the actual GitHub Actions gates (`check:knip`, not the stale `check:tsprune`) and documents the workspace build-order prerequisite behind the compile gate.

## [1.1.885] - 2026-04-04
### Fixed
- **Growing last dialog bubbles now auto-scroll correctly**: when the user is already pinned to the bottom, Session and Project Manager dialogs now continue following appended text inside the same logical bubble instead of waiting for a new message count change.
- **Shared dialog panel now tracks a bottom-anchor fingerprint**: auto-scroll no longer keys only off `displayMessages.length`, which prevents long provider `Thinking` streams from extending below the visible viewport while the user is still at the bottom.
- **Project Manager help-text color retune**: all PM help/spravka surfaces based on `pm-details` now use `rgba(115, 130, 140, 1)` while keeping the existing `14px`, medium-weight presentation.

## [1.1.884] - 2026-04-04
### Fixed
- **Claude same-message thinking continuity**: when Claude emits `thinking`, then a short `text` continuation, and then `tool_use` within the same provider-native message id, the intermediate text is now rendered as `Thinking` instead of appearing as a separate assistant reply.
- **Claude provider-native classification rule**: the thinking/assistant split now follows Claude `message.id` ownership plus `message_delta.delta.stop_reason = "tool_use"` vs `end_turn`, avoiding brittle text-based heuristics for this boundary.
- **Project Manager help-text color retune**: all PM help/spravka surfaces based on `pm-details` now use `rgba(100, 130, 155, 1)` while keeping the existing `14px`, medium-weight presentation.

## [1.1.883] - 2026-04-04
### Fixed
- **Claude long-thinking translation overflow**: visible Claude reasoning is now translated in smaller transport-safe chunks before reassembly, so oversized Google GTX GET requests no longer force large thinking blocks to fall back to English.
- **Claude pre-tool progress localization**: short assistant progress text is now buffered until Claude reports `message_delta.delta.stop_reason = "tool_use"`, which allows user-facing pre-tool messages to be localized while leaving final `end_turn` assistant replies untouched.
- **Claude visible-thinking readability**: oversized Claude reasoning is now emitted as multiple smaller `Thinking` dialog bubbles instead of one giant block, which keeps long model reasoning readable in the Session UI.
- **Project Manager help-text presentation**: all PM help/spravka surfaces based on `pm-details` now use the requested `14px`, medium-weight, `rgba(87, 147, 225, 1)` style.

## [1.1.882] - 2026-04-04
### Fixed
- **Persistent startup localization bootstrap**: the localization runtime now saves a startup-ready browser snapshot in `~/.codeai-hub/localization/cache/browser-runtime-bootstrap.json` and reuses it across restarts instead of rebuilding first paint from English component fallbacks.
- **Settings cold-start no longer flashes English**: the extension host injects the persisted localization bootstrap payload into the generated webview HTML before JS boot, so Settings UI labels and help text render from the selected language on the first paint.
- **Project Manager startup now preloads localization before mount**: PM fetches `/api/v1/localization/bootstrap` from Core before `root.render(...)` and seeds its runtime state from the returned snapshot, removing the temporary English Help/UI state on cold launch.

## [1.1.881] - 2026-04-04
### Fixed
- **Project Manager `Add workspace` modal now fully localizes**: the dialog title, field labels, placeholders, buttons, and validation errors now resolve through explicit localization dictionaries instead of staying hardcoded in the modal component.
- **Glossary editing now targets a user-owned file instead of a browser draft**: `Settings -> Localization -> Do-not-translate terms` now opens `~/.codeai-hub/localization/glossary/do-not-translate-terms.txt` in the current VS Code window, seeds it with known preserve terms on first open, and stops relying on a localStorage-only draft flow.

## [1.1.880] - 2026-04-04
### Fixed
- **Claude thinking settings now use explicit effort levels**: the settings UI, persisted snapshot, Core applied turn config, and Claude SDK bridge now use `thinking.enabled + effort` instead of the deprecated `maxThinkingTokens` expectation, so Claude effort changes are again meaningful on modern SDK builds.
- **Claude runtime model sync now reflects effort switches**: when Claude thinking is enabled, Session UI now receives effective identities such as `sonnet reasoning:high` and `sonnet reasoning:max`, instead of a generic `thinking:on` style state that no longer captured the real Claude SDK behavior.
- **Claude display-sync settings now load correctly from the shared snapshot**: Core now carries `thinkingDisplaySyncEnabled` from the persisted Claude provider settings, which keeps the visible-thinking presentation toggle aligned with the actual saved settings state.

## [1.1.879] - 2026-04-04
### Fixed
- **Claude visible thinking now follows `Messages for the User`**: the Claude provider runtime now consumes `messagesForTheUserLanguage` from the Core-applied turn config and translates visible thinking bubbles through the shared translation facade, so Russian user-facing localization no longer leaves Claude thought summaries in English.
- **Claude reasoning-language sync is now covered in module tests**: Claude messaging tests now verify both the applied-turn runtime language handoff and the translated visible-thinking path, which closes the earlier provider gap left after Codex and Gemini were fixed in `1.1.878`.

## [1.1.878] - 2026-04-04
### Fixed
- **Selected user-message language now reaches provider thinking bubbles**: Core applied turn config now carries `messagesForTheUserLanguage` from the shared settings snapshot, so Codex and Gemini runtime adapters can localize visible reasoning/thought output to the same language selected under `Messages for the User`.
- **Gemini visible thoughts are no longer pinned to English**: Gemini thought translation now uses the runtime-selected target language and skips translation entirely when the selected language is `en`, preserving the original provider wording as the default fallback.
- **Codex reasoning bubbles now use the same localization contract**: Codex runtime state now receives the live user-message language per turn, which keeps visible reasoning aligned with Gemini and prevents the same English-only regression from resurfacing on the Codex path.

## [1.1.877] - 2026-04-04
### Fixed
- **Gemini CLI `0.36.x` runtime compatibility**: the Gemini provider bridge now supports global bundle-only `@google/gemini-cli` installs plus the relocated scheduler export from `@google/gemini-cli-core`, so provider selection no longer fails on missing legacy `dist/src/config/*` modules.
- **Safe Gemini settings bootstrap inside Core**: compatibility startup now reads `~/.gemini/settings.json` and workspace `.gemini/settings.json` directly instead of importing Gemini CLI bundle chunks, avoiding telemetry-global side effects that could break provider initialization in the host process.
- **Bundle-layout regression coverage**: Gemini runtime bridge tests now cover the modern bundle-only CLI layout and the adapted scheduler contract before release packaging.

## [1.1.876] - 2026-04-03
### Fixed
- **Claude full SDK isolation**: provider-driven Claude sessions now use empty `settingSources`, which puts CodeAI Hub-managed turns into SDK isolation mode and disables filesystem `CLAUDE.md` / settings auto-discovery entirely.
- **Parent-directory `CLAUDE.md` leak closed**: Claude no longer walks up from the active workspace and treats `/Users/oleksandroliinyk/.claude/CLAUDE.md` as a `Project` memory file, so assistant chat replies stop inheriting personal Russian-only memory while thinking and artifacts remain English.

## [1.1.875] - 2026-04-03
### Fixed
- **Claude provider-home memory isolation**: Claude query options no longer pass the real user `homedir()` as an extra `CLAUDE.md` discovery root, so provider-home sessions stop importing global `~/.claude/CLAUDE.md` as project memory.
- **Workspace-scoped Claude setting sources**: provider-driven Claude sessions now load only `project` / `local` Claude filesystem settings, which keeps global user settings outside CodeAI Hub’s isolated provider-home runtime contract.

## [1.1.874] - 2026-04-03
### Fixed
- **English-only internal workflow prompt boundary**: packaged runtime prompt scaffolding plus bundled `Description`, `Virtual Simulation`, and `Diagram Modules` internal templates now stay English-only, so installed workflow sessions no longer surface Russian agent instructions when user-facing language remains English.
- **Bundled template snapshot parity**: `bundled-templates.ts`, template sync verification, and idea-contract tests now track the translated English internal sources instead of shipping or asserting stale Russian base64/template snippets.
- **Thinking language no longer forced to Russian**: Codex and Gemini runtime thought translation adapters no longer hardcode `ru` as the target language, so visible reasoning/thinking now falls back to the provider’s original language by default.

## [1.1.873] - 2026-04-03
### Fixed
- **Standalone settings-shell intro**: the `Settings only` explanatory body and hint now resolve through `UI Helper Text`, so the installed standalone shell no longer keeps that intro block in English when helper language changes.
- **Provider update risk banner**: the warning shown in `Claude`, `Codex`, and `Gemini` version-management sections now participates in `Messages for the User` lookup instead of staying hardcoded English.
- **Per-model explanatory sentences**: the descriptions under each `Claude`, `Codex`, and `Gemini` model option now resolve through `UI Helper Text`, so packaged provider settings show visible Russian helper changes beyond the top card descriptions.

## [1.1.872] - 2026-04-03
### Added
- **Localization ownership guardrail**: the architecture SSOT now includes an explicit user-facing text boundary contract, so new product-authored copy must be classified up front instead of relying on later localization cleanup.

### Fixed
- **General helper response**: `Settings -> General -> Response Mode` now resolves its explanatory copy through `UI Helper Text`, making the packaged settings surface react visibly to helper-language changes.
- **Provider-tab helper coverage**: `Claude`, `Codex`, and `Gemini` settings now route the major visible helper blocks for default-model selection, auto-update guidance, session continuity, and Claude thinking through explicit localization dictionaries instead of leaving those areas hardcoded.
- **Provider-dialog guidance**: Codex reasoning and Gemini thinking modal subtitles now participate in `UI Helper Text` lookup instead of staying English-only in installed builds.

## [1.1.871] - 2026-04-03
### Fixed
- **Packaged post-release localization gaps**: `Settings -> Localization` glossary-editor copy now resolves through explicit localization categories instead of inline hardcoded strings, so the installed release responds more visibly when `UI Helper Text` changes.
- **Description provider picker ownership**: the picker title, buttons, availability labels, description, and status line now resolve through `UI Labels` and `Messages for the User` instead of Russian literals embedded directly in the Project Manager component.
- **Project Manager shell placeholders**: the default `Sessions` / `Artifacts` panel headers and empty placeholders now participate in localization lookup instead of staying English-only in the installed shell.

## [1.1.870] - 2026-04-03
### Added
- **Approved four-category localization settings**: the user-facing settings model now exposes `UI Labels`, `UI Helper Text`, `Messages for the User`, and `Artifacts for the User`, with `Default Language (English)` as the reset state when a category override is cleared.

### Changed
- **Existing copy is now category-owned**: Settings shell text, Session status/empty-state feedback, Project Manager navigation/help, and Description questionnaire entrypoints now resolve through explicit localization categories instead of mixed legacy buckets.
- **Artifact-language runtime threading**: prompt-pack assembly and workflow start/submit flows now pass `Artifacts for the User` language into Description, Virtual Simulation, and Diagram Modules so final user-facing artifacts and brief user-facing chat updates follow the selected language.

### Fixed
- **Internal prompt boundary is now enforced**: bundled workflow prompts, appendices, and agent-only templates are classified as `Internal Agent Instructions`, excluded from user-facing runtime bundles, and verified to stay English-only while Russian localization materializes only marked user-facing text.

## [1.1.869] - 2026-04-02
### Fixed
- **Release `1.1.868` Core bootstrap regression**: the staged standalone Core runtime now carries the localization runtime dependency chain plus bundled source dictionaries under `app/assets/localization/source/en`, so startup no longer stalls before `/api/v1/health` on installed builds.

### Changed
- **Installed-Core release validation**: `build-release.sh` now verifies the staged Core bundle itself by checking for bundled `@codeai-hub/localization`, bundled `@codeai-hub/translation`, packaged source dictionaries, and a successful `settings-request-handler.js` require through the installed runtime node binary before packaging succeeds.

## [1.1.868] - 2026-04-02
### Fixed
- **Release `1.1.867` startup regression**: the packaged localization runtime now resolves bundled source dictionaries from both supported deployment topologies, so extension activation no longer fails on missing `interactive_templates.json` after VSIX install.

### Changed
- **VSIX runtime smoke coverage**: `build-release.sh` now extracts the packaged extension and requires `@codeai-hub/localization/dist/source-dictionary-registry.js` from the installed extension layout, which catches packaged path regressions before release.

## [1.1.867] - 2026-04-02
### Fixed
- **Release `1.1.866` startup regression**: the VSIX now ships `@codeai-hub/localization`, so extension activation no longer fails on `Cannot find module '@codeai-hub/localization'`.
- **Localization runtime transitive packaging**: the final VSIX now keeps `@codeai-hub/translation` alongside the shipped localization package, preserving the runtime dependency chain used by the host hydration path.

### Changed
- **Release packaging guards**: `build-release.sh` now validates the final VSIX surface and fails if required localization runtime packages are missing or if repo-only entries such as `.github/**` and `.nvmrc` leak into the archive.
- **Unified version bump coverage**: `build-all.sh` now includes `packages/localization` in the shared release-version update flow.

## [1.1.866] - 2026-04-02
### Added
- **Searchable localization picker UX**: localization settings now provide searchable language comboboxes plus a catalog-backed engine selector, replacing the earlier free-form language/engine entry flow.

### Changed
- **Hydrated browser localization runtime**: extension settings load/save and Project Manager settings load now materialize `LocalizationRuntimePayload` through `@codeai-hub/localization`, then deliver resolved bundles and engine catalogs into a shared browser-side provider.
- **Shared PM localization provider**: Project Manager help/questionnaire/navigation surfaces now consume one root localization provider instead of reloading settings and resolving bundles independently in each localized leaf.

### Fixed
- **Browser delivery boundary closed**: localized browser surfaces now resolve translated and source bundle entries from host-materialized runtime payloads instead of falling back to bundled English source catalogs after settings load.
- **Localization selector semantics**: the visible `English` source option now maps cleanly to canonical persisted `source`, avoiding duplicate `en`/`source` semantics in the settings UI and browser runtime.

## [1.1.865] - 2026-04-01
### Added
- **Persistent localization module**: `@codeai-hub/localization` now owns bundled English source catalogs, language catalog metadata, glossary protection, user override storage, and localized bundle persistence under `~/.codeai-hub/localization/`.
- **Localization SSOT**: the architecture index and system/module SSOT now include a dedicated live `Localization` module document.

### Changed
- **Dictionary-driven UI copy**: Settings, Session system feedback, Project Manager help/questionnaire, and Project Manager shell/navigation surfaces now resolve product copy through stable message ids instead of inline component-owned strings.
- **Shared browser localization runtime**: the settings host now provides one browser lookup helper for webview settings surfaces, while Project Manager localization consumers resolve the same persisted policy through shared settings snapshots.

### Notes
- **Current browser delivery boundary**: non-`source` language selections, glossary policy, and localized bundle materialization are implemented and persisted, but browser lookup still falls back to bundled English source catalogs until a host-side translated-bundle delivery bridge is added.

## [1.1.864] - 2026-04-01
### Fixed
- **GitHub Actions compile dependency order**: the root `compile` script now builds `@codeai-hub/core-supervisor` before `tsc -p .`, so CI no longer fails on missing `@codeai-hub/core-supervisor` declarations after `npm ci`.
- **End-to-end public CI bootstrap**: together with the new `.nvmrc`, the repository now provides both the Node version hint and the compile-time supervisor build step required for `Repository CI` to run the real quality gates.

## [1.1.863] - 2026-04-01
### Fixed
- **GitHub Actions bootstrap failure**: the repository now includes a root `.nvmrc`, so `actions/setup-node@v4` can resolve the intended Node version instead of failing before dependency installation.
- **Push-triggered CI false negatives**: `Repository CI` now gets past `Setup Node.js` and can execute the actual quality gates, which stops the repeated failure emails caused by the missing Node version file.

## [1.1.862] - 2026-04-01
### Fixed
- **Core Controls visual alignment**: the `Restart Core` button and restart-status pill now share the same height and sit on the same vertical axis instead of looking offset from each other.
- **Balanced control-row spacing**: the restart action and its status feedback now render as a visually matched pair, which makes the Core Controls row read cleanly across hover, pressed, and busy states.

## [1.1.861] - 2026-04-01
### Fixed
- **Core restart now follows an explicit staged flow**: `Settings -> General -> Core Controls` performs `stop -> wait -> start` instead of a fire-and-forget restart request, matching the operational contract used by the standalone core control script.
- **Core Controls feedback is now visible in-place**: the Settings card reports stop, waiting, start, success, and failure states beside the button, instead of leaving restart progress invisible to the user.
- **Restart button interaction states**: `Restart Core` now exposes clear hover, pressed, and busy states so the action no longer looks inert when clicked.

## [1.1.860] - 2026-04-01
### Fixed
- **Thinking visibility is now presentation-only**: Claude and Gemini `Thinking in dialog` toggles no longer suppress provider-side history emission; they only filter whether thinking bubbles are rendered in the Session dialog.
- **Restored-dialog parity**: the same thinking visibility toggle now applies to reopened/reloaded dialog history, including continuation chains, instead of affecting only newly emitted runtime messages.

## [1.1.859] - 2026-04-01
### Fixed
- **Thinking display snapshot backfill**: older settings snapshots now backfill Claude and Gemini `thinkingDisplaySyncEnabled` on load, so the UI toggle and Core payload stay aligned after restart.
- **Claude visible thinking contract**: Claude reasoning now renders as a standard assistant bubble with a `Thinking` label when display sync is on.

## [1.1.858] - 2026-04-01
### Fixed
- **Session dialog link readability**: clickable markdown links in user, assistant, and thinking bubbles now use a shared high-contrast light-blue color instead of the browser default blue.
- **Dialog link presentation consistency**: session-dialog links now render with medium weight and no underline across Claude, Codex, Gemini, and user message surfaces.

## [1.1.857] - 2026-03-31
### Added
- **Codex `gpt-5.4-mini` settings exposure**: the Codex settings baseline now includes `gpt-5.4-mini` with the same reasoning effort choices as `gpt-5.4`.

### Changed
- **Codex reasoning summary setting**: Codex settings now expose `Reasoning in dialog` as the canonical toggle for provider reasoning summaries. `On` maps to `model_reasoning_summary = "auto"` and `Off` maps to `"none"`.
- **Provider-home config ownership**: `~/.codeai-hub/providers/codex/home/config.toml` is now a provider-owned materialized file derived from `~/.codex/config.toml` plus CodeAI overrides, instead of a direct symlink to the user config.
- **Immediate Codex settings sync**: toggling the Codex reasoning setting in the UI rewrites the provider-owned `config.toml` immediately, while saved settings remain the restart-proof source of truth for future provider bootstrap.

### Fixed
- **Duplicate Codex truth paths removed**: Codex no longer keeps a second display-only runtime gate for translated reasoning bubbles; visible reasoning now depends only on whether upstream Codex actually sends reasoning summaries.
- **Saved settings bootstrap parity**: Codex auth/bootstrap and SDK config sanitization now resolve reasoning summary mode from the shared persisted settings snapshot instead of hardcoding `"auto"`.

## [1.1.856] - 2026-03-31
### Fixed
- **Codex provider bundle dependency**: the build pipeline now vendors `@codeai-hub/translation` into the installed Codex provider root, so Core can load Codex startup-time reasoning translation support without workspace `node_modules`.
- **Release validation parity**: build/release smoke checks now require both the installed Codex and Gemini bundles to load successfully with their bundled shared translation package before packaging.

## [1.1.855] - 2026-03-31
### Added
- **Thinking display sync controls**: provider settings now expose per-provider toggles for Codex and Gemini visible thinking sync, while the translation and reasoning pipelines stay active even when the visible bubble is disabled.

### Changed
- **Codex reasoning display parity**: Codex reasoning now uses the shared runtime translation path and the same visible assistant-thinking bubble contract as Gemini, with provider-level display sync gating handled through the applied turn config.
- **Release preparation docs**: README current-release notes and architecture SSOT now reflect the thinking display sync controls before version bump.

## [1.1.854] - 2026-03-31
### Fixed
- **Gemini provider bundle dependency**: the build pipeline now vendors `@codeai-hub/translation` into the installed Gemini provider root, so the bundled provider can resolve the shared translation facade without workspace `node_modules`.
- **Release validation**: build/release smoke checks now require the installed Gemini bundle to load successfully before packaging, which catches missing bundled translation dependencies early.

## [1.1.853] - 2026-03-31
### Added
- **Shared runtime translation module**: `packages/translation` now provides the reusable translation facade and Google GTX engine for runtime translation use cases.

### Changed
- **Gemini thought translation adapter**: Gemini thoughts now flow through `GeminiThoughtTranslationAdapter` backed by the shared facade, and `thought-translator-service.ts` remains a compatibility re-export.
- **Gemini session wiring**: `GeminiSessionManager` and `GeminiTurnRunner` now own the adapter directly, keeping translated thinking visible as tagged assistant output without changing the UI contract.

### Fixed
- **Gemini flush semantics**: when no thought translations are pending, finished turns now emit the final assistant segment synchronously; deferred flush still handles pending translations.
- **Verification surface**: `@codeai-hub/translation` and `@codeai-hub/gemini-module` builds plus focused `message-processor` / `gemini-session-manager` tests passed before release packaging.

## [1.1.852] - 2026-03-31
### Changed
- **Workspace runtime test split**: `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts` now keeps snapshot/select/flush coverage, while continuity and resume scenarios moved into `packages/core/src/workspace-runtime/workspace-runtime-facade-continuity.test.ts`.
- **Session request handler test-support split**: `packages/core/src/remote-bridge/handlers/session-request-handler.test-helpers.ts` is now a smaller harness-focused root, with event counters in `session-request-handler.test-event-helpers.ts` and continuity/bootstrap utilities in `session-request-handler.test-continuity-helpers.ts`.
- **Gemini post-tool regression split**: `packages/Gemini_Module/src/session/gemini-session-manager.test.ts` now keeps baseline/recoverable and translated-thinking coverage, while nested post-tool watchdog scenarios moved into `packages/Gemini_Module/src/session/gemini-session-manager.post-tool.test.ts`.

### Fixed
- **Architecture warning-zone debt**: the remaining test/support files from the `400-500` warning band are now below the threshold, so the architecture gate reports zero warning-zone files again.
- **Release verification surface**: cleanup was verified with focused source-level tests for all newly split files plus package builds for `@codeai-hub/core` and `@codeai-hub/gemini-module` before release packaging.

## [1.1.851] - 2026-03-30
### Changed
- **Claude auth façade decomposition**: `packages/Claude_Module/src/auth/sdk-auth-manager.ts` is now a thin coordinator over dedicated helpers instead of a mixed provider-home/runtime auth root.
- **Provider-home auth bridge**: macOS Keychain bridge, legacy `.claude.json` link/copy handling, and legacy credentials migration now live in `packages/Claude_Module/src/auth/claude-auth-home-bridge.ts`.
- **Runtime auth split**: OAuth bootstrap/cache refresh, auth environment assembly, `npx @anthropic-ai/claude-code` preflight probe, and final auth check now live in `packages/Claude_Module/src/auth/claude-auth-runtime.ts`.

### Fixed
- **Warning-zone closure**: the last production hotspot from the originally agreed runtime `400-500` wave (`sdk-auth-manager.ts`) is now below the architecture warning threshold without changing the public Claude auth contract.
- **Release verification coverage**: Claude auth decomposition was verified with `@codeai-hub/claude-module` build, package tests, and a compiled `SDKAuthManager` env-contract smoke check before release packaging.

## [1.1.850] - 2026-03-30
### Fixed
- **Gemini final-answer deduplication**: deferred translated-thought flush now completes before segmented-vs-fallback assistant accounting, so a terminal Gemini answer emitted once by the provider is written once to dialog history instead of being duplicated locally.
- **Deferred finalization ordering**: `GeminiTurnRunner` now waits for deferred Gemini dialog emits before detaching assistant-segment listeners or deciding late-stall-after-answer completion, keeping terminal-answer accounting consistent with the actual emitted segments.

### Added
- **Dedup regression coverage**: added a focused Gemini session test for delayed translated `thinking` followed by one terminal assistant answer and no aggregate fallback duplicate.

## [1.1.849] - 2026-03-30
### Fixed
- **Gemini post-tool terminal-leg contract**: assistant progress output from a leg that emitted `tool_call_request` no longer satisfies whole-turn completion; only the nested terminal leg without new tool requests can complete the turn.
- **Adaptive post-tool timeout policy**: Gemini stalled-turn watchdog now distinguishes `initial` and `post_tool` legs, so follow-up after successful tool execution uses a longer timeout window instead of inheriting the aggressive initial-leg threshold.

### Added
- **Post-tool regression coverage**: added Gemini session tests for `progress -> write_file -> nested stall`, delayed post-tool final answer, and late silent tail after a terminal nested answer.

## [1.1.848] - 2026-03-30
### Fixed
- **Gemini terminal-answer contract**: `thinking`/translated thoughts no longer satisfy terminal answer accounting, so a Gemini turn cannot silently complete on thoughts alone.
- **Late-stall handling**: Gemini stalled-turn timeout now resolves based on whether a real non-thinking assistant answer was already emitted; answer-then-stall completes, no-answer stall remains recoverable failure.
- **History-visible failure outcome**: recoverable Gemini `turn_failed` is now appended to session/dialog history as a system message, so reload preserves the failure outcome beside prior thinking output.

### Added
- **Regression coverage**: added focused Gemini/Core tests for thinking-without-answer stall, answer-then-stall completion, and `turn_failed` history materialization.

## [1.1.847] - 2026-03-30
### Fixed
- **Test debt eliminated**: all 145 tests passing (was 139/151). Removed stale dist artifacts, replaced `Function()` hack with lazy `require("node:crypto")` in `computeDiagramRevision`, synchronized 5 test assertions with current template/router content.

## [1.1.845] - 2026-03-30
### Changed
- **Architecture line limit raised to 500**: `MAX_LINES` 300→500, `WARNING_LINES` 250→400 in `check-architecture.sh`; updated `AGENTS.md` principles.
- **Oversized file refactoring**: split all 5 files that exceeded 500 lines into focused modules: `unified-session-backfill.ts`, `workspace-runtime-facade-task-timer.test.ts`, `cli-parser.ts`, `core-runtime-resolver.ts`, `session-request-handler-types.ts`, `session-request-handler.test-helpers.ts`. Debt allowlist cleared to zero entries.

## [1.1.844] - 2026-03-30
### Changed
- **Dead code detection**: replaced deprecated `ts-prune` with `knip` in pre-commit hook, CI workflow, and AGENTS.md; knip now blocks commits on unused files, unused exports, and duplicate exports.
- **Dead code cleanup**: removed 59 verified dead files (~6900 lines) and cleaned 105 unused exports across all packages; each deletion manually verified via grep before removal.
- **Quality gate docs**: updated `AGENTS.md`, CI workflow, and continuity templates to reference `knip` instead of `ts-prune`.

## [1.1.843] - 2026-03-30
### Fixed
- **Workspace switch session visibility**: switching between workspaces with active sessions no longer flashes the "Start with the Description questionnaire" placeholder. Root cause: workspace-tree auto-select fired `handleStateUpdate` with a stale previous-workspace snapshot before the store emitted data for the new workspace, permanently consuming `pendingWorkspaceIdRef` and preventing the correct `pm:dialog:open` dispatch. Fix: added `storeState.workspaceSlug === workspaceSlug` guard so auto-select only processes snapshots that belong to the current workspace. Additionally, the reset effect no longer unconditionally clears `hasDescriptionSession`, and a `workflowStoreLoaded` guard prevents the questionnaire panel from rendering until the store loads.

## [1.1.841] - 2026-03-29
### Fixed
- **Session panel connects after submit**: after submitting the Description questionnaire, the session panel now switches to dialog mode (same path as clicking a session node in the tree), so it connects to the newly created session via dialog API immediately instead of relying on Core stream events that runtime mode may miss during mount timing. Fixes "Creating session..." stuck state for all providers.

## [1.1.840] - 2026-03-29
### Fixed
- **Session display after questionnaire submit**: the runtime session view no longer resets `activeSessionId` when the preferred session is not yet in the visible list. Previously the visibility sync effect raced against Core's `session:created` delivery, causing the session panel to stay stuck on "Creating session..." until the user manually clicked the session node. Fix is provider-agnostic (Claude, Codex, Gemini).

## [1.1.839] - 2026-03-29
### Fixed
- **Session view unmount on store activation**: suppressed the intermediate null-snapshot emit from `WorkflowStateStore.activate()` that caused a render-cycle lag, briefly flipping `showDescriptionHelpInSessionPanel` to true and unmounting the active `ProjectManagerSessionView`.
- **Derivation guard**: workflow state derivation now skips all setter calls until the store completes its first poll (`loaded` flag), preventing stale state from reaching the UI between workspace switches.

## [1.1.838] - 2026-03-29
### Fixed
- **Description session flicker**: post-submit Description UI no longer reverts to Help+Questionnaire when polling returns a snapshot before backend persists the session binding.
- **False Final_Description.md**: legacy `description.md` draftPath no longer appears as `Final_Description.md` in the workspace tree or central panel; only the canonical path contract is shown.
- **Description gating alignment**: downstream workflow steps now require `finalPath` (not legacy `draftPath`) to unblock, matching the actual step-start contract.

### Added
- **Shared WorkflowStateStore**: MainArea and WorkspaceTree now share a single polling cycle, eliminating split-brain between the two components.
- **Description artifact availability probe**: a readability gate prevents showing Description artifacts that don't exist at the canonical HTTP endpoint.

## [1.1.837] - 2026-03-29
### Changed
- **Provider-feedback rollback**: removed the normalized `provider_feedback` observability seam for Claude, Codex, and Gemini from the active baseline after real runs showed that it did not provide trustworthy cross-provider exact-level confirmation.
- **Provider-native audit path restored**: exact applied model/reasoning/thinking should again be verified from provider-native artifacts such as Claude provider-home JSONL, Codex raw rollout `turn_context`, and Gemini raw session/stream traces.
- **Effective model identity baseline preserved**: the runtime/UI effective identity contract from `1.1.835` remains active; only the extra SDK observability layer from `1.1.836` was rolled back.

## [1.1.836] - 2026-03-29
### Added
- **Provider-confirmed SDK feedback logs**: Claude, Codex, and Gemini now write normalized `provider_feedback` records into their SDK JSONL diagnostics only when the provider runtime actually echoes model/thinking/reasoning signals back.

### Changed
- **Codex observability seam**: raw `turn_context` feedback is now promoted into `sdk-codex-*.jsonl`, preserving provider-confirmed `model`, `effort`, and `reasoningEffort` instead of treating outbound applied config as proof.
- **Claude observability seam**: `sdk-claude-*.jsonl` now records provider-confirmed `message.model` and `thinking` blocks as dedicated `provider_feedback` entries.
- **Gemini observability seam**: `sdk-gemini-*.jsonl` now persists structured `logEvent(...)`, normalizes provider-confirmed `model_info`, `thought`, and `usageMetadata.thoughtsTokenCount`, and explicitly avoids faking feedback from local `thinkingLevel`.


## [1.1.835] - 2026-03-29
### Changed
- **Effective model identity contract**: `modelId` across Core transport/runtime/UI now represents the full effective identity, with Codex reasoning and Claude/Gemini thinking semantics treated as part of the runtime identity instead of auxiliary UI-only fields.
- **Provider-neutral next-turn resolver**: Core now resolves `baseModelId`, effective `modelId`, and provider-specific reasoning/thinking payload from the shared persisted settings snapshot before outbound send, then threads that contract through provider capabilities and applied turn config.

### Fixed
- **Codex reasoning-only switches**: changing Codex reasoning on the same base model now mutates the live thread runtime on the next turn instead of staying split between settings, runtime model, and UI labels.
- **Outbound runtime model updates**: `session:model:update` now publishes the effective identity that Core will actually use on the next turn, rather than only the base model id.
- **PM/webview label parity**: Project Manager and the standard webview now consume runtime effective model updates directly and preserve ready-session reasoning/thinking labels instead of rebuilding stale labels from settings-only defaults.

## [1.1.834] - 2026-03-29
### Changed
- **Session-scoped Stop contract**: Session UI, websocket bridge, and Core now use `session:stop` as the canonical stop path, so `Stop` targets only the active logical session/turn instead of triggering global Core shutdown.
- **Stop-triggered provider rebind path**: Core now keeps the logical session alive after `Stop`, invalidates only the live provider binding, and creates a fresh provider session on the next send when that binding was intentionally stopped.
- **Gemini recoverable stalled-turn path**: Gemini stalled-stream watchdog failures now surface as provider `turn_failed` on the recoverable session path instead of escalating through generic provider-runtime failure recovery.

### Fixed
- **Stop no longer kills Core runtime**: the Session input button no longer calls `/api/v1/shutdown`, no longer relies on supervisor restart on the next send, and no longer drops the active dialog into a stop-core UX.
- **Gemini silent stall deadlock**: stalled Gemini streams after `model_info` or partial progress now fail back to `idle` instead of leaving Core/UI in an infinite `Agent is working... Please wait.` state.
- **Recovery regression coverage**: Core and Gemini test suites now lock in stop-mid-turn survival, stuck-lock release, rebinding on next send, stalled-stream timeout, recoverable retry, and the absence of phantom partial assistant flush before `finished`.

## [1.1.833] - 2026-03-29
### Changed
- **SessionRequestHandler runtime graph split**: constructor/service bootstrap for continuity, resume, provider binding, flow-node rollover, and turn arbitration now lives in `session-request-handler-runtime{,-core,-types}.ts` instead of one inline root constructor block.
- **SessionRequestHandler action split**: switch resend flow, regular message ingress, rollover-pending send guards, and delete cleanup now live in `session-request-handler-session-actions.ts`, reducing the root handler to a narrower orchestration surface.

### Fixed
- **Phase 81 carry-over closure**: the remaining post-`1.1.832` decomposition tail is now isolated into dedicated helpers without regressing the provider-neutral applied-config contract or the already verified Claude/Codex/Gemini next-turn model switching path.
- **Release docs/runtime alignment**: this build is the doc-synced post-plan verification release after the full `Phase 81` refactor pass, so release-facing docs, SSOT, and packaged artifacts now describe the same architecture baseline.

## [1.1.832] - 2026-03-28
### Changed
- **Provider-neutral applied config contract**: Core now resolves per-provider next-turn model/thinking through a shared registry + capability contract, so outbound send attachment and PM runtime label sync no longer depend on `if (providerId === ...)` bridge branches.

### Fixed
- **Claude/Codex/Gemini model-sync onboarding path**: adding a provider to the model-switch pipeline now centers on Core resolver/capability registration instead of separate PM sync and outbound-bridge hotfixes.
- **Gemini runtime thinking parity**: Gemini now stages both `model` and `thinkingLevel` from the shared applied turn config for fresh and existing sessions, instead of only overriding the model while leaving bootstrap thinking state stale.
- **Gemini local settings precedence**: Gemini session bootstrap no longer reasserts `model` / `thinkingLevel` from provider-local `settings.json` when Core already supplied authoritative runtime defaults.

## [1.1.831] - 2026-03-28
### Fixed
- **Applied runtime model label sync on regular next turns**: Core now emits `session:model:update` directly from the outbound applied turn config on normal send paths, so Project Manager updates the lower session label even when the provider does not emit a follow-up runtime `model_info` / `system` event.

## [1.1.830] - 2026-03-28
### Changed
- **Settings SSOT next-turn config path**: Core now resolves persisted `model` / `reasoning` once and threads the applied turn config through remote-bridge outbound send and switch paths instead of leaving providers to refresh those values independently.

### Fixed
- **Codex real next-turn model switching**: Codex now applies Core-owned model/reasoning overrides directly onto the active thread runtime before each turn, so the provider-native rollout uses the same model that Project Manager and Core expect.
- **Codex split-brain removal**: `codex-sdk-manager` no longer re-reads `settings.json` to decide the current runtime model for live turns; bootstrap defaults come from Core and live overrides come from the applied turn config contract.
- **PM applied model labels**: ready session labels no longer jump to a new model purely because settings changed; they now wait for `session:model:update` and can still refresh reasoning/thinking when Core confirms another turn on the same model.
- **Gemini/Claude next-turn parity**: Gemini and Claude outbound send paths now consume the same Core-applied next-turn model payload, so they no longer rely on provider-local current-model refresh for live send behavior.

## [1.1.829] - 2026-03-28
### Fixed
- **Runtime model labels now refresh reasoning/thinking from settings**: Project Manager no longer freezes the `reasoning` / `thinking` suffix when a session is already marked with a runtime model override. The active runtime model is preserved, but its reasoning/thinking label is rebuilt from the latest settings snapshot on refresh.

## [1.1.828] - 2026-03-28
### Fixed
- **Forced live session model refresh**: Project Manager now tracks whether a session status model label came from `settings` or from a runtime `session:model:update` event. This prevents stale settings-era model IDs from being preserved as fake runtime overrides after a model change, and the standard runtime session panel now subscribes to `session:model:update` just like the dialog panel.

## [1.1.827] - 2026-03-28
### Fixed
- **Session status model labels now follow live settings**: Project Manager reloads the shared settings snapshot when a runtime/dialog session becomes active and immediately before each user send, so the lower session status bar reflects the currently selected provider model and reasoning/thinking level across Claude, Codex, and Gemini without requiring a Core restart.

## [1.1.826] - 2026-03-28
### Changed
- **Phase 79 session-request-handler decomposition**: `packages/core/src/remote-bridge/handlers/session-request-handler.ts` now offloads bootstrap, session resolution, message dispatch, flow-node rollover/report state, dialog segment metadata, provider-event message persistence/parsing, and retry/pending-intent state into dedicated helper modules while preserving the existing runtime behavior.
- **Repository truthfulness baseline**: root metadata, release workflow wording, and hook ownership are aligned around the real Husky-first process; stale Lefthook leftovers are removed from the active dependency/workflow surface.

### Added
- **Public CI baseline**: `.github/workflows/ci.yml` now runs the root repository gates (`check:architecture`, `lint`, `check:tsprune`, `compile`) on pushes to `main` and on pull requests.

## [1.1.825] - 2026-03-28
### Fixed
- **Broken Gemini global runtime installs**: `packages/Gemini_Module/src/installer/gemini-installer.ts` now validates the installed top-level `@google/gemini-cli-core` dependency graph before provider startup and automatically reinstalls Gemini CLI/Core when corrupted dependencies like a truncated `fast-uri` payload are detected.
- **Nested/bridge Gemini dependency sanity**: `packages/Gemini_Module/src/runtime/cli-bridge.ts` now treats broken bridge-side runtime dependencies as compatibility failures during bridge loading instead of letting them surface later as Core-killing crashes.
- **Stale npm rename debris during repair**: Gemini runtime reinstall now removes leftover hidden npm temp directories (for example `.gemini-cli-core-*`) before `npm install -g`, preventing `ENOTEMPTY` rename failures from blocking automatic recovery.

## [1.1.824] - 2026-03-28
### Fixed
- **Gemini loop-recovery crash**: `packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts` now patches the vulnerable `gemini-cli-core` loop-recovery path so internal aborts no longer propagate `AbortError: The user aborted a request.` into Core and tear down the process mid-turn.

## [1.1.823] - 2026-03-28
### Added
- **Core fatal crash log**: `packages/core/src/index.ts` now appends `uncaughtExceptionMonitor` crash records to `~/.codeai-hub/logs/core/core-fatal.log` so abrupt provider-boundary failures leave a synchronous stack trace on disk.
- **Bridge observer log**: `src/extension-module/core/core-keep-alive.ts` now mirrors extension-side bridge lifecycle messages into `~/.codeai-hub/logs/observer/bridge-observer.log`, giving post-mortem visibility even when Core exits before flushing its own logs.

## [1.1.822] - 2026-03-28
### Changed
- **Wave 2 oversized debt cleanup**: `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`, `packages/core/src/config/index.ts`, `packages/core/src/remote-bridge/types.ts`, and `packages/core/src/workflow/diagram-dsl/diagram-modules-parser.ts` are now thin façade/aggregation surfaces over focused helper clusters.
- **Provider messaging clusters**: Claude, Codex, and Gemini `message-processor.ts` roots now delegate stream routing, finish/usage sync, and assistant/system normalization to dedicated helper modules.
- **Codex structured output controller**: `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts` is now a focused façade over parser/state helpers, preserving passthrough and session-promotion behavior.

### Fixed
- **Oversized allowlist truthfulness**: root files that dropped under the 300-line handwritten limit were removed from the explicit debt allowlist in the same refactor wave; blocking non-allowlisted oversized source files remain at zero.

## [1.1.821] - 2026-03-27
### Changed
- **Remote bridge façade split**: `packages/core/src/remote-bridge/index.ts` is now a thin façade over dedicated bootstrap, server-lifecycle, websocket command-router, dialog command-router, and workspace command-router modules.

### Fixed
- **Oversized architecture debt**: `packages/core/src/remote-bridge/index.ts` was removed from the explicit oversized-file allowlist immediately after the façade cut.

## [1.1.820] - 2026-03-27
### Changed
- **Core HTTP router decomposition**: `packages/core/src/remote-bridge/handlers/http-api-router.ts` is now a thin façade over dedicated session, system, artifact validation, and artifact upsert helpers; the root router left the explicit oversized-file debt allowlist.

### Fixed
- **VSIX packaging surface**: `.husky/_` helper files and repository hook scripts are no longer shipped inside the extension package.

## [1.1.819] - 2026-03-27
### Changed
- **Repository quality gates**: repo-wide `npm run lint` is green again; `.husky/pre-commit` now runs architecture + lint + ts-prune and formats only staged files via stash-safe restore.
- **Provider registry façade**: `packages/core/src/provider-registry/index.ts` is now a façade over dedicated installer-path, installed-path, module-loader, descriptor-factory, usage-limits bridge, and recovery modules.
- **Gemini session façade**: `packages/Gemini_Module/src/session/gemini-session-manager.ts` now delegates bootstrap, settings, store/lifecycle, turn runner, and tool-call orchestration to focused submodules.

### Added
- **Gemini session regression split**: dedicated `gemini-session-bootstrapper.test.ts` and `gemini-turn-runner.test.ts` suites alongside the façade smoke test.

### Fixed
- **Oversized architecture debt**: `packages/core/src/provider-registry/index.ts` and `packages/Gemini_Module/src/session/gemini-session-manager.ts` were removed from the explicit oversized-file allowlist after the façade cuts.

## [1.1.818] - 2026-03-26
### Fixed
- **Rate limit display**: filter stale model buckets (e.g. `gemini-3-pro-preview`) from Google Quota API and show human-readable display names ("Gemini 3.1 Pro", "Gemini 3 Flash") instead of raw model IDs.
- **Model label after switch**: `StatusPanel` now updates immediately when switching models via recovery banner. Three-layer fix: explicit `session:model:update` broadcast on `switch_model`, snapshot ID fallback for dialog sessions, and `useSettingsModelsSync` skip when runtime override is active.
- **Optimistic user message**: user messages in PM dialog sessions appear instantly on send instead of waiting for `dialog:history:result` round-trip.

## [1.1.810] - 2026-03-26
### Changed
- **Gemini ThoughtTranslator**: replaced Flash-Lite LLM translation with free Google Translate API — latency drops from 1-71s to ~100ms, no chain-of-thought leakage.
- **Thought rendering**: translated thoughts now display as visible "Gemini · Thinking" messages instead of collapsed English-only blocks.
- **JSONL format**: one record per thought (`role: "assistant"`, `tag: "thinking"`) instead of two (thinking + assistant). English originals no longer written to JSONL.

### Added
- **SessionMessage `tag` field**: optional string tag propagated through Core storage, JSONL, and UI for semantic message classification.
- **Buffered thought ordering**: translations are awaited before real response emit, guaranteeing correct JSONL ordering.

## [1.1.806] - 2026-03-26
### Fixed
- **Recovery offer pipeline (BUG-2026-03-26-01)**: provider timeout/failure now emits `dialog:switch:offer` event so PM can show recovery banner with retry/switch options — previously only silent input unlock occurred.

### Added
- **FailureRecoveryBridge** (`packages/core/src/recovery/`): translates classified failure into `DialogSwitchOfferPayload` using `RecoveryTargetResolver`.
- **useDialogSwitchOffer** hook: PM-side listener for `dialog:switch:offer` events with session-scoped state.
- **SwitchOfferBanner** in session view: renders `SwitchRecoveryBanner` above input panel when recovery offer is active.

## [1.1.804] - 2026-03-26
### Fixed
- **Provider failure resilience (BUG-2026-03-25-01)**: transient provider errors no longer destroy session binding, degrade the whole provider, or deadlock UI in perpetual running state.
- **No-silent-drop**: user messages at missing binding now get explicit error + pending intent tracking instead of being silently dropped.

### Added
- **ProviderFailureClassifier** (`packages/core/src/recovery/`): classifies errors into `transient_turn_failure`, `session_binding_recoverable`, `provider_runtime_failure`, `terminal_session_failure`.
- **Bounded retry budget**: 1 silent retry for transient errors, 1 auto-resume for recoverable bindings, 60s TTL for pending user intent.
- **DialogSwitchOrchestrator**: same-provider retry and model switch via `retry_in_place`/`switch_model` modes.
- **RecoveryTargetResolver**: MVP hardcoded fallback matrix for cross-provider recovery (Gemini/Claude/Codex).
- **Provider-neutral transfer builders**: `CanonicalSessionPreambleResolver`, `ProviderFacingDialogBuilder` (plain `User:/Assistant:` transcript), `UnifiedDialogTransferBuilder` (handoff + bootstrap prompt).
- **Generic `dialog:switch:*` protocol**: `dialog:switch:offer/progress/result` outgoing events, `dialog:switch:request/confirm/cancel` incoming commands.
- **CoreHealthBanner**: PM-side crash/unavailable UX with retry/restart CTAs.
- **SwitchRecoveryBanner**: session-level switch options (retry in place, switch model, switch provider, dismiss).
- **PM dialog-switch-types.ts**: extracted switch types to stay within 300-line architectural limit.

## [1.1.801] - 2026-03-25
### Fixed
- **Gemini tool execution**: full compatibility with `gemini-cli-core@0.35.0` — build `AgentLoopContext` from Config deprecated getters, pass to `CoreToolScheduler` (fixes `TypeError: Cannot read properties of undefined (reading 'messageBus')`).

### Added
- **Gemini Thought Translator**: real-time Russian translation of Gemini agent thoughts via `gemini-2.0-flash-lite` (fire-and-forget, zero-cost, graceful degradation).
- **New event handlers**: `ModelInfo`, `AgentExecutionStopped`, `AgentExecutionBlocked` events from `gemini-cli-core@0.35.0`.

### Removed
- **Legacy nonInteractiveToolExecutor**: dead code path removed from `cli-bridge`, `cli-types`, and tool executor facade.

## [1.1.800] - 2026-03-25
### Added
- **Detachable diagram window**: `Detach` button in artifact header opens a full-viewport ReactFlow popup via `window.open()`; shared sidecar file with BroadcastChannel sync on drop.
- **Dynamic container resizing**: Product Part and Cluster containers auto-grow/shrink when child nodes are dragged toward or away from edges; `containerConstraints` stored in flow node data.
- **Collision avoidance**: AABB minimum-translation-vector with 12px gap between siblings within the same container and between Product Parts at top level.
- **Multi-column layout**: clusters with 3+ modules use 2-column grid (`CLUSTER_MULTI_COL_THRESHOLD = 2`).
- **Controls hint**: muted text in artifact header — `Zoom: scroll · Pan: drag · Move node: ⌥(Alt)+drag` — shown only for Diagram Modules.
- **Auto-select Diagram Modules**: workspace open now checks DM sessions before Virtual Simulation.

### Changed
- **Option(Alt)+drag** replaces Ctrl/Meta for node movement — Ctrl+click on macOS triggers context menu.
- **Canvas cleanup**: removed description block, toolbar header, and zoom controls; ReactFlow fills 100% of panel area.
- **Detach button relocated** from above the graph to the artifact header (left of Artifacts toggle) via `extraActions` slot.
- **Documentation reorganization**: Plans/ cleaned (9 deleted, 9 archived, 8 moved to System/Contracts); SystemArchitecture.md and Project_Manager.md updated.

### Removed
- **Diagram Facades workflow step**: trunk now ends at Diagram Modules. Deleted: `diagram-facades-agent`, facade panel/help, facade parser, facade editor components, ~3,500 lines of code across 86 files.
- **module-inventory.md aggregate**: Module Graph now built progressively from individual `product-parts/<part-id>.md` files.
- **Separate detached sidecar**: detached window now shares the same `module-map.flow.json` as the main PM.

## [1.1.786] - 2026-03-24
### Fixed
- **First module overlaps cluster purpose**: `getClusterHeaderHeight` now includes `CL_PAD_TOP=14` (clusterCardStyle padding-top) and `MODULE_CARD_GAP` gap after header content. Purpose text uses `CL_PURPOSE_LH=16` (lineHeight:1.4) instead of LH11=14.
- **Purpose panel flush against clusters**: `PRODUCT_PART_HEADER_BODY_GAP` raised from 4 to 12 — all vertical gaps now uniform at MODULE_CARD_GAP=12.
- **Responsibility truncated at pipe chars**: `|` inside backtick expressions (e.g. `` `a|b` ``) was treated as column separator by optional group regex. Fix: removed raw-text alternative — only backtick-wrapped values valid as extra columns.
- **Module kind always "service"**: parser now preserves actual kind from col2 (`gateway`, `adapter`, `store`, etc.) instead of hardcoding `"service"`.

## [1.1.783] - 2026-03-24
### Fixed
- **Clusters overlap Purpose panel**: `getProductPartHeaderHeight` now includes `productPartCardStyle` padding-top (18px), so clusters start below the card padding instead of overlapping the Purpose panel content.
- **3-column module table N-1 bug**: `\s*` in `OUTLINE_MODULE_ROW_RE` optional group matched `\n`, causing the regex to span two lines and swallow the next data row (N-1 visible modules per cluster). Fix: `[ \t]*` prevents newline crossing.
- **Phantom header row**: table header `| \`module-id\` | \`kind\` | Responsibility |` was matched as a real module. Now filtered by id.
- **Module title shows kind**: when agent produces 3-column tables (`module-id | kind | Responsibility`), col2 is now detected as kind and module-id is humanized for display title instead of showing "service"/"store"/etc.

## [1.1.778] - 2026-03-24
### Changed
- **Diagram Modules step-by-step workflow**: removed hidden auto-continuation. The agent now pauses after creating the product parts index and after each product part, giving the user full control over the conversation flow.
- **Prompt rewritten**: agent instructions updated from auto-continuation to explicit step-by-step schema with index turn + part turns.
- **Module Graph sidebar**: artifact renamed from `module-inventory.md` to `Module Graph`; Source mode removed for Diagram Modules (graph is the primary artifact).

### Fixed
- **Graph refresh**: diagram graph now auto-refreshes when a new product part artifact is persisted (`pm:diagram:refresh` event).
- **Auto-layout sidecar fallback**: when `flow.json` does not cover all nodes in the current projection, computed layout is used instead of a partially stale sidecar.
- **Purpose panel width**: CSS changed from `minmax(240px, 320px)` to `minmax(240px, 1fr)` so the Purpose panel stretches to fill available space; layout chars-per-line recalculated dynamically from actual product part width.
- **Height underestimation**: `MODULE_CARD_MIN_HEIGHT` increased from 132 to 148; 16px safety buffer added to cluster and product part container heights to prevent node overlap.

## [1.1.777] - 2026-03-23
### Fixed
- **Critical**: `normalizeWorkflowContract` in `description-submit-service.ts` was rejecting `diagram_modules` and `diagram_facades` contracts because `needsTemplate` was true but these stages deliver templates via `promptAppendix`, not via a `template` path. The agent was falling back to a generic prompt and never received `module-inventory-prompt.md` or canonical templates. Fix: `needsTemplate = stage === "description"`.
- Canonical product-part template rewritten from legacy inventory-first list DSL (`# Module Inventory`) to Outline format (`# Product Part: <Title>`) with Identity table, Purpose prose, `## Owned Clusters` with module tables, and `## Standalone Modules` — fully aligned with the existing Outline parser path.
- Continuation prompts for `generate_product_part` substeps now embed the canonical product-part template content, so the agent no longer relies on "memory" from the first turn and format drift is eliminated.
- Parser compatibility shim added for existing drift files: `## Cluster Ownership` section and `### Cluster: \`id\`` headers now recognized alongside canonical forms.
- Semantic validation hardening: aggregate compose now explicitly rejects Product Part files that parse OK but contain zero Clusters and zero Modules, instead of silently producing shallow results.
- Bundled template delivery layer regenerated and synced with canonical source assets.

## [1.1.776] - 2026-03-23
### Fixed
- `Diagram Modules` now accepts the live identity-table `product-parts/<part-id>.md` continuation format (`# Product Part: ...`, `## Identity`, `## Owned Clusters`, module rows with `Status`), so the first materialized part no longer fails on the legacy `- \`part_id\`: ...` expectation.
- The shared staged parser now tolerates both `Owned Clusters` / `Cluster Inventory` aliases and both three-column and four-column module tables, keeping progressive graph materialization aligned with the actual agent-authored markdown.
- Added aggregate regression coverage for the same identity-table format, so `module-inventory.md` must still be composed from the live continuation files that power the progressive `Diagram Modules` graph.

## [1.1.775] - 2026-03-23
### Fixed
- `Diagram Modules` now accepts the live `product-parts.index.md` canonical-order heading format (`## Canonical Order`, `### <n>. \`part-id\``, `Name:`, `Purpose:`), so the stage no longer produces an empty graph or stalls hidden continuation when the agent writes the newer index shape.
- The same parser recovery now powers both the client-side staged skeleton and the server-side `diagramModulesProgress` snapshot, restoring `Product Part` cards and automatic continuation together instead of leaving one path behind.
- Added regression coverage for the live canonical-order heading format while keeping the earlier ordered-list and table-based index variants intact.

## [1.1.774] - 2026-03-23
### Fixed
- `Diagram Modules` now accepts the live outline `product-parts/<part-id>.md` continuation format (`# Product Part: ...`, `## Purpose`, `## Cluster Inventory`, `## Direct Standalone Modules Under This Part`) in the shared staged parser, so the first materialized part no longer crashes on the legacy `# Module Inventory` title requirement.
- The same shared parser keeps backward compatibility with the earlier table-based staged `Product Part` format from `1.1.773`, so progressive rendering and runtime aggregate composition continue to work across both live continuation shapes.
- Added explicit aggregate regression coverage for the outline format, so `module-inventory.md` must still be built from the same live continuation files that power the progressive graph.

## [1.1.773] - 2026-03-23
### Fixed
- `Diagram Modules` now parses the live human-readable staged `product-parts/<part-id>.md` format in the progressive loader, so the first continuation file expands the graph instead of failing on legacy `Metadata`, `Simple Relations`, or flat inventory section requirements.
- Compatibility aggregate composition now uses the same staged `Product Part` parser, allowing runtime to build `module-inventory.md` from the real continuation files after the staged sequence completes.
- Added regression coverage for both paths: the progressive UI must accept the live staged part format, and aggregate composition must emit canonical inventory DSL from those same files.

## [1.1.772] - 2026-03-23
### Fixed
- `Diagram Modules` `Source` now becomes available as soon as `product-parts.index.md` exists; the availability gate no longer waits for `module-inventory.md` before opening the staged canonical artifact.
- `Diagram Modules` now reads the live Markdown table format under `Canonical Product Parts`, so the first `product-parts.index.md` immediately produces a visible staged skeleton instead of an empty canvas.
- The same table-format parser recovery restores hidden continuation after the index write by resolving planned parts and the next `currentPartId` from the real live artifact shape.
- Added regression coverage for both fixes: `Source` availability must follow `product-parts.index.md`, and staged parser tests now accept the live table-based index alongside the earlier heading/list formats.

## [1.1.771] - 2026-03-23
### Fixed
- `Diagram Modules` now reads both the legacy `### Product Part: ...` index blocks and the live numbered `Canonical order` format written by the staged agent, so the first `product-parts.index.md` immediately produces a visible React Flow skeleton instead of an empty canvas.
- The same parser recovery restores the hidden continuation path after the index write: `diagramModulesProgress` again resolves the next `currentPartId`, which prevents the stage from stalling on `substep: index` when the live numbered format is used.
- `Diagram Modules` panel/source surfaces now treat `product-parts.index.md` as the primary stage artifact: intro copy, source label/path, and pending messaging no longer point users back to `module-inventory.md` as if the stage were still inventory-first.
- Empty-state messaging in the visual shell now explains the staged `index -> product-parts/<part-id>.md -> runtime aggregate` flow, replacing the misleading suggestion to “add semantic entities” or rerun the step while staged materialization is still in progress.

## [1.1.770] - 2026-03-23
### Changed
- `Diagram Modules` prompt composition now states exact current-turn inputs and explicit non-inputs, so the stage no longer suggests searching compatibility inventory, staged examples, continuity files, legacy helper artifacts, or generic templates unless runtime explicitly passed them.
- `Diagram Facades` now follows the same strict input contract: author from the current `module-inventory.md`, embedded appendix content, and explicitly listed project files instead of spending a turn on continuity/template scouting.
- Diagram-stage contract assembly now injects staged templates, field references, and merge rules directly into the prompt payload while removing the generic stage-level `templatePath` hint for both `diagram_modules` and `diagram_facades`.

### Fixed
- Closed the follow-up `1.1.769` composite prompt drift found during live retest, where the agent could still produce discovery chatter such as checking compatibility inventory, staged examples, or a missing formal staged template before writing the real artifact.
- Added regression coverage for diagram prompt/contract composition, so legacy strings, unwanted template hints, and weakened strict-input restrictions are caught before the next release.

## [1.1.769] - 2026-03-23
### Changed
- `Diagram Modules` live prompt/template surface now follows one explicit staged contract: first `product-parts.index.md`, then one `product-parts/<part-id>.md` per hidden continuation, while `module-inventory.md` remains runtime-owned compatibility output.
- Bundled template delivery now includes dedicated staged templates for `product-parts.index.md` and a single materialized `Product Part`, so synced `~/.codeai-hub/templates/diagram_modules/...` assets match the repaired PM prompt surface instead of only shipping the old monolithic inventory template.

### Fixed
- Hidden `Diagram Modules` continuation now rereads `workflowState` after `turn_completed`, so direct file-write / file-change Codex turns continue automatically even when no `structured_output` event is emitted.
- Added regression coverage for the live failure mode `index written -> no structured_output -> continuation still starts`, reducing the chance that future transport-path changes silently break staged orchestration again.

## [1.1.768] - 2026-03-23
### Changed
- `Diagram Modules` now starts from `product-parts.index.md` and then materializes one `product-parts/<part-id>.md` at a time, so the stage can progressively reveal the system instead of waiting for one giant inventory turn.
- React Flow now follows the staged `Product Part` order from the index artifact, shows visible generation progress in Project Manager, and keeps the graph readable while new parts appear.
- Runtime now composes `module-inventory.md` as a compatibility aggregate after the last `Product Part`, preserving the downstream single-file contract for `Diagram Facades` without giving that file back to the agent as the primary authoring target.

### Fixed
- `Diagram Facades` remains blocked until the full `Diagram Modules` product-part sequence reaches `awaiting_review` and the compatibility aggregate exists; intermediate staged part files no longer unlock the next step too early.
- `Codex` no longer aborts long silent diagram turns on a hard idle timeout while the provider is still working, which removes the failure mode where large `Diagram Modules` sessions died before `structured_output`.
- Late provider assistant/commentary messages now preserve their original provider timestamps in the session transcript even if they arrive after `turn_completed`, reducing drift between raw provider logs and the infinite session history.

## [1.1.767] - 2026-03-23
### Changed
- `Product Part` purpose panels in `Diagram Modules` now claim a wider right-side column, reducing artificial line wrapping in dense review scenarios.
- The dense `Diagram Modules` autolayout baseline now treats header/body separation as a two-pass measurement problem for both `Product Part` and `Cluster`, instead of relying on shortened header budgets.

### Fixed
- `Product Part` cluster sections no longer begin inside the visible purpose area when the top-level description is long; the body start now follows the measured bottom edge of the full header block.
- Cluster stacks now reserve enough space for long cluster descriptions before placing the first module card, eliminating the remaining overlap reported in the `1.1.766` retest.
- Standalone-band regression tests now validate layout invariants against measured cluster bottoms instead of brittle absolute coordinates, so second-pass header tuning does not break unrelated release gates.

## [1.1.766] - 2026-03-23
### Changed
- `Diagram Modules` is now explicitly documented as the primary user-review step before `Diagram Facades`, and `Product Part` / `Cluster` cards show short purpose text directly in the visual hierarchy.
- Dense `Diagram Modules` first-open layout now follows a deterministic `measure -> place` contract: cluster/module placement budgets are derived from content length instead of only from a fixed row step.

### Fixed
- Cluster containers now reserve header space for title/meta/purpose text, so tall module cards no longer collide with cluster headers or with the next module in the same stack.
- Standalone modules inside a `Product Part` now dock under the shorter measured column, and the product-part frame closes around the actual occupied content instead of leaving a large empty lower band.

## [1.1.765] - 2026-03-22
### Changed
- Runtime-synced `Diagram Modules` and `Diagram Facades` template packs are now localized for the user-facing surface: explanatory text is Russian, while DSL terms and field names remain English.
- Bundled template delivery is now regenerated from those localized source assets and verified by `TemplateSyncService`, so the synced `~/.codeai-hub/templates/...` copies match the release bundle instead of drifting behind repo changes.

### Fixed
- `Diagram Modules` first-open autolayout now gives stacked module cards inside clusters enough vertical space, eliminating the visible overlap regression from the `1.1.764` live pass.
- Standalone modules inside a `Product Part` now use tighter horizontal spacing, so the standalone band no longer stretches far wider than the cluster columns next to it.

## [1.1.764] - 2026-03-22
### Changed
- `Product Part` is now the canonical top-level term across `Description`, `Virtual Simulation`, and `Diagram Modules` help/prompt/template surfaces, replacing the longer explanatory wording that previously drifted away from the actual diagram DSL.
- `Diagram Modules` no longer treats `Role` as a required user-facing field in `module-inventory.md`; `Title`, `Purpose`, `Clusters`, and `Standalone Modules` now carry the semantic weight of the top-level ownership layer instead.

### Fixed
- The `Diagram Modules` parser remains backward-compatible with legacy inventories that still contain `Role:` under `Product Part`, but new serializer/template output no longer emits that field.
- The diagram UI now explicitly labels module cards as `Module` and demotes `Kind` (`service`, `store`, `library`, etc.) to a secondary label instead of letting the kind masquerade as the entity level.
- `Product Part` cards no longer show the removed display-only role tag; the visible hierarchy now reads through top-level ownership counts instead of a brittle role enum.

## [1.1.763] - 2026-03-22
### Fixed
- `Description Help` now explicitly matches the real `Submit questionnaire` flow: provider selection appears immediately after submit, the provider is chosen once per workflow workspace in the current MVP, and the dialog continues until the user considers the document strong enough for the next step.
- `Diagram Modules` and `Diagram Facades` runtime prompts no longer duplicate the appended `Field Reference` and `Merge Rules` blocks when both synced templates and bundled fallback assets are present.
- `Source` for `Diagram Modules` and `Diagram Facades` now shows workflow-aware pending copy before the canonical stage artifact exists, instead of opening the generic artifact surface with a `file not found` error.

## [1.1.762] - 2026-03-22
### Changed
- The live first workflow step is now consistently `Description` across Project Manager bootstrap, provider picker, workflow start/fix flows, and active SSOT documents; `Idea / Idea Collector` no longer appears as user-facing product semantics for the current workflow.
- Cleanup documentation now explicitly classifies the remaining legacy `idea-*` zone as internal compat helpers, provider parser internals, redirect-only aliases, or disabled old-flow remnants instead of presenting it as active architecture.

### Fixed
- `build-all` / `build-core` no longer try to build or stage the removed `@codeai-hub/idea-collector` package during local release packaging.

### Removed
- Unused PM legacy wrappers and provider accessors that no longer had active callers after the `Description` naming migration.

## [1.1.761] - 2026-03-22
### Fixed
- `Description Help` in Project Manager now renders locally by the same pattern as the other workflow step helps, instead of depending on `description-contract` and runtime template availability.
- Closed the UI architecture regression where `Description` alone could degrade into `template недоступен` while `Virtual Simulation`, `Diagram Modules`, and `Diagram Facades` already used stable built-in help surfaces.

## [1.1.760] - 2026-03-22
### Fixed
- `Description` workflow contracts now self-heal missing synced visible templates: if `~/.codeai-hub/templates/description/description-template.md` is absent, runtime restores it from the bundled release assets before serving `Description Help` or the `description-contract`.
- Closed the regression where the `Description` `Help` button could degrade to `template недоступен` immediately after install/restart even though the release already contained the canonical help/template markdown.

## [1.1.759] - 2026-03-22
### Changed
- `Description` now has a stricter document-level DoD: `Final_Description.md` must contain an explicit user-readable scenario section, and the number of scenarios is driven by product coverage instead of a fixed cap.
- The visible `Description Help` surface now comes from the same synced markdown template that runtime ships into `~/.codeai-hub/templates/description/description-template.md`, so pre-submit help and post-submit `Help` tab can no longer drift apart.

### Fixed
- Closed the remaining `Description` drift where scenario coverage could stay implicit inside narrative sections even when the questionnaire already contained concrete user flows.
- Closed the help-source split where Project Manager held one copy of `Description Help` in React and runtime/contracts shipped another copy through the bundled template layer.

## [1.1.757] - 2026-03-22
### Changed
- `Description` runtime questionnaire is now universal for any software product: the question order is a simple-to-complex ladder, `тип продукта / платформа` moved near the top, and the stage now explicitly offers cluster-modular architecture as a recommended way to describe a product for AI instead of assuming internal CodeAI terminology.
- `Description Help` now explains the same universal baseline as the installed questionnaire, including why cluster-modular architecture is recommended and how users can answer in plain language without pre-knowing `shell` / `cluster` / `module` vocabulary.
- Downstream `Description`, `Virtual Simulation`, and `Diagram Modules` prompts now explicitly treat the questionnaire as universal input: they must infer architecture from user language and project-local artifacts instead of expecting product-specific workflow facts or ready-made module lists in `Description`.

### Added
- A full `Diagram Facades` runtime prompt surface aligned with the current workflow contract: artifact-first behavior, project-local source boundaries, direct dependence on `module-inventory.md`, and user-readable facade/relation authoring guidance.
- Matching `Diagram Facades Help` guidance in Project Manager, so the visible UI now explains the same boundary-map baseline that the runtime prompt expects.

### Fixed
- Closed the prompt/help drift where `Diagram Facades` still used a minimal generic prompt while upstream stages already followed the richer artifact-first greenfield contract.
- Closed the downstream expectation drift where later stages could overread `Description` as if it already contained technical architecture vocabulary, fixed workflow facts, or a finished module inventory.

## [1.1.756] - 2026-03-21
### Changed
- Empty-workspace `Virtual Simulation` and `Diagram Modules` runtime prompts now explicitly restrict themselves to project-local artifacts, current-stage continuity files, and files the user named for the current project, instead of drifting into internal CodeAI Hub implementation context.
- `Diagram Modules` user-facing prompt/reference/template surface now treats `Product Part` ownership as parser-critical authoring contract: `Clusters:` / `Standalone Modules:` must exactly match nested blocks, and the runtime-visible template/checklist now calls that out directly.
- Pending `Artifacts` surfaces for `Virtual Simulation`, `Diagram Modules`, and `Diagram Facades` now reuse the exact same help content as the `Help` tab, so the stage intro no longer diverges before the first canonical artifact exists.

### Added
- Ownership-aware regression coverage for first-open `Diagram Modules` layout: top-level `Product Part` rows, dedicated standalone-module band placement, and external provider boundary projection outside product-part containers.

### Fixed
- Closed the greenfield prompt drift where diagram stages could consult internal parser/runtime code instead of staying inside the current project artifact boundary.
- Fixed the first-open `Diagram Modules` readability regressions where wide product parts could overlap, internal standalone modules could blow out container width, and the selected external AI provider could render as if it were inside a product part.

## [1.1.755] - 2026-03-21
### Changed
- `Description`, `Virtual Simulation`, and `Diagram Modules` now share the approved compact runtime surface: user-facing help, runtime prompts, and visible template delivery all use the same glossary, artifact-first baseline, and stop-questioning contract.
- `Virtual Simulation` now treats the old runtime scenario cap as a formatting concern only; the prompt surface explicitly requires enough combined scenario coverage to expose the whole visible system.
- `Diagram Modules` now moves from the flat inventory baseline to `Product Part -> Cluster -> Module`, so top-level ownership is part of the semantic model instead of being hidden in notes or flattened into decorative clusters.

### Added
- New `ProductPartEntity` / ownership-aware `ModuleMapModel` contract in the diagram DSL runtime, including explicit `productPart` ownership on clusters and modules.
- Dual-read parser migration for `module-inventory.md`: legacy flat inventories now materialize a synthetic `default-product-part`, while v2 inventories preserve explicit product-part hierarchy.
- Nested React Flow rendering for `Diagram Modules`: product parts render as top-level containers, clusters render as child containers, and standalone modules stay inside their owning product part.
- Ownership-aware sidecar coverage proving that `module-map.flow.json` still stores only layout coordinates and only replays them when the diagram revision matches.

### Fixed
- Closed the greenfield diagram flattening gap where prompts could already express ownership/runtime placement, but the visible diagram still collapsed everything into one flat `cluster + module` layer.
- Synchronized the runtime-visible prompt/help surface and the bundled template checks so the installed app delivers the same compact contract that the codebase assets now define.

## [1.1.754] - 2026-03-20
### Changed
- `Description` now starts the greenfield polygon grammar earlier: the prompt surface explicitly captures application archetype, visible deployable/runtime contours, and candidate system boundaries instead of only product narrative.
- `Virtual Simulation` now turns upstream scenarios into `archetype-aware shell constraints`, candidate clusters, standalone modules, and simple boundary-sensitive interactions for downstream diagram work.
- `Diagram Modules` prompt grammar now treats clusters as formal subsystem containers with nested modules, keeps standalone modules outside clusters by default, and discourages loose analytical labels such as `core`, `shared`, `services`, or `stores`.

### Added
- Contract and sync coverage for the new polygon surface:
  - `virtual-simulation` contract smoke-checks now assert the new architecture-aware prompt sections
  - `diagram_modules` contract tests now verify bundled prompt/template invariants for cluster containers and standalone modules
  - template-sync tests now verify that `Description`, `Virtual Simulation`, and `Diagram Modules` ship the updated visible prompt surface into `~/.codeai-hub/templates`

## [1.1.753] - 2026-03-20
### Changed
- `Codex gpt-5.4` resume no longer unconditionally starts a fresh thread during ordinary reopen/recovery; the provider now reuses the existing thread id by default.
- Project Manager cold-open bootstrap now deduplicates runtime restore requests per dialog continuity entry, so repeated `dialog:list` refreshes do not spam the same stale `providerSessionId`.

### Fixed
- Core continuity now eagerly tracks freshly rebound runtime sessions, preventing continuity/index drift when a recovered dialog is rebound before the next outbound user turn.
- Closed the reopen/recovery loop where `diagram_modules` dialogs could remain stuck in `Agent is working… Please wait.` after restarting Project Manager / Core with no `module-inventory.md` yet on disk.

## [1.1.752] - 2026-03-19
### Changed
- `Diagram Modules` now treats `module-inventory.md` as the only semantic workspace artifact for the stage; `module-map.flow.json` remains the layout-only sidecar used by the visual canvas.
- `Diagram Facades` now starts and gates from `module-inventory.md`, aligning the downstream contract with the actual inventory-first workflow.
- Project Manager help/pending copy, loader paths, and runtime prompts no longer advertise a raw `module-map.md` file as part of the visible `Diagram Modules` contract.

### Fixed
- Removed the last inventory-only regression tails where PM/runtime/docs still mixed the old `module-map.md` workspace contract into start, gating, and repair expectations.

## [1.1.751] - 2026-03-19
### Changed
- `Diagram Modules` now starts from an explicit inventory-first session prompt: the agent sees `Final_Description.md` and `virtual-simulation.md`, targets `module-inventory.md`, and is told to follow `read -> discuss inventory -> derive module map`.
- `Fix with agent` now opens the correct dialog session for the active workflow stage and forwards the current parse/validation error into that session as a repair prompt.

### Fixed
- Saving `module-inventory.md` now automatically materializes the derived `module-map.md`, so `Diagram Facades` and downstream gating no longer stall when only the agreed inventory exists.
- Corrected the broken `v1.1.750` PM/runtime split where `Diagram Modules` still targeted `module-map.md` directly and a parse failure could not be sent back into the agent session from the repair button.

## [1.1.750] - 2026-03-19
### Changed
- `Diagram Modules` now derives the visible `module-map.md` from `module-inventory.md` before React Flow projection, so the inventory stays the first agreement layer and the visual diagram remains cluster-aware.
- `Diagram Modules` help/pending copy now explains the inventory-first flow and the derived visual map.

### Fixed
- `Diagram Modules` no longer depends on the raw `module-map.md` file as the first semantic handoff when the inventory agreement already exists.

## [1.1.749] - 2026-03-19
### Changed
- `Diagram Modules` and `Diagram Facades` now expose a visual-only manual-layout surface: the visible UI no longer shows `Auto-layout`, layout profiles, `Edit Modules`, `Edit Relations`, or the facade editing sections.
- `*.flow.json` continues to store only user-owned geometry, and the bottom-right minimap was removed so the canvas keeps more room for the graph itself.
- Semantic changes are now handled through agent-driven updates or direct canonical Markdown editing, keeping the main surface layout-first.

### Fixed
- Removed the launcher-risky inline semantic editing surface from the diagram panels, which left the UI focused on navigation, manual layout, and read-only source inspection.

## [1.1.748] - 2026-03-19
### Changed
- `Diagram Modules` and `Diagram Facades` now follow a manual-layout-first contract: the visible diagram surface no longer exposes `Auto-layout`, `Vertical`, `Horizontal`, `Compact`, `Fill space`, or the old `Layout saved` chrome.
- The diagram editor shell is now simplified to React Flow rendering plus persisted manual drag positions; `*.flow.json` stores only user-owned geometry and no longer carries ELK profile state.
- `Edit Modules`, `Edit Relations`, and the facade editing sections remain available as secondary inline DSL editors beneath the main diagram surface.

### Fixed
- Removed the whole ELK-driven runtime pipeline from the product UX, so manually corrected diagram compositions are no longer at risk of being re-imposed by a fallback auto-layout action.

### Removed
- The runtime dependency `elkjs`.

## [1.1.746] - 2026-03-19
### Fixed
- `Diagram Modules` layout profile choice now takes effect immediately on the current graph instead of only changing local UI state with no visible impact.
- The selected profile is now persisted in `module-map.flow.json`, so reopening or restarting Project Manager restores the last chosen mode instead of reverting to the default vertical layout.

### Changed
- The launcher-safe toolbar control introduced in `1.1.745` is now connected to the actual flow-state lifecycle: profile selection immediately triggers a fresh layout pass and saves the resulting profile together with node positions.

### Added
- Targeted coverage for layout-profile restore flow: sidecar parse/serialize now covers `layoutProfile`, and source-level checks verify that `Diagram Modules` restores the profile from sidecar and auto-applies it through the shared shell.

## [1.1.747] - 2026-03-19
### Fixed
- `Diagram Modules` no longer renders module nodes through a broken cluster-parent nesting path that could hide real ELK coordinate changes from the visible React Flow canvas.
- Layout profile switching (`Vertical`, `Horizontal`, `Compact`, `Fill space`) should now change the actual diagram surface instead of only updating persisted flow-state.

### Changed
- The diagram shell now uses explicit node renderers for `cluster`, `module`, and `facade`, so the canvas reflects the corrected runtime projection rather than React Flow fallback rendering.
- `Diagram Modules` clustered modules are now projected as top-level visual nodes, which keeps profile-driven layout changes visible and avoids fake parent geometry interfering with React Flow placement.

### Added
- Targeted projection coverage proving that `Diagram Modules` clustered modules no longer rely on `parentId` / `extent="parent"` for their visual layout contract.

## [1.1.745] - 2026-03-19
### Fixed
- `Diagram Modules` no longer uses a native HTML `<select>` for layout profile choice inside the Project Manager launcher.
- This closes the new macOS launcher crash from `v1.1.744`, where opening the profile chooser and selecting `Vertical` could collapse the whole CEF window through an AppKit exception path outside the React/ELK layer.

### Changed
- The four approved profiles `Vertical`, `Horizontal`, `Compact`, and `Fill space` are now exposed through a custom toolbar button-group next to `Auto-layout`.
- The layout algorithms themselves are unchanged in this corrective release; the scope is launcher stability and safe profile selection.

### Added
- Targeted regression coverage proving that the diagram toolbar no longer renders a native `<select>` for layout profiles.

## [1.1.744] - 2026-03-18
### Changed
- `Diagram Modules` now exposes multiple concrete layout profiles next to `Auto-layout`: `Vertical`, `Horizontal`, `Compact`, and `Fill space`.
- The new `Fill space` profile is intended to occupy the available canvas area instead of leaving the module graph compressed into a single long strip.
- The `Diagram Modules` artifact surface now stretches to the full available height of the right panel, so the canvas absorbs spare vertical space and collapsed editing sections no longer float above a large empty lower area.

### Added
- Targeted coverage for the new layout-profile contract and for the full-height stage scaffold behavior.

## [1.1.743] - 2026-03-18
### Fixed
- Shared diagram auto-layout feedback: `Diagram Modules` and `Diagram Facades` now refit the live React Flow viewport immediately after the new ELK layout is applied, so the user sees the rearranged graph in the current screen instead of only after leaving and reopening the stage.
- This closes the newly confirmed UX bug where `Auto-layout` persisted fresh node positions into `module-map.flow.json` / `facade-map.flow.json` but left the active canvas on a stale camera framing until remount.

### Changed
- The shared diagram shell now emits an explicit viewport-refresh signal after both:
  - the first automatic layout when the diagram has no meaningful saved positions yet;
  - a manual click on the `Auto-layout` button.
- The shared React Flow facade now performs an in-place `fitView` when that signal arrives, without changing the `Artifacts | Source | Help` contract or exposing the internal `*.flow.json` sidecar.

## [1.1.742] - 2026-03-18
### Changed
- Repository-wide duplication debt is back under control: `jscpd` now reports `1207` duplicated lines out of `447` scanned sources, or `2.8%`, which is below the enforced `3%` threshold.
- The duplication gate is now single-source: `check-architecture.sh`, `npm run check:dup`, and release packaging all run the same repo-wide duplication command instead of disagreeing about the scanned surface.
- The largest diagram-related clone clusters were collapsed into shared building blocks:
  - shared provider option dialog shell for Codex/Gemini settings
  - shared diagram stage scaffold for `Diagram Modules` / `Diagram Facades`
  - shared relation editor shell for module/facade relation editing
  - shared dialog-segment meta helper across PM and UI surfaces

### Fixed
- Release builds no longer emit the recurring repository-wide duplication advisory that had been hovering around `4.17%` to `4.25%` in recent diagram releases.

## [1.1.741] - 2026-03-18
### Changed
- Project Manager diagram stages now expose an explicit `Artifacts | Source | Help` contract: `Artifacts` keeps the visual diagram primary, `Source` shows read-only canonical Markdown, and `Help` remains separate guidance.
- `Diagram Modules` and `Diagram Facades` reopen back into the visual diagram instead of silently replacing the right panel with raw `module-map.md` / `facade-map.md`.
- Both diagram panels are now diagram-first surfaces: the canvas renders before semantic editing controls, internal `artifact -> sidecar` path chrome is removed from the default UI, and `*.flow.json` stays hidden as a runtime-only sidecar.
- The shared React Flow shell now supports manual node repositioning in addition to optional `Auto-layout`, and those layout changes persist across reopen/resume without changing semantic Markdown DSL content.

### Added
- Regression coverage for the new diagram header/source contract and updated facade-shell chrome.

### Known Issues
- Dense diagrams can still require manual layout cleanup after the first automatic placement; this release makes that path available and persistent, but does not yet redesign the graph projection itself.

## [1.1.740] - 2026-03-18
### Fixed
- Diagram workflow contract delivery: `Diagram Modules` / `Diagram Facades` now inject their strict field-reference and merge-rules assets directly into the emitted prompt, so the provider sees the canonical DSL enum constraints before generating the first artifact.
- This closes the newly exposed post-launch failure where a session started correctly but produced a non-renderable `module-map.md` with invalid enum values such as `Kind: application`.

### Changed
- Added regression coverage for diagram-stage contract assembly, proving that both contracts now embed field-reference and merge-rules text into the final prompt payload.
- Synchronized `SystemArchitecture`, the audit plan, and the recovered `todo-plan` around the stricter diagram contract requirement: fresh stage success now means both `session` launch and immediate PM parseability of the first artifact.

### Known Issues
- This release fixed prompt-contract parseability but still left the user-facing surface unfinished; the follow-up `1.1.741` release moves the diagram itself back to the primary panel and adds `Source` as the explicit secondary debug view.

## [1.1.739] - 2026-03-18
### Fixed
- Core workflow-state recovery: `/workflow-state` now hydrates canonical workflow artifacts from disk on cold start, so `Diagram Modules` / `Diagram Facades` no longer stay silently blocked just because the current Core/watchers lifetime missed the original filesystem events.
- Diagram-stage gating now follows the agreed manual-transition contract: if `virtual-simulation.md` or `module-map.md` exists, the next toolbar step unlocks even when the upstream stage is currently marked `invalid` or `outdated`.

### Changed
- Added regression coverage for cold-start workflow-state hydration and for the case where an invalid upstream `virtual-simulation.md` must remain diagnostically invalid but still allow manual launch of `Diagram Modules`.
- Synchronized `SystemArchitecture`, the audit plan, and the recovered `todo-plan` around the corrected bootstrap contract: stage validation state and next-step start gating are now treated as separate concerns.

### Known Issues
- This release closes the three confirmed gating/bootstrap blockers. Live verification of the deeper runtime path `session:create -> session:created -> session:binding -> sendSessionMessage` remains open until the new VSIX is rechecked in the running UI.

## [1.1.738] - 2026-03-18
### Fixed
- Project Manager diagram-stage bootstrap: `Diagram Modules` and `Diagram Facades` no longer require the upstream workflow stage to be exactly `completed` before a fresh toolbar launch. If the canonical upstream artifact already exists and gating is open, the next-step session can now start.

### Changed
- Added behavioral regression coverage for diagram-stage bootstrap, verifying that artifact availability is sufficient for launch while blocked gating still rejects the start.
- Synchronized `Workflow_CLI`, `WorkflowSteps_Overview`, and `SystemArchitecture` around the corrected launch contract for `Diagram Modules` / `Diagram Facades`.

### Known Issues
- This release fixes the first confirmed toolbar-bootstrap blocker. The broader audit of `session:create -> session:created -> session:binding -> sendSessionMessage` remains open until the full fresh-start path is revalidated in the running UI.

## [1.1.737] - 2026-03-16
### Added
- Hardening coverage for the interactive diagram workflow: concurrent merge regression tests, continuity normalization guards for `diagram_modules` / `diagram_facades`, Markdown DSL BOM/CRLF parsing checks, serializer CRLF normalization checks, and targeted tree-node status coverage for diagram branches.

### Changed
- Project Manager visual shell now keeps the last ready diagram visible during background refresh instead of blanking the canvas on every poll; empty graphs expose an explicit placeholder, and auto-layout failures surface through the shared save-status indicator.
- Workflow tree child nodes under `Diagram Modules` and `Diagram Facades` now mirror the real stage status (`active`, `outdated`, `blocked`) and tooltip copy instead of always rendering as active children.
- Markdown DSL normalization is stricter and more fault-tolerant: parser input accepts UTF-8 BOM + CRLF files, while serializer output normalizes multiline text blocks back to canonical LF-based Markdown.

### Known Issues
- Starting a fresh toolbar session for `Diagram Modules` / `Diagram Facades` remains a deferred blocker outside this release scope; this release hardens parsing, semantic merge safety, and PM workflow visualization for already-existing diagram artifacts.

## [1.1.736] - 2026-03-16
### Added
- `Diagram Facades` semantic editing: Project Manager now exposes facade create/update/delete controls plus methods, ports, and facade relation editing directly on top of the visual shell.
- Local facade patch pipeline and facade relation patch pipeline now exist as explicit client-side domain transforms, giving the UI deterministic semantic updates before serialization back to `facade-map.md`.

### Changed
- Semantic facade edits now autosave into canonical `facade-map.md`, while `facade-map.flow.json` continues to store only layout/view state.
- Local edits preserve provenance by converting modified agent-owned facades and relations from `origin: agent` to `origin: merged`.
- The PM session now keeps a facade-specific patch queue and reapplies it over incoming facade-map refreshes, surfacing preserved-edit conflict warnings instead of discarding local semantic changes immediately.

### Known Issues
- Fresh toolbar bootstrap for `Diagram Modules` / `Diagram Facades` is still outside this release scope, so repeated-agent manual verification remains limited to workspaces where the diagram artifacts already exist.

## [1.1.733] - 2026-03-16
### Fixed
- Core runtime packaging: `build-core.sh` now ships `packages/agents/diagram-modules-agent/assets/` and `packages/agents/diagram-facades-agent/assets/` into the installed core runtime, so release builds can resolve the new Markdown DSL diagram contracts instead of missing the prompt/template assets.
- Template sync: startup cleanup now removes stale home-cache diagram templates `modules-diagram-prompt.md`, `modules-diagram-template.mmd`, `facades-graph-prompt.md`, and `facades-graph-template.mmd`.

### Changed
- Corrective validation target for this release is the real installed workflow surface: `Diagram Modules` / `Diagram Facades` must start from the toolbar using Markdown DSL assets, while local `~/.codeai-hub/templates` must no longer expose the removed Mermaid diagram files.

## [1.1.734] - 2026-03-16
### Added
- Project Manager visual shell: `Diagram Modules` and `Diagram Facades` now render canonical Markdown DSL artifacts through a read-only React Flow canvas with ELK first-layout and an `Auto-layout` action.
- Flow sidecar persistence: `module-map.flow.json` and `facade-map.flow.json` are now loaded and saved from the PM side so layout survives reopen/resume without semantic writes into the canonical `.md`.

### Changed
- Diagram panels no longer default to raw Markdown-only rendering once `module-map.md` / `facade-map.md` exist; the primary user-facing surface is now the visual shell, while `.md` remains the semantic SSOT.
- Browser bundle compatibility: the diagram DSL parser path now has a browser-safe revision fallback, allowing PM/UI to parse canonical diagram artifacts without bundling `node:crypto`.
- Validation target for this release moves from contract alignment to visible diagram inspection: render `module-map.md`, render `facade-map.md`, use `Auto-layout`, persist `*.flow.json`, and verify layout restoration after reopen.

### Known Issues
- Starting a fresh toolbar session for `Diagram Modules` / `Diagram Facades` remains a deferred blocker outside this release scope; this release focuses on visualizing and persisting already-created diagram artifacts.

## [1.1.735] - 2026-03-16
### Added
- `Diagram Modules` semantic editing: Project Manager now exposes module create/update/delete controls and relation create/update/delete controls on top of the visual shell.
- Local module patch pipeline and relation patch pipeline now exist as explicit client-side domain transforms, giving the UI deterministic semantic updates before serialization back to `module-map.md`.

### Changed
- Semantic edits now autosave into canonical `module-map.md`, while `module-map.flow.json` continues to store only layout/view state.
- Local edits preserve provenance by converting modified agent-owned module entities and relations from `origin: agent` to `origin: merged`.
- The PM session now keeps a local patch queue and reapplies it over incoming module-map refreshes, surfacing conflict warnings instead of discarding local semantic changes immediately.

### Known Issues
- Fresh toolbar bootstrap for `Diagram Modules` / `Diagram Facades` is still outside this release scope, so repeated-agent manual verification remains limited to workspaces where the diagram artifacts already exist.

## [1.1.732] - 2026-03-16
### Fixed
- Project Manager: toolbar start, gating, artifact availability, tree labels, and panel/help copy for `Diagram Modules` / `Diagram Facades` now follow `module-map.md` and `facade-map.md` instead of the removed Mermaid `.mmd` files.

### Changed
- UI/PM contract: the active diagram workflow surface no longer exposes `modules-diagram.mmd` or `facades-graph.mmd` as user-facing canonical artifacts.
- Validation target for this release shifts from runtime foundation only to an actual PM smoke: stage launch from the top toolbar and opening canonical `.md` artifacts from the tree.

## [1.1.731] - 2026-03-16
### Added
- Core diagram DSL foundation: strict Markdown parsers/serializers for `module-map.md` and `facade-map.md`, revision metadata helpers, and baseline diff/change-summary services for repeated agent runs.
- Agent packages: dedicated asset packs for both diagram workflow steps (`prompt`, `template`, `field-reference`, `merge-rules`) now live under `packages/agents/diagram-modules-agent/assets/` and `packages/agents/diagram-facades-agent/assets/`.

### Changed
- Workflow runtime: canonical diagram artifacts are now `module-map.md` / `facade-map.md` plus auxiliary `*.flow.json` and `*.agent-baseline.md`; legacy Mermaid `.mmd` files are no longer part of the active workflow contract.
- Workflow prompts: runtime now assembles diagram prompt packs from agent-owned assets and injects generated `Change Summary` blocks instead of relying on legacy bundled Mermaid templates.
- Docs/SSOT: synchronized `System/WorkflowSteps_Overview.md`, `Workflow_CLI.md`, and `SystemArchitecture.md` so Diagram Modules / Facades explicitly describe the Markdown DSL triplet and the non-semantic role of `*.flow.json`.

## [1.1.730] - 2026-03-15
### Fixed
- Core continuity arbitration: flow-node/document-node rollover is now deferred to the post-turn boundary, so a low remaining-context `token_usage` snapshot can no longer preempt an active user one-shot turn before `turn_completed`.

### Changed
- Tests: added regression coverage for both provider event orders, guarding `Gemini` (`token_usage -> turn_completed`) and `Claude/Codex` (`turn_completed -> token_usage`) plus cache reset between outbound turns.
- Docs/SSOT: synchronized the continuity contract so `token_usage` acts as post-turn arbitration input, trailing usage can complete pending decisions, and cached usage from a previous turn cannot leak into the next one.
- Validation: manual `Gemini` document-node smoke on March 15, 2026 confirmed that the active one-shot turn in `v1.1.730` now completes before continuity handoff/bootstrap starts.

## [1.1.729] - 2026-03-15
### Fixed
- Gemini dialog history: `GeminiMessageProcessor` now flushes each assistant segment on `finished`, and `GeminiSessionManager` suppresses the old final aggregate `assistant` block when segmented replies were already emitted through `dialog_message`.

### Changed
- Tests: added regression coverage for both Gemini paths: segmented `content -> finished` delivery without duplicate final assistant output and fallback aggregate delivery when a turn ends without a `finished` segment flush.
- Docs/SSOT: synchronized the architecture invariant that provider normalization layers must preserve real assistant segment boundaries instead of collapsing them into a single post-turn blob.

## [1.1.728] - 2026-03-15
### Fixed
- Core transport: `WebSocketManager` now caches canonical `usage_limits` stream-events and replays them after websocket connect and workspace-scope changes, so `Codex` usage limits survive late `Project Manager` / `Session UI` attach instead of disappearing after the first live emission.

### Changed
- Tests: replaced the previous source-level `WebSocketManager` guard with a live websocket regression that verifies out-of-scope `usage_limits` are filtered live but replay correctly after scope switch with `providerScopeKey` preserved.
- Docs/SSOT: synchronized the architecture invariant that stateful session signals such as `token_usage` and `usage_limits` must have replay-safe delivery across scope rebinds.

## [1.1.727] - 2026-03-14
### Added
- Core: introduced a universal provider usage-limits module in `packages/core`, with shared types/cache/facade, provider-specific readers/normalizers, and a canonical `providerScopeKey` contract for `Claude`, `Codex`, and `Gemini`.

### Changed
- Claude, Codex, and Gemini now emit usage limits through the same shared pipeline `reader -> normalizer -> shared snapshot -> compat stream payload`; live provider surfaces are primary, while provider-specific fallback paths remain secondary.
- Codex usage limits now prefer runtime payloads and `app-server account/rateLimits/read`; rollout JSONL is retained only as fallback rather than the main source.
- Session UI and Project Manager now cache/fan-out usage limits by `providerScopeKey`, and `Session ID bar` renders provider-aware labels from the shared snapshot instead of hardcoded `session/weekly`.

### Fixed
- Usage-limits refreshes now expose source-aware diagnostics (`cache_hit`, `fresh_read`, `fallback_cached`, `unavailable`), making fallback/debug analysis explicit in the shared facade and Codex runtime logs.

## [1.1.726] - 2026-03-14
### Fixed
- Codex runtime: saved `providers.codex.defaultModel` from `~/.codeai-hub/settings/settings.json` now wins over stale `CODEX_DEFAULT_MODEL` in long-lived core/provider processes, so a user-selected `gpt-5.4` no longer silently starts new turns as `gpt-5.3-codex`.

### Changed
- Tests: added regression guards in both core config and Codex SDK manager to lock the priority order `settings snapshot -> env fallback -> hardcoded/workspace fallback` for Codex default model resolution.

## [1.1.725] - 2026-03-14
### Changed
- Documentation lifecycle: introduced `doc/SolidWorks-WorkFlow/Plans/` as the only place for pre-implementation planning docs before `doc/TODO/todo-plan.md`; implemented SSOT remains only in `System/`, `Clusters/`, `Modules/`, and `Contracts/`.
- Agent instructions governance: `AGENTS.md` is now the sole git-tracked instruction source, while local `GEMINI.md` and `.claude/CLAUDE.md` are reduced to redirect notes outside repository tracking.

## [1.1.724] - 2026-03-13
### Changed
- Description workflow: removed the last product-visible legacy `description` architecture tails from PM/UI, core artifact routing, bundled fallback schemas, and active SSOT docs; the release now presents only the canonical `questionnaire.md` -> `Final_Description.md` flow.

### Fixed
- Project Manager: `questionnaire.md` no longer exposes the old manual `↻ Restart attempt` control, and compat `draftPath` no longer leaks the label `description.md` into tree/main-area routing.
- Core: obsolete `/api/v1/orchestrator/idea-artifact` transport and the remaining restart-era artifact bridge semantics are removed; active persistence stays on `/api/v1/orchestrator/artifact-upsert`.
- Validation: added final regression guards for Description cleanup invariants and revalidated the cleanup contour with targeted core/webview builds and tests.

## [1.1.723] - 2026-03-13
### Changed
- Mainline release verification: the primary `main` branch was hard-synchronized with baseline line `v1.1.722`, so subsequent work and the release cycle now proceed from the verified response-mode stable baseline.

### Fixed
- Codex runtime: the baseline fix for response-mode session promotion (`Debug/Raw` / `Hybrid`) is now available directly from the primary `main`, without depending on a separate baseline worktree.

## [1.1.722] - 2026-03-13
### Fixed
- Codex runtime: preserved response-mode state across `temp session id -> real thread id` promotion, so `Debug/Raw` and `Hybrid` no longer fall back to the default structured-output config after `thread.started`.
- Codex dialog history: ordinary text replies from `gpt-5.4` in `Debug/Raw` once again reach downstream `assistant` persistence instead of disappearing after the provider rollout is promoted to the real thread id.

### Changed
- Tests: added a regression guard for the session-promotion path in `StructuredOutputStreamController`, covering both `Hybrid` and `Debug/Raw` passthrough behavior.

## [1.1.721] - 2026-03-13
### Added
- General Settings: a new dedicated `Response Mode` card for Codex with `Strict`, `Hybrid`, and `Debug/Raw`, kept separate from `Core Controls`.

### Changed
- Codex runtime now reads `general.responsePolicy` from the persisted settings snapshot; baseline workflow sessions default to `Hybrid`.
- `Strict` mode exposes editable schema/instruction text, while ordinary turns in `Hybrid` and `Debug/Raw` no longer inherit the baseline default JSON-only shaping automatically.
- Commentary suppression in the Codex messaging path is now response-policy-aware instead of unconditional.

### Fixed
- Codex SDK diagnostics preserve historical `sdk-codex-*.jsonl` content across `resume` on the same `thread_id`.

## [1.1.720] - 2026-03-12
### Changed
- Codex baseline settings/UI/runtime replace the general-purpose model `gpt-5.2` with `gpt-5.4`, while keeping `gpt-5.3-codex` as the dedicated coding model.
- Codex settings snapshots now persist only two user-facing model keys in `reasoningByModel`: `gpt-5.3-codex` and `gpt-5.4`.
- Stable baseline release rebuilt from the pre-`gpt-5.4` workflow line, avoiding later PM workflow-state/hydration refactors while updating only the Codex model selection surface.

## [1.1.711] - 2026-03-05
### Fixed
- Project Manager: a watchdog retry was added for cold-open history, so a stalled first `dialog:history` request (`cursor=0`) is automatically reset and retried through a forced route without user intervention.
- Project Manager: fixed an intermittent `No messages yet` case on workspace open where history appeared only after a second click on the session/stage in the left tree.

### Changed
- Tests: `dialog-session-snapshot-replay.test.ts` was expanded with watchdog invariant coverage (`pending timeout -> forced retry`).

## [1.1.710] - 2026-03-05
### Fixed
- Project Manager: fixed the first dialog-mode open race, so `dialog:history:result` is no longer lost between `dialog:list:result` and the session identity update.
- Project Manager: on cold-open workspace, stage dialog history (JSONL) now hydrates immediately without requiring a second click on `Virtual Simulation` or another workflow step.

### Changed
- Tests: added a `dialog-session-snapshot-replay.test.ts` guard for the order `bind sessionRef -> requestDialogHistory`.

## [1.1.709] - 2026-03-05
### Fixed
- Project Manager: fixed workflow navigation desync between the Toolbar, the left tree (stage/session/artifact), and auto-select; the active step is now synchronized through a single `activeStage` route.
- Project Manager: removed stage-specific exceptions (`skipSession`) from stage activation semantics, so selecting a step now consistently opens the aligned dialog session.

### Changed
- Project Manager: the right-side header was unified for all workflow steps (`<Step Name> + Artifacts/Help`), and `Artifacts/Help` now works across steps.
- Project Manager: added help panels for non-description stages (`Virtual Simulation`, `Diagram Modules`, `Diagram Facades`).
- Tests: added a `workflow-navigation.test.ts` guard to prevent regressions in stage-selection synchronization.

## [1.1.708] - 2026-03-05
### Fixed
- Session UI: token usage now hydrates correctly for dialog-mode sessions resumed from continuity (fixes Codex showing `0 tokens / 100%`).

## [1.1.707] - 2026-03-05
### Changed
- Rebuild of the stable workflow baseline from `v1.1.706` as the new main release line (no workflow approval markers).

## [1.1.706] - 2026-03-01
### Changed
- Virtual Simulation is now prompt-only (no artifact template shipped); the agent writes `virtual-simulation.md` from `Final_Description.md`.

### Fixed
- Workflow: aligned Virtual Simulation prompt-only status and gating checks for downstream stages.

## [1.1.701] - 2026-02-28
### Changed
- Description runtime/core: removed reviewer auto-runtime branch and fixed description session persistence to collector-only mode for active flow.
- Project Manager UI: removed reviewer auto-focus/visibility branches from runtime session view and workspace-tree resume paths for `description`.
- Workflow templates: `description` bundle now uses only single-session collector wording; reviewer terminology removed from `description-collector-prompt.md`.

### Fixed
- Workspace activate/runtime resume: reviewer session slots are ignored for active delivery, preventing accidental reopen into legacy reviewer path.
- Template sync: legacy files `~/.codeai-hub/templates/description/reviewer-prompt.md` and `reviewer-template.md` are removed during sync.

## [1.1.696] - 2026-02-27
### Changed
- Workflow templates: simplified the Description questionnaire from 16 to 10 sections with plain-language names and inline examples for non-programmers.
- Workflow templates: aligned `description-template.md`, `description-collector-prompt.md`, `reviewer-prompt.md`, and `reviewer-template.md` with the new questionnaire structure.
- Reviewer Agent prompt: removed artificial 3-question limit; agent now discusses module/cluster composition as a first approximation.
- Description Agent prompt: when `modules_draft` is empty, agent proposes its own decomposition based on described scenarios and capabilities.
- Code: simplified `buildDefaults()` in `description-questionnaire-utils.ts` to only set `meta.title`; removed dead `formatDate()` and `resolveAuthorName()`.

### Added
- Workflow docs: `System/WorkflowSteps_Overview.md` — SSOT for all six workflow steps (Description → Virtual Simulation → Diagram Modules → Diagram Facades → Module Specifications → TODO Plan), including philosophy, artifacts, feedback loop, and adaptive templates concept.
- Workflow docs: `QuestionnaireTemplate_Draft.md` — intermediate draft used during the questionnaire redesign discussion.
- Docs index: added Workflow Overview section linking to `System/WorkflowSteps_Overview.md`.

## [1.1.695] - 2026-02-27
### Changed
- Project Manager: refactored duplicated stage artifact panel state rendering into shared components (`StageArtifactStateView`, `StageArtifactPendingLayout`) to keep duplication checks under the pre-push threshold.

### Fixed
- Release pipeline: `pre-push` duplication gate now passes again after the panel deduplication (`jscpd` back under 3%).

## [1.1.694] - 2026-02-27
### Fixed
- Project Manager: toolbar stage highlight is now workspace-scoped, so switching workspaces always reflects that workspace's last active step (`Description`, `Virtual Simulation`, `Diagram Modules`, or `Diagram Facades`).
- Project Manager: dialog open resume now checks runtime session presence in `workspace:snapshot` and triggers `session:create` when the dialog session is missing after restart.
- Virtual Simulation cold-start recovery: stale running lock and reset `total` timer are normalized/restored from snapshot + persisted timer state.

## [1.1.691] - 2026-02-26
### Fixed
- Project Manager: when opening a stage dialog after Core restart and `dialog:list` has no `latestSessionId`, the UI now triggers `session:create` resume so workspace snapshots include the stage session again.
- Virtual Simulation: reopen after restart no longer remains stuck in default `running` lock while waiting for user input.
- Session timers: `total` restores after restart because the resumed stage session receives `taskTimer.totalSeconds` via `workspace:snapshot`.

## [1.1.690] - 2026-02-26
### Fixed
- Project Manager: layout-level `workspace-scope-sync` now stores incoming `workspace:snapshot` payloads in `workspaceSnapshotStore` independently from runtime session view mount timing.
- Project Manager: Virtual Simulation no longer gets stuck with `Agent is working...` on late tab open after reload when the turn is already idle and waiting for user input.
- Session UI: `total` timer is restored on late mount because the latest snapshot is retained even when `workspace:snapshot` arrived before the tab subscribed.

## [1.1.689] - 2026-02-26
### Fixed
- Project Manager: on runtime hydrate, the UI now reapplies the latest stored `workspace:snapshot` from `workspaceSnapshotStore`, preventing stale default `running` lock when snapshot arrives before `core:state`.
- Project Manager: Virtual Simulation restart/reopen path now keeps input unlocked and task timer state aligned with the latest snapshot after reconnect/reload.

## [1.1.688] - 2026-02-26
### Fixed
- Core: cold-start recovery now normalizes stale `running` runtime sessions to `idle` on workspace selection when turn completion is already known and no bootstrap continuity lock is active.
- Core: persisted task timer totals are restored even when runtime sessions hydrate before the first `workspace select` call.
- Docs (SSOT): synchronized input lock and task timer contracts for the `Virtual Simulation` cold-start recovery rules.

## [1.1.687] - 2026-02-26
### Fixed
- Project Manager: Session EmptyState no longer tells users to start from “buttons above”; it now explains the actual Description flow (`Artifacts` questionnaire → `Submit questionnaire` → provider picker).
- Project Manager: Description questionnaire CTA labels are now English (`Submit questionnaire`, `Close`) to match PM UI terminology.
- Project Manager: stage panel “Fix with agent” callbacks are type-aligned with `WorkflowStepStartService`, restoring green `npm run typecheck:webview`.

## [1.1.685] - 2026-02-26
### Fixed
- Project Manager: false "Creating session…" spinner no longer appears when a stale dialog intent is restored from `localStorage` (e.g. on the Description tab in a fresh workspace). The pending indicator is now driven exclusively by the `pendingSessionCreate` flag (`emptyStatePending`), not by the mere presence of a dialog intent.

## [1.1.684] - 2026-02-26
### Fixed
- Project Manager: all side-effects for gated toolbar buttons (Virtual Simulation, Diagram Modules, Diagram Facades) — `setActiveTool`, `setPendingSessionCreate`, `dispatchStageActivated`, `pm:dialog:open` — are now deferred until the async gating check passes. Clicking these buttons when the upstream artifact is missing produces zero UI changes.

## [1.1.683] - 2026-02-26
### Added
- Project Manager: new **Diagram Modules** workflow step — toolbar click launches an agent session that produces `modules-diagram.mmd`; artifact panel with mermaid validation (`%% Modules Diagram` header + `subgraph`) and "Fix with agent" recovery.
- Project Manager: new **Diagram Facades** workflow step — toolbar click launches an agent session that produces `facades-graph.mmd`; artifact panel with mermaid validation (`%% Facades Graph` header + edge syntax) and "Fix with agent" recovery.
- Project Manager: artifact availability polling hooks for both diagram stages (10 s interval, `maxBytes: "1"` probe).
- Project Manager: Workspace tree branch nodes for Diagram Modules / Facades (session child + artifact child), with gated progression (Diagram Modules requires VS done; Diagram Facades requires Diagram Modules done).
- Project Manager: table-driven toolbar handler (`DIAGRAM_STAGE_MAP`) for diagram clicks; `renderStagePanel()` helper eliminates duplicate workspace-check pattern in `main-area.tsx`.

## [1.1.681] - 2026-02-26
### Added
- Implementation of Diagram Modules & Diagram Facades workflow steps (code only; see `1.1.682` for the doc-synced release).

## [1.1.680] - 2026-02-26
### Added
- Project Manager: every click that says "I want stage X" (toolbar buttons, tree parent labels, tree child nodes) now syncs both artifact and session panels together via `resolveStageSyncPayload()` and the `pm:stage:activated` event.
- Project Manager: auto-select the latest workflow step (Virtual Simulation or Description) when opening a workspace.

### Fixed
- Project Manager: clear stale artifact when the VS session has no artifact file yet.

## [1.1.676] - 2026-02-26
### Changed
- Core: task timer storage is now per-workspace (stored in `<workspaceRoot>/.codeai-hub/state/task-timers.json`); legacy global file is cleaned up on startup.

## [1.1.675] - 2026-02-25
### Fixed
- Project Manager: remove the confusing Back button from the artifact viewer.

## [1.1.674] - 2026-02-25
### Fixed
- Project Manager: show `virtual-simulation.md` in the Workspace tree only after the artifact exists (avoids 404 when clicking).

## [1.1.673] - 2026-02-25
### Fixed
- Project Manager: Virtual Simulation reuses the provider selected for Description (prevents accidental provider switches).
- Session UI: workflow tabs use stage labels for non-description stages (e.g., `Virtual Simulation`) instead of showing `Reviewer`.
- Project Manager: Workspace tree now shows the `virtual-simulation.md` artifact as a child node under Virtual Simulation.

## [1.1.672] - 2026-02-25
### Fixed
- Project Manager: Virtual Simulation now immediately switches the Sessions panel into a pending state and auto-opens the stage dialog once it becomes available.
- Project Manager: Workspace tree shows the Virtual Simulation session (collapsible stage node with a session child).

## [1.1.671] - 2026-02-25
### Fixed
- Project Manager: Virtual Simulation toolbar now opens the stage session (and reveals the hint panel) instead of acting like a dead click.
- Project Manager: bridge config derives missing `httpUrl` from `wsUrl` (prevents workflow API calls from silently failing).

## [1.1.670] - 2026-02-25
### Added
- Workflow: new `Virtual Simulation` step with bundled prompt+template (file-first from `Final_Description.md`).
- Project Manager: start Virtual Simulation from the toolbar, show a hint panel until the artifact exists, and offer “Fix with agent” when validation fails.

### Changed
- Workflow state: record watcher events and compute deterministic gating + `OUTDATED` propagation.

## [1.1.669] - 2026-02-24
### Fixed
- Reviewer sessions: Stop → Play no longer resets task timer total (BUG-2026-02-24-04).

## [1.1.668] - 2026-02-24
### Fixed
- Project Manager (one-shot Description): after ↻ Restart attempt, auto-focus the newly created session (no manual click in the tree) (BUG-2026-02-24-03).

## [1.1.667] - 2026-02-24
### Changed
- Rebuild of `1.1.666` to avoid the `666` version number; no functional differences.

## [1.1.666] - 2026-02-24
### Changed
- One-shot Description: ↻ Restart attempt confirmation now uses an inline Apply/Cancel bar (Session UI + `questionnaire.md` header), instead of a 2-step arm/confirm click.

## [1.1.665] - 2026-02-24
### Fixed
- Standalone Project Manager (CEF): avoid crash when confirming ↻ Restart attempt in one-shot Description (replaced native `window.confirm` with a 2-step arm/confirm UX).

### Changed
- Session UI: ↻ Restart icon is now 1.6× larger.

## [1.1.664] - 2026-02-24
### Added
- One-shot Description: ↻ Restart attempt recovery to re-submit the questionnaire and start a fresh attempt when the original attempt hangs mid-turn.

## [1.1.663] - 2026-02-23
### Fixed
- Session UI: Stop (■) icon is now ~10% smaller for better visual balance.

## [1.1.662] - 2026-02-23
### Fixed
- Standalone Project Manager (CEF): after Stop (■), the next Enter/▶ now starts Core again via the Launcher bridge (instead of getting stuck with Core stopped).

## [1.1.661] - 2026-02-23
### Fixed
- Session UI: ■ now reliably stops Core by calling the shutdown endpoint (`POST /api/v1/shutdown`) and no longer leaves the “Agent is working…” placeholder visible after Stop.

## [1.1.660] - 2026-02-23
### Changed
- Session UI: the input Play/Stop button now stops Core on ■ (instead of a quick restart), then resumes on the next send (▶ / Enter starts Core and submits after reconnect).
- Session UI: refined the Stop icon visuals (larger ■, clearer red background, better vertical alignment).

## [1.1.659] - 2026-02-23
### Added
- Session UI: added a Play/Stop button next to the input (▶ sends like Enter; ■ restarts Core to abort the active turn and immediately unlock input for a new request).

## [1.1.658] - 2026-02-23
### Changed
- Session UI: locked input “please wait” placeholders now pulse opacity from 20% to 40% every 1000ms (provider color).

## [1.1.657] - 2026-02-23
### Changed
- Session UI: locked input “please wait” placeholders now pulse opacity from 5% to 50% every 1000ms (provider color).

## [1.1.656] - 2026-02-23
### Fixed
- Session UI: locked input “please wait” placeholders now actually pulse opacity from 5% to 80% every 500ms (provider color).

## [1.1.655] - 2026-02-23
### Changed
- Session UI: locked input “please wait” placeholders now pulse opacity from 5% to 80% every 500ms (provider color).

## [1.1.654] - 2026-02-23
### Changed
- Session UI: locked input “please wait” placeholders now use the provider wait color (matching the live turn timer) at 80% opacity.

## [1.1.653] - 2026-02-23
### Fixed
- Session timers: one-shot Description sessions (`resumeMode="no_resume"`) now show the live turn timer while running, without accumulating total time.

## [1.1.652] - 2026-02-22
### Changed
- Session timers: moved SSOT to Core and deliver via workspace snapshots so totals stay consistent across multi-workspace/multi-tab Project Manager usage and Project Manager reloads.

## [1.1.651] - 2026-02-22
### Changed
- Session UI: aligned footer `total:` label typography with timer digits (same font-size/family) for consistent visual weight.
- Session UI: aligned turn/total timers to a shared right anchor so upper and lower values are horizontally aligned.

## [1.1.650] - 2026-02-22
### Changed
- Session UI: total timer in footer is now static during lock/working state (always gray), then updates by jump when the turn completes; footer copy now shows `total:  00h 00m 00s`.
- Session UI: live turn timer in the input area is shown without background badge/pill (plain overlay text on the input field).

## [1.1.649] - 2026-02-22
### Fixed
- Session UI: task timers now match the contract semantics — total is always visible in the footer while input is locked; per-turn timer resets each new turn.
- Session UI: removed legacy manual force unlock toggle (no longer needed after continuity lock fixes).

### Changed
- Session UI: timer display format is now text-only `00h 00m 00s` (no flip animation).

## [1.1.648] - 2026-02-22
### Added
- Session UI: persistent task execution timer (HH:MM:SS) with 3D flip digits — shows live time while the agent is working and keeps an accumulated total per workflow-agent across continuity rollovers and Core restarts.

## [1.1.647] - 2026-02-22
### Fixed
- Project Manager / Session UI (BUG-2026-02-22-01): avoid stuck “resuming/blocked” on cold start — unlock input when `workspace:snapshot` reports `turnState=idle` and `continuityLockActive=false`, even if `continuityLockReason` is missing.
- Core / Workspace snapshots: normalize idle resume-in-place sessions to emit an explicit unlock hint `continuityLockReason="no_rollover_needed"` (defense-in-depth; reason is never a hard unlock gate).
- Crash/restart resilience: after Core restarts mid-turn, input unblocks automatically when the snapshot is `idle/unlocked`; sending “Continue” resumes the interrupted turn.

### Changed
- Docs: update release notes (`README.md`, `CHANGELOG.md`) before packaging.
- Note: `1.1.647` is a doc-synced rebuild of `1.1.646` artifacts (no additional code changes).

## [1.1.646] - 2026-02-22
### Fixed
- Project Manager / Session UI (BUG-2026-02-22-01): avoid stuck “resuming/blocked” on cold start — unlock input when `workspace:snapshot` reports `turnState=idle` and `continuityLockActive=false`, even if `continuityLockReason` is missing.
- Core / Workspace snapshots: normalize idle resume-in-place sessions to emit an explicit unlock hint `continuityLockReason="no_rollover_needed"` (defense-in-depth; reason is never a hard unlock gate).
- Crash/restart resilience: after Core restarts mid-turn, input unblocks automatically when the snapshot is `idle/unlocked`; sending “Continue” resumes the interrupted turn.

### Changed
- Release notes: `1.1.646` artifacts were packaged before the docs were updated; use `1.1.647` for the doc-synced release.

## [1.1.643] - 2026-02-21
### Fixed
- Claude / Recovery hints: corrected provider-home auth command in user-facing errors to `HOME=~/.codeai-hub/providers/claude/home claude /login`.

## [1.1.642] - 2026-02-20
### Changed
- Release maintenance rebuild: regenerated unified local artifacts (providers/core/UI/launcher) and VSIX for clean install validation.

## [1.1.641] - 2026-02-19
### Fixed
- Core / Codex Session Continuity: prevent duplicate rollover / double session separators when report generation is slow (no timeout-based retries; ignore rollover triggers from stale continuity segments).

## [1.1.640] - 2026-02-19
### Fixed
- Extension / UI: fix UI bundle installation (extract tarballs without an extra top-level folder) so VS Code Settings and Launcher UI can load from `~/.codeai-hub/packages/ui/*/current/*` without `ERR_FILE_NOT_FOUND`.

## [1.1.639] - 2026-02-19
### Fixed
- UI / Sessions: show “resuming session…” placeholder during continuity rollover locks (avoid misleading “agent working” copy while switching/bootstraping a new workflow session).

## [1.1.638] - 2026-02-18
### Fixed
- UI / Sessions: show “resuming session…” placeholder during session binding (avoid misleading “agent working” copy while switching/hydrating a new workflow session).

## [1.1.637] - 2026-02-18
### Fixed
- Core / Templates: bundle and install `reviewer-template.md`, and pass its absolute path into Reviewer instructions (so the agent uses the template instead of searching for a missing file).

## [1.1.636] - 2026-02-18
### Fixed
- Claude / Session Continuity: compute context remaining % from the real `/context` snapshot (provider JSONL) and avoid incorrect rollovers caused by `modelUsage`/cache token totals.

## [1.1.635] - 2026-02-18
### Fixed
- Project Manager / Dialog sessions: prevent stuck-locked input by replaying the latest `workspace:snapshot` after dialog session hydration / rollover.

## [1.1.634] - 2026-02-18
### Fixed
- Core / Workspace snapshots: preserve session lock fields during partial updates (fixes missed unlock after continuity rollover).

## [1.1.626] - 2026-02-17
### Fixed
- Project Manager / Session UI: token usage now refreshes reliably after turns (including dialog sessions that hydrate snapshots after stream events).

## [1.1.625] - 2026-02-17
### Fixed
- Project Manager: auto-open the `Reviewer` dialog after live `Description → Reviewer` handoff (mirrors workflow tree click via `pm:dialog:open`).

## [1.1.624] - 2026-02-17
### Fixed
- Project Manager: fix live `Description → Reviewer` auto-handoff by resolving the reviewer runtime session deterministically (prevents hiding the reviewer before binding is ready).

## [1.1.623] - 2026-02-17
### Fixed
- Project Manager: live auto-handoff now focuses `Reviewer` session after one-shot `Description` completes (without manual click in workflow tree).
- Guardrail: reviewer auto-focus is scoped to `description/collector` transition to avoid stealing focus from unrelated active sessions.

## [1.1.622] - 2026-02-17
### Fixed
- Project Manager / Session UI: show a spinner in the left session area while a workflow session is being created (so the UI does not look frozen).

### Docs
- SolidWorks-Flow: archive non-contract drafts, clarify SSOT boundaries, and normalize doc statuses/metadata.
- Knowledge base: model selection/aliases are documented as SSOT-in-code (see `src/types/*-model-registry.ts`).

## Previous releases (summary)
Earlier releases in the `1.1.57x–1.1.62x` series focused on SSOT routing (dialog vs runtime), snapshot-first lock/usage authority, and continuity/resume reliability across providers. For the full history, use `git log` / tags.
