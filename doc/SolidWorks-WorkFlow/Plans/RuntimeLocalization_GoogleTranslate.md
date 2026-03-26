# Runtime Localization via Google Translate

**Status:** Draft
**Created:** 2026-03-26
**Owner:** Oleksandr

---

## 1. Problem Statement

Traditional i18n (locale files per language) is unsustainable for a small team:
- Hundreds of UI strings to translate manually for each supported language
- Every new feature = new strings to translate in all locale files
- Maintaining translation quality and consistency across updates is a full-time job

Meanwhile, the application already has a working Google Translate integration
(`ThoughtTranslatorService` in Gemini Module) that proves the approach is viable.

**Goal:** Enable any user, regardless of their native language, to use CodeAI Hub
entirely in their own language — with a single setting in preferences.

---

## 2. Solution: Runtime Translation Module in Core

### 2.1. Global language setting

A new setting in user preferences:

```jsonc
// ~/.codeai-hub/settings.json
{
  "language": "ru"   // ISO 639-1 code: "en", "ru", "de", "uk", "ja", "zh", etc.
                     // Default: "en" (no translation, everything stays as-is)
}
```

When `language === "en"`, the translation module is effectively a no-op.

### 2.2. Two translation layers

#### Layer 1 — Static UI (buttons, labels, tooltips, help texts)

- Finite, known set of strings (buttons, menu items, panel headers, placeholders, help)
- Translated **once** at startup (or when language setting changes)
- Cached locally in `~/.codeai-hub/i18n-cache/<lang>.json`
- Subsequent launches read from cache — **zero network requests**
- Cache invalidated on app version bump (new strings may appear)

```
Startup → load cache → if miss → batch translate → save cache → render UI
```

#### Layer 2 — Dynamic dialog content (agent messages, user messages)

- Agent responses (English) → translate to user language before rendering
- User messages (any language) → translate to English before sending to agent
- JSONL stores **original English** content (source of truth)
- Translation is display-only — never persisted as canonical data
- Existing `tag` field mechanism can mark translated content

```
User types in Russian
  → TranslationService.translate(text, "auto", "en")
  → English text sent to agent
  → Agent responds in English
  → TranslationService.translate(response, "en", "ru")
  → Russian text displayed to user
```

### 2.3. Translation Service API (in Core)

Extract from Gemini Module into `packages/core/src/translation/`:

```typescript
class TranslationService {
  translate(text: string, sourceLang?: string, targetLang?: string): Promise<string | null>
  translateBatch(texts: string[], sourceLang?: string, targetLang?: string): Promise<(string | null)[]>
  clearCache(): void
}
```

- `sourceLang` defaults to `"auto"` (auto-detect)
- `targetLang` defaults to user's `language` setting
- Chunking built-in for texts > 5000 characters
- Timeout: 3 seconds per request (non-blocking, fallback to original)

### 2.4. Protected terms dictionary

Certain terms must NOT be translated — they are universal or brand-specific:

```typescript
const PROTECTED_TERMS = [
  "SolidWorks", "CodeAI Hub", "Claude", "Gemini", "Codex",
  "workflow", "commit", "push", "merge", "branch",
  "JSONL", "API", "SDK", "VSIX", "CEF"
];
```

Before translation: replace protected terms with placeholders (`__TERM_0__`).
After translation: restore placeholders back to original terms.

This prevents Google Translate from mangling technical vocabulary.

---

## 3. Architecture

### 3.1. Module location

```
packages/core/src/translation/
  ├── translation-service.ts        — Google Translate API wrapper
  ├── translation-cache.ts          — persistent file-based cache for static strings
  ├── translation-protected-terms.ts — term protection logic
  └── index.ts                      — facade
```

### 3.2. Integration points

| Integration point | Direction | Layer |
|-------------------|-----------|-------|
| UI components (buttons, labels, tooltips) | EN → user lang | Static (cached) |
| Help texts / panel descriptions | EN → user lang | Static (cached) |
| Agent responses in dialog | EN → user lang | Dynamic |
| User messages in dialog | User lang → EN | Dynamic |
| Agent thoughts (Gemini) | EN → user lang | Dynamic (existing) |
| Prompts / system instructions | No translation | Internal |
| JSONL storage | No translation | Storage (always English) |

### 3.3. Existing ThoughtTranslatorService

After migration, `ThoughtTranslatorService` in Gemini Module becomes a thin wrapper
that calls `TranslationService.translate()` from Core. No duplication.

---

## 4. Caching strategy

### Static strings cache

