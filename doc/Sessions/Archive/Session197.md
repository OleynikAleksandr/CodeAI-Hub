# Session 197 — Architecture Gate 500 + as-any Elimination + Test Debt Plan

**Date:** 2026-03-30
**Branch:** main
**Version:** 1.1.844 → 1.1.845

---

# 1. Work Done in This Session

## Work summary

### Phase 1: Architecture gate raised to 500 lines
- `MAX_LINES` 300→500, `WARNING_LINES` 250→400 in `check-architecture.sh`
- Debt allowlist shrunk from 19 → 5 → 0 entries (fully cleared)
- `AGENTS.md` updated (two references to 300→500)

### Phase 2: Refactored 5 oversized files
- `unified-session/storage.ts`: 506→392 (extracted `unified-session-backfill.ts`)
- `workspace-runtime-facade.test.ts`: 529→400 (extracted `workspace-runtime-facade-task-timer.test.ts`)
- `core-supervisor/index.ts`: 585→342 (extracted `cli-parser.ts`, `core-runtime-resolver.ts`)
- `session-request-handler.ts`: 595→477 (extracted `session-request-handler-types.ts`, removed dead delegates)
- `session-request-handler.test.ts`: 633→270 (extracted `session-request-handler.test-helpers.ts`)

### Phase 3: Eliminated all `as any` from codebase
- Zero `as any` across 552 .ts/.tsx source files
- Created typed `HandlerTestInternals` interface + `internals()` helper for test harness monkey-patching
- Replaced `hasOwnProperty.call()` with `in` operator
- Replaced `...args: any[]` with `Parameters<typeof>`
- Replaced `as any as CliArgs` with `as unknown as CliArgs`
- Enforced `noExplicitAny: "error"` in test files via `biome.jsonc` override (ultracite preset was `"off"` for `*.test.ts`)

### Phase 4: Release build v1.1.845
- README, CHANGELOG synced
- `build-all.sh` + `build-release.sh` → `codeai-hub-1.1.845.vsix` verified

### Test debt diagnosed
- Full test suite run: 151 tests, 139 pass, 12 fail (all pre-existing)
- Root causes categorized, new `todo-plan.md` created for next session

## Git commits
- `2f35d3ab` `refactor: raise architecture line limit to 500`
- `ba08d805` `refactor: split oversized files to comply with 500-line limit`
- `2b9afb5d` `docs(release): prepare architecture refactor release v1.1.845`
- `dbe2eb03` `chore: prepare v1.1.845 artifacts`
- `f7514db1` `docs: add Session 197 report`
- `a65e1e7f` `refactor: remove unused protected delegates from session-request-handler`
- `eff82025` `refactor: replace as-any test monkey-patching with typed internals helper`
- `788fd8a5` `refactor: remove biome-ignore for noExplicitAny and noPrototypeBuiltins`
- `071218c4` `refactor: eliminate all as-any from source code`
- `37358eac` `chore: enforce noExplicitAny in test files via biome override`

