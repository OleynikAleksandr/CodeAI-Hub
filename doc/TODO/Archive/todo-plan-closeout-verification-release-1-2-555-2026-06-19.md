# Plan Closeout: verification-release-1-2-555-2026-06-19

**Created:** 2026-06-19
**Acceptance:** User accepted release 1.2.555 verification build: works the same as 1.2.554 on the working local models (live assistant streaming, reasoning thinking block, Description artifact written to disk). User also confirmed GLM 4.6 Flash works and the orchestrator understands it — three working local models total.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** phase1.stream4.task1
**Expected Commit:** docs: close 1.2.555 verification release scope
**Last Recorded Commit:** 325430f64
**Planning Source Disposition:** none (verification-only release; no planning document). Context: the structured output exploration scope was fully reverted (`git reset --hard 98e06ed20`) before this release; the root cause of the original artifact-format bug was an abliterated model, not the architecture.

## Active Plan Copy

`````markdown
# Development TODO Plan

(codeai-plan-state ACTIVE at closeout; planId verification-release-1-2-555-2026-06-19; lastRecordedCommit 325430f64)

## Phase 1 — Verification Release 1.2.555 (owner: session, updated: 2026-06-19)

### Stream: Release Notes
1. [DONE] phase1.stream1.task1 Bump README "Current Release" + CHANGELOG entry for 1.2.555 (no functional changes; reverted structured output exploration). (commit: docs: prepare 1.2.555 verification release notes; hash 393562fdb)
2. [DONE] phase1.stream1.commit1 Git Commit (hash: 393562fdb)

### Stream: Release Build
3. [DONE] phase1.stream2.task1 Run build-all.sh (bumped versions to 1.2.555, built VSIX + tarballs), recorded artifacts in doc/tmp/releases/. (commit: chore: build 1.2.555 verification release; hash 325430f64)
4. [DONE] phase1.stream2.commit1 Git Commit (hash: 325430f64)

### Stream: User Acceptance Testing
5. [DONE] phase1.stream3.task1 User retest. Result: accepted; works the same as 1.2.554 on the working local models; GLM 4.6 Flash also confirmed working (third model).

### Stream: Scope Closeout
6. [DONE] phase1.stream4.task1 Close the verification release scope after user acceptance and archive the plan.
7. [DONE] phase1.stream4.commit1 Git Commit: docs: close 1.2.555 verification release scope
8. Reserved post-closeout handoff anchor.
`````

## Release Artifacts (1.2.555)

- VSIX: `codeai-hub-1.2.555.vsix` (5.4M)
- Tarballs: core, launcher, claude/codex/gemini/glm/glm-opencode/kimi modules, vscode-webview, project-manager (in `doc/tmp/releases/` and `~/.codeai-hub/releases/`)