```jsonc
// ~/.codeai-hub/i18n-cache/ru.json
{
  "_version": "1.1.820",
  "_lang": "ru",
  "_created": "2026-03-26T10:00:00Z",
  "Send Message": "Отправить сообщение",
  "New Session": "Новая сессия",
  "Settings": "Настройки",
  "Virtual Simulation": "Виртуальная симуляция"
}
```

- Key = original English string, Value = translation
- Invalidated when app version changes (new/changed strings)
- User can force refresh via settings

### Dynamic content

- NOT cached persistently (each message is unique)
- In-memory LRU cache for repeated short phrases (optional optimization)

---

## 5. Failure handling

| Scenario | Behavior |
|----------|----------|
| Google Translate unreachable | Show original English text |
| Translation timeout (> 3s) | Show original English text |
| Rate limit hit | Show original English text, retry next request |
| Language set to "en" | Module is no-op, zero overhead |
| Malformed response | Show original English text, log warning |

**Principle:** translation failure is never blocking. User always sees content,
worst case in English.

---

## 6. Advantages over traditional i18n

| Aspect | Traditional i18n | Runtime translation |
|--------|-----------------|---------------------|
| Adding a new language | Manual translation of all strings | Change one setting |
| Maintenance cost | High (sync translations with code) | Zero (automatic) |
| Number of languages | Limited by team capacity | 100+ (all Google Translate languages) |
| New feature strings | Must translate before release | Automatic |
| Translation quality | High (human) | Good (machine, with protected terms) |
| Offline support | Full | Static: cached; Dynamic: fallback to English |
| Initial setup effort | High (extract all strings, create files) | Moderate (integrate one module) |

---

## 7. Non-goals (out of scope)

- Cloud Translation API v2 with authentication (not needed for current volume)
- Translating prompts/system instructions (must stay in English for AI quality)
- User-editable translation overrides (can be added later if needed)
- Translating code snippets within agent responses
- RTL (right-to-left) layout support (separate concern, not part of translation module)

---

## 8. Text-to-Speech (TTS) — voice output for agent responses

### Concept

A "speak" button next to each agent message in the dialog.
The message (already translated to user's language by Layer 2) is sent to a TTS
engine and played back as audio.

### Settings

```jsonc
// ~/.codeai-hub/settings.json
{
  "tts": {
    "provider": "openai",          // "system" | "openai" | "elevenlabs"
    "voice": "nova",               // provider-specific voice ID
    "vibe": "calm professional"    // OpenAI gpt-4o-mini-tts only: style instruction
  }
}
```

### Provider comparison

| Provider | Quality | Cost | Offline | Notes |
|----------|---------|------|---------|-------|
| **System** (Web Speech API) | Basic | Free | Yes | Built into Chromium; voice depends on OS |
| **OpenAI TTS** | High | ~$15/1M chars | No | Best price/quality; `vibe` parameter for style |
| **ElevenLabs** | Premium | ~$99/mo for 500k chars | No | Best quality; expensive for high volume |

### Recommended default: OpenAI TTS (`gpt-4o-mini-tts`)

- 13 built-in voices (male/female): alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse, ...
- `vibe` (instructions) parameter controls delivery style
- Token-based pricing: $0.60/1M text input + $12/1M audio output tokens
- Multilingual — follows Whisper language support (Russian included)
- Voices optimized for English but Russian quality is good

### Integration point

```
User clicks "Speak" on a message
  → get translated text (from Layer 2 cache or original if language=en)
  → call TTS provider API
  → play returned audio (MP3/PCM) via <audio> element or AudioContext
```

### References

- OpenAI TTS docs: https://developers.openai.com/api/docs/guides/text-to-speech
- OpenAI TTS demo (try voices + vibe): https://www.openai.fm/
- OpenAI TTS pricing: https://platform.openai.com/docs/pricing
- ElevenLabs: https://elevenlabs.io/pricing
- Web Speech API (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- Web Speech API demo: https://addpipe.com/web-speech-api-text-to-speech-demo/

---

## 9. Open questions

1. **Static string extraction** — how to collect all UI strings for batch translation?
   Options: manual registry, AST extraction, or runtime collection on first English render.
2. **Code blocks in agent responses** — should be excluded from translation.
   Need a splitter that separates prose from code fences before translating.
3. **Markdown formatting** — Google Translate may break markdown syntax.
   May need pre/post-processing to preserve formatting markers.
4. **Volume limits** — free endpoint has undocumented rate limits.
   Monitor and evaluate if paid API is needed at scale.