## Gates (final state)
- Architecture: 0 blocking, 0 allowlisted, 7 warning zone
- Lint (ultracite): 552 files, 0 errors
- Knip: 0 issues
- Duplication: 2.01% (under 3%)
- noExplicitAny: enforced everywhere including *.test.ts

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md` — master process and architecture rules
2. `doc/TODO/todo-plan.md` — active plan with 4 phases of test fixes
3. `doc/Sessions/Session197.md` (THIS REPORT) — especially the diagnostic details below
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

## Diagnostic: 12 failing tests (all pre-existing)

### GROUP A: Stale dist artifacts (6 tests, 3 files to delete)

Source files were deleted in Session 196 (knip cleanup, commit `12029c86`), but compiled `.js` stayed in `dist/`. `node --test` picks them up and they fail because their imports resolve to removed code.

**Files to delete:**
- `packages/core/dist/workflow/diagram-dsl/facade-map-parser.test.js` (+ `.d.ts`, `.js.map`) — 3 tests, `parseFacadeMapDsl is not a function`
- `packages/Codex_Module/dist/logging/session-logger.test.js` (+ `.d.ts`, `.js.map`) — 2 tests, `CodexSessionLogger.logProviderFeedback is not a function`
- `packages/Claude_Module/dist/messaging/message-processor.turn-marker.test.js` (+ `.d.ts`, `.js.map`) — 1 test, `stream_event` type ignored by current processor

**Action:** Delete these files from dist/. Rebuild each package (`npm run build --workspace <pkg>`) and confirm they don't reappear.

### GROUP B: Production bug — computeDiagramRevision (2 tests)

**File:** `packages/core/src/workflow/diagram-dsl/markdown-dsl-shared.ts`
**Tests:** `markdown-dsl-serializer.test.ts` lines 96, 106

**Root cause:** `computeDiagramRevision` uses `Function('return typeof require === "function" ? require : null;')()` to dynamically obtain `require` for `node:crypto`. Under `node --test` runner, `Function()` returns `null`, so the hash fallback always returns `"00000000"` instead of the real SHA-256.

**Fix:** Replace `Function()` hack with static `import { createHash } from "node:crypto"`. The function is only used server-side (core package), so static import is safe.

**Read before fixing:** `packages/core/src/workflow/diagram-dsl/markdown-dsl-shared.ts` (search for `computeDiagramRevision`)

### GROUP C: Test assertions out of sync (3 tests)

**C1: idea-contract-service.diagram-stages.test.ts** (1 test)
- **File:** `packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts` line ~30
- **Root cause:** Test expects `"This staged file should materialize exactly one Product Part"` but template now says `"File materializes exactly one Product Part"`
- **Read:** the test file + `packages/agents/diagram-modules-agent/assets/` templates (search for "Product Part")
- **Fix:** Update expected string in test to match current template

**C2: workflow-state-service.test.ts** (1 test)
- **File:** `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts` line ~134
- **Root cause:** Test expects status `"invalid"` for virtual-simulation with 1 scenario, but validator (`packages/core/src/workflow/validation/virtual-simulation-validator.ts` line ~43) requires `scenarioCount < 1` for invalid. 1 scenario passes validation → status stays `"completed"`
- **Read:** the test file + `virtual-simulation-validator.ts`
- **Fix:** Change test fixture to have 0 scenarios (empty file) so validation correctly returns `"invalid"`, OR update expected status to `"completed"` if 1-scenario is intentionally valid

**C3: remote-bridge/index.test.ts** (1 test)
- **File:** `packages/core/src/remote-bridge/index.test.ts` line ~34
- **Root cause:** Test reads source of `remote-bridge-message-router.ts` and checks for session:create handling strings, but that logic was extracted to `remote-bridge-session-create-router.ts`
- **Read:** the test file + `packages/core/src/remote-bridge/remote-bridge-session-create-router.ts` + `remote-bridge-message-router.ts`
- **Fix:** Update SOURCE_PATH to point at `remote-bridge-session-create-router.ts` and adapt the checked string patterns

### GROUP D: Template content checks out of sync (1 test)

**File:** `packages/core/src/templates/template-sync-service.test.ts` line ~123
- **Root cause:** `POLYGON_TEMPLATE_CONTENT_CHECKS` expects snippets `"Разделы \`Module Inventory\`:"` and `"Правила для \`Relation\`:"` in `diagram-modules-field-reference.md`, but the template was updated with new terminology
- **Read:** the test file + the bundled template source: `packages/agents/diagram-modules-agent/assets/diagram-modules-field-reference.md`
- **Fix:** Update expected snippets in `POLYGON_TEMPLATE_CONTENT_CHECKS` to match current template content

### GROUP E: Fragile path resolution (1 test)

**File:** `packages/core/src/remote-bridge/handlers/session-request-handler.test-helpers.ts` line ~18
- **Test:** `session-request-handler.create-resume.test.ts` — "keeps primary description dialog contracts"
- **Root cause:** `SOURCE_PATH = path.resolve(process.cwd(), "packages/core/src/...")` breaks when `node --test` runs from a different cwd than project root
- **Fix:** Replace with `path.resolve(__dirname, "../../src/remote-bridge/handlers/session-request-handler.ts")` (relative to dist location at runtime)

## Plans for next session
- Execute all 4 phases of `doc/TODO/todo-plan.md` (test debt elimination)
- Target: 151/151 tests passing, 0 failures
- After all green: release build v1.1.846
