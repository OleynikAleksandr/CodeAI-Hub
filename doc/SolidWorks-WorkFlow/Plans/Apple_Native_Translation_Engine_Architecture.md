# Apple Native Translation Engine Architecture

**Status:** Planning / design intake  
**Updated:** 2026-05-05  
**Owner:** Oleksandr + Codex  
**Scope:** add Apple on-device text translation as an optional runtime translation engine for CodeAI Hub.

---

## 1. Problem

Current runtime translation engines are useful but expensive or operationally awkward:

- LLM-backed engines consume provider tokens and add turn/runtime overhead.
- `google-gtx` is zero-config but network-backed and not a privacy-preserving local path.
- UI localization and visible reasoning translation already have separate engine settings, but both still depend on non-native transport engines.

macOS 26 exposes Apple Translation APIs that can translate text on-device when the required language packs are installed. Local testing on 2026-05-05 confirmed:

- machine: macOS `26.3.1`;
- Xcode: `26.4.1`;
- SDK: macOS `26.4`;
- Swift: `6.3.1`;
- Apple Translation language availability after pack install:
  - `en -> ru`: `installed`;
  - `ru -> en`: `installed`;
  - `en -> uk`: `installed`;
  - `uk -> en`: `installed`;
  - `en -> es`: `supported` when Spanish pack is not installed.

The external prototype at `/Users/oleksandroliinyk/VSCODE/native-audio-translator` already contains a text-only `AppleTranslationEngine` under `Sources/NativeAudioTranslatorCore/Translation/AppleTranslationEngine.swift`. It uses Apple `Translation`, `LanguageAvailability`, and `TranslationSession(installedSource:target:)`. The repository builds successfully after installing Xcode 26.4.1.

---

## 2. Goal

Introduce a new optional translation engine:

```text
engineId: apple-native
label: Apple Native - On-Device
```

It should be selectable in:

- `UI Translation Engine`;
- `Reasoning Translation Engine`.

The engine must work without provider tokens when all platform and language-pack prerequisites are satisfied.

---

## 3. Non-goals

- Do not replace all translation engines.
- Do not remove `google-gtx`, Codex, or Claude translation engines.
- Do not make Apple Native available on Windows, Linux, or macOS versions below the supported API level.
- Do not silently fall back to network-backed Apple translation for an on-device engine.
- Do not rely on SwiftUI `.translationTask(...)`; CodeAI Hub needs a helper callable from Core/runtime code.
- Do not introduce Apple Speech/audio translation into CodeAI Hub in this scope.

---

## 4. Apple API Findings

Relevant Apple framework: `Translation`.

Observed SDK symbols in macOS 26.4:

- `LanguageAvailability.status(from:to:) -> installed | supported | unsupported`;
- `LanguageAvailability.supportedLanguages`;
- `TranslationSession.translate(_:)`;
- `TranslationSession.translations(from:)`;
- `TranslationSession.prepareTranslation()`;
- `TranslationSession(installedSource:target:)`, available on macOS 26+.

Runtime behavior:

- `supported` means Apple supports the language pair but the on-device pack may not be installed.
- `installed` means the local pack is available and `TranslationSession` can translate.
- `TranslationSession(installedSource:target:)` with a `supported` but not installed pair throws `TranslationError.notInstalled`.
- `canRequestDownloads` can be `false` for the programmatic installed-source session; CodeAI Hub must guide users to System Settings instead of expecting the helper to download packs.

User prerequisite path:

```text
System Settings -> General -> Language & Region -> Translation Languages
```

Required user action for missing packs:

- download source and target languages;
- enable `On-Device Mode`.

---

## 5. Architecture

### 5.1 Helper Boundary

Add a small Swift helper owned by CodeAI Hub:

```text
native/apple-translation-helper/
```

The helper is the only Apple-framework boundary. Node/Core code should not embed Swift snippets or call Apple frameworks directly.

Suggested commands:

```text
preflight
availability
translate
translateBatch
```

Transport:

- JSON stdin/stdout for deterministic Core integration;
- stderr only for diagnostics;
- bounded timeout per request;
- explicit process exit codes for malformed request, platform failure, and runtime failure.

### 5.2 Translation Engine Boundary

Register `apple-native` as a `TranslationEngine` implementation in the existing translation facade path.

Contract rules:

- `apple-native` is explicit and fail-closed.
- If selected but unavailable, return `TranslationResult.status = "fallback"` with a specific `errorCode`.
- Do not silently substitute `google-gtx` when the user explicitly selected Apple Native.
- Keep existing `TranslationFacade` consumer contracts unchanged.

### 5.3 Settings Boundary

The Settings UI should expose `Apple Native - On-Device` in both engine selectors only when the platform can run the helper. Selection still requires per-language readiness checks.

Settings save must block unavailable Apple Native selections with actionable guidance. Runtime translation failures should remain non-blocking for visible UI/reasoning, but diagnostics must preserve the readiness reason so the user can fix the setup.

---

## 6. Readiness Contract

Readiness result should be structured, not a free-form string.

Proposed fields:

