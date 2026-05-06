# Apple Native Text-to-Speech Architecture

**Status:** Planning intake  
**Owner:** Oleksandr + Codex  
**Created:** 2026-05-05  
**Target scope:** Native Text-to-Speech for visible dialog message bubbles  
**Planning source for:** `doc/TODO/todo-plan.md`

## 1. Goal

Add a native on-device Text-to-Speech module that can read the text of one selected dialog bubble aloud.

The first user-facing workflow:

1. The user sees a compact provider-styled speech button in each assistant or thinking bubble header.
2. The button sits immediately to the right of the provider label, for example `Codex [volume icon]` or `Codex - Thinking [volume icon]`.
3. The button is always visible, but semi-transparent in idle state so the clickable target is discoverable without dominating the bubble.
4. Clicking the button reads only the visible text from that exact bubble.
5. The user can stop the currently speaking bubble.
6. Speech rate is adjustable from Settings.

This scope is Text-to-Speech only. Speech-to-Text and live microphone transcription are future modules.

## 2. Apple Framework Choice

Use `AVSpeechSynthesizer`, `AVSpeechUtterance`, and `AVSpeechSynthesisVoice` from AVFAudio.

Local SDK check on 2026-05-05:

```text
Speech framework import OK
SFSpeechRecognizer supported locales: 63
TTS voices: 182
SpeechTranscriber available: true
SpeechTranscriber installed locales: 9
SpeechTranscriber supported locales: 30
DictationTranscriber installed locales: 2
DictationTranscriber supported locales: 43
```

Relevant Text-to-Speech voice check:

```text
ru-RU: Milena, Yuri, Yuri Enhanced
uk-UA: Lesya
en-US/en-GB/etc: multiple voices
```

Apple documentation references:

- `AVSpeechSynthesizer`: https://developer.apple.com/documentation/avfaudio/avspeechsynthesizer
- `AVSpeechUtterance`: https://developer.apple.com/documentation/avfaudio/avspeechutterance
- `AVSpeechSynthesisVoice`: https://developer.apple.com/documentation/avfaudio/avspeechsynthesisvoice

## 3. User Experience Contract

### 3.1 Bubble placement

There are two relevant bubble types for MVP:

- normal assistant bubble;
- thinking bubble, including assistant messages tagged as thinking.

The speech button belongs to the bubble header, not to the content area.

Normal assistant bubble:

```text
Codex [speak]                                      8:12:49 PM
message text...
```

Thinking bubble:

```text
[collapse] Codex - Thinking [speak]
reasoning text...
```

The button must not move the timestamp or create wrapping in the header. The header should keep a left group (`role label + speech button`) and a right timestamp when one exists.

### 3.2 Visibility and interaction

- The speech button is always rendered.
- Idle opacity should be around `0.45`.
- Bubble hover, button hover, keyboard focus, and active speaking state raise opacity to `1`.
- The button uses an icon-only control, not visible `Speak` text.
- The accessible label and tooltip should use `Speak`.
- Active speaking state should visually switch to stop behavior or a clear active state.
- Hover alone must not start speech.

### 3.3 Provider styling

The button must follow `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html` provider tokens:

- Claude: `--claude-accent`, `--claude-fill`, `--claude-fill-hover`, `--claude-border`;
- Codex: `--codex-accent`, `--codex-fill`, `--codex-fill-hover`, `--codex-border`;
- Gemini: `--gemini-accent`, `--gemini-fill`, `--gemini-fill-hover`, `--gemini-border`.

If the bubble has no provider theme, the button falls back to neutral session dialog styling.

### 3.4 Text source

Do not scrape rendered DOM.

The readable text must come from the `SessionMessage` model already used by `DialogPanel`:

- prefer `localizedContent` when present;
- otherwise use `content`;
- never include provider label, timestamp, buttons, or UI chrome;
- do not read segment boundary messages in MVP.

Markdown may be passed as plain text in MVP. A later polish pass can strip markdown syntax if user testing shows it sounds awkward.

## 4. Settings Contract

Add `general.textToSpeech.rate`.

Recommended MVP range:

