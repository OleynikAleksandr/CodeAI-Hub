# Apple Native Translation First Reasoning Retry

**Status:** Planning intake
**Owner:** Oleksandr + Codex
**Created:** 2026-05-06
**Target scope:** Retry transient Apple Native Translation failures on first reasoning overlay
**Planning source for:** `doc/TODO/todo-plan.md`

## 1. Problem

User testing showed the first Codex `Thinking` / reasoning bubble can remain in English even when the Reasoning translation engine is `apple-native` and target language is Russian.

Observed runtime evidence for provider session `019dfc94-6c48-72d0-8403-a77af5d2e51a`:

- Core persisted the thinking message.
- Core dispatched it to the session translation pipeline.
- `AppleNativeTranslationEngine` selected `apple-native` and target `ru`.
- The helper returned fallback with diagnostic `TranslationError(cause: Translation.TranslationError.Cause.notInstalled, sourceLanguage: nil, targetLanguage: nil)`.
- A later reasoning bubble in the same session translated successfully.
- A manual replay of the exact first reasoning text through the packaged helper translated successfully.

This means the message is not lost before translation. The failure is a transient Apple `Translation` first-call readiness/runtime race after language availability reports the pair as installed.

## 2. Fix Contract

`AppleNativeTranslationEngine` should retry only retryable Apple Native helper failures.

Retryable cases:

- helper response `errorCode = "runtime_failure"` with diagnostic containing `TranslationError.Cause.notInstalled`;
- thrown helper timeout/request failure stays non-retryable for this scope unless proven related.

Retry behavior:

- no retry for missing helper, missing language packs, unsupported pairs, invalid input, or empty translation results;
- short bounded retry count, default one retry;
- small delay before retry to let Apple Translation warm readiness state;
- preserve existing fail-closed behavior if retry also returns fallback;
- log retry attempts through the existing translation reporter.

## 3. Verification

Automated checks:

- unit test that a first retryable Apple Native fallback is retried and returns the second translated result;
- unit test that missing language-pack fallback is not retried;
- package build: `npm run build --workspace=@codeai-hub/translation`;
- targeted test command for translation package tests.

Manual evidence:

- repeat the packaged helper replay for the observed text when needed;
- after release, user retests first reasoning bubble in a fresh Codex session.

### 3.1 Verification Evidence

2026-05-06 local verification:

- `npm run build --workspace=@codeai-hub/translation` passed.
- `node --test packages/translation/dist/apple-native-translation-engine.test.js` passed with 2 tests:
  - retries transient `runtime_failure` / `TranslationError.Cause.notInstalled` and returns the second translated result;
  - does not retry `apple_native_language_pack_missing`.
- `node --test packages/translation/dist/translation-facade.test.js` passed with 10 tests.
- `npm exec -- ultracite check packages/translation/src/apple-native-translation-engine.ts packages/translation/src/apple-native-translation-engine.test.ts` passed.
- Commit hooks for `fix: retry transient apple native translation failures` passed architecture, lint, knip, and staged formatting gates.

### 3.2 Release Evidence

2026-05-06 release candidate `1.2.156`:

- `./scripts/build-all.sh` completed for providers, Core, UI bundles, and CEF launcher.
- Runtime tarballs copied to `doc/tmp/releases/`: `claude-module-1.2.156.tar.bz2`, `codex-module-1.2.156.tar.bz2`, `gemini-module-1.2.156.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.156.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.156.tar.bz2`, `vscode-webview-1.2.156.tar.bz2`, `project-manager-1.2.156.tar.bz2`.
- `./scripts/build-release.sh --use-current-version` completed with `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and `Step 9.5: Verifying VSIX runtime package surface`.
- VSIX produced at repository root: `codeai-hub-1.2.156.vsix` (`3.1M`).

## 4. Documentation Disposition

This is a hotfix planning document. After implementation and acceptance, archive it under `doc/SolidWorks-WorkFlow/Plans/Archive/` and keep stable behavior in `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`.