```ts
interface AppleNativeTranslationReadiness {
  readonly engineId: "apple-native";
  readonly ok: boolean;
  readonly platform: "macos" | "unsupported";
  readonly macOSVersion?: string;
  readonly xcodeStatus: "ready" | "missing" | "unsupported" | "unknown";
  readonly helperStatus: "ready" | "missing" | "failed" | "unknown";
  readonly languageStatus:
    | "installed"
    | "supported_not_installed"
    | "unsupported"
    | "unknown";
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly userMessageCode:
    | "apple_native_ready"
    | "apple_native_requires_macos"
    | "apple_native_requires_macos_26"
    | "apple_native_requires_xcode"
    | "apple_native_helper_failed"
    | "apple_native_language_pair_unsupported"
    | "apple_native_language_pack_missing";
  readonly diagnostic?: string;
}
```

User-facing guidance:

- Non-macOS: Apple Native Translation is available only on macOS. Choose another engine.
- macOS below 26: update macOS to 26 or newer.
- Xcode/helper missing: install Xcode 26+ and complete first launch setup.
- Helper failed: show short technical reason and provide `Recheck`.
- Unsupported pair: Apple Translation does not support this language pair.
- Supported but not installed: download languages in System Settings -> General -> Language & Region -> Translation Languages and enable On-Device Mode.
- Installed: engine is ready.

---

## 7. Language Catalog Policy

Apple Native catalog should be derived from helper/API availability when possible, but the UI can start with the known Apple `supportedLanguages` set as a guarded catalog.

Important distinction:

- selector catalog answers "can this engine potentially support this language?";
- readiness answers "is this exact source/target pair installed and usable now?".

The current CodeAI Hub source language for localization bundles is `en`, but reasoning translation can involve visible provider text that is usually English. The MVP can prioritize:

- `en -> ru`;
- `ru -> en`;
- `en -> uk`;
- `uk -> en`;
- generic `en -> selected target` readiness checks for UI localization.

---

## 8. Packaging And Distribution

The helper must be packaged with the app/extension release only for macOS builds where it is meaningful.

Open decisions for implementation:

- whether helper source lives under `native/` or `packages/apple-native-translation-helper/`;
- whether release scripts build the helper unconditionally on macOS or lazily during setup;
- whether the helper binary is bundled inside VSIX or generated into `~/.codeai-hub` during first run.

Planning default:

- keep source in repo;
- build during release on macOS;
- Core resolves helper path from the packaged runtime first, then a development path during local runs.

---

## 9. Verification Plan

Targeted checks:

- Swift helper build.
- Helper `preflight` on macOS 26+.
- Helper `availability` returns `installed`, `supported_not_installed`, and `unsupported` fixtures.
- Helper `translate` succeeds for `en -> ru`, `ru -> en`, `en -> uk`.
- `packages/translation` tests cover explicit `apple-native` success and fail-closed fallback.
- `packages/localization` tests cover engine catalog and Settings materialization blocking.
- Core/session translation tests cover readiness failure metadata.
- Settings UI tests cover selector availability, missing-pack message, and `Recheck`.

Implementation verification on 2026-05-05:

- Swift helper: `./scripts/build-apple-translation-helper.sh` passed.
- Swift live tests: `APPLE_TRANSLATION_HELPER_RUN_LIVE_TESTS=1 swift test --package-path native/apple-translation-helper` passed 6 tests.
- TypeScript builds: `@codeai-hub/translation`, `@codeai-hub/localization`, and `@codeai-hub/core` passed.
- Webview settings surface: `npm run typecheck:webview` passed.
- Node tests: translation facade/Core translation factory/session translation facade passed 22 tests; localization materializer/bootstrap store passed 9 tests.
- Apple Native smoke: `en -> ru` returned `translated`; `en -> hi` returned fallback `apple_native_language_pack_missing`.

Release verification on 2026-05-05:

- Release metadata was prepared for `1.2.151` after the local `1.2.150` VSIX candidate was superseded to avoid VS Code extension caching.
- `./scripts/build-all.sh` passed and produced `1.2.151` provider, Core, UI, and CEF launcher tarballs in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
- macOS Core runtime packaging compiled the Swift Apple Translation helper and staged it at `app/native/apple-translation-helper/.build/release/apple-translation-helper`.
- The generated `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.2.151.tar.bz2` contains the executable Apple Translation helper at the runtime path used by Core.
- `./scripts/build-release.sh --use-current-version` passed for `1.2.151`, including architecture check, root type-check, compile, SDK exclusions, local artefact validation, markdown link check, duplication advisory check, VSIX packaging, and VSIX runtime package surface verification.
- Final user-test artifact: `codeai-hub-1.2.151.vsix` in the repository root, size `3.0M`.

Manual user workflow:

1. Select `Apple Native - On-Device` as `UI Translation Engine`.
2. Select `Apple Native - On-Device` as `Reasoning Translation Engine`.
3. Confirm missing-pack guidance when a language is only `supported`.
4. Install language packs.
5. Confirm `Recheck` transitions to ready.
6. Confirm UI/reasoning translation uses Apple Native without provider token usage.

---

## 10. Documentation Disposition

This file is a planning document and not a permanent SSOT.

After implementation and user acceptance:

- stable contracts move into:
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`;
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`;
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`;
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md` if Settings UX changes are material;
- this planning document moves to `doc/SolidWorks-WorkFlow/Plans/Archive/`;
- `doc/SolidWorks-WorkFlow/Docs_Index.md` is updated during closeout.