- minimum: `0.75`;
- default: `1.0`;
- maximum: `2.0`;
- UI step: `0.05` or fixed presets if the slider feels too noisy.

Swift helper receives the normalized user rate and maps it to the valid `AVSpeechUtterance.rate` range.

Voice selection is deferred. The helper should choose an Apple voice from the current bubble language when possible, otherwise system default.

## 5. Native Helper Contract

Create `native/apple-speech-helper`.

The helper should use a JSON stdin/stdout protocol similar to the Apple Translation helper.

MVP commands:

```json
{ "command": "preflight" }
{ "command": "voices" }
{ "command": "speak", "id": "message-id", "text": "Text to read", "language": "ru-RU", "rate": 1.0 }
{ "command": "stop" }
```

Expected events:

```json
{ "event": "ready", "ok": true }
{ "event": "started", "id": "message-id" }
{ "event": "finished", "id": "message-id" }
{ "event": "stopped", "id": "message-id" }
{ "event": "error", "id": "message-id", "message": "..." }
```

Implementation note: stop behavior needs Core to keep control of the active helper process. A one-process-per-speak implementation can stop by killing the child process, but pause/resume requires a long-lived helper. MVP requires speak and stop; pause/resume is deferred.

## 6. Core Runtime Contract

Core owns speech execution. UI sends intent; Core launches/stops the native helper.

Proposed remote bridge messages:

- `session:speech:speak-message`
- `session:speech:stop`
- `session:speech:state`

The speak request should include:

- `sessionId`;
- `messageId`;
- `role`;
- `providerId` or provider theme;
- `text`;
- `rate`.

The state broadcast should include:

- current `messageId`;
- `status`: `idle`, `starting`, `speaking`, `stopping`, `error`;
- optional user-facing error message.

Only one active spoken bubble is allowed at a time in MVP. Starting a new bubble stops the previous one.

## 7. Packaging Contract

The helper must be packaged into the Core runtime, not loaded from the repo workspace.

Expected packaged path:

```text
app/native/apple-speech-helper/.build/release/apple-speech-helper
```

Release validation must fail if the helper is missing from the packaged Core tarball / install root.

## 8. Verification Plan

Targeted checks:

- Swift helper builds.
- Helper `preflight` returns available voices.
- Helper can speak a short English text.
- Helper can speak Russian text with a Russian voice available on this machine.
- Core service resolves helper from packaged runtime path, not only `process.cwd()`.
- UI renders an always-visible semi-transparent speech button for normal assistant bubbles.
- UI renders an always-visible semi-transparent speech button for thinking bubbles.
- Button uses provider color tokens for Claude/Codex/Gemini themes.
- Rate setting persists and changes helper `rate` input.
- Stop action stops the active spoken bubble.

Manual acceptance workflow:

1. Open a dialog with normal and thinking Codex bubbles.
2. Confirm speech buttons are visible beside `Codex` / `Codex - Thinking`.
3. Confirm the buttons are provider-styled and semi-transparent when idle.
4. Click a normal bubble speech button and confirm only that bubble is read.
5. Click a thinking bubble speech button and confirm only that thinking text is read.
6. Change Text-to-Speech rate in Settings and confirm audible speed changes.
7. Stop active speech and confirm it stops immediately.

### 8.1 Release Build Evidence

2026-05-05 release candidate `1.2.153`:

- `./scripts/build-all.sh` completed for providers, Core, UI bundles, and CEF launcher.
- Packaged Core runtime verified executable helper at `~/.codeai-hub/core/darwin-arm64/1.2.153/app/native/apple-speech-helper/.build/release/apple-speech-helper`.
- Runtime tarballs copied to `doc/tmp/releases/`: `claude-module-1.2.153.tar.bz2`, `codex-module-1.2.153.tar.bz2`, `gemini-module-1.2.153.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.153.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.153.tar.bz2`, `vscode-webview-1.2.153.tar.bz2`, `project-manager-1.2.153.tar.bz2`.
- `./scripts/build-release.sh --use-current-version` completed with `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and `Step 9.5: Verifying VSIX runtime package surface`.
- VSIX produced at repository root: `codeai-hub-1.2.153.vsix` (`3.1M`).

2026-05-06 hotfix release candidate `1.2.154`:

- Hotfix reason: user testing of `1.2.153` showed bubble Speak clicks reached Core but were rejected by incoming WebSocket validation as `unknown-command:session:speech:speak-message`.
- Regression fix: Core now accepts `session:speech:speak-message` and `session:speech:stop` payloads before routing them to the speech request handler.
- Targeted verification completed before release prep: incoming validator regression, speech request handler, message router, speech service, Ultracite check, and `npm run build --workspace=@codeai-hub/core`.
- `./scripts/build-all.sh` completed for providers, Core, UI bundles, and CEF launcher at `1.2.154`.
- Packaged Core runtime verified executable helper at `~/.codeai-hub/core/darwin-arm64/1.2.154/app/native/apple-speech-helper/.build/release/apple-speech-helper`.
- Runtime tarballs copied to `doc/tmp/releases/`: `claude-module-1.2.154.tar.bz2`, `codex-module-1.2.154.tar.bz2`, `gemini-module-1.2.154.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.154.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.154.tar.bz2`, `vscode-webview-1.2.154.tar.bz2`, `project-manager-1.2.154.tar.bz2`.
- `./scripts/build-release.sh --use-current-version` completed with `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and `Step 9.5: Verifying VSIX runtime package surface`.
- VSIX produced at repository root: `codeai-hub-1.2.154.vsix` (`3.1M`).

2026-05-06 hotfix release candidate `1.2.155`:

- Hotfix reason: user testing of `1.2.154` confirmed Speak playback works, but Russian bubble text was read with the system/default English voice because no speech language was passed.
- Regression fix: the Apple Speech helper now infers voice language from the text when UI/Core does not provide an explicit language. Russian Cyrillic text resolves to `ru-RU`; Ukrainian-specific Cyrillic characters resolve to `uk-UA`; otherwise Apple NaturalLanguage plus installed voice fallbacks are used.
- Targeted verification completed before release prep: `./scripts/build-apple-speech-helper.sh`, `cd native/apple-speech-helper && swift test`, and packaged Core helper dry-run returning `resolvedLanguage:"ru-RU"` with `voiceIdentifier:"com.apple.voice.enhanced.ru-RU.Yuri"`.
- `./scripts/build-all.sh` completed for providers, Core, UI bundles, and CEF launcher at `1.2.155`.
- Packaged Core runtime verified executable helper at `~/.codeai-hub/core/darwin-arm64/1.2.155/app/native/apple-speech-helper/.build/release/apple-speech-helper`.
- Runtime tarballs copied to `doc/tmp/releases/`: `claude-module-1.2.155.tar.bz2`, `codex-module-1.2.155.tar.bz2`, `gemini-module-1.2.155.tar.bz2`, `codeai-hub-core-darwin-arm64-1.2.155.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.2.155.tar.bz2`, `vscode-webview-1.2.155.tar.bz2`, `project-manager-1.2.155.tar.bz2`.
- `./scripts/build-release.sh --use-current-version` completed with `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `Package created`, and `Step 9.5: Verifying VSIX runtime package surface`.
- VSIX produced at repository root: `codeai-hub-1.2.155.vsix` (`3.1M`).

### 8.2 User Acceptance Evidence

2026-05-06 accepted release `1.2.155`:

- User installed and tested the new VSIX.
- Bubble `Speak` playback works from the dialog message plate.
- Russian bubble text is spoken with Russian voice selection after automatic language inference.
- User reported speech quality as acceptable and the workflow as working ideally for this scope.

## 9. Deferred Work

- Speech-to-Text.
- Voice selection in Settings.
- Per-message language detection.
- Pause/resume.
- Read selected text inside a bubble.
- Queue multiple bubbles.
- Strip or transform Markdown syntax for more natural speech.

## 10. Documentation Disposition

This file is a planning document and not a permanent SSOT.

After implementation and user acceptance:

- stable Core/runtime contracts move into `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`;
- stable UI contracts move into `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md` and `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`;
- global module map changes move into `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`;
- this planning document moves to `doc/SolidWorks-WorkFlow/Plans/Archive/`.
